import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from django.core.management.base import CommandError

SUPPORTED_SCHEMA_VERSION = 1
DEFAULT_MARKER = "datafaker-demo"


@dataclass(frozen=True)
class DemoPayload:
    metadata: dict[str, Any]
    marker: str
    users: list[dict[str, Any]]
    services: list[dict[str, Any]]
    suppliers: list[dict[str, Any]]
    customers: list[dict[str, Any]]
    vehicles: list[dict[str, Any]]
    repairs: list[dict[str, Any]]
    purchases: list[dict[str, Any]]


def load_demo_payload(path: str | Path) -> DemoPayload:
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CommandError(f"Datafaker demo JSON not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise CommandError(f"Invalid Datafaker demo JSON: {exc}") from exc
    return parse_demo_payload(raw)


def parse_demo_payload(raw: Any) -> DemoPayload:
    if not isinstance(raw, dict):
        raise CommandError("Datafaker demo JSON must be an object.")
    metadata = _dict(raw, "metadata")
    if metadata.get("generator") != "datafaker":
        raise CommandError("metadata.generator must be 'datafaker'.")
    if metadata.get("schema_version") != SUPPORTED_SCHEMA_VERSION:
        raise CommandError(f"Unsupported Datafaker schema_version: {metadata.get('schema_version')!r}.")

    payload = DemoPayload(
        metadata=metadata,
        marker=str(metadata.get("marker") or _marker_from_metadata(metadata)),
        users=_list(raw, "users"),
        services=_list(raw, "services"),
        suppliers=_list(raw, "suppliers"),
        customers=_list(raw, "customers"),
        vehicles=_list(raw, "vehicles"),
        repairs=_list(raw, "repairs"),
        purchases=_list(raw, "purchases"),
    )
    validate_payload(payload)
    return payload


def validate_payload(payload: DemoPayload) -> None:
    customer_keys = _require_unique_keys(payload.customers, "customers")
    vehicle_keys = _require_unique_keys(payload.vehicles, "vehicles")
    repair_keys = _require_unique_keys(payload.repairs, "repairs")
    supplier_keys = _require_unique_keys(payload.suppliers, "suppliers")
    service_keys = _require_unique_keys(payload.services, "services")
    _require_unique_keys(payload.purchases, "purchases")

    user_emails = {str(row.get("email")) for row in payload.users if row.get("email")}
    allowed_statuses = {"new", "in_progress", "waiting_parts", "completed", "picked_up"}

    for row in payload.vehicles:
        _require_ref(row, "customer_key", customer_keys, "vehicles")
        _require(row, "license_plate", "vehicles")
        _require(row, "make", "vehicles")
        _require(row, "model", "vehicles")

    for row in payload.repairs:
        _require_ref(row, "vehicle_key", vehicle_keys, "repairs")
        _require(row, "service_name", "repairs")
        status = row.get("status", "new")
        if status not in allowed_statuses:
            raise CommandError(f"repairs row {row.get('key')!r} has unsupported status: {status!r}.")
        master_email = row.get("master_email")
        if master_email and master_email not in user_emails:
            raise CommandError(f"repairs row {row.get('key')!r} references unknown master_email: {master_email!r}.")
        for service_key in row.get("service_line_keys", []):
            if service_key not in service_keys:
                raise CommandError(f"repairs row {row.get('key')!r} references unknown service key: {service_key!r}.")

    for row in payload.purchases:
        _require_ref(row, "supplier_key", supplier_keys, "purchases")
        if row.get("vehicle_key"):
            _require_ref(row, "vehicle_key", vehicle_keys, "purchases")
        if row.get("repair_key"):
            _require_ref(row, "repair_key", repair_keys, "purchases")
        _require(row, "part_name", "purchases")
        parse_decimal(row.get("quantity", "1"), field="quantity")
        parse_decimal(row.get("purchase_price"), field="purchase_price")
        parse_decimal(row.get("sale_price", "0"), field="sale_price")


def parse_decimal(value: Any, *, field: str) -> Decimal:
    if value is None or value == "":
        raise CommandError(f"{field} is required.")
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise CommandError(f"{field} must be a decimal value, got {value!r}.") from exc


def with_marker(value: str, marker: str) -> str:
    suffix = f" [{marker}]"
    value = value or ""
    if suffix in value:
        return value
    return f"{value}{suffix}" if value else suffix.strip()


def _marker_from_metadata(metadata: dict[str, Any]) -> str:
    return f"{DEFAULT_MARKER}:{metadata.get('profile', 'demo')}:{metadata.get('seed', 'unknown')}"


def _dict(raw: dict[str, Any], key: str) -> dict[str, Any]:
    value = raw.get(key)
    if not isinstance(value, dict):
        raise CommandError(f"{key} must be an object.")
    return value


def _list(raw: dict[str, Any], key: str) -> list[dict[str, Any]]:
    value = raw.get(key, [])
    if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
        raise CommandError(f"{key} must be a list of objects.")
    return value


def _require_unique_keys(rows: list[dict[str, Any]], label: str) -> set[str]:
    keys: set[str] = set()
    for row in rows:
        key = _require(row, "key", label)
        if key in keys:
            raise CommandError(f"{label} contains duplicate key: {key!r}.")
        keys.add(key)
    return keys


def _require(row: dict[str, Any], key: str, label: str) -> str:
    value = row.get(key)
    if value is None or value == "":
        raise CommandError(f"{label} row is missing required field: {key}.")
    return str(value)


def _require_ref(row: dict[str, Any], key: str, known: set[str], label: str) -> str:
    value = _require(row, key, label)
    if value not in known:
        raise CommandError(f"{label} row {row.get('key')!r} references unknown {key}: {value!r}.")
    return value
