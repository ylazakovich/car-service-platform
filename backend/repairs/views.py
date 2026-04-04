from django.db.models import Exists, OuterRef, Q
import secrets

from django.http import FileResponse, HttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Repair, RepairDocument, RepairNote
from .serializers import PortalRepairSerializer, RepairNoteSerializer, RepairSerializer


def build_repair_queryset():
    has_pdf_subquery = RepairDocument.objects.filter(repair_id=OuterRef("pk"))
    return (
        Repair.objects.select_related("vehicle", "vehicle__customer", "master")
        .prefetch_related("notes")
        .annotate(has_pdf=Exists(has_pdf_subquery))
    )


class PortalLookupThrottle(AnonRateThrottle):
    scope = "portal_lookup"


class PortalRepairLookupView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [PortalLookupThrottle]
    serializer_class = PortalRepairSerializer
    lookup_field = "portal_token"
    lookup_url_kwarg = "token"

    def get_queryset(self):
        return Repair.objects.select_related("vehicle", "master")


class RepairListCreateView(generics.ListCreateAPIView):
    serializer_class = RepairSerializer

    def get_queryset(self):
        qs = build_repair_queryset()
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(tracking_code__icontains=q)
                | Q(service_name__icontains=q)
                | Q(vehicle__license_plate__icontains=q)
                | Q(vehicle__customer__full_name__icontains=q)
            )
        master_id = self.request.query_params.get("master_id", "").strip()
        if master_id:
            qs = qs.filter(master_id=master_id)
        return qs


class RepairDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RepairSerializer

    def get_queryset(self):
        return build_repair_queryset()


class RepairNoteCreateView(APIView):
    def post(self, request, repair_pk):
        repair = generics.get_object_or_404(Repair, pk=repair_pk)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"detail": "text is required"}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        name_parts = [user.first_name, user.last_name]
        author_name = " ".join(p for p in name_parts if p).strip() or user.email
        note = RepairNote.objects.create(
            repair=repair,
            author=user,
            author_name=author_name,
            author_email=user.email,
            text=text,
        )
        return Response(RepairNoteSerializer(note).data, status=status.HTTP_201_CREATED)


class RepairNoteDeleteView(APIView):
    def delete(self, request, repair_pk, note_pk):
        note = generics.get_object_or_404(RepairNote, pk=note_pk, repair_id=repair_pk)
        if note.author_email != request.user.email:
            raise PermissionDenied
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RepairPdfView(APIView):
    """GET latest exported PDF only — does not create a new version."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        repair = generics.get_object_or_404(
            Repair.objects.select_related("vehicle", "vehicle__customer", "master"),
            pk=pk,
        )
        if repair.status != Repair.Status.COMPLETED:
            return Response(
                {"detail": "PDF is only available for completed repairs."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .pdf_export import get_latest_repair_document

        doc = get_latest_repair_document(repair)
        if doc is None:
            return Response(
                {
                    "detail": (
                        f"No PDF has been exported for this repair yet. "
                        f"Use POST /api/repairs/{repair.pk}/pdf/export/ to create one."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        filename = doc.original_filename or f"act_{repair.tracking_code}.pdf"
        fh = doc.file.open("rb")
        resp = FileResponse(fh, as_attachment=True, filename=filename)
        resp["Content-Type"] = "application/pdf"
        return resp


class RepairPdfExportView(APIView):
    """POST generates PDF, persists a new document version + financial snapshot."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        repair = generics.get_object_or_404(
            Repair.objects.select_related("vehicle", "vehicle__customer", "master"),
            pk=pk,
        )
        if repair.status != Repair.Status.COMPLETED:
            return Response(
                {"detail": "PDF export is only available for completed repairs."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .pdf_export import export_repair_pdf_and_snapshot

        pdf_bytes, doc = export_repair_pdf_and_snapshot(repair, request.user)
        filename = doc.original_filename or f"act_{repair.tracking_code}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class RepairRegeneratePortalTokenView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        repair = generics.get_object_or_404(Repair, pk=pk)
        repair.portal_token = secrets.token_urlsafe(20)
        repair.save(update_fields=["portal_token"])
        return Response({"portal_token": repair.portal_token})


class RepairReorderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        items = request.data
        if not isinstance(items, list):
            return Response({"error": "Expected a list"}, status=400)
        for item in items:
            repair_id = item.get("id")
            position = item.get("position")
            if repair_id is not None and position is not None:
                Repair.objects.filter(id=repair_id).update(position=position)
        return Response({"status": "ok"})
