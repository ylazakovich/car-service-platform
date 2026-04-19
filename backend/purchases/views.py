import re

from django.db import transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from foundation.pagination import StandardPagination
from .invoice_line_parse import (
    extract_supplier,
    extract_text_from_file,
    parse_invoice_lines,
    suggest_line_pattern,
    suggest_supplier_pattern,
)
from .models import InvoiceLineParseTemplate, Purchase, Supplier, UnitOfMeasure
from .pdf_generator import generate_purchase_order_pdf
from .serializers import (
    MAX_PURCHASE_BULK_LINES,
    InvoiceLineParseTemplateSerializer,
    InvoiceParsePreviewSerializer,
    InvoiceParseSuggestSerializer,
    PurchaseBulkCreateSerializer,
    PurchaseOrderPdfSerializer,
    PurchaseSerializer,
    SupplierSerializer,
    UnitOfMeasureReorderSerializer,
    UnitOfMeasureSerializer,
    default_pcs_unit,
)


def _po_filename(supplier_name: str, order_date) -> str:
    slug = re.sub(r"[^A-Za-z0-9_-]+", "_", supplier_name.strip()).strip("_").lower()
    if not slug:
        slug = "supplier"
    return f"po_{slug}_{order_date.isoformat()}.pdf"


class SupplierListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierSerializer

    def get_queryset(self):
        queryset = Supplier.objects.all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(Q(name__icontains=query))
        return queryset


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.all()


class UnitOfMeasureListCreateView(generics.ListCreateAPIView):
    serializer_class = UnitOfMeasureSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = UnitOfMeasure.objects.all()
        include_inactive = self.request.query_params.get("include_inactive") in ("1", "true", "yes")
        if not include_inactive or not self.request.user.is_staff:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by("sort_order", "code", "id")


class UnitOfMeasureDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UnitOfMeasureSerializer
    queryset = UnitOfMeasure.objects.all()

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def perform_destroy(self, instance):
        try:
            super().perform_destroy(instance)
        except ProtectedError:
            raise ValidationError(
                {
                    "detail": "This unit is still used on purchase lines. Set is_active to false instead of deleting."
                }
            )


class UnitOfMeasureReorderView(APIView):
    """Admin-only: set display order from top to bottom (sort_order 0..n-1)."""

    permission_classes = [IsAuthenticated, IsAdminUser]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = UnitOfMeasureReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.validated_data["order"]
        all_ids = set(UnitOfMeasure.objects.values_list("id", flat=True))
        if len(order) != len(all_ids) or set(order) != all_ids:
            raise ValidationError({"order": "Must list every unit id exactly once."})
        id_to_obj = UnitOfMeasure.objects.in_bulk(order)
        for position, pk in enumerate(order):
            id_to_obj[pk].sort_order = position
        UnitOfMeasure.objects.bulk_update([id_to_obj[pk] for pk in order], ["sort_order"])
        refreshed = UnitOfMeasure.objects.all().order_by("sort_order", "code", "id")
        return Response(UnitOfMeasureSerializer(refreshed, many=True).data)


class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        queryset = Purchase.objects.select_related("supplier", "vehicle", "unit_of_measure").all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(part_name__icontains=query)
                | Q(supplier__name__icontains=query)
                | Q(repair_code__icontains=query)
            )
        shop = self.request.query_params.get("shop_consumable")
        if shop is not None:
            v = shop.strip().lower()
            if v in ("1", "true", "yes"):
                queryset = queryset.filter(is_shop_consumable=True)
            elif v in ("0", "false", "no"):
                queryset = queryset.filter(is_shop_consumable=False)

        od_from = self.request.query_params.get("order_date_from", "").strip()
        od_to = self.request.query_params.get("order_date_to", "").strip()
        if od_from:
            queryset = queryset.filter(order_date__gte=od_from)
        if od_to:
            queryset = queryset.filter(order_date__lte=od_to)

        return queryset


class PurchaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.select_related("supplier", "vehicle", "unit_of_measure").all()


class PurchaseOrderPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = PurchaseOrderPdfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        supplier = Supplier.objects.filter(name=payload["supplier_name"]).first()
        payload["supplier_registered_address"] = supplier.registered_address if supplier else ""
        payload["supplier_nip"] = supplier.nip if supplier else ""
        pdf_bytes = generate_purchase_order_pdf(payload)
        filename = _po_filename(payload["supplier_name"], payload["order_date"])
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class PurchaseBulkCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = PurchaseBulkCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lines = data.pop("lines")
        supplier_name = data.pop("supplier_name")
        supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
        is_shop = data["is_shop_consumable"]

        created_pks = []
        for line in lines:
            uom = line.get("unit_of_measure")
            if uom is None:
                uom = default_pcs_unit()
            vehicle = None if is_shop else line.get("vehicle")
            repair_code = "" if is_shop else (line.get("repair_code") or "")
            sale_price = line.get("sale_price", 0)
            if is_shop:
                sale_price = 0
            purchase = Purchase.objects.create(
                order_date=data["order_date"],
                approximate_delivery_date=data.get("approximate_delivery_date"),
                supplier=supplier,
                vehicle=vehicle,
                unit_of_measure=uom,
                part_name=line["part_name"],
                quantity=line["quantity"],
                purchase_price=line["purchase_price"],
                sale_price=sale_price,
                repair_code=repair_code,
                invoice_name=data.get("invoice_name") or "",
                invoice_url=data.get("invoice_url") or "",
                delivered=data.get("delivered", False),
                is_shop_consumable=is_shop,
            )
            created_pks.append(purchase.pk)

        order_index = {pk: i for i, pk in enumerate(created_pks)}
        loaded = list(
            Purchase.objects.filter(pk__in=created_pks).select_related("supplier", "vehicle", "unit_of_measure")
        )
        loaded.sort(key=lambda p: order_index[p.pk])
        out = PurchaseSerializer(loaded, many=True, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)


class InvoiceLineParseTemplateListCreateView(generics.ListCreateAPIView):
    """List saved regex templates (active only unless staff passes include_inactive=1)."""

    serializer_class = InvoiceLineParseTemplateSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = InvoiceLineParseTemplate.objects.all().order_by("sort_order", "id")
        if (
            self.request.user.is_authenticated
            and self.request.user.is_staff
            and self.request.query_params.get("include_inactive") in ("1", "true", "yes")
        ):
            return qs
        return qs.filter(is_active=True)


class InvoiceLineParseTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InvoiceLineParseTemplateSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        qs = InvoiceLineParseTemplate.objects.all()
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return qs
        return qs.filter(is_active=True)


class InvoiceParseSuggestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = InvoiceParseSuggestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw = serializer.validated_data["raw_text"].strip()
        if not raw:
            return Response({"detail": "raw_text is empty."}, status=status.HTTP_400_BAD_REQUEST)
        pattern, label, preview = suggest_line_pattern(raw)
        sup_pat, sup_name = suggest_supplier_pattern(raw)
        if not pattern:
            return Response(
                {
                    "matched": False,
                    "detail": "Could not guess a matching pattern for this text.",
                    "suggested_supplier_pattern": sup_pat,
                    "preview_supplier_name": sup_name,
                },
                status=status.HTTP_200_OK,
            )
        return Response(
            {
                "matched": True,
                "suggested_name": label,
                "line_pattern": pattern,
                "preview_lines": preview,
                "suggested_supplier_pattern": sup_pat,
                "preview_supplier_name": sup_name,
            },
            status=status.HTTP_200_OK,
        )


class InvoiceParsePreviewView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        serializer = InvoiceParsePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        raw = (data.get("raw_text") or "").strip()
        upload = data.get("file")
        template_id = data.get("template_id")
        line_pattern = (data.get("line_pattern") or "").strip()
        supplier_pattern_inline = (data.get("supplier_pattern") or "").strip()

        if upload:
            try:
                extracted = extract_text_from_file(upload)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            except RuntimeError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            raw = f"{raw}\n{extracted}".strip() if raw else extracted

        if not raw:
            return Response(
                {"detail": "No text to parse. Paste invoice text or upload a text-based PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplier_pattern_effective = supplier_pattern_inline
        if template_id is not None:
            template = InvoiceLineParseTemplate.objects.filter(pk=template_id).first()
            if template is None:
                return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
            if not template.is_active and not request.user.is_staff:
                return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)
            pattern = template.line_pattern
            if not supplier_pattern_effective:
                supplier_pattern_effective = (template.supplier_pattern or "").strip()
        else:
            pattern = line_pattern

        try:
            lines, warnings = parse_invoice_lines(raw, pattern)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        supplier_name, supplier_warnings = extract_supplier(raw, supplier_pattern_effective or None)
        warnings = list(warnings) + list(supplier_warnings)

        if len(lines) > MAX_PURCHASE_BULK_LINES:
            return Response(
                {"detail": f"Too many matched lines ({len(lines)}); max is {MAX_PURCHASE_BULK_LINES}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "lines": lines,
                "warnings": warnings,
                "matched_count": len(lines),
                "supplier_name": supplier_name,
                "supplier_pattern_used": supplier_pattern_effective or None,
            },
            status=status.HTTP_200_OK,
        )
