"""Read-only staff dashboard aggregates (PDF snapshots + operational KPIs)."""

from __future__ import annotations

import statistics
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, ExpressionWrapper, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncDate
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Purchase
from repairs.models import Repair, RepairDocument, RepairFinancialSnapshot


def _parse_iso_date(value: str) -> date | None:
    value = (value or "").strip()
    if len(value) < 10:
        return None
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return None


def _decimal_to_float(d: Decimal | None) -> float:
    if d is None:
        return 0.0
    return float(d)


class StaffDashboardAnalyticsView(APIView):
    """
    GET ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        [&operational_start_date=...&operational_end_date=...]

    MoneyFlow / PDF block uses start_date..end_date.
    ServiceBoard operational block uses operational_* if provided, else same as start/end.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = _parse_iso_date(request.query_params.get("start_date", ""))
        end = _parse_iso_date(request.query_params.get("end_date", ""))
        if not start or not end or start > end:
            return Response(
                {"detail": "start_date and end_date (YYYY-MM-DD) are required; start must be <= end."},
                status=400,
            )

        op_start = _parse_iso_date(request.query_params.get("operational_start_date", "")) or start
        op_end = _parse_iso_date(request.query_params.get("operational_end_date", "")) or end
        if op_start > op_end:
            return Response(
                {"detail": "operational_start_date must be <= operational_end_date."},
                status=400,
            )

        pdf_payload = self._pdf_block(start, end)
        operational_payload = self._operational_block(op_start, op_end)
        moneyflow_payload = self._moneyflow_block(start, end)

        return Response(
            {
                "moneyflow_range": {"start_date": str(start), "end_date": str(end)},
                "operational_range": {"start_date": str(op_start), "end_date": str(op_end)},
                "pdf": pdf_payload,
                "operational": operational_payload,
                "moneyflow": moneyflow_payload,
            }
        )

    def _moneyflow_block(self, start: date, end: date) -> dict:
        """Purchasing + PDF exporter aggregates for the MoneyFlow date range."""
        line_amount = ExpressionWrapper(
            F("purchase_price") * F("quantity"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )

        supplier_rows = (
            Purchase.objects.filter(order_date__gte=start, order_date__lte=end)
            .values("supplier_id", "supplier__name")
            .annotate(total_spend=Sum(line_amount), line_count=Count("id"))
            .order_by("-total_spend")[:10]
        )
        supplier_spend_top = [
            {
                "supplier_id": row["supplier_id"],
                "supplier_name": (row["supplier__name"] or ""),
                "total_spend": _decimal_to_float(row["total_spend"]),
                "line_count": row["line_count"],
            }
            for row in supplier_rows
        ]

        unlinked_agg = (
            Purchase.objects.filter(order_date__gte=start, order_date__lte=end)
            .filter(Q(repair_code="") | Q(repair_code__isnull=True))
            .aggregate(count=Count("id"), total_spend=Sum(line_amount))
        )
        purchases_unlinked = {
            "count": unlinked_agg["count"] or 0,
            "total_spend": _decimal_to_float(unlinked_agg["total_spend"]),
        }

        export_rows = (
            RepairDocument.objects.filter(created_at__date__gte=start, created_at__date__lte=end)
            .values("exported_by")
            .annotate(export_count=Count("id"))
            .order_by("-export_count")
        )
        user_ids = [r["exported_by"] for r in export_rows if r["exported_by"] is not None]
        users_by_id = {u.id: u for u in get_user_model().objects.filter(id__in=user_ids)}

        exports_by_exporter: list[dict] = []
        for row in export_rows:
            uid = row["exported_by"]
            if uid is None:
                exports_by_exporter.append(
                    {
                        "user_id": None,
                        "email": "",
                        "display_name": "",
                        "export_count": row["export_count"],
                    }
                )
                continue
            u = users_by_id.get(uid)
            email = u.email if u else ""
            name = u.full_name if u else ""
            exports_by_exporter.append(
                {
                    "user_id": uid,
                    "email": email,
                    "display_name": (name or email or "—"),
                    "export_count": row["export_count"],
                }
            )

        return {
            "supplier_spend_top": supplier_spend_top,
            "purchases_unlinked": purchases_unlinked,
            "exports_by_exporter": exports_by_exporter,
        }

    def _pdf_block(self, start: date, end: date) -> dict:
        latest_doc_pk = (
            RepairDocument.objects.filter(repair_id=OuterRef("pk"))
            .order_by("-version", "-id")
            .values("pk")[:1]
        )

        completed_in_range = Repair.objects.filter(
            status=Repair.Status.COMPLETED,
            completed_at__gte=start,
            completed_at__lte=end,
        )

        annotated = completed_in_range.annotate(latest_doc_id=Subquery(latest_doc_pk))
        total_completed = annotated.count()
        without_pdf = annotated.filter(latest_doc_id__isnull=True).count()

        snap_qs = RepairFinancialSnapshot.objects.filter(
            document_id__in=annotated.exclude(latest_doc_id__isnull=True).values("latest_doc_id")
        )
        agg = snap_qs.aggregate(
            labor_total=Sum("labor_total"),
            parts_client_total=Sum("parts_client_total"),
            parts_purchase_total=Sum("parts_purchase_total"),
            other_expenses_total=Sum("other_expenses_total"),
            document_total=Sum("document_total"),
        )

        repairs_with_pdf = snap_qs.count()

        series_qs = (
            RepairFinancialSnapshot.objects.filter(created_at__date__gte=start, created_at__date__lte=end)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(
                labor_total=Sum("labor_total"),
                parts_client_total=Sum("parts_client_total"),
                parts_purchase_total=Sum("parts_purchase_total"),
                other_expenses_total=Sum("other_expenses_total"),
                document_total=Sum("document_total"),
                export_events=Count("id"),
            )
            .order_by("day")
        )

        series = []
        for row in series_qs:
            day = row["day"]
            day_str = day.isoformat() if isinstance(day, date) else str(day)[:10]
            series.append(
                {
                    "date": day_str,
                    "labor_total": _decimal_to_float(row["labor_total"]),
                    "parts_client_total": _decimal_to_float(row["parts_client_total"]),
                    "parts_purchase_total": _decimal_to_float(row["parts_purchase_total"]),
                    "other_expenses_total": _decimal_to_float(row["other_expenses_total"]),
                    "document_total": _decimal_to_float(row["document_total"]),
                    "export_events": row["export_events"],
                }
            )

        completed_ids = list(completed_in_range.values_list("pk", flat=True))
        multi_export_repairs = (
            Repair.objects.filter(pk__in=completed_ids)
            .annotate(dc=Count("documents"))
            .filter(dc__gt=1)
            .count()
        )

        exports_in_period = RepairDocument.objects.filter(
            created_at__date__gte=start,
            created_at__date__lte=end,
        ).count()

        export_lag_days: list[int] = []
        for repair in completed_in_range:
            docs = list(
                RepairDocument.objects.filter(repair_id=repair.pk).order_by("version", "id")
            )
            if not docs or repair.completed_at is None:
                continue
            first_created = docs[0].created_at.date()
            export_lag_days.append((first_created - repair.completed_at).days)

        avg_lag = None
        median_lag = None
        p90_lag = None
        if export_lag_days:
            avg_lag = round(sum(export_lag_days) / len(export_lag_days), 2)
            median_lag = float(statistics.median(export_lag_days))
            sorted_lags = sorted(export_lag_days)
            idx = min(int(round(0.9 * (len(sorted_lags) - 1))), len(sorted_lags) - 1)
            p90_lag = float(sorted_lags[idx])

        return {
            "latest_act_totals": {
                "labor_total": _decimal_to_float(agg["labor_total"]),
                "parts_client_total": _decimal_to_float(agg["parts_client_total"]),
                "parts_purchase_total": _decimal_to_float(agg["parts_purchase_total"]),
                "other_expenses_total": _decimal_to_float(agg["other_expenses_total"]),
                "document_total": _decimal_to_float(agg["document_total"]),
                "repairs_with_latest_act": repairs_with_pdf,
            },
            "coverage": {
                "completed_in_range": total_completed,
                "completed_without_pdf": without_pdf,
            },
            "exports_in_period": exports_in_period,
            "completed_repairs_with_multiple_exports": multi_export_repairs,
            "completed_to_first_export_lag_days": {
                "average": avg_lag,
                "median": median_lag,
                "p90": p90_lag,
                "sample_size": len(export_lag_days),
            },
            "series_by_export_day": series,
        }

    def _operational_block(self, op_start: date, op_end: date) -> dict:
        created_in_range = Repair.objects.filter(
            created_at__date__gte=op_start,
            created_at__date__lte=op_end,
        )

        funnel = {key: 0 for key, _label in Repair.Status.choices}
        status_rows = created_in_range.values("status").annotate(c=Count("id"))
        for row in status_rows:
            funnel[row["status"]] = row["c"]

        completed_for_cycle = Repair.objects.filter(
            status=Repair.Status.COMPLETED,
            completed_at__gte=op_start,
            completed_at__lte=op_end,
        )

        cycle_days: list[int] = []
        for r in completed_for_cycle:
            if r.completed_at is None:
                continue
            created_d = r.created_at.date()
            delta = (r.completed_at - created_d).days
            cycle_days.append(delta)

        cycle_median = float(statistics.median(cycle_days)) if cycle_days else None
        cycle_p90 = None
        if cycle_days:
            s = sorted(cycle_days)
            idx = min(int(round(0.9 * (len(s) - 1))), len(s) - 1)
            cycle_p90 = float(s[idx])

        def _vehicle_label(vehicle) -> str:
            return f"{vehicle.license_plate} • {vehicle.make} {vehicle.model}"

        active_qs = (
            Repair.objects.filter(
                created_at__date__gte=op_start,
                created_at__date__lte=op_end,
            )
            .exclude(status=Repair.Status.COMPLETED)
            .select_related("vehicle")
            .order_by("-updated_at")[:8]
        )
        active_workload = []
        for r in active_qs:
            active_workload.append(
                {
                    "id": r.id,
                    "tracking_code": r.tracking_code,
                    "service_name": r.service_name,
                    "status": r.status,
                    "vehicle_label": _vehicle_label(r.vehicle),
                    "updated_at": r.updated_at.isoformat(),
                }
            )

        recently_created = []
        for r in (
            created_in_range.select_related("vehicle").order_by("-created_at")[:5]
        ):
            recently_created.append(
                {
                    "id": r.id,
                    "tracking_code": r.tracking_code,
                    "service_name": r.service_name,
                    "status": r.status,
                    "vehicle_label": _vehicle_label(r.vehicle),
                    "created_at": r.created_at.isoformat(),
                }
            )

        return {
            "funnel_by_status": funnel,
            "repairs_created_in_range": created_in_range.count(),
            "cycle_time_days": {
                "median": cycle_median,
                "p90": cycle_p90,
                "sample_completed_in_range": len(cycle_days),
            },
            "active_workload_preview": active_workload,
            "recently_created_preview": recently_created,
        }
