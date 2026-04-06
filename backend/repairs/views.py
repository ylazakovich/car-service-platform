from django.db.models import Exists, OuterRef, Q
import secrets

from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Repair, RepairDocument, RepairNote, RepairVisit
from .serializers import PortalRepairSerializer, RepairNoteSerializer, RepairSerializer


def build_repair_queryset():
    has_pdf_subquery = RepairDocument.objects.filter(visit_id=OuterRef("visit_id"))
    return (
        Repair.objects.select_related("vehicle", "vehicle__customer", "master", "visit")
        .prefetch_related("notes")
        .annotate(has_pdf=Exists(has_pdf_subquery))
    )


def _visit_tasks_all_completed(visit: RepairVisit) -> bool:
    tasks = list(visit.repairs.all())
    return bool(tasks) and all(t.status == Repair.Status.COMPLETED for t in tasks)


class PortalLookupThrottle(AnonRateThrottle):
    scope = "portal_lookup"


class PortalRepairLookupView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [PortalLookupThrottle]
    serializer_class = PortalRepairSerializer
    lookup_field = "portal_token"
    lookup_url_kwarg = "token"

    def get_queryset(self):
        return RepairVisit.objects.select_related("vehicle", "vehicle__customer").prefetch_related(
            "repairs__master",
        )


class RepairListCreateView(generics.ListCreateAPIView):
    serializer_class = RepairSerializer

    def get_queryset(self):
        qs = build_repair_queryset()
        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(
                Q(visit__tracking_code__icontains=q)
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
    """GET latest exported PDF only — does not create a new version (visit-scoped)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        repair = generics.get_object_or_404(
            Repair.objects.select_related("vehicle", "vehicle__customer", "master", "visit"),
            pk=pk,
        )
        visit = repair.visit
        if not _visit_tasks_all_completed(visit):
            return Response(
                {"detail": "PDF is only available when every task in the visit is completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .pdf_export import get_latest_visit_document

        doc = get_latest_visit_document(visit)
        if doc is None:
            return Response(
                {
                    "detail": (
                        f"No PDF has been exported for this visit yet. "
                        f"Use POST /api/repairs/{repair.pk}/pdf/export/ to create one."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        filename = doc.original_filename or f"act_{visit.tracking_code}.pdf"
        with doc.file.open("rb") as fh:
            pdf_bytes = fh.read()
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class RepairPdfExportView(APIView):
    """POST generates PDF for the visit, persists a new document version + financial snapshot."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        repair = generics.get_object_or_404(
            Repair.objects.select_related("vehicle", "vehicle__customer", "master", "visit"),
            pk=pk,
        )
        visit = repair.visit
        from .pdf_export import export_visit_pdf_and_snapshot

        try:
            pdf_bytes, doc = export_visit_pdf_and_snapshot(visit, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        filename = doc.original_filename or f"act_{visit.tracking_code}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class RepairRegeneratePortalTokenView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        repair = generics.get_object_or_404(
            Repair.objects.select_related("visit"),
            pk=pk,
        )
        visit = repair.visit
        visit.portal_token = secrets.token_urlsafe(20)
        visit.save(update_fields=["portal_token"])
        return Response({"portal_token": visit.portal_token})


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
