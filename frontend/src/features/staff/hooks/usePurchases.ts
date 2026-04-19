import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import type { Vehicle } from "../shared/vehicles";
import {
  createPurchasesBulk,
  deletePurchase,
  exportPurchaseOrderPdf,
  fetchPurchases,
  fetchSuppliers,
  fetchUnitsOfMeasure,
  updatePurchase,
  uploadInvoiceFile,
  type PurchaseBulkLinePayload,
  type PurchaseItem,
  type PurchaseOrderPdfPayload,
  type PurchaseWritePayload,
  type SupplierItem,
  type UnitOfMeasureItem,
} from "../../../api/purchases";

export type PurchaseCreateMode = "warehouse" | "consumables";

export type PurchaseEntry = {
  id: number;
  order_date: string;
  approximate_delivery_date: string;
  supplier_name: string;
  supplier_nip: string;
  part_name: string;
  quantity: number;
  current_stock_quantity: number;
  purchase_price: number;
  sale_price: number;
  repair_code: string;
  vehicle_id: number | null;
  vehicle_label: string;
  unit_of_measure_id: number;
  unit_of_measure_code: string;
  invoice_name: string;
  invoice_url: string;
  delivered: boolean;
  is_shop_consumable: boolean;
};

export type PurchaseFormState = {
  order_date: string;
  approximate_delivery_date: string;
  supplier_name: string;
  supplier_nip: string;
  part_name: string;
  quantity: string;
  current_stock_quantity: string;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  vehicle_id: string;
  unit_of_measure_id: string;
  delivered: boolean;
  is_shop_consumable: boolean;
};

/** One stock/consumable line under the same invoice (create modal). */
export type PurchaseLineFormState = {
  part_name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  vehicle_id: string;
  unit_of_measure_id: string;
};

/** Parsed row from invoice regex preview before mapping into purchase line form state. */
export type ParsedImportLine = {
  part_name: string;
  quantity: number;
  purchase_price: string;
};

function emptyPurchaseForm(defaultUomId: string): PurchaseFormState {
  return {
    order_date: "",
    approximate_delivery_date: "",
    supplier_name: "",
    supplier_nip: "",
    part_name: "",
    quantity: "1",
    current_stock_quantity: "0",
    purchase_price: "",
    sale_price: "",
    repair_code: "",
    vehicle_id: "",
    unit_of_measure_id: defaultUomId,
    delivered: false,
    is_shop_consumable: false,
  };
}

function emptyPurchaseLineForm(defaultUomId: string, salePriceZero: boolean): PurchaseLineFormState {
  return {
    part_name: "",
    quantity: "1",
    purchase_price: "",
    sale_price: salePriceZero ? "0" : "",
    repair_code: "",
    vehicle_id: "",
    unit_of_measure_id: defaultUomId,
  };
}

export function mapApiPurchaseToPurchaseEntry(item: PurchaseItem): PurchaseEntry {
  return {
    id: item.id,
    order_date: item.order_date,
    approximate_delivery_date: item.approximate_delivery_date ?? "",
    supplier_name: item.supplier.name,
    supplier_nip: item.supplier.nip,
    part_name: item.part_name,
    quantity: item.quantity,
    current_stock_quantity: parseFloat(item.current_stock_quantity ?? "0"),
    purchase_price: parseFloat(item.purchase_price),
    sale_price: parseFloat(item.sale_price),
    repair_code: item.repair_code,
    vehicle_id: item.vehicle,
    vehicle_label: item.vehicle_license_plate ?? "",
    unit_of_measure_id: item.unit_of_measure.id,
    unit_of_measure_code: item.unit_of_measure.code,
    invoice_name: item.invoice_name,
    invoice_url: item.invoice_url,
    delivered: Boolean(item.delivered),
    is_shop_consumable: Boolean(item.is_shop_consumable),
  };
}

function defaultUomIdFromList(units: UnitOfMeasureItem[]): string {
  const pcs = units.find((u) => u.code === "pcs");
  const first = units[0];
  const id = pcs?.id ?? first?.id;
  return id != null ? String(id) : "";
}

function getUploadErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }

  return fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilenamePart(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "supplier";
}

export type UsePurchasesOptions = {
  /** When true, keep the shop-consumables list in sync with search/pagination (Purchases → Consumables tab). */
  enableConsumablesFetch?: boolean;
};

export function usePurchases(vehicles: Vehicle[], options: UsePurchasesOptions = {}) {
  const { enableConsumablesFetch = false } = options;
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasureItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [purchaseHasMore, setPurchaseHasMore] = useState(false);
  const [purchaseLoadingMore, setPurchaseLoadingMore] = useState(false);
  const [consumablePurchases, setConsumablePurchases] = useState<PurchaseEntry[]>([]);
  const [consumableSearch, setConsumableSearch] = useState("");
  const [consumablePage, setConsumablePage] = useState(1);
  const [consumableCount, setConsumableCount] = useState(0);
  const [consumableHasMore, setConsumableHasMore] = useState(false);
  const [consumableLoadingMore, setConsumableLoadingMore] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() => emptyPurchaseForm(""));
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseModalError, setPurchaseModalError] = useState("");
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isDownloadingPurchaseOrder, setIsDownloadingPurchaseOrder] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [purchaseModalForm, setPurchaseModalForm] = useState<PurchaseFormState>(() => emptyPurchaseForm(""));
  const [purchaseInvoiceName, setPurchaseInvoiceName] = useState("");
  const [purchaseInvoiceUrl, setPurchaseInvoiceUrl] = useState("");
  const [purchaseModalInvoiceName, setPurchaseModalInvoiceName] = useState("");
  const [purchaseModalInvoiceUrl, setPurchaseModalInvoiceUrl] = useState("");

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [showCreateSuggestions, setShowCreateSuggestions] = useState(false);
  const [showModalSuggestions, setShowModalSuggestions] = useState(false);
  const [isPurchaseCreateModalOpen, setIsPurchaseCreateModalOpen] = useState(false);
  const [purchaseCreateMode, setPurchaseCreateMode] = useState<PurchaseCreateMode | null>(null);
  const [purchaseLineRows, setPurchaseLineRows] = useState<PurchaseLineFormState[]>(() => [
    emptyPurchaseLineForm("", false),
  ]);

  const deferredPurchaseSearch = useDeferredValue(purchaseSearch);
  const deferredConsumableSearch = useDeferredValue(consumableSearch);

  const selectedPurchase =
    purchases.find((entry) => entry.id === selectedPurchaseId) ??
    consumablePurchases.find((entry) => entry.id === selectedPurchaseId) ??
    null;

  const refreshSuppliers = useCallback(() => {
    return fetchSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    void refreshSuppliers();
  }, [refreshSuppliers]);

  const refreshUnitsOfMeasure = useCallback(async () => {
    try {
      const units = await fetchUnitsOfMeasure();
      setUnitsOfMeasure(units);
      const def = defaultUomIdFromList(units);
      setPurchaseForm((current) => {
        const stillValid = units.some((u) => String(u.id) === current.unit_of_measure_id);
        if (!stillValid && def) {
          return { ...current, unit_of_measure_id: def };
        }
        if (current.unit_of_measure_id === "" && def) {
          return { ...current, unit_of_measure_id: def };
        }
        return current;
      });
    } catch {
      /* keep previous list */
    }
  }, []);

  useEffect(() => {
    void refreshUnitsOfMeasure();
  }, [refreshUnitsOfMeasure]);

  useEffect(() => {
    let ignore = false;

    setPurchasePage(1);
    fetchPurchases({
      q: deferredPurchaseSearch,
      page: 1,
      pageSize: 50,
      shopConsumable: false,
    })
      .then((result) => {
        if (ignore) {
          return;
        }
        setPurchases(result.results.map(mapApiPurchaseToPurchaseEntry));
        setPurchaseCount(result.count);
        setPurchaseHasMore(result.next !== null);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [deferredPurchaseSearch]);

  useEffect(() => {
    if (!enableConsumablesFetch) {
      return;
    }
    let ignore = false;

    setConsumablePage(1);
    fetchPurchases({
      q: deferredConsumableSearch,
      page: 1,
      pageSize: 50,
      shopConsumable: true,
    })
      .then((result) => {
        if (ignore) {
          return;
        }
        setConsumablePurchases(result.results.map(mapApiPurchaseToPurchaseEntry));
        setConsumableCount(result.count);
        setConsumableHasMore(result.next !== null);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [deferredConsumableSearch, enableConsumablesFetch]);

  async function loadMorePurchases() {
    setPurchaseLoadingMore(true);
    try {
      const result = await fetchPurchases({
        q: purchaseSearch,
        page: purchasePage + 1,
        pageSize: 50,
        shopConsumable: false,
      });
      setPurchases((current) => [...current, ...result.results.map(mapApiPurchaseToPurchaseEntry)]);
      setPurchasePage((current) => current + 1);
      setPurchaseCount(result.count);
      setPurchaseHasMore(result.next !== null);
    } catch {
    } finally {
      setPurchaseLoadingMore(false);
    }
  }

  async function loadMoreConsumables() {
    if (!enableConsumablesFetch) {
      return;
    }
    setConsumableLoadingMore(true);
    try {
      const result = await fetchPurchases({
        q: consumableSearch,
        page: consumablePage + 1,
        pageSize: 50,
        shopConsumable: true,
      });
      setConsumablePurchases((current) => [...current, ...result.results.map(mapApiPurchaseToPurchaseEntry)]);
      setConsumablePage((current) => current + 1);
      setConsumableCount(result.count);
      setConsumableHasMore(result.next !== null);
    } catch {
    } finally {
      setConsumableLoadingMore(false);
    }
  }

  function resetPurchaseForm() {
    const def = defaultUomIdFromList(unitsOfMeasure);
    setPurchaseForm(emptyPurchaseForm(def));
    setPurchaseLineRows([emptyPurchaseLineForm(def, false)]);
    setPurchaseError("");
    setPurchaseInvoiceName("");
    setPurchaseInvoiceUrl("");
  }

  function openPurchaseCreateModal(mode: PurchaseCreateMode) {
    const defUom = defaultUomIdFromList(unitsOfMeasure);
    const base = emptyPurchaseForm(defUom);
    setPurchaseForm({
      ...base,
      is_shop_consumable: mode === "consumables",
      sale_price: mode === "consumables" ? "0" : base.sale_price,
    });
    setPurchaseLineRows([emptyPurchaseLineForm(defUom, mode === "consumables")]);
    setPurchaseError("");
    setPurchaseInvoiceName("");
    setPurchaseInvoiceUrl("");
    setPurchaseCreateMode(mode);
    setIsPurchaseCreateModalOpen(true);
  }

  function addPurchaseLineRow() {
    const defUom = defaultUomIdFromList(unitsOfMeasure);
    const saleZero = purchaseCreateMode === "consumables";
    setPurchaseLineRows((rows) => [...rows, emptyPurchaseLineForm(defUom, saleZero)]);
  }

  function removePurchaseLineRowAt(index: number) {
    setPurchaseLineRows((rows) => {
      if (rows.length <= 1) {
        return rows;
      }
      return rows.filter((_, i) => i !== index);
    });
  }

  function updatePurchaseLineRow(index: number, patch: Partial<PurchaseLineFormState>) {
    setPurchaseLineRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function closePurchaseCreateModal() {
    setIsPurchaseCreateModalOpen(false);
    setPurchaseCreateMode(null);
    resetPurchaseForm();
  }

  function openPurchaseDetailModal(entry: PurchaseEntry) {
    setSelectedPurchaseId(entry.id);
    setPurchaseModalError("");
    setPurchaseModalForm({
      order_date: entry.order_date,
      approximate_delivery_date: entry.approximate_delivery_date,
      supplier_name: entry.supplier_name,
      supplier_nip: entry.supplier_nip,
      part_name: entry.part_name,
      quantity: String(entry.quantity),
      current_stock_quantity: String(entry.current_stock_quantity),
      purchase_price: String(entry.purchase_price),
      sale_price: String(entry.sale_price),
      repair_code: entry.repair_code === "Unassigned" ? "" : entry.repair_code,
      vehicle_id: entry.vehicle_id ? String(entry.vehicle_id) : "",
      unit_of_measure_id: String(entry.unit_of_measure_id),
      delivered: entry.delivered,
      is_shop_consumable: entry.is_shop_consumable,
    });
    setPurchaseModalInvoiceName(entry.invoice_name);
    setPurchaseModalInvoiceUrl(entry.invoice_url);
  }

  function closePurchaseDetailModal() {
    setSelectedPurchaseId(null);
    setPurchaseModalForm(emptyPurchaseForm(defaultUomIdFromList(unitsOfMeasure)));
    setPurchaseModalInvoiceName("");
    setPurchaseModalInvoiceUrl("");
    setPurchaseModalError("");
  }

  async function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseError("");
    setIsSavingPurchase(true);

    const isConsumableLine = purchaseCreateMode === "consumables";

    if (!purchaseForm.order_date || !purchaseForm.supplier_name.trim()) {
      setPurchaseError("Order date and supplier are required.");
      setIsSavingPurchase(false);
      return;
    }

    const shopConsumableFlag =
      purchaseCreateMode === "warehouse"
        ? false
        : purchaseCreateMode === "consumables"
          ? true
          : purchaseForm.is_shop_consumable;

    const lines: PurchaseBulkLinePayload[] = [];

    for (let i = 0; i < purchaseLineRows.length; i++) {
      const row = purchaseLineRows[i];
      const label = purchaseLineRows.length > 1 ? `Line ${i + 1}: ` : "";

      if (!row.part_name.trim()) {
        setPurchaseError(`${label}${isConsumableLine ? "Item" : "Part"} name is required.`);
        setIsSavingPurchase(false);
        return;
      }

      const quantity = Number(row.quantity);
      const purchasePrice = Number(row.purchase_price);
      const salePrice = row.sale_price ? Number(row.sale_price) : 0;
      const selectedVehicle = isConsumableLine
        ? undefined
        : vehicles.find((vehicle) => String(vehicle.id) === row.vehicle_id);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setPurchaseError(`${label}Quantity must be greater than zero.`);
        setIsSavingPurchase(false);
        return;
      }

      if (
        !Number.isFinite(purchasePrice) ||
        purchasePrice < 0 ||
        !Number.isFinite(salePrice) ||
        salePrice < 0
      ) {
        setPurchaseError(`${label}Purchase and sale price must be valid numbers.`);
        setIsSavingPurchase(false);
        return;
      }

      const uomId = Number(row.unit_of_measure_id);
      if (!Number.isFinite(uomId) || uomId <= 0) {
        setPurchaseError(`${label}Select a unit of measure.`);
        setIsSavingPurchase(false);
        return;
      }

      const linePayload: PurchaseBulkLinePayload = {
        part_name: row.part_name.trim(),
        quantity,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        unit_of_measure_id: uomId,
      };

      if (!isConsumableLine) {
        linePayload.vehicle_id = selectedVehicle?.id ?? null;
        if (row.repair_code.trim()) {
          linePayload.repair_code = row.repair_code.trim();
        }
      }

      lines.push(linePayload);
    }

    const bulkPayload = {
      order_date: purchaseForm.order_date,
      approximate_delivery_date: purchaseForm.approximate_delivery_date || null,
      supplier_name: purchaseForm.supplier_name.trim(),
      invoice_name: purchaseInvoiceName,
      invoice_url: purchaseInvoiceUrl,
      delivered: purchaseForm.delivered,
      is_shop_consumable: shopConsumableFlag,
      lines,
    };

    try {
      const createdList = await createPurchasesBulk(bulkPayload);
      const entries = createdList.map(mapApiPurchaseToPurchaseEntry);
      const n = entries.length;
      if (!shopConsumableFlag) {
        setPurchases((current) => [...entries, ...current]);
        setPurchaseCount((count) => count + n);
      } else {
        setConsumablePurchases((current) => [...entries, ...current]);
        setConsumableCount((count) => count + n);
      }
      closePurchaseCreateModal();
    } catch {
      setPurchaseError("Failed to save purchase. Please try again.");
    } finally {
      setIsSavingPurchase(false);
    }
  }

  async function handlePurchaseOrderDownload() {
    setPurchaseError("");
    if (!purchaseCreateMode) {
      return;
    }

    const isConsumableLine = purchaseCreateMode === "consumables";
    if (!purchaseForm.order_date || !purchaseForm.supplier_name.trim()) {
      setPurchaseError("Order date and supplier are required before downloading PO.");
      return;
    }

    const lines: PurchaseOrderPdfPayload["lines"] = [];
    for (let i = 0; i < purchaseLineRows.length; i++) {
      const row = purchaseLineRows[i];
      const label = purchaseLineRows.length > 1 ? `Line ${i + 1}: ` : "";
      if (!row.part_name.trim()) {
        setPurchaseError(`${label}${isConsumableLine ? "Item" : "Part"} name is required before downloading PO.`);
        return;
      }

      const quantity = Number(row.quantity);
      const purchasePrice = Number(row.purchase_price);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        setPurchaseError(`${label}Quantity must be greater than zero.`);
        return;
      }
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
        setPurchaseError(`${label}Purchase price must be a valid number.`);
        return;
      }

      const uomId = Number(row.unit_of_measure_id);
      if (!Number.isFinite(uomId) || uomId <= 0) {
        setPurchaseError(`${label}Select a unit of measure.`);
        return;
      }

      lines.push({
        part_name: row.part_name.trim(),
        quantity,
        purchase_price: purchasePrice,
        unit_of_measure_id: uomId,
      });
    }

    setIsDownloadingPurchaseOrder(true);
    try {
      const blob = await exportPurchaseOrderPdf({
        order_date: purchaseForm.order_date,
        approximate_delivery_date: purchaseForm.approximate_delivery_date || null,
        supplier_name: purchaseForm.supplier_name.trim(),
        is_shop_consumable: isConsumableLine,
        lines,
      });
      downloadBlob(blob, `po_${safeFilenamePart(purchaseForm.supplier_name)}_${purchaseForm.order_date}.pdf`);
    } catch {
      setPurchaseError("Failed to download PO. Please check the order lines and try again.");
    } finally {
      setIsDownloadingPurchaseOrder(false);
    }
  }

  async function handlePurchaseInvoiceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPurchaseInvoiceName("");
      setPurchaseInvoiceUrl("");
      return;
    }

    try {
      const result = await uploadInvoiceFile(file);
      setPurchaseInvoiceName(result.name);
      setPurchaseInvoiceUrl(result.url);
    } catch (error) {
      setPurchaseError(getUploadErrorMessage(error, "Failed to upload invoice file."));
    }
  }

  async function handlePurchaseModalInvoiceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await uploadInvoiceFile(file);
      setPurchaseModalInvoiceName(result.name);
      setPurchaseModalInvoiceUrl(result.url);
    } catch (error) {
      setPurchaseModalError(getUploadErrorMessage(error, "Failed to upload invoice file."));
    }
  }

  function handlePurchaseModalInvoiceRemove() {
    if (!purchaseModalInvoiceName && !purchaseModalInvoiceUrl) {
      return;
    }

    const shouldRemove = window.confirm("Remove the attached invoice from this purchase?");
    if (!shouldRemove) {
      return;
    }

    setPurchaseModalInvoiceName("");
    setPurchaseModalInvoiceUrl("");
  }

  function handleOpenInvoice(invoiceUrl: string) {
    window.open(invoiceUrl, "_blank", "noopener,noreferrer");
  }

  const createSupplierSuggestions: SupplierItem[] =
    showCreateSuggestions && purchaseForm.supplier_name.length >= 1
      ? suppliers
          .filter((s) => s.name.toLowerCase().includes(purchaseForm.supplier_name.toLowerCase()))
          .slice(0, 8)
      : [];

  const modalSupplierSuggestions: SupplierItem[] =
    showModalSuggestions && purchaseModalForm.supplier_name.length >= 1
      ? suppliers
          .filter((s) => s.name.toLowerCase().includes(purchaseModalForm.supplier_name.toLowerCase()))
          .slice(0, 8)
      : [];

  function handleCreateSupplierInput(value: string) {
    setPurchaseForm((current) => ({ ...current, supplier_name: value }));
    setShowCreateSuggestions(true);
  }

  function handleCreateSupplierSelect(supplier: SupplierItem) {
    setPurchaseForm((current) => ({ ...current, supplier_name: supplier.name, supplier_nip: supplier.nip }));
    setShowCreateSuggestions(false);
  }

  function handleModalSupplierInput(value: string) {
    setPurchaseModalForm((current) => ({ ...current, supplier_name: value }));
    setShowModalSuggestions(true);
  }

  function handleModalSupplierSelect(supplier: SupplierItem) {
    setPurchaseModalForm((current) => ({ ...current, supplier_name: supplier.name, supplier_nip: supplier.nip }));
    setShowModalSuggestions(false);
  }

  async function handlePurchaseModalSave() {
    if (!selectedPurchase) {
      return;
    }

    const quantity = Number(purchaseModalForm.quantity);
    const currentStockQuantity = Number(purchaseModalForm.current_stock_quantity);
    const purchasePrice = Number(purchaseModalForm.purchase_price);
    const salePrice = purchaseModalForm.sale_price ? Number(purchaseModalForm.sale_price) : 0;
    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === purchaseModalForm.vehicle_id);

    if (!purchaseModalForm.order_date || !purchaseModalForm.part_name.trim() || !purchaseModalForm.supplier_name.trim()) {
      setPurchaseModalError("Order date, supplier and part name are required.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPurchaseModalError("Quantity must be greater than zero.");
      return;
    }

    if (!Number.isFinite(currentStockQuantity) || currentStockQuantity < 0) {
      setPurchaseModalError("Inventory value must be a number greater than or equal to zero.");
      return;
    }

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0 || !Number.isFinite(salePrice) || salePrice < 0) {
      setPurchaseModalError("Purchase and sale price must be valid numbers.");
      return;
    }

    const uomId = Number(purchaseModalForm.unit_of_measure_id);
    if (!Number.isFinite(uomId) || uomId <= 0) {
      setPurchaseModalError("Select a unit of measure.");
      return;
    }

    const payload: Partial<PurchaseWritePayload> = {
      order_date: purchaseModalForm.order_date,
      approximate_delivery_date: purchaseModalForm.approximate_delivery_date || null,
      supplier_name: purchaseModalForm.supplier_name.trim(),
      part_name: purchaseModalForm.part_name.trim(),
      quantity,
      current_stock_quantity: currentStockQuantity,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      vehicle_id: selectedVehicle?.id ?? null,
      repair_code: purchaseModalForm.repair_code.trim(),
      unit_of_measure_id: uomId,
      is_shop_consumable: purchaseModalForm.is_shop_consumable,
      invoice_name: purchaseModalInvoiceName,
      invoice_url: purchaseModalInvoiceUrl,
      delivered: purchaseModalForm.delivered,
    };

    try {
      const updated = await updatePurchase(selectedPurchase.id, payload);
      const entry = mapApiPurchaseToPurchaseEntry(updated);
      setPurchases((prev) => {
        const rest = prev.filter((e) => e.id !== entry.id);
        return entry.is_shop_consumable ? rest : [entry, ...rest];
      });
      setConsumablePurchases((prev) => {
        const rest = prev.filter((e) => e.id !== entry.id);
        return !entry.is_shop_consumable ? rest : [entry, ...rest];
      });
      closePurchaseDetailModal();
    } catch {
      setPurchaseModalError("Failed to save changes. Please try again.");
    }
  }

  async function handlePurchaseDelete() {
    if (!selectedPurchase) {
      return;
    }

    const shouldDelete = window.confirm(`Delete purchase "${selectedPurchase.part_name}"?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deletePurchase(selectedPurchase.id);
      setPurchases((prev) => prev.filter((entry) => entry.id !== selectedPurchase.id));
      setConsumablePurchases((prev) => prev.filter((entry) => entry.id !== selectedPurchase.id));
      if (selectedPurchase.is_shop_consumable) {
        setConsumableCount((count) => Math.max(0, count - 1));
      } else {
        setPurchaseCount((count) => Math.max(0, count - 1));
      }
      closePurchaseDetailModal();
    } catch {
      setPurchaseModalError("Failed to delete purchase. Please try again.");
    }
  }

  function applyPurchaseLineImport(
    parsed: ParsedImportLine[],
    options?: {
      supplierName?: string | null;
    },
  ) {
    if (!parsed.length) {
      return;
    }
    const supplier = options?.supplierName?.trim();
    if (supplier) {
      setPurchaseForm((current) => ({ ...current, supplier_name: supplier }));
    }
    const defaultUom = defaultUomIdFromList(unitsOfMeasure);
    const saleZero = purchaseCreateMode === "consumables";
    setPurchaseLineRows(
      parsed.map((row) => ({
        part_name: row.part_name,
        quantity: String(row.quantity),
        purchase_price: row.purchase_price,
        sale_price: saleZero ? "0" : "",
        repair_code: "",
        vehicle_id: "",
        unit_of_measure_id: defaultUom,
      })),
    );
  }

  async function handleConsumableStockSave(entry: PurchaseEntry, value: string) {
    const normalized = value.trim().replace(",", ".");
    const nextQuantity = normalized === "" ? 0 : Number(normalized);
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) {
      setPurchaseModalError("Inventory value must be a number greater than or equal to zero.");
      return;
    }

    try {
      const updated = await updatePurchase(entry.id, { current_stock_quantity: nextQuantity });
      const updatedEntry = mapApiPurchaseToPurchaseEntry(updated);
      setPurchases((prev) => prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
      setConsumablePurchases((prev) => prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item)));
    } catch {
      setPurchaseModalError("Failed to save inventory value. Please try again.");
    }
  }

  return {
    unitsOfMeasure,
    purchases,
    setPurchases,
    purchaseSearch,
    setPurchaseSearch,
    purchaseCount,
    purchaseHasMore,
    purchaseLoadingMore,
    loadMorePurchases,
    purchaseForm,
    setPurchaseForm,
    purchaseLineRows,
    addPurchaseLineRow,
    removePurchaseLineRowAt,
    updatePurchaseLineRow,
    purchaseError,
    purchaseModalError,
    isSavingPurchase,
    isDownloadingPurchaseOrder,
    selectedPurchaseId,
    selectedPurchase,
    purchaseModalForm,
    setPurchaseModalForm,
    purchaseInvoiceName,
    purchaseInvoiceUrl,
    purchaseModalInvoiceName,
    purchaseModalInvoiceUrl,
    isPurchaseCreateModalOpen,
    purchaseCreateMode,
    openPurchaseCreateModal,
    closePurchaseCreateModal,
    suppliers,
    consumablePurchases,
    consumableSearch,
    setConsumableSearch,
    consumableCount,
    consumableHasMore,
    consumableLoadingMore,
    loadMoreConsumables,
    openPurchaseDetailModal,
    closePurchaseDetailModal,
    handlePurchaseSubmit,
    handlePurchaseOrderDownload,
    handlePurchaseModalSave,
    handlePurchaseDelete,
    handleConsumableStockSave,
    handlePurchaseInvoiceChange,
    handlePurchaseModalInvoiceChange,
    handlePurchaseModalInvoiceRemove,
    handleOpenInvoice,
    createSupplierSuggestions,
    modalSupplierSuggestions,
    showCreateSuggestions,
    setShowCreateSuggestions,
    showModalSuggestions,
    setShowModalSuggestions,
    handleCreateSupplierInput,
    handleCreateSupplierSelect,
    handleModalSupplierInput,
    handleModalSupplierSelect,
    refreshUnitsOfMeasure,
    refreshSuppliers,
    applyPurchaseLineImport,
  };
}
