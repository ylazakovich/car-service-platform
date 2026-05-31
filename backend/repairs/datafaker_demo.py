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
    """
    Load and parse a Datafaker demo payload from a JSON file.
    
    Parameters:
        path (str | Path): Path to the JSON file containing the demo payload.
    
    Returns:
        DemoPayload: Parsed and validated demo payload.
    
    Raises:
        CommandError: If the file does not exist, contains invalid JSON, or the payload fails schema/validation checks.
    """
    try:
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CommandError(f"Datafaker demo JSON not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise CommandError(f"Invalid Datafaker demo JSON: {exc}") from exc
    return parse_demo_payload(raw)


def parse_demo_payload(raw: Any) -> DemoPayload:
    """
    Parse and validate a raw JSON-decoded Datafaker demo payload into a DemoPayload.
    
    Parameters:
        raw (Any): The decoded JSON value to parse; expected to be a dictionary matching the Datafaker demo schema.
    
    Returns:
        DemoPayload: A validated payload with populated metadata, marker, and lists for users, services, suppliers, customers, vehicles, repairs, and purchases.
    
    Raises:
        CommandError: If `raw` is not an object, if `metadata` is missing or invalid, if `metadata.generator` is not "datafaker", if `metadata.schema_version` does not equal SUPPORTED_SCHEMA_VERSION, or if payload validation fails.
    """
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
    """
    Validate a DemoPayload for required fields, uniqueness, and cross-reference integrity.
    
    Checks performed include:
    - Enforcing unique `key` values for customers, vehicles, repairs, suppliers, services, and purchases.
    - Ensuring vehicles reference an existing customer and include `license_plate`, `make`, and `model`.
    - Ensuring repairs reference an existing vehicle, include `service_name`, have a status from the allowed set (`"new"`, `"in_progress"`, `"waiting_parts"`, `"completed"`, `"picked_up"`), reference known `service_line_keys`, and (if present) reference a `master_email` that exists among users.
    - Ensuring purchases reference an existing supplier and optionally an existing vehicle or repair, include `part_name`, and have `quantity`, `purchase_price`, and `sale_price` validated as decimals.
    
    Parameters:
        payload (DemoPayload): The parsed demo payload to validate.
    
    Raises:
        CommandError: If any validation rule fails (missing or empty required fields, duplicate keys, unknown references, unsupported repair status, or invalid numeric values).
    """
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
    """
    Parse a value into a Decimal rounded to two decimal places using ROUND_HALF_UP.
    
    Parameters:
        value: The input numeric value (string, int, Decimal, etc.) to parse.
        field (str): Human-readable field name used in error messages.
    
    Returns:
        Decimal: The value converted to a Decimal and quantized to two decimal places.
    
    Raises:
        CommandError: If `value` is None or empty, or if it cannot be parsed as a decimal.
    """
    if value is None or value == "":
        raise CommandError(f"{field} is required.")
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError) as exc:
        raise CommandError(f"{field} must be a decimal value, got {value!r}.") from exc


def with_marker(value: str, marker: str) -> str:
    """
    Append a marker tag in square brackets to a string unless that exact suffix is already present.
    
    Parameters:
        value (str): The base string to which the marker will be appended. If empty, only the marker is returned.
        marker (str): The marker text to include inside square brackets.
    
    Returns:
        str: The original string with " [{marker}]" appended unless that exact suffix is already contained; if `value` is empty, returns "[{marker}]" (no leading space).
    """
    suffix = f" [{marker}]"
    value = value or ""
    if suffix in value:
        return value
    return f"{value}{suffix}" if value else suffix.strip()


def _marker_from_metadata(metadata: dict[str, Any]) -> str:
    """
    Builds a marker string derived from demo metadata.
    
    Parameters:
        metadata (dict[str, Any]): Metadata that may contain `profile` and `seed` keys.
    
    Returns:
        str: Marker in the form "datafaker-demo:{profile}:{seed}" where `profile` defaults to "demo" and `seed` defaults to "unknown" if not present.
    """
    return f"{DEFAULT_MARKER}:{metadata.get('profile', 'demo')}:{metadata.get('seed', 'unknown')}"


def _dict(raw: dict[str, Any], key: str) -> dict[str, Any]:
    """
    Retrieve the value at `key` from `raw` and ensure it is a dictionary.
    
    Parameters:
        raw (dict[str, Any]): Mapping to read the value from.
        key (str): Key whose associated value must be a dictionary.
    
    Returns:
        dict[str, Any]: The dictionary stored at `raw[key]`.
    
    Raises:
        CommandError: If the value is missing or is not a dictionary.
    """
    value = raw.get(key)
    if not isinstance(value, dict):
        raise CommandError(f"{key} must be an object.")
    return value


def _list(raw: dict[str, Any], key: str) -> list[dict[str, Any]]:
    """
    Retrieve the list stored at `key` in `raw` and ensure every element is a mapping.
    
    Parameters:
        raw (dict[str, Any]): Source mapping to read from.
        key (str): Key whose value should be a list of object dictionaries.
    
    Returns:
        list[dict[str, Any]]: The list of dictionaries found at `key`, or an empty list if the key is missing.
    
    Raises:
        CommandError: If the value at `key` is not a list of dictionaries.
    """
    value = raw.get(key, [])
    if not isinstance(value, list) or any(not isinstance(row, dict) for row in value):
        raise CommandError(f"{key} must be a list of objects.")
    return value


def _require_unique_keys(rows: list[dict[str, Any]], label: str) -> set[str]:
    """
    Collect the unique `"key"` values from a list of row objects and fail if any duplicate key is found.
    
    Parameters:
        rows (list[dict[str, Any]]): Sequence of row dictionaries; each row must contain a non-empty `"key"` field.
        label (str): Human-readable label used in error messages to identify the collection being checked.
    
    Returns:
        set[str]: Set of unique `"key"` string values extracted from `rows`.
    
    Raises:
        CommandError: If a row is missing or empty `"key"`, or if a duplicate key is encountered (message includes `label` and the duplicate key).
    """
    keys: set[str] = set()
    for row in rows:
        key = _require(row, "key", label)
        if key in keys:
            raise CommandError(f"{label} contains duplicate key: {key!r}.")
        keys.add(key)
    return keys


def _require(row: dict[str, Any], key: str, label: str) -> str:
    """
    Require and return a non-empty field value from a row.
    
    Parameters:
        row (dict[str, Any]): The object representing a single data row.
        key (str): The field name to retrieve from `row`.
        label (str): Human-readable label for the row type used in error messages.
    
    Returns:
        str: The value of `row[key]` coerced to a string.
    
    Raises:
        CommandError: If the field is missing or an empty string.
    """
    value = row.get(key)
    if value is None or value == "":
        raise CommandError(f"{label} row is missing required field: {key}.")
    return str(value)


def _require_ref(row: dict[str, Any], key: str, known: set[str], label: str) -> str:
    """
    Validate that a required string field in a row references a known key.
    
    Parameters:
        row (dict[str, Any]): The record containing the field to validate.
        key (str): The field name in `row` whose value must reference a known key.
        known (set[str]): Set of allowed key values that `row[key]` may reference.
        label (str): Human-readable label used in error messages to identify the row type.
    
    Returns:
        str: The string value of `row[key]`.
    
    Raises:
        CommandError: If `row[key]` is missing or empty, or if its value is not present in `known`.
    """
    value = _require(row, key, label)
    if value not in known:
        raise CommandError(f"{label} row {row.get('key')!r} references unknown {key}: {value!r}.")
    return value
