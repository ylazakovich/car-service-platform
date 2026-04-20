from django.db import models
from django.utils import timezone

from vehicles.models import Vehicle


class UnitOfMeasure(models.Model):
    """
    Extensible catalog of units (pcs, liters, kg, …) for purchase line quantities.
    """

    code = models.SlugField(max_length=32, unique=True)
    name = models.CharField(max_length=64)
    is_active = models.BooleanField(default=True, db_default=True)
    sort_order = models.PositiveSmallIntegerField(default=0, db_default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "units_of_measure"
        ordering = ("sort_order", "code", "id")

    def __str__(self):
        return f"{self.name} ({self.code})"


def supplier_alias_normalize(value: str) -> str:
    """Lowercase + collapse whitespace for OCR / invoice supplier matching."""
    return " ".join(value.strip().lower().split())


class Supplier(models.Model):
    name = models.CharField(max_length=255, unique=True)
    nip = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    registered_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "suppliers"
        ordering = ("name", "id")

    def __str__(self):
        return self.name


class SupplierAlias(models.Model):
    """
    Maps invoice / OCR vendor strings to a canonical Supplier (e.g. shorthand vs legal name).
    ``normalized_key`` is unique so one alias string resolves to at most one supplier.
    """

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name="aliases")
    alias_text = models.CharField(max_length=255, help_text="Text as it appears on invoices (any casing).")
    normalized_key = models.CharField(max_length=255, editable=False, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "supplier_aliases"
        ordering = ("supplier_id", "normalized_key", "id")
        constraints = [
            models.UniqueConstraint(fields=("normalized_key",), name="supplier_alias_normalized_key_unique"),
        ]

    def save(self, *args, **kwargs):
        self.normalized_key = supplier_alias_normalize(self.alias_text)[:255]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.alias_text} → {self.supplier_id}"


class Purchase(models.Model):
    order_date = models.DateField()
    approximate_delivery_date = models.DateField(null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchases")
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="purchases",
    )
    unit_of_measure = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    part_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    current_stock_quantity = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_default=0)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    repair_code = models.CharField(max_length=32, blank=True)
    invoice_name = models.CharField(max_length=255, blank=True)
    invoice_url = models.CharField(max_length=500, blank=True)
    delivered = models.BooleanField(default=False, db_default=False)
    is_shop_consumable = models.BooleanField(
        default=False,
        db_default=False,
        help_text="Shop supplies not included on the completion act / PDF line items.",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "purchases"
        ordering = ("-order_date", "-id")

    def __str__(self):
        return f"{self.part_name} ({self.order_date})"


class InvoiceLineParseTemplate(models.Model):
    """
    Saved regex for turning invoice table text into purchase line fields.

    The pattern must use named groups: part_name, quantity, purchase_price (see invoice_line_parse).
    """

    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    line_pattern = models.TextField(help_text="Python regex with named groups part_name, quantity, purchase_price.")
    supplier_pattern = models.TextField(
        blank=True,
        default="",
        help_text="Optional regex on full document text; named group supplier_name captures vendor (e.g. Sprzedawca line).",
    )
    is_active = models.BooleanField(default=True, db_default=True)
    sort_order = models.PositiveSmallIntegerField(default=0, db_default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "invoice_line_parse_templates"
        ordering = ("sort_order", "id")

    def __str__(self):
        return self.name
