import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Vehicle } from "../shared/vehicles";
import {
  createPurchase,
  fetchPurchases,
  updatePurchase,
  uploadInvoiceFile,
  type PurchaseItem,
  type PurchaseWritePayload,
} from "../../../api/purchases";

export type PurchaseEntry = {
  id: number;
  order_date: string;
  approximate_delivery_date: string;
  supplier_name: string;
  supplier_nip: string;
  part_name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  repair_code: string;
  vehicle_id: number | null;
  vehicle_label: string;
  invoice_name: string;
  invoice_url: string;
};

export type PurchaseFormState = {
  order_date: string;
  approximate_delivery_date: string;
  supplier_name: string;
  supplier_nip: string;
  part_name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  vehicle_id: string;
};

const emptyPurchaseForm: PurchaseFormState = {
  order_date: "",
  approximate_delivery_date: "",
  supplier_name: "",
  supplier_nip: "",
  part_name: "",
  quantity: "1",
  purchase_price: "",
  sale_price: "",
  repair_code: "",
  vehicle_id: "",
};

function mapApiPurchaseToPurchaseEntry(item: PurchaseItem): PurchaseEntry {
  return {
    id: item.id,
    order_date: item.order_date,
    approximate_delivery_date: item.approximate_delivery_date ?? "",
    supplier_name: item.supplier.name,
    supplier_nip: item.supplier.nip,
    part_name: item.part_name,
    quantity: item.quantity,
    purchase_price: parseFloat(item.purchase_price),
    sale_price: parseFloat(item.sale_price),
    repair_code: item.repair_code,
    vehicle_id: item.vehicle,
    vehicle_label: item.vehicle_license_plate ?? "",
    invoice_name: item.invoice_name,
    invoice_url: item.invoice_url,
  };
}

export function usePurchases(vehicles: Vehicle[]) {
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([]);
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [purchaseHasMore, setPurchaseHasMore] = useState(false);
  const [purchaseLoadingMore, setPurchaseLoadingMore] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseModalError, setPurchaseModalError] = useState("");
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [purchaseModalForm, setPurchaseModalForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [purchaseInvoiceName, setPurchaseInvoiceName] = useState("");
  const [purchaseInvoiceUrl, setPurchaseInvoiceUrl] = useState("");
  const [purchaseModalInvoiceName, setPurchaseModalInvoiceName] = useState("");
  const [purchaseModalInvoiceUrl, setPurchaseModalInvoiceUrl] = useState("");

  const selectedPurchase = purchases.find((entry) => entry.id === selectedPurchaseId) ?? null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPurchasePage(1);
      fetchPurchases({ q: purchaseSearch, page: 1, pageSize: 50 })
        .then((result) => {
          setPurchases(result.results.map(mapApiPurchaseToPurchaseEntry));
          setPurchaseCount(result.count);
          setPurchaseHasMore(result.next !== null);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
  }, [purchaseSearch]);

  async function loadMorePurchases() {
    setPurchaseLoadingMore(true);
    try {
      const result = await fetchPurchases({ q: purchaseSearch, page: purchasePage + 1, pageSize: 50 });
      setPurchases((current) => [...current, ...result.results.map(mapApiPurchaseToPurchaseEntry)]);
      setPurchasePage((current) => current + 1);
      setPurchaseCount(result.count);
      setPurchaseHasMore(result.next !== null);
    } catch {
    } finally {
      setPurchaseLoadingMore(false);
    }
  }

  function resetPurchaseForm() {
    setPurchaseForm(emptyPurchaseForm);
    setPurchaseError("");
    setPurchaseInvoiceName("");
    setPurchaseInvoiceUrl("");
  }

  function openPurchaseCreateModal() {
    resetPurchaseForm();
    setIsPurchaseFormOpen(true);
  }

  function closePurchaseFormModal() {
    resetPurchaseForm();
    setIsPurchaseFormOpen(false);
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
      purchase_price: String(entry.purchase_price),
      sale_price: String(entry.sale_price),
      repair_code: entry.repair_code === "Unassigned" ? "" : entry.repair_code,
      vehicle_id: entry.vehicle_id ? String(entry.vehicle_id) : "",
    });
    setPurchaseModalInvoiceName(entry.invoice_name);
    setPurchaseModalInvoiceUrl(entry.invoice_url);
  }

  function closePurchaseDetailModal() {
    setSelectedPurchaseId(null);
    setPurchaseModalForm(emptyPurchaseForm);
    setPurchaseModalInvoiceName("");
    setPurchaseModalInvoiceUrl("");
    setPurchaseModalError("");
  }

  async function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseError("");
    setIsSavingPurchase(true);

    const quantity = Number(purchaseForm.quantity);
    const purchasePrice = Number(purchaseForm.purchase_price);
    const salePrice = purchaseForm.sale_price ? Number(purchaseForm.sale_price) : 0;
    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === purchaseForm.vehicle_id);

    if (!purchaseForm.order_date || !purchaseForm.part_name.trim() || !purchaseForm.supplier_name.trim()) {
      setPurchaseError("Order date, supplier and part name are required.");
      setIsSavingPurchase(false);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPurchaseError("Quantity must be greater than zero.");
      setIsSavingPurchase(false);
      return;
    }

    if (
      !Number.isFinite(purchasePrice) ||
      purchasePrice < 0 ||
      !Number.isFinite(salePrice) ||
      salePrice < 0
    ) {
      setPurchaseError("Purchase and sale price must be valid numbers.");
      setIsSavingPurchase(false);
      return;
    }

    const payload: PurchaseWritePayload = {
      order_date: purchaseForm.order_date,
      approximate_delivery_date: purchaseForm.approximate_delivery_date || null,
      supplier_name: purchaseForm.supplier_name.trim(),
      part_name: purchaseForm.part_name.trim(),
      quantity,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      repair_code: purchaseForm.repair_code.trim(),
      vehicle_id: selectedVehicle?.id ?? null,
      invoice_name: purchaseInvoiceName,
      invoice_url: purchaseInvoiceUrl,
    };

    try {
      const created = await createPurchase(payload);
      setPurchases((current) => [mapApiPurchaseToPurchaseEntry(created), ...current]);
      resetPurchaseForm();
      setIsPurchaseFormOpen(false);
    } catch {
      setPurchaseError("Failed to save purchase. Please try again.");
    } finally {
      setIsSavingPurchase(false);
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
    } catch {
      setPurchaseError("Failed to upload invoice file.");
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
    } catch {
      setPurchaseModalError("Failed to upload invoice file.");
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

  async function handlePurchaseModalSave() {
    if (!selectedPurchase) {
      return;
    }

    const quantity = Number(purchaseModalForm.quantity);
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

    if (!Number.isFinite(purchasePrice) || purchasePrice < 0 || !Number.isFinite(salePrice) || salePrice < 0) {
      setPurchaseModalError("Purchase and sale price must be valid numbers.");
      return;
    }

    const payload: Partial<PurchaseWritePayload> = {
      order_date: purchaseModalForm.order_date,
      approximate_delivery_date: purchaseModalForm.approximate_delivery_date || null,
      supplier_name: purchaseModalForm.supplier_name.trim(),
      part_name: purchaseModalForm.part_name.trim(),
      quantity,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      repair_code: purchaseModalForm.repair_code.trim(),
      vehicle_id: selectedVehicle?.id ?? null,
      invoice_name: purchaseModalInvoiceName,
      invoice_url: purchaseModalInvoiceUrl,
    };

    try {
      const updated = await updatePurchase(selectedPurchase.id, payload);
      setPurchases((current) =>
        current.map((entry) =>
          entry.id === selectedPurchase.id ? mapApiPurchaseToPurchaseEntry(updated) : entry
        )
      );
      closePurchaseDetailModal();
    } catch {
      setPurchaseModalError("Failed to save changes. Please try again.");
    }
  }

  return {
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
    purchaseError,
    purchaseModalError,
    isSavingPurchase,
    isPurchaseFormOpen,
    selectedPurchaseId,
    selectedPurchase,
    purchaseModalForm,
    setPurchaseModalForm,
    purchaseInvoiceName,
    purchaseInvoiceUrl,
    purchaseModalInvoiceName,
    purchaseModalInvoiceUrl,
    openPurchaseCreateModal,
    closePurchaseFormModal,
    openPurchaseDetailModal,
    closePurchaseDetailModal,
    handlePurchaseSubmit,
    handlePurchaseModalSave,
    handlePurchaseInvoiceChange,
    handlePurchaseModalInvoiceChange,
    handlePurchaseModalInvoiceRemove,
    handleOpenInvoice,
  };
}
