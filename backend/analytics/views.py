"""Read-only staff dashboard aggregates (PDF snapshots + operational KPIs)."""

from __future__ import annotations

import statistics
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, ExpressionWrapper, F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from purchases.models import Purchase
from repairs.models import Repair, RepairDocument, RepairFinancialSnapshot
from services.models import Service


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
        service_board_payload = self._service_board_block(op_start, op_end)
        moneyflow_payload = self._moneyflow_block(start, end)
        warehouse_payload = self._warehouse_block(start, end)

        return Response(
            {
                "moneyflow_range": {"start_date": str(start), "end_date": str(end)},
                "operational_range": {"start_date": str(op_start), "end_date": str(op_end)},
                "pdf": pdf_payload,
                "operational": operational_payload,
                "service_board": service_board_payload,
                "moneyflow": moneyflow_payload,
                "warehouse": warehouse_payload,
            }
        )

    def _moneyflow_block(self, start: date, end: date) -> dict:
        """Purchasing + PDF exporter aggregates for the MoneyFlow date range."""
        line_amount = ExpressionWrapper(
            F("purchase_price") * F("quantity"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )

        in_range = Purchase.objects.filter(order_date__gte=start, order_date__lte=end)
        parts_in_range = in_range.filter(is_shop_consumable=False)
        consumables_in_range = in_range.filter(is_shop_consumable=True)

        supplier_rows = (
            parts_in_range.values("supplier_id", "supplier__name")
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
            parts_in_range.filter(Q(repair_code="") | Q(repair_code__isnull=True))
            .aggregate(count=Count("id"), total_spend=Sum(line_amount))
        )
        purchases_unlinked = {
            "count": unlinked_agg["count"] or 0,
            "total_spend": _decimal_to_float(unlinked_agg["total_spend"]),
        }

        consumables_agg = consumables_in_range.aggregate(
            line_count=Count("id"),
            buy_total=Sum(line_amount),
        )
        shop_consumables = {
            "line_count": consumables_agg["line_count"] or 0,
            "buy_total": _decimal_to_float(consumables_agg["buy_total"]),
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
            "shop_consumables": shop_consumables,
        }

    def _warehouse_block(self, start: date, end: date) -> dict:
        line_buy_amount = ExpressionWrapper(
            F("purchase_price") * F("quantity"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        line_sale_amount = ExpressionWrapper(
            F("sale_price") * F("quantity"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        missing_repair_code = Q(repair_code="") | Q(repair_code__isnull=True)
        missing_invoice = Q(invoice_name="") & Q(invoice_url="")

        parts_qs = Purchase.objects.filter(is_shop_consumable=False)

        def _value_triplet(queryset) -> dict:
            agg = queryset.aggregate(
                buy_total=Sum(line_buy_amount),
                sale_total=Sum(line_sale_amount),
            )
            buy_total = _decimal_to_float(agg["buy_total"])
            sale_total = _decimal_to_float(agg["sale_total"])
            return {
                "buy_total": buy_total,
                "sale_total": sale_total,
                "margin_total": sale_total - buy_total,
            }

        delivered_qs = parts_qs.filter(delivered=True)
        in_transit_qs = parts_qs.filter(delivered=False)
        all_purchases_qs = parts_qs.all()

        stock_totals = {
            "delivered_quantity_total": delivered_qs.aggregate(total=Sum("quantity"))["total"] or 0,
            "assigned_quantity_total": delivered_qs.exclude(missing_repair_code).aggregate(total=Sum("quantity"))["total"] or 0,
            "free_quantity_total": delivered_qs.filter(missing_repair_code).aggregate(total=Sum("quantity"))["total"] or 0,
            "in_transit_quantity_total": in_transit_qs.aggregate(total=Sum("quantity"))["total"] or 0,
        }

        with_invoice_qs = all_purchases_qs.exclude(missing_invoice)
        without_invoice_qs = all_purchases_qs.filter(missing_invoice)

        def _invoice_split(queryset) -> dict:
            agg = queryset.aggregate(
                line_count=Count("id"),
                quantity_total=Sum("quantity"),
                buy_total=Sum(line_buy_amount),
            )
            return {
                "line_count": agg["line_count"] or 0,
                "quantity_total": agg["quantity_total"] or 0,
                "buy_total": _decimal_to_float(agg["buy_total"]),
            }

        supplier_rows = (
            all_purchases_qs.values("supplier_id", "supplier__name")
            .annotate(
                current_buy_total=Sum(line_buy_amount),
                in_stock_buy_total=Sum(line_buy_amount, filter=Q(delivered=True)),
                in_transit_buy_total=Sum(line_buy_amount, filter=Q(delivered=False)),
                current_quantity_total=Sum("quantity"),
                in_stock_quantity_total=Sum("quantity", filter=Q(delivered=True)),
                in_transit_quantity_total=Sum("quantity", filter=Q(delivered=False)),
            )
            .order_by("-current_buy_total", "supplier__name")
        )
        supplier_part_rows = (
            all_purchases_qs.values("supplier_id", "part_name")
            .annotate(
                current_buy_total=Sum(line_buy_amount),
                in_stock_buy_total=Sum(line_buy_amount, filter=Q(delivered=True)),
                in_transit_buy_total=Sum(line_buy_amount, filter=Q(delivered=False)),
                current_quantity_total=Sum("quantity"),
                in_stock_quantity_total=Sum("quantity", filter=Q(delivered=True)),
                in_transit_quantity_total=Sum("quantity", filter=Q(delivered=False)),
            )
            .order_by("supplier_id", "-current_buy_total", "part_name")
        )
        supplier_parts_by_supplier: dict[int | None, list[dict]] = {}
        for row in supplier_part_rows:
            supplier_parts_by_supplier.setdefault(row["supplier_id"], []).append(
                {
                    "part_name": (row["part_name"] or "").strip() or "Unnamed part",
                    "current_buy_total": _decimal_to_float(row["current_buy_total"]),
                    "in_stock_buy_total": _decimal_to_float(row["in_stock_buy_total"]),
                    "in_transit_buy_total": _decimal_to_float(row["in_transit_buy_total"]),
                    "current_quantity_total": row["current_quantity_total"] or 0,
                    "in_stock_quantity_total": row["in_stock_quantity_total"] or 0,
                    "in_transit_quantity_total": row["in_transit_quantity_total"] or 0,
                }
            )
        return {
            "snapshot_as_of": timezone.now().isoformat(),
            "stock_totals": stock_totals,
            "valuations": {
                "in_stock": _value_triplet(delivered_qs),
                "in_transit": _value_triplet(in_transit_qs),
                "cumulative": _value_triplet(all_purchases_qs),
            },
            "invoice_split": {
                "with_invoice": _invoice_split(with_invoice_qs),
                "without_invoice": _invoice_split(without_invoice_qs),
            },
            "suppliers_top_current": [
                {
                    "supplier_id": row["supplier_id"],
                    "supplier_name": row["supplier__name"] or "",
                    "current_buy_total": _decimal_to_float(row["current_buy_total"]),
                    "in_stock_buy_total": _decimal_to_float(row["in_stock_buy_total"]),
                    "in_transit_buy_total": _decimal_to_float(row["in_transit_buy_total"]),
                    "current_quantity_total": row["current_quantity_total"] or 0,
                    "in_stock_quantity_total": row["in_stock_quantity_total"] or 0,
                    "in_transit_quantity_total": row["in_transit_quantity_total"] or 0,
                    "parts": supplier_parts_by_supplier.get(row["supplier_id"], []),
                }
                for row in supplier_rows
            ],
        }

    def _pdf_block(self, start: date, end: date) -> dict:
        """
        Produce PDF-related coverage and financial aggregates for repairs and their latest exported snapshots within the given date range.
        
        Parameters:
            start (date): Inclusive start date for completed repairs and snapshots (YYYY-MM-DD).
            end (date): Inclusive end date for completed repairs and snapshots (YYYY-MM-DD).
        
        Returns:
            dict: A payload containing:
                - latest_act_totals: Financial sums across latest repair snapshots and a count of repairs with a latest act.
                - coverage: Counts of completed repairs in range and how many lack a latest PDF.
                - exports_in_period: Count of repair documents created in the period.
                - completed_repairs_with_multiple_exports: Number of completed repairs that have more than one exported document.
                - completed_to_first_export_lag_days: Summary statistics (`average`, `median`, `p90`, `sample_size`) of days between repair completion and first export for completed repairs.
                - series_by_export_day: Daily series of export-day aggregates including totals for labor, client parts, purchase parts, other expenses, document totals, and export event counts.
        """
        latest_doc_pk = (
            RepairDocument.objects.filter(repair_id=OuterRef("pk"))
            .order_by("-version", "-id")
            .values("pk")[:1]
        )

        completed_in_range = Repair.objects.filter(
            status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP],
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
        """
        Builds operational KPIs for repairs within the given operational date range.
        
        Constructs a funnel of repairs by status for items created in the range, cycle-time statistics for completed repairs in the range, a short preview of active workload (recently updated open repairs), and a preview of recently created repairs.
        
        Parameters:
            op_start (date): Inclusive start date for the operational range.
            op_end (date): Inclusive end date for the operational range.
        
        Returns:
            dict: A payload containing:
                - "funnel_by_status": mapping of Repair.Status values to counts for repairs created in the range.
                - "repairs_created_in_range": integer count of repairs created in the range.
                - "cycle_time_days": dict with keys:
                    - "median": median cycle time in days (float) for completed repairs, or None if no samples.
                    - "p90": 90th percentile cycle time in days (float) for completed repairs, or None if no samples.
                    - "sample_completed_in_range": integer sample size used for the statistics.
                - "active_workload_preview": list of up to 8 recent open repairs created in the range; each item contains id, tracking_code, service_name, status, vehicle_label, and updated_at ISO string.
                - "recently_created_preview": list of up to 5 most recently created repairs in the range; each item contains id, tracking_code, service_name, status, vehicle_label, and created_at ISO string.
        """
        created_in_range = Repair.objects.filter(
            created_at__date__gte=op_start,
            created_at__date__lte=op_end,
        )

        funnel = {key: 0 for key, _label in Repair.Status.choices}
        status_rows = created_in_range.values("status").annotate(c=Count("id"))
        for row in status_rows:
            funnel[row["status"]] = row["c"]

        completed_for_cycle = Repair.objects.filter(
            status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP],
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
            .exclude(status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP])
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

    def _service_board_block(self, op_start: date, op_end: date) -> dict:
        """
        Compute service-board KPIs and snapshots for the operational date range.
        
        Parameters:
            op_start (date): Start of the operational range (inclusive).
            op_end (date): End of the operational range (inclusive).
        
        Returns:
            dict: Dictionary containing:
                - range_summary: counts and ratios for the range (open repairs at end of range, vehicles/customers in range,
                  returning/non-returning customers, returning ratio, median cycle time in days, completed repairs count).
                - current_snapshot: current open-work snapshot (waiting_parts_current, open_repairs_current).
                - all_time_totals: cumulative totals across all time (repairs, vehicles, customers, returning/non-returning customers,
                  masters total).
                - masters_current: list of per-master current assignment rows with assigned open counts, status counts,
                  waiting parts count and estimated assigned value.
                - masters_range: list of per-master completed-range rows with completed count, median cycle time, and actual
                  service value completed.
        """
        range_repairs = Repair.objects.filter(
            created_at__date__lte=op_end,
        ).filter(Q(completed_at__isnull=True) | Q(completed_at__gte=op_start))
        open_repairs_end_of_range = range_repairs.filter(
            Q(status__in=[Repair.Status.NEW, Repair.Status.IN_PROGRESS, Repair.Status.WAITING_PARTS])
            & (Q(completed_at__isnull=True) | Q(completed_at__gt=op_end))
        ).count()

        range_vehicle_ids = list(range_repairs.order_by().values_list("vehicle_id", flat=True).distinct())
        range_customer_ids = list(range_repairs.order_by().values_list("vehicle__customer_id", flat=True).distinct())

        customer_repair_rows = (
            Repair.objects.values("vehicle__customer_id")
            .annotate(repair_count=Count("id"))
        )
        returning_customer_ids = {
            row["vehicle__customer_id"]
            for row in customer_repair_rows
            if row["vehicle__customer_id"] is not None and row["repair_count"] >= 2
        }
        range_customer_id_set = set(range_customer_ids)
        returning_customers_in_range = len(range_customer_id_set & returning_customer_ids)
        non_returning_customers_in_range = len(range_customer_id_set) - returning_customers_in_range

        completed_in_range_qs = Repair.objects.filter(
            status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP],
            completed_at__gte=op_start,
            completed_at__lte=op_end,
        )
        cycle_days: list[int] = []
        for repair in completed_in_range_qs:
            if repair.completed_at is None:
                continue
            cycle_days.append((repair.completed_at - repair.created_at.date()).days)
        median_cycle_time_days = float(statistics.median(cycle_days)) if cycle_days else None

        current_open_qs = Repair.objects.exclude(status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP])
        waiting_parts_current = current_open_qs.filter(status=Repair.Status.WAITING_PARTS).count()
        open_repairs_current = current_open_qs.count()

        services_by_name = {service.name: service for service in Service.objects.all()}
        master_ids = set(Repair.objects.filter(master_id__isnull=False).values_list("master_id", flat=True))
        master_ids.update(
            get_user_model().objects.filter(role=get_user_model().Role.STAFF).values_list("id", flat=True)
        )
        masters = get_user_model().objects.filter(id__in=master_ids).order_by("first_name", "last_name", "email")

        current_open_by_master = list(
            current_open_qs.filter(master_id__isnull=False).values("master_id").annotate(
                assigned_open_current=Count("id"),
                new_current=Count("id", filter=Q(status=Repair.Status.NEW)),
                in_progress_current=Count("id", filter=Q(status=Repair.Status.IN_PROGRESS)),
                waiting_parts_current=Count("id", filter=Q(status=Repair.Status.WAITING_PARTS)),
            )
        )
        current_master_counts = {row["master_id"]: row for row in current_open_by_master}

        estimated_value_by_master: dict[int, Decimal] = {}
        for repair in current_open_qs.filter(master_id__isnull=False):
            service = services_by_name.get(repair.service_name)
            if service is None or service.price is None:
                continue
            estimated_value_by_master[repair.master_id] = estimated_value_by_master.get(repair.master_id, Decimal("0")) + service.price

        completed_range_with_totals = list(completed_in_range_qs.filter(master_id__isnull=False))
        completed_repair_ids = [repair.id for repair in completed_range_with_totals]
        latest_doc_id_by_repair: dict[int, int] = {}
        for row in (
            RepairDocument.objects.filter(repair_id__in=completed_repair_ids)
            .order_by("repair_id", "-version", "-id")
            .values("repair_id", "id")
        ):
            latest_doc_id_by_repair.setdefault(row["repair_id"], row["id"])
        snapshot_total_by_doc = {
            row["document_id"]: row["document_total"]
            for row in RepairFinancialSnapshot.objects.filter(document_id__in=latest_doc_id_by_repair.values()).values(
                "document_id", "document_total"
            )
        }
        completed_repairs_by_master = list(
            completed_in_range_qs.filter(master_id__isnull=False).values("master_id").annotate(completed_in_range=Count("id"))
        )
        completed_counts_by_master = {row["master_id"]: row["completed_in_range"] for row in completed_repairs_by_master}

        cycle_days_by_master: dict[int, list[int]] = {}
        actual_value_by_master: dict[int, Decimal] = {}
        for repair in completed_range_with_totals:
            if repair.master_id is None or repair.completed_at is None:
                continue
            cycle_days_by_master.setdefault(repair.master_id, []).append(
                (repair.completed_at - repair.created_at.date()).days
            )
            latest_doc_id = latest_doc_id_by_repair.get(repair.id)
            latest_document_total = snapshot_total_by_doc.get(latest_doc_id) if latest_doc_id is not None else None
            if latest_document_total is not None:
                actual_value_by_master[repair.master_id] = actual_value_by_master.get(
                    repair.master_id, Decimal("0")
                ) + latest_document_total

        returning_customers_total = len(returning_customer_ids)
        customers_total = len(
            set(
                Repair.objects.values_list("vehicle__customer_id", flat=True)
            )
        )
        non_returning_customers_total = max(customers_total - returning_customers_total, 0)

        masters_current = []
        masters_range = []
        for master in masters:
            display_name = master.full_name or master.email or f"User {master.id}"
            current_counts = current_master_counts.get(master.id, {})
            masters_current.append(
                {
                    "master_id": master.id,
                    "display_name": display_name,
                    "assigned_open_current": current_counts.get("assigned_open_current", 0),
                    "current_status_counts": {
                        "new": current_counts.get("new_current", 0),
                        "in_progress": current_counts.get("in_progress_current", 0),
                        "waiting_parts": current_counts.get("waiting_parts_current", 0),
                    },
                    "waiting_parts_current": current_counts.get("waiting_parts_current", 0),
                    "estimated_assigned_value_current": _decimal_to_float(estimated_value_by_master.get(master.id)),
                }
            )
            master_cycle_days = cycle_days_by_master.get(master.id, [])
            masters_range.append(
                {
                    "master_id": master.id,
                    "display_name": display_name,
                    "completed_in_range": completed_counts_by_master.get(master.id, 0),
                    "median_cycle_time_days": float(statistics.median(master_cycle_days)) if master_cycle_days else None,
                    "actual_service_value_completed": _decimal_to_float(actual_value_by_master.get(master.id)),
                }
            )

        masters_current.sort(key=lambda row: (-row["assigned_open_current"], row["display_name"]))
        masters_range.sort(key=lambda row: (-row["completed_in_range"], row["display_name"]))

        total_customer_ids = set(
            Repair.objects.values_list("vehicle__customer_id", flat=True)
        )
        total_customer_ids.discard(None)

        returning_ratio = None
        if range_customer_id_set:
            returning_ratio = round(returning_customers_in_range / len(range_customer_id_set), 4)

        return {
            "range_summary": {
                "open_repairs_end_of_range": open_repairs_end_of_range,
                "vehicles_in_range": len(range_vehicle_ids),
                "customers_in_range": len(range_customer_id_set),
                "returning_customers_in_range": returning_customers_in_range,
                "non_returning_customers_in_range": non_returning_customers_in_range,
                "returning_ratio": returning_ratio,
                "median_cycle_time_days": median_cycle_time_days,
                "completed_repairs_in_range": completed_in_range_qs.count(),
            },
            "current_snapshot": {
                "waiting_parts_current": waiting_parts_current,
                "open_repairs_current": open_repairs_current,
            },
            "all_time_totals": {
                "repairs_total": Repair.objects.count(),
                "vehicles_total": len(set(Repair.objects.values_list("vehicle_id", flat=True))),
                "customers_total": len(total_customer_ids),
                "returning_customers_total": returning_customers_total,
                "non_returning_customers_total": non_returning_customers_total,
                "masters_total": masters.count(),
            },
            "masters_current": masters_current,
            "masters_range": masters_range,
        }
