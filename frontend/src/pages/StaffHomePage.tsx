import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { StaffSection } from "../App";
import api from "../api/client";
import { fetchStaffUsers, type StaffUser } from "../api/repairs";
import { createInvite, fetchUsers, resetInvite, updateUserName, type InviteResponse, type UserItem } from "../api/users";
import { fetchServices, type ServiceItem } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { usePurchases } from "../features/staff/hooks/usePurchases";
import { useRepairs, customRepairServiceOption } from "../features/staff/hooks/useRepairs";
import { StaffRepairsMobileList } from "../features/staff/mobile/StaffRepairsMobileList";
import { StaffVehicleMobileDetail } from "../features/staff/mobile/StaffVehicleMobileDetail";
import { StaffVehiclesMobileList } from "../features/staff/mobile/StaffVehiclesMobileList";
import {
  getRepairStatusClass,
  REPAIR_KANBAN_COLUMNS,
  REPAIR_STATUS_LABELS,
  type RepairEntry,
  type RepairStatus,
  type RepairStatusFilter,
} from "../features/staff/shared/repairs";
import {
  type Vehicle,
  type VehicleOwnerDetails,
  type VehicleUiDetails,
} from "../features/staff/shared/vehicles";
import { StaffRepairsKanban } from "../features/staff/web/StaffRepairsKanban";
import { StaffVehicleDetailPanel } from "../features/staff/web/StaffVehicleDetailPanel";
import { StaffVehiclesRegistry } from "../features/staff/web/StaffVehiclesRegistry";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  notes: string;
  vehicle_count: number;
  is_demo?: boolean;
};

type CustomerFormState = {
  full_name: string;
  phone: string;
  email: string;
  notes: string;
  vehicle_id: string;
};

type VehicleFormState = {
  customer_id: string;
  license_plate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  mileage: string;
  last_service_date: string;
  added_date: string;
  notes: string;
};

type StaffHomePageProps = {
  activeSection: StaffSection;
  onSelectSection: (section: StaffSection) => void;
  openRepairComposerRequest: number;
};

type UserAccessTab = "owner" | "admins" | "masters";
type DashboardTab = "moneyflow" | "service_board";
type DashboardDateRange = {
  start_date: string;
  end_date: string;
};

const emptyCustomerForm: CustomerFormState = {
  full_name: "",
  phone: "",
  email: "",
  notes: "",
  vehicle_id: "",
};

const emptyVehicleForm: VehicleFormState = {
  customer_id: "",
  license_plate: "",
  make: "",
  model: "",
  year: "",
  vin: "",
  color: "",
  mileage: "",
  last_service_date: "",
  added_date: "",
  notes: "",
};

function getStaffUserLabel(staff: StaffUser): string {
  return [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email;
}

const repairServiceSaleCatalog: Record<string, number> = {
  "Oil Change": 190,
  "Brake Service": 420,
  Diagnostics: 260,
  "Suspension Repair": 780,
  "Engine Check": 340,
  [customRepairServiceOption]: 320,
};

function getLocalTodayDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function getApproximateDeliveryDate(orderDate: string): string {
  if (!orderDate) {
    return "";
  }

  const parsed = new Date(`${orderDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setDate(parsed.getDate() + 4);
  return parsed.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string): string {
  if (!value) {
    return "";
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!match) {
    return value;
  }

  const [, year, month, day, time] = match;
  return time ? `${day}-${month}-${year} ${time}` : `${day}-${month}-${year}`;
}

function getDateBounds(values: string[]) {
  const normalized = values.filter((value) => /^\d{4}-\d{2}-\d{2}/.test(value)).sort();
  return {
    start_date: normalized[0] ?? "",
    end_date: normalized[normalized.length - 1] ?? "",
  };
}

function isDateWithinRange(value: string, startDate: string, endDate: string) {
  if (!value) {
    return false;
  }

  const normalized = value.slice(0, 10);
  if (startDate && normalized < startDate) {
    return false;
  }
  if (endDate && normalized > endDate) {
    return false;
  }
  return true;
}

function getRepairServiceSaleValue(serviceName: string) {
  return repairServiceSaleCatalog[serviceName] ?? 320;
}


function getDefaultVehicleForm(nextCustomerId = ""): VehicleFormState {
  return {
    ...emptyVehicleForm,
    customer_id: nextCustomerId,
    added_date: getLocalTodayDate(),
  };
}

const vehicleYearOptions = Array.from(
  { length: new Date().getFullYear() - 1979 },
  (_, index) => new Date().getFullYear() - index
);

const sectionMeta: Record<StaffSection, { eyebrow: string; title: string; copy: string }> = {
  dashboard: {
    eyebrow: "Workshop Command",
    title: "Operations Dashboard",
    copy: "Monitor repair flow, purchase movement and current crew workload from one operational view.",
  },
  customers: {
    eyebrow: "Registry",
    title: "Customer Registry",
    copy: "Capture contact records first so every repair, vehicle and document starts from a clean owner record.",
  },
  vehicles: {
    eyebrow: "Registry",
    title: "Vehicle Registry",
    copy: "Keep one owner per active vehicle in v1 and use the vehicle list as the future gateway into repairs.",
  },
  repairs: {
    eyebrow: "Next Vertical Slice",
    title: "Repair Operations",
    copy: "The next implementation step will turn this section into the main working board for diagnostics and active jobs.",
  },
  purchases: {
    eyebrow: "Procurement",
    title: "Purchases",
    copy: "Track ordered parts, supplier costs and resale values before they are attached to repair accounting.",
  },
  users: {
    eyebrow: "Access Control",
    title: "Users",
    copy: "Split system access by owner, admins and masters so roles stay explicit before implementation starts.",
  },
};

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) {
      return response.data.detail;
    }
  }
  return fallback;
}

export function StaffHomePage({ activeSection, onSelectSection, openRepairComposerRequest }: StaffHomePageProps) {
  const { user, isStaff, isAdmin } = useAuth();
  const lastHandledRepairComposerRequest = useRef(0);
  const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
  const [serverVehicles, setServerVehicles] = useState<Vehicle[]>([]);
  const [demoCustomers, setDemoCustomers] = useState<Customer[]>([]);
  const [demoVehicles, setDemoVehicles] = useState<Vehicle[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [vehicleUiDetails, setVehicleUiDetails] = useState<Record<number, VehicleUiDetails>>({});
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [sectionVehicles, setSectionVehicles] = useState<Vehicle[]>([]);
  const [sectionVehiclesCount, setSectionVehiclesCount] = useState(0);
  const [sectionVehiclesPage, setSectionVehiclesPage] = useState(1);
  const [sectionVehiclesHasMore, setSectionVehiclesHasMore] = useState(false);
  const [sectionVehiclesLoading, setSectionVehiclesLoading] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [activeUserTab, setActiveUserTab] = useState<UserAccessTab>("owner");
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("moneyflow");
  const [moneyflowDateRange, setMoneyflowDateRange] = useState<DashboardDateRange>({ start_date: "", end_date: "" });
  const [serviceBoardDateRange, setServiceBoardDateRange] = useState<DashboardDateRange>({ start_date: "", end_date: "" });
  const [apiServices, setApiServices] = useState<ServiceItem[]>([]);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isInlineCustomerOpen, setIsInlineCustomerOpen] = useState(false);
  const [inlineCustomerForm, setInlineCustomerForm] = useState({ full_name: "", phone: "", email: "" });
  const [inlineCustomerError, setInlineCustomerError] = useState("");
  const [isSavingInlineCustomer, setIsSavingInlineCustomer] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [inviteResult, setInviteResult] = useState<{ url: string } | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [copiedResetUserId, setCopiedResetUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resetLinkResult, setResetLinkResult] = useState<{ userId: number; url: string } | null>(null);

  const customers = useMemo(() => [...serverCustomers, ...demoCustomers], [serverCustomers, demoCustomers]);
  const vehicles = useMemo(() => [...serverVehicles, ...demoVehicles], [serverVehicles, demoVehicles]);

  const {
    purchases,
    setPurchases,
    purchaseSearch,
    setPurchaseSearch,
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
    purchaseCount,
    purchaseHasMore,
    purchaseLoadingMore,
    loadMorePurchases,
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
  } = usePurchases(vehicles);

  const {
    repairs,
    repairSearch,
    setRepairSearch,
    mobileRepairStatusFilter,
    setMobileRepairStatusFilter,
    repairForm,
    setRepairForm,
    repairError,
    isSavingRepair,
    isRepairFormOpen,
    repairPhotoPreviews,
    selectedRepairId,
    repairModalStatus,
    setRepairModalStatus,
    repairModalMasterId,
    setRepairModalMasterId,
    repairModalNewNote,
    setRepairModalNewNote,
    repairBeforePhotos,
    repairDuringPhotos,
    repairAfterPhotos,
    draggingRepairId,
    dragOverColumn,
    copyToast,
    resetRepairForm,
    closeRepairModal,
    openRepairCreateModal,
    closeRepairCreateModal,
    openRepairModal,
    handleRepairSubmit,
    handleRepairNoteAdd,
    handleRepairNoteDelete,
    handleRepairModalSave,
    handleRepairDelete,
    handleRepairPhotosChange,
    handleRepairBeforePhotosChange,
    handleRepairDuringPhotosChange,
    handleRepairAfterPhotosChange,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
    handleCopyTrackingCode,
  } = useRepairs(vehicles, staffUsers);
  const currentUserLabel = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Unknown User";
  const repairServiceOptions = useMemo(
    () => [...apiServices.map((s) => s.name), customRepairServiceOption],
    [apiServices]
  );
  const moneyflowDateBounds = useMemo(
    () => getDateBounds([...purchases.map((entry) => entry.order_date), ...repairs.map((repair) => repair.created_at)]),
    [purchases, repairs]
  );
  const serviceBoardDateBounds = useMemo(
    () => getDateBounds(repairs.map((repair) => repair.created_at)),
    [repairs]
  );

  useEffect(() => {
    void loadRegistries();
  }, []);

  useEffect(() => {
    fetchServices().then(setApiServices).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStaffUsers().then(setStaffUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!moneyflowDateRange.start_date && !moneyflowDateRange.end_date && moneyflowDateBounds.start_date && moneyflowDateBounds.end_date) {
      setMoneyflowDateRange(moneyflowDateBounds);
    }
  }, [moneyflowDateBounds, moneyflowDateRange.end_date, moneyflowDateRange.start_date]);

  useEffect(() => {
    if (
      !serviceBoardDateRange.start_date &&
      !serviceBoardDateRange.end_date &&
      serviceBoardDateBounds.start_date &&
      serviceBoardDateBounds.end_date
    ) {
      setServiceBoardDateRange(serviceBoardDateBounds);
    }
  }, [serviceBoardDateBounds, serviceBoardDateRange.end_date, serviceBoardDateRange.start_date]);

  useEffect(() => {
    if (activeSection !== "repairs") {
      return;
    }

    if (
      openRepairComposerRequest === 0 ||
      openRepairComposerRequest === lastHandledRepairComposerRequest.current
    ) {
      return;
    }

    lastHandledRepairComposerRequest.current = openRepairComposerRequest;
    handleOpenRepairCreate();
  }, [activeSection, openRepairComposerRequest]);

  function handleOpenRepairCreate() {
    openRepairCreateModal();
    if (!isAdmin && user?.id) {
      setRepairForm((current) => ({ ...current, master_id: String(user.id) }));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSectionVehicles(vehicleSearch, 1, false);
    }, 350);
    return () => clearTimeout(timer);
  }, [vehicleSearch]);

  useEffect(() => {
    if (activeSection === "users") {
      loadAllUsers();
    }
  }, [activeSection]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isPurchaseFormOpen) {
        closePurchaseFormModal();
      } else if (selectedPurchaseId !== null) {
        closePurchaseDetailModal();
      } else if (isVehicleFormOpen) {
        closeVehicleFormModal();
      } else if (selectedVehicleId !== null) {
        closeVehicleDetailModal();
      } else if (isCustomerFormOpen) {
        closeCustomerFormModal();
      } else if (selectedCustomerId !== null) {
        closeCustomerDetailModal();
      } else if (isRepairFormOpen) {
        closeRepairCreateModal();
      } else if (selectedRepairId !== null) {
        closeRepairModal();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isPurchaseFormOpen,
    selectedPurchaseId,
    isVehicleFormOpen,
    selectedVehicleId,
    isCustomerFormOpen,
    selectedCustomerId,
    isRepairFormOpen,
    selectedRepairId,
    closePurchaseFormModal,
    closePurchaseDetailModal,
    closeVehicleFormModal,
    closeVehicleDetailModal,
    closeCustomerFormModal,
    closeCustomerDetailModal,
    closeRepairCreateModal,
    closeRepairModal,
  ]);

  async function loadAllUsers() {
    setUsersLoading(true);
    try {
      const data = await fetchUsers();
      setAllUsers(data);
    } catch {
    } finally {
      setUsersLoading(false);
    }
  }

  async function handleResetUserPassword(userId: number, email: string) {
    if (!window.confirm(`Send a new invite link to ${email}?`)) return;
    try {
      const { invite_url } = await resetInvite(userId);
      setResetLinkResult({ userId, url: invite_url });
      loadAllUsers();
    } catch {
    }
  }

  function startEditUser(u: UserItem) {
    setEditingUserId(u.id);
    setEditFirstName(u.first_name);
    setEditLastName(u.last_name);
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditFirstName("");
    setEditLastName("");
  }

  async function saveEditUser(userId: number) {
    try {
      const updated = await updateUserName(userId, editFirstName, editLastName);
      setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      cancelEditUser();
    } catch {
    }
  }

  async function loadRegistries() {
    setLoadError("");
    setIsLoading(true);
    try {
      const [customersResponse, vehiclesResponse] = await Promise.all([
        api.get("/customers/?page_size=500"),
        api.get("/vehicles/?page_size=500"),
      ]);
      setServerCustomers(customersResponse.data.results ?? customersResponse.data);
      setServerVehicles(vehiclesResponse.data.results ?? vehiclesResponse.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to load customers and vehicles."));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSectionVehicles(q: string, page: number, append: boolean) {
    if (page === 1) setSectionVehiclesLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "50", page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      const response = await api.get(`/vehicles/?${params.toString()}`);
      const data = response.data;
      const results: Vehicle[] = data.results ?? data;
      if (append) {
        setSectionVehicles((prev) => [...prev, ...results]);
      } else {
        setSectionVehicles(results);
      }
      setSectionVehiclesCount(data.count ?? results.length);
      setSectionVehiclesHasMore(data.next !== null && data.next !== undefined);
      setSectionVehiclesPage(page);
    } catch {
      // silent
    } finally {
      setSectionVehiclesLoading(false);
    }
  }

  function resetCustomerForm() {
    setCustomerForm(emptyCustomerForm);
    setEditingCustomerId(null);
    setCustomerError("");
  }

  function resetVehicleForm(nextCustomerId = "") {
    setVehicleForm(getDefaultVehicleForm(nextCustomerId));
    setEditingVehicleId(null);
    setVehicleError("");
  }

  function getVehicleDetails(vehicle: Vehicle): VehicleUiDetails {
    return {
      mileage: vehicleUiDetails[vehicle.id]?.mileage ?? (vehicle.mileage != null ? String(vehicle.mileage) : ""),
      last_service_date: vehicleUiDetails[vehicle.id]?.last_service_date ?? vehicle.last_service_date ?? "",
      added_date: vehicleUiDetails[vehicle.id]?.added_date ?? vehicle.added_date ?? "",
    };
  }

  function openCustomerCreateModal() {
    resetCustomerForm();
    setIsCustomerFormOpen(true);
  }

  function closeCustomerFormModal() {
    resetCustomerForm();
    setIsCustomerFormOpen(false);
  }

  function openCustomerEditModal(customer: Customer) {
    setEditingCustomerId(customer.id);
    setCustomerError("");
    setCustomerForm({
      full_name: customer.full_name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      vehicle_id: vehicles.find((vehicle) => vehicle.customer.id === customer.id)
        ? String(vehicles.find((vehicle) => vehicle.customer.id === customer.id)?.id)
        : "",
    });
    setIsCustomerFormOpen(true);
  }

  function openCustomerDetailModal(customer: Customer) {
    setSelectedCustomerId(customer.id);
  }

  function closeCustomerDetailModal() {
    setSelectedCustomerId(null);
  }

  function openVehicleCreateModal() {
    resetVehicleForm("");
    setIsInlineCustomerOpen(false);
    setInlineCustomerForm({ full_name: "", phone: "", email: "" });
    setInlineCustomerError("");
    setIsVehicleFormOpen(true);
  }

  function closeVehicleFormModal() {
    resetVehicleForm("");
    setIsInlineCustomerOpen(false);
    setInlineCustomerForm({ full_name: "", phone: "", email: "" });
    setInlineCustomerError("");
    setIsVehicleFormOpen(false);
  }

  async function handleInlineCustomerSave(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setInlineCustomerError("");
    setIsSavingInlineCustomer(true);
    try {
      const payload = {
        full_name: inlineCustomerForm.full_name.trim(),
        phone: inlineCustomerForm.phone.trim(),
        email: inlineCustomerForm.email.trim(),
        notes: "",
      };
      const response = await api.post("/customers/", payload);
      const newId = String(response.data.id);
      await loadRegistries();
      setVehicleForm((current) => ({ ...current, customer_id: newId }));
      setIsInlineCustomerOpen(false);
      setInlineCustomerForm({ full_name: "", phone: "", email: "" });
    } catch (error) {
      setInlineCustomerError(getErrorMessage(error, "Unable to create customer."));
    } finally {
      setIsSavingInlineCustomer(false);
    }
  }

  function openVehicleEditModal(vehicle: Vehicle) {
    const vehicleDetails = getVehicleDetails(vehicle);
    setEditingVehicleId(vehicle.id);
    setVehicleError("");
    setVehicleForm({
      customer_id: String(vehicle.customer.id),
      license_plate: vehicle.license_plate,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year ? String(vehicle.year) : "",
      vin: vehicle.vin,
      color: vehicle.color,
      mileage: vehicleDetails.mileage,
      last_service_date: vehicleDetails.last_service_date,
      added_date: vehicleDetails.added_date,
      notes: vehicle.notes,
    });
    setIsVehicleFormOpen(true);
  }

  function openVehicleDetailModal(vehicle: Vehicle) {
    setSelectedVehicleId(vehicle.id);
  }

  function closeVehicleDetailModal() {
    setSelectedVehicleId(null);
  }

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCustomerError("");
    setIsSavingCustomer(true);
    try {
    const payload = {
        full_name: customerForm.full_name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        notes: customerForm.notes.trim(),
      };
      let customerId = editingCustomerId;
      const editingCustomer = editingCustomerId ? customers.find((customer) => customer.id === editingCustomerId) : null;

      if (editingCustomer?.is_demo) {
        setDemoCustomers((current) =>
          current.map((customer) =>
            customer.id === editingCustomerId
              ? {
                  ...customer,
                  full_name: payload.full_name,
                  phone: payload.phone,
                  email: payload.email,
                  notes: payload.notes,
                }
              : customer
          )
        );
      } else if (editingCustomerId) {
        await api.patch(`/customers/${editingCustomerId}`, payload);
      } else {
        const response = await api.post("/customers/", payload);
        customerId = response.data.id;
        setVehicleForm((current) => ({
          ...current,
          customer_id: current.customer_id || String(response.data.id),
        }));
      }

      if (customerForm.vehicle_id && customerId) {
        const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === customerForm.vehicle_id);

        if (selectedVehicle?.is_demo) {
          setDemoVehicles((current) =>
            current.map((vehicle) =>
              vehicle.id === selectedVehicle.id
                ? {
                    ...vehicle,
                    customer: {
                      id: customerId as number,
                      full_name: payload.full_name,
                    },
                  }
                : vehicle
            )
          );
        } else if (selectedVehicle) {
          await api.patch(`/vehicles/${customerForm.vehicle_id}`, { customer_id: customerId });
        }
      }

      await loadRegistries();
      resetCustomerForm();
      setIsCustomerFormOpen(false);
    } catch (error) {
      setCustomerError(getErrorMessage(error, "Unable to save customer."));
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleVehicleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVehicleError("");
    setIsSavingVehicle(true);
    try {
      const selectedOwner = customers.find((customer) => String(customer.id) === vehicleForm.customer_id);
      const payload = {
        customer_id: Number(vehicleForm.customer_id),
        license_plate: vehicleForm.license_plate.trim(),
        make: vehicleForm.make.trim(),
        model: vehicleForm.model.trim(),
        year: vehicleForm.year ? Number(vehicleForm.year) : null,
        vin: vehicleForm.vin.trim(),
        color: vehicleForm.color.trim(),
        notes: vehicleForm.notes.trim(),
        mileage: vehicleForm.mileage ? Number(vehicleForm.mileage) : null,
        last_service_date: vehicleForm.last_service_date || null,
        added_date: vehicleForm.added_date || null,
      };
      const nextVehicleDetails = {
        mileage: vehicleForm.mileage.trim(),
        last_service_date: vehicleForm.last_service_date,
        added_date: vehicleForm.added_date,
      };
      const editingVehicle = editingVehicleId ? vehicles.find((vehicle) => vehicle.id === editingVehicleId) : null;

      if ((editingVehicle?.is_demo ?? false) || selectedOwner?.is_demo) {
        const demoPayload: Vehicle = {
          id: editingVehicleId ?? -Date.now(),
          customer: {
            id: payload.customer_id,
            full_name: selectedOwner?.full_name ?? "Demo Owner",
          },
          license_plate: payload.license_plate,
          make: payload.make,
          model: payload.model,
          year: payload.year,
          vin: payload.vin,
          color: payload.color,
          mileage: nextVehicleDetails.mileage ? Number(nextVehicleDetails.mileage) : null,
          last_service_date: nextVehicleDetails.last_service_date || "",
          added_date: nextVehicleDetails.added_date || "",
          notes: payload.notes,
          is_demo: true,
        };

        setDemoVehicles((current) => {
          if (editingVehicleId) {
            return current.map((vehicle) => (vehicle.id === editingVehicleId ? demoPayload : vehicle));
          }
          return [demoPayload, ...current];
        });
        setVehicleUiDetails((current) => ({
          ...current,
          [demoPayload.id]: nextVehicleDetails,
        }));
      } else if (editingVehicleId) {
        await api.patch(`/vehicles/${editingVehicleId}`, payload);
      } else {
        await api.post("/vehicles/", payload);
      }
      await loadRegistries();
      resetVehicleForm("");
      setIsVehicleFormOpen(false);
    } catch (error) {
      setVehicleError(getErrorMessage(error, "Unable to save vehicle."));
    } finally {
      setIsSavingVehicle(false);
    }
  }

  async function handleCustomerDelete(customer: Customer) {
    setCustomerError("");
    const shouldDelete = window.confirm(`Delete customer ${customer.full_name}?`);
    if (!shouldDelete) {
      return;
    }
    try {
      if (customer.is_demo) {
        setDemoCustomers((current) => current.filter((item) => item.id !== customer.id));
        setDemoVehicles((current) => current.filter((vehicle) => vehicle.customer.id !== customer.id));
      } else {
        await api.delete(`/customers/${customer.id}`);
        await loadRegistries();
      }
      if (editingCustomerId === customer.id) {
        resetCustomerForm();
      }
      if (selectedCustomerId === customer.id) {
        setSelectedCustomerId(null);
      }
      if (vehicleForm.customer_id === String(customer.id)) {
        resetVehicleForm("");
      }
    } catch (error) {
      setCustomerError(getErrorMessage(error, `Unable to delete ${customer.full_name}.`));
    }
  }

  async function handleVehicleDelete(vehicle: Vehicle) {
    setVehicleError("");
    const shouldDelete = window.confirm(`Delete vehicle ${vehicle.license_plate}?`);
    if (!shouldDelete) {
      return;
    }
    try {
      if (vehicle.is_demo) {
        setDemoVehicles((current) => current.filter((item) => item.id !== vehicle.id));
      } else {
        await api.delete(`/vehicles/${vehicle.id}`);
        await loadRegistries();
      }
      if (editingVehicleId === vehicle.id) {
        resetVehicleForm(vehicleForm.customer_id);
      }
      if (selectedVehicleId === vehicle.id) {
        setSelectedVehicleId(null);
      }
      setVehicleUiDetails((current) => {
        if (!(vehicle.id in current)) {
          return current;
        }
        const nextDetails = { ...current };
        delete nextDetails[vehicle.id];
        return nextDetails;
      });
    } catch (error) {
      setVehicleError(getErrorMessage(error, `Unable to delete ${vehicle.license_plate}.`));
    }
  }

  const visibleCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const haystack = `${customer.full_name} ${customer.phone} ${customer.email}`.toLowerCase();
        return haystack.includes(customerSearch.trim().toLowerCase());
      }),
    [customers, customerSearch]
  );

  const visibleVehicles = useMemo(
    () =>
      vehicles.filter((vehicle) => {
        const haystack =
          `${vehicle.license_plate} ${vehicle.make} ${vehicle.model} ${vehicle.customer.full_name} ${vehicle.vin}`.toLowerCase();
        return haystack.includes(vehicleSearch.trim().toLowerCase());
      }),
    [vehicleSearch, vehicles]
  );

  const visiblePurchases = purchases;

  const visibleRepairs = useMemo(
    () =>
      repairs.filter((repair) => {
        const haystack =
          `${repair.created_at} ${repair.vehicle_label} ${repair.owner_name} ${repair.master_name} ${repair.service_name} ${repair.status} ${repair.tracking_code} ${repair.issue_notes} ${repair.repair_notes
            .map((note) => `${note.author_name} ${note.text}`)
            .join(" ")}`.toLowerCase();
        return haystack.includes(repairSearch.trim().toLowerCase());
      }),
    [repairSearch, repairs]
  );

  const selectedRepairVehicle = vehicles.find((vehicle) => String(vehicle.id) === repairForm.vehicle_id) ?? null;
  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? null;

  const customerVehicleCounts = useMemo(() => {
    return vehicles.reduce<Record<number, number>>((accumulator, vehicle) => {
      accumulator[vehicle.customer.id] = (accumulator[vehicle.customer.id] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [vehicles]);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const selectedCustomerVehicles = selectedCustomer
    ? vehicles.filter((vehicle) => vehicle.customer.id === selectedCustomer.id)
    : [];
  const selectedCustomerRepairs = selectedCustomer
    ? repairs.filter((repair) => selectedCustomerVehicles.some((vehicle) => vehicle.id === repair.vehicle_id))
    : [];
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const selectedVehicleOwner: VehicleOwnerDetails | null = selectedVehicle
    ? (() => {
        const owner = customers.find((customer) => customer.id === selectedVehicle.customer.id) ?? null;
        return owner
          ? {
              full_name: selectedVehicle.customer.full_name,
              phone: owner.phone,
              email: owner.email,
              notes: owner.notes,
            }
          : null;
      })()
    : null;
  const selectedVehicleRepairs = selectedVehicle
    ? repairs.filter((repair) => repair.vehicle_id === selectedVehicle.id)
    : [];
  const selectedVehiclePurchases = selectedVehicle
    ? purchases.filter((entry) => entry.vehicle_id === selectedVehicle.id)
    : [];
  const filteredMoneyflowPurchases = useMemo(
    () =>
      purchases.filter((entry) =>
        isDateWithinRange(entry.order_date, moneyflowDateRange.start_date, moneyflowDateRange.end_date)
      ),
    [moneyflowDateRange.end_date, moneyflowDateRange.start_date, purchases]
  );
  const filteredMoneyflowRepairs = useMemo(
    () =>
      repairs.filter((repair) =>
        isDateWithinRange(repair.created_at, moneyflowDateRange.start_date, moneyflowDateRange.end_date)
      ),
    [moneyflowDateRange.end_date, moneyflowDateRange.start_date, repairs]
  );
  const filteredServiceBoardRepairs = useMemo(
    () =>
      repairs.filter((repair) =>
        isDateWithinRange(repair.created_at, serviceBoardDateRange.start_date, serviceBoardDateRange.end_date)
      ),
    [repairs, serviceBoardDateRange.end_date, serviceBoardDateRange.start_date]
  );
  const activeRepairs = useMemo(
    () => filteredServiceBoardRepairs.filter((repair) => repair.status !== "completed"),
    [filteredServiceBoardRepairs]
  );
  const waitingPartsRepairs = useMemo(
    () => filteredServiceBoardRepairs.filter((repair) => repair.status === "waiting_parts"),
    [filteredServiceBoardRepairs]
  );
  const totalPurchaseCost = useMemo(
    () => filteredMoneyflowPurchases.reduce((sum, entry) => sum + entry.purchase_price * entry.quantity, 0),
    [filteredMoneyflowPurchases]
  );
  const totalPartsSales = useMemo(
    () => filteredMoneyflowPurchases.reduce((sum, entry) => sum + entry.sale_price * entry.quantity, 0),
    [filteredMoneyflowPurchases]
  );
  const totalServiceSales = useMemo(
    () => filteredMoneyflowRepairs.reduce((sum, repair) => sum + getRepairServiceSaleValue(repair.service_name), 0),
    [filteredMoneyflowRepairs]
  );
  const projectedMargin = totalPartsSales - totalPurchaseCost;
  const totalMoneyflowRevenue = totalPartsSales + totalServiceSales;
  const dashboardWorkerLoad = useMemo(
    () =>
      staffUsers.map((master) => {
        const masterLabel = getStaffUserLabel(master);
        const assignedRepairs = filteredServiceBoardRepairs.filter((repair) => repair.master_name === masterLabel);
        const liveRepairs = assignedRepairs.filter((repair) => repair.status !== "completed");
        return {
          id: master.id,
          name: masterLabel,
          assignedCount: assignedRepairs.length,
          liveCount: liveRepairs.length,
          waitingPartsCount: liveRepairs.filter((repair) => repair.status === "waiting_parts").length,
          latestJob: assignedRepairs[0]?.service_name ?? "No jobs yet",
        };
      }),
    [filteredServiceBoardRepairs, staffUsers]
  );
  const dashboardTabs: Array<{ id: DashboardTab; label: string }> = [
    {
      id: "moneyflow",
      label: "Moneyflow",
    },
    {
      id: "service_board",
      label: "Service board",
    },
  ];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function renderStaffMobileTaskRail({
    title,
    summary,
    searchValue,
    searchPlaceholder,
    onSearchChange,
    primaryActionLabel,
    onPrimaryAction,
  }: {
    title: string;
    summary: string;
    searchValue: string;
    searchPlaceholder: string;
    onSearchChange: (value: string) => void;
    primaryActionLabel: string;
    onPrimaryAction: () => void;
  }) {
    if (!isStaff) {
      return null;
    }

    return (
      <div className="staff-mobile-taskbar">
        <div className="staff-mobile-switcher" aria-label="Staff task switcher">
          <button
            type="button"
            className={`staff-mobile-switch ${activeSection === "vehicles" ? "staff-mobile-switch-active" : ""}`}
            onClick={() => onSelectSection("vehicles")}
          >
            Vehicles
          </button>
          <button
            type="button"
            className={`staff-mobile-switch ${activeSection === "repairs" ? "staff-mobile-switch-active" : ""}`}
            onClick={() => onSelectSection("repairs")}
          >
            Repairs
          </button>
        </div>

        <div className="staff-mobile-taskcard">
          <div className="staff-mobile-taskcopy">
            <span className="mobile-section-pill">Staff Task</span>
            <strong>{title}</strong>
            <p>{summary}</p>
          </div>

          <div className="staff-mobile-taskactions">
            <label className="search-field staff-mobile-search">
              <span>Search</span>
              <input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
              />
            </label>

            <button type="button" className="button staff-mobile-primary-action" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    const recentPurchases = [...filteredMoneyflowPurchases]
      .sort((left, right) => right.order_date.localeCompare(left.order_date))
      .slice(0, 3);
    const recentRepairs = [...filteredServiceBoardRepairs]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 3);
    const activeDateRange = activeDashboardTab === "moneyflow" ? moneyflowDateRange : serviceBoardDateRange;
    const activeDateBounds = activeDashboardTab === "moneyflow" ? moneyflowDateBounds : serviceBoardDateBounds;
    const updateActiveDateRange = (field: keyof DashboardDateRange, value: string) => {
      if (activeDashboardTab === "moneyflow") {
        setMoneyflowDateRange((current) => ({ ...current, [field]: value }));
        return;
      }
      setServiceBoardDateRange((current) => ({ ...current, [field]: value }));
    };

    return (
      <div className="workspace-stack dashboard-workspace">
        <section className="dashboard-shell">
          <div className="dashboard-shell-head">
            <div>
              <p className="eyebrow">Workshop Command</p>
              <h2>Operations Dashboard</h2>
              <p className="workspace-copy">
                Track intake volume, purchase movement and repair load without leaving the staff workspace.
              </p>
            </div>
          </div>

          <div className="dashboard-folder-tabs" role="tablist" aria-label="Dashboard views">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeDashboardTab === tab.id}
                className={`dashboard-folder-tab ${activeDashboardTab === tab.id ? "dashboard-folder-tab-active" : ""}`}
                onClick={() => setActiveDashboardTab(tab.id)}
              >
                <span className="dashboard-folder-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="dashboard-folder-panel">
            <div className="dashboard-date-bar">
              <label className="dashboard-date-field">
                <span>Start date</span>
                <input
                  type="date"
                  value={activeDateRange.start_date}
                  min={activeDateBounds.start_date || undefined}
                  max={activeDateRange.end_date || activeDateBounds.end_date || undefined}
                  onChange={(event) => updateActiveDateRange("start_date", event.target.value)}
                />
              </label>
              <label className="dashboard-date-field">
                <span>End date</span>
                <input
                  type="date"
                  value={activeDateRange.end_date}
                  min={activeDateRange.start_date || activeDateBounds.start_date || undefined}
                  max={activeDateBounds.end_date || undefined}
                  onChange={(event) => updateActiveDateRange("end_date", event.target.value)}
                />
              </label>
            </div>
            {activeDashboardTab === "moneyflow" ? (
              <div className="workspace-stack">
                <div className="metric-grid dashboard-metric-grid">
                  <article className="metric-card metric-card-accent">
                    <span className="metric-label">Purchase Spend</span>
                    <strong>{formatCurrency(totalPurchaseCost)}</strong>
                    <p>Current ordered parts across the board.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Parts Sales</span>
                    <strong>{formatCurrency(totalPartsSales)}</strong>
                    <p>Potential resale value of booked purchases.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Service Jobs</span>
                    <strong>{filteredMoneyflowRepairs.length}</strong>
                    <p>Repairs opened inside the selected period.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Total Service Sales</span>
                    <strong>{formatCurrency(totalServiceSales)}</strong>
                    <p>Estimated labour sales across selected repairs.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Total Revenue</span>
                    <strong>{formatCurrency(totalMoneyflowRevenue)}</strong>
                    <p>Parts sales plus service sales in one view.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Projected Margin</span>
                    <strong>{formatCurrency(projectedMargin)}</strong>
                    <p>Spread between buy and sell values for parts.</p>
                  </article>
                </div>

                <section className="panel dashboard-mini-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Procurement Pulse</p>
                      <h3>Latest Purchase Entries</h3>
                    </div>
                    <button type="button" className="button button-secondary" onClick={() => onSelectSection("purchases")}>
                      Open Purchases
                    </button>
                  </div>

                  <div className="dashboard-inline-list">
                    {recentPurchases.length === 0 ? <p className="workspace-note">No purchase entries inside this period.</p> : null}
                    {recentPurchases.map((entry) => (
                      <article className="dashboard-inline-card" key={entry.id}>
                        <div>
                          <h4>{entry.part_name}</h4>
                          <p>{entry.supplier_name}</p>
                          <p>Tracking {entry.repair_code}</p>
                        </div>
                        <div className="dashboard-inline-meta">
                          <span>{formatCurrency(entry.purchase_price * entry.quantity)}</span>
                          <p>Ordered {formatDisplayDate(entry.order_date)}</p>
                          {entry.approximate_delivery_date ? (
                            <p>Approx. delivery {formatDisplayDate(entry.approximate_delivery_date)}</p>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {activeDashboardTab === "service_board" ? (
              <div className="workspace-stack">
                <div className="metric-grid metric-grid-three">
                  <article className="metric-card metric-card-accent">
                    <span className="metric-label">Open Repairs</span>
                    <strong>{activeRepairs.length}</strong>
                    <p>Everything not yet moved to completed.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Waiting Parts</span>
                    <strong>{waitingPartsRepairs.length}</strong>
                    <p>Jobs blocked on procurement delivery.</p>
                  </article>
                  <article className="metric-card">
                    <span className="metric-label">Vehicles</span>
                    <strong>{vehicles.length}</strong>
                    <p>Active registry entries available for intake.</p>
                  </article>
                </div>

                <section className="panel dashboard-mini-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Repair Flow</p>
                      <h3>Current Work Queue</h3>
                    </div>
                    <div className="hero-actions">
                      <button type="button" className="button button-secondary" onClick={() => onSelectSection("vehicles")}>
                        Open Vehicles
                      </button>
                      <button type="button" className="button" onClick={() => onSelectSection("repairs")}>
                        Open Repairs
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-inline-list">
                    {recentRepairs.length === 0 ? <p className="workspace-note">No repair jobs inside this period.</p> : null}
                    {recentRepairs.map((repair) => (
                      <article className="dashboard-inline-card" key={repair.id}>
                        <div>
                          <h4>{repair.service_name}</h4>
                          <p>{repair.vehicle_label}</p>
                        </div>
                        <div className="dashboard-inline-meta">
                          <span className={getRepairStatusClass(repair.status)}>
                            {REPAIR_STATUS_LABELS[repair.status]}
                          </span>
                          <p>{repair.master_name}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="panel dashboard-mini-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Crew Snapshot</p>
                      <h3>Master Workload</h3>
                    </div>
                  </div>
                  <div className="dashboard-worker-grid">
                    {dashboardWorkerLoad.every((master) => master.assignedCount === 0) ? (
                      <p className="workspace-note">No worker load inside this period.</p>
                    ) : null}
                    {dashboardWorkerLoad.map((master) => (
                      <article className="dashboard-worker-card" key={master.id}>
                        <div className="dashboard-worker-topline">
                          <strong>{master.name}</strong>
                          <span className="tag">{master.liveCount} live</span>
                        </div>
                        <p>{master.latestJob}</p>
                        <div className="dashboard-worker-stats">
                          <span>Assigned {master.assignedCount}</span>
                          <span>Waiting parts {master.waitingPartsCount}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  function renderCustomersSection() {
    return (
      <div className="workspace-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Customers</h3>
            </div>
            <button type="button" className="button" onClick={openCustomerCreateModal}>
              Add New Customer
            </button>
          </div>

          <label className="search-field search-field-tight">
            <span>Search customers</span>
            <input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Name, phone or email"
              type="search"
            />
          </label>

          <div className="registry-list">
            {visibleCustomers.length === 0 ? (
              <p className="workspace-note">No customers yet.</p>
            ) : (
              visibleCustomers.map((customer) => (
                <article className="registry-card customer-card" key={customer.id} onClick={() => openCustomerDetailModal(customer)}>
                  <div>
                    <h4>{customer.full_name}</h4>
                    <p>{customer.phone}</p>
                    {customer.email ? <p>{customer.email}</p> : null}
                    <p className="meta-line">Vehicles: {customerVehicleCounts[customer.id] ?? 0}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {isCustomerFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closeCustomerFormModal}>
            <section className="modal-card modal-card-large" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Customer Intake</p>
                  <h3>{editingCustomerId ? "Edit Customer" : "Create Customer"}</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeCustomerFormModal}>
                  Close
                </button>
              </div>

              <form className="stack-form" onSubmit={handleCustomerSubmit}>
                <label>
                  <span>Full Name</span>
                  <input
                    value={customerForm.full_name}
                    onChange={(event) => setCustomerForm((current) => ({ ...current, full_name: event.target.value }))}
                    placeholder="e.g. Anna Kowalska"
                    type="text"
                    required
                  />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    value={customerForm.phone}
                    onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="e.g. +48 600 100 100"
                    type="tel"
                    pattern="[\+]?[0-9\s\-\(\)]{7,20}"
                    title="Enter a valid phone number (7–20 digits, spaces, dashes, + allowed)"
                    required
                  />
                </label>

                <label>
                  <span>Email <span className="field-hint" style={{ display: "inline" }}>(optional)</span></span>
                  <input
                    value={customerForm.email}
                    onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="e.g. anna@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label>
                  <span>Vehicle</span>
                  <select
                    value={customerForm.vehicle_id}
                    onChange={(event) => setCustomerForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} • {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Notes</span>
                  <textarea
                    value={customerForm.notes}
                    onChange={(event) => setCustomerForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="e.g. Prefers phone call before any additional work"
                    rows={4}
                  />
                </label>

                {customerError ? <p className="form-error">{customerError}</p> : null}

                <div className="form-actions">
                  <button type="submit" className="button" disabled={isSavingCustomer}>
                    {isSavingCustomer ? "Saving..." : editingCustomerId ? "Update Customer" : "Create Customer"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeCustomerFormModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {selectedCustomer ? (
          <div className="modal-overlay" role="presentation" onClick={closeCustomerDetailModal}>
            <section
              className="modal-card modal-card-large"
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Customer Details</p>
                  <h3 id="customer-modal-title">{selectedCustomer.full_name}</h3>
                </div>
                <div className="inline-actions">
                  {!isStaff && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        closeCustomerDetailModal();
                        openCustomerEditModal(selectedCustomer);
                      }}
                    >
                      Edit Customer
                    </button>
                  )}
                  {!isStaff && (
                    <button type="button" className="button button-danger" onClick={() => void handleCustomerDelete(selectedCustomer)}>
                      Delete Customer
                    </button>
                  )}
                  <button type="button" className="button button-secondary" onClick={closeCustomerDetailModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="customer-detail-stack">
                <div className="detail-card">
                  <strong>Contact</strong>
                  <p>{selectedCustomer.phone}</p>
                  <p>{selectedCustomer.email || "No email provided"}</p>
                  <p className="meta-line">{selectedCustomer.notes || "No notes yet"}</p>
                </div>

                <div className="detail-card">
                  <strong>Vehicles</strong>
                  {selectedCustomerVehicles.length === 0 ? (
                    <p className="workspace-note">No vehicles linked yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedCustomerVehicles.map((vehicle) => (
                        <article className="detail-item" key={vehicle.id}>
                          <h4>{vehicle.license_plate}</h4>
                          <p>
                            {vehicle.make} {vehicle.model}
                            {vehicle.year ? `, ${vehicle.year}` : ""}
                          </p>
                          {vehicle.vin ? <p className="meta-line">VIN: {vehicle.vin}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="detail-card">
                  <strong>Repairs And Tracking</strong>
                  {selectedCustomerRepairs.length === 0 ? (
                    <p className="workspace-note">No repairs linked to this customer yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedCustomerRepairs.map((repair) => (
                        <article className="detail-item" key={repair.id}>
                          <h4>{repair.vehicle_label}</h4>
                          <p>{repair.service_name}</p>
                          <div className="tracking-chip-row">
                            <span className={getRepairStatusClass(repair.status)}>{REPAIR_STATUS_LABELS[repair.status]}</span>
                          </div>
                          <div className="tracking-chip-row">
                            <span className="tracking-chip">Tracking: {repair.tracking_code}</span>
                            <button
                              type="button"
                              className="copy-chip"
                              aria-label={`Copy tracking code ${repair.tracking_code}`}
                              onClick={() => void handleCopyTrackingCode(repair.tracking_code)}
                            >
                              ⧉
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  function renderVehiclesSection() {
    return (
      <div className="workspace-stack vehicle-workspace">
        {renderStaffMobileTaskRail({
          title: "Vehicle flow",
          summary:
            visibleVehicles.length > 0
              ? `${visibleVehicles.length} vehicles ready for lookup and detail review.`
              : "Search the registry or create the next vehicle card.",
          searchValue: vehicleSearch,
          searchPlaceholder: "Search plate, owner, make, model or VIN",
          onSearchChange: setVehicleSearch,
          primaryActionLabel: "Add Vehicle",
          onPrimaryAction: openVehicleCreateModal,
        })}

        <div className="kanban-topbar section-desktop-topbar">
          <div>
            <p className="eyebrow">Registry</p>
            <h2>Vehicle List</h2>
            {sectionVehiclesCount > 0 ? (
              <span className="registry-count">{sectionVehiclesCount} total</span>
            ) : null}
          </div>
          <div className="workspace-top-actions">
            <label className="kanban-search">
              <input
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder="Search vehicles…"
                type="search"
              />
            </label>
            <button type="button" className="button" onClick={openVehicleCreateModal}>
              + Add Vehicle
            </button>
          </div>
        </div>

        <div className="vehicles-surface-stack">
          <StaffVehiclesMobileList
            vehicles={sectionVehicles}
            getVehicleDetails={getVehicleDetails}
            onOpenVehicle={openVehicleDetailModal}
          />

          <StaffVehiclesRegistry
            vehicles={sectionVehicles}
            getVehicleDetails={getVehicleDetails}
            onOpenVehicle={openVehicleDetailModal}
          />
        </div>

        {sectionVehiclesHasMore ? (
          <div className="load-more-bar">
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                void loadSectionVehicles(vehicleSearch, sectionVehiclesPage + 1, true)
              }
              disabled={sectionVehiclesLoading}
            >
              {sectionVehiclesLoading
                ? "Loading…"
                : `Load more (${sectionVehiclesCount - sectionVehicles.length} remaining)`}
            </button>
          </div>
        ) : null}

        {selectedVehicle ? (
          <div className="modal-overlay" role="presentation" onClick={closeVehicleDetailModal}>
            <section
              className="modal-card modal-card-large vehicle-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vehicle-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Vehicle Details</p>
                  <h3 id="vehicle-modal-title">{selectedVehicle.license_plate}</h3>
                </div>
                <div className="inline-actions">
                  {!isStaff && (
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        closeVehicleDetailModal();
                        openVehicleEditModal(selectedVehicle);
                      }}
                    >
                      Edit Vehicle
                    </button>
                  )}
                  {!isStaff && (
                    <button type="button" className="button button-danger" onClick={() => void handleVehicleDelete(selectedVehicle)}>
                      Delete Vehicle
                    </button>
                  )}
                  <button type="button" className="button button-secondary" onClick={closeVehicleDetailModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="customer-detail-stack vehicle-detail-stack">
                <StaffVehicleMobileDetail
                  vehicle={selectedVehicle}
                  vehicleDetails={getVehicleDetails(selectedVehicle)}
                  owner={selectedVehicleOwner}
                  repairs={selectedVehicleRepairs}
                  purchases={selectedVehiclePurchases}
                  formatCurrency={formatCurrency}
                  getRepairStatusClass={getRepairStatusClass}
                  repairStatusLabels={REPAIR_STATUS_LABELS}
                  onCopyTrackingCode={(trackingCode) => void handleCopyTrackingCode(trackingCode)}
                  onOpenRepairs={() => {
                    closeVehicleDetailModal();
                    onSelectSection("repairs");
                  }}
                  onClose={closeVehicleDetailModal}
                />

                <StaffVehicleDetailPanel
                  vehicle={selectedVehicle}
                  vehicleDetails={getVehicleDetails(selectedVehicle)}
                  owner={selectedVehicleOwner}
                  repairs={selectedVehicleRepairs}
                  purchases={selectedVehiclePurchases}
                  formatCurrency={formatCurrency}
                  getRepairStatusClass={getRepairStatusClass}
                  repairStatusLabels={REPAIR_STATUS_LABELS}
                  onCopyTrackingCode={(trackingCode) => void handleCopyTrackingCode(trackingCode)}
                />
              </div>
            </section>
          </div>
        ) : null}

        {isVehicleFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closeVehicleFormModal}>
            <section
              className="modal-card modal-card-large vehicle-form-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Vehicle Intake</p>
                  <h3>{editingVehicleId ? "Edit Vehicle" : "Register Vehicle"}</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeVehicleFormModal}>
                  Close
                </button>
              </div>

              <form className="stack-form vehicle-form-stack" onSubmit={handleVehicleSubmit}>

                {/* Owner field + inline customer creation */}
                <div className="inline-owner-block vehicle-form-section">
                  <div className="vehicle-form-section-header">
                    <div>
                      <p className="eyebrow">Owner</p>
                      <h4>Select Or Create Owner</h4>
                    </div>
                  </div>

                  <div className="inline-owner-header">
                    <label className="inline-owner-select">
                      <span>Owner</span>
                      <select
                        value={vehicleForm.customer_id}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, customer_id: event.target.value }))}
                        required={!isInlineCustomerOpen}
                      >
                        <option value="">Select existing customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.full_name} {customer.phone ? `· ${customer.phone}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={`button ${isInlineCustomerOpen ? "button-secondary" : "button-ghost"} inline-owner-toggle`}
                      onClick={() => {
                        setIsInlineCustomerOpen((open) => !open);
                        setInlineCustomerError("");
                      }}
                    >
                      {isInlineCustomerOpen ? "Cancel new owner" : "Need new owner?"}
                    </button>
                  </div>

                  {!isInlineCustomerOpen ? (
                    <p className="inline-owner-hint">
                      Use an existing owner first. Open the new-owner form only if this customer does not exist yet.
                    </p>
                  ) : null}

                  {isInlineCustomerOpen ? (
                    <div className="inline-customer-form inline-customer-form-expanded">
                      <p className="inline-customer-hint">Fill in the new customer — they'll be created and selected automatically.</p>
                      <div className="form-grid">
                        <label>
                          <span>Full Name</span>
                          <input
                            value={inlineCustomerForm.full_name}
                            onChange={(e) => setInlineCustomerForm((f) => ({ ...f, full_name: e.target.value }))}
                            placeholder="e.g. Anna Kowalska"
                            type="text"
                            required
                          />
                        </label>
                        <label>
                          <span>Phone</span>
                          <input
                            value={inlineCustomerForm.phone}
                            onChange={(e) => setInlineCustomerForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="e.g. +48 600 100 100"
                            type="tel"
                            pattern="[\+]?[0-9\s\-\(\)]{7,20}"
                            title="Enter a valid phone number (7–20 digits, spaces, dashes, + allowed)"
                            required
                          />
                        </label>
                      </div>
                      <label>
                        <span>Email <span className="field-hint" style={{ display: "inline" }}>(optional)</span></span>
                        <input
                          value={inlineCustomerForm.email}
                          onChange={(e) => setInlineCustomerForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="e.g. anna@example.com"
                          type="email"
                        />
                      </label>
                      {inlineCustomerError ? <p className="form-error">{inlineCustomerError}</p> : null}
                      <div className="form-actions inline-owner-actions">
                        <button type="button" className="button" disabled={isSavingInlineCustomer} onClick={() => void handleInlineCustomerSave()}>
                          {isSavingInlineCustomer ? "Creating…" : "Create & Select"}
                        </button>
                        <button type="button" className="button button-secondary" onClick={() => setIsInlineCustomerOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="vehicle-form-section">
                  <div className="vehicle-form-section-header">
                    <div>
                      <p className="eyebrow">Identity</p>
                      <h4>Core Vehicle Data</h4>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span>License Plate</span>
                      <input
                        value={vehicleForm.license_plate}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, license_plate: event.target.value }))}
                        placeholder="e.g. KR 2048A"
                        type="text"
                        required
                      />
                    </label>

                    <label>
                      <span>Year</span>
                      <select
                        value={vehicleForm.year}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, year: event.target.value }))}
                      >
                        <option value="">Select year</option>
                        {vehicleYearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span>Make</span>
                      <input
                        value={vehicleForm.make}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, make: event.target.value }))}
                        placeholder="e.g. Toyota"
                        type="text"
                        required
                      />
                    </label>

                    <label>
                      <span>Model</span>
                      <input
                        value={vehicleForm.model}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, model: event.target.value }))}
                        placeholder="e.g. Yaris"
                        type="text"
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="vehicle-form-section vehicle-form-section-secondary">
                  <div className="vehicle-form-section-header">
                    <div>
                      <p className="eyebrow">Specs</p>
                      <h4>Technical And Service Details</h4>
                    </div>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span>VIN <span className="field-hint" style={{ display: "inline" }}>(17 characters)</span></span>
                      <input
                        value={vehicleForm.vin}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, vin: event.target.value.toUpperCase() }))}
                        placeholder="e.g. JTNB1234567890001"
                        type="text"
                        maxLength={17}
                        pattern="[A-HJ-NPR-Z0-9]{17}"
                        title="VIN must be exactly 17 alphanumeric characters (no I, O, Q)"
                        style={{ textTransform: "uppercase" }}
                      />
                    </label>

                    <label>
                      <span>Color</span>
                      <input
                        value={vehicleForm.color}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, color: event.target.value }))}
                        placeholder="e.g. Silver"
                        type="text"
                      />
                    </label>
                  </div>

                  <div className="form-grid">
                    <label>
                      <span>Mileage <span className="field-hint" style={{ display: "inline" }}>km</span></span>
                      <input
                        value={vehicleForm.mileage}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, mileage: event.target.value }))}
                        placeholder="e.g. 78210"
                        type="number"
                        min="0"
                        step="1"
                      />
                    </label>

                    <label>
                      <span>Last Service Date</span>
                      <input
                        value={vehicleForm.last_service_date}
                        onChange={(event) => setVehicleForm((current) => ({ ...current, last_service_date: event.target.value }))}
                        type="date"
                      />
                    </label>
                  </div>

                  <label>
                    <span>Date Added</span>
                    <input
                      value={vehicleForm.added_date}
                      onChange={(event) => setVehicleForm((current) => ({ ...current, added_date: event.target.value }))}
                      type="date"
                    />
                    <small className="field-hint">Defaults to today on this device, but you can change it.</small>
                  </label>

                  <label>
                    <span>Notes</span>
                    <textarea
                      value={vehicleForm.notes}
                      onChange={(event) => setVehicleForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="e.g. Customer requests photo before any paint work"
                      rows={4}
                    />
                  </label>
                </div>

                {customers.length === 0 ? (
                  <p className="workspace-note">Create a customer first, then attach the vehicle.</p>
                ) : null}
                {vehicleError ? <p className="form-error">{vehicleError}</p> : null}

                <div className="form-actions vehicle-modal-actions">
                  <button type="submit" className="button" disabled={isSavingVehicle || customers.length === 0}>
                    {isSavingVehicle ? "Saving..." : editingVehicleId ? "Update Vehicle" : "Create Vehicle"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeVehicleFormModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  function renderRepairsPreview() {
    return (
      <div className="workspace-stack kanban-workspace repairs-workspace">
        {renderStaffMobileTaskRail({
          title: "Repair flow",
          summary:
            visibleRepairs.length > 0
              ? `${visibleRepairs.length} repairs ready for update, notes, and photo handling.`
              : "Create the next repair card or clear the search to reveal more jobs.",
          searchValue: repairSearch,
          searchPlaceholder: "Search owner, vehicle, service or tracking",
          onSearchChange: setRepairSearch,
          primaryActionLabel: "New Repair",
          onPrimaryAction: handleOpenRepairCreate,
        })}

        {/* Topbar */}
        <div className="kanban-topbar section-desktop-topbar">
          <div>
            <p className="eyebrow">Repairs</p>
            <h2>Kanban Board</h2>
          </div>
          <div className="workspace-top-actions">
            <label className="kanban-search">
              <input
                value={repairSearch}
                onChange={(event) => setRepairSearch(event.target.value)}
                placeholder="Search repairs…"
                type="search"
              />
            </label>
            <button type="button" className="button" onClick={handleOpenRepairCreate}>
              + New Repair
            </button>
          </div>
        </div>

        <div className="repairs-surface-stack">
          <StaffRepairsMobileList
            repairs={visibleRepairs}
            activeFilter={mobileRepairStatusFilter}
            onFilterChange={setMobileRepairStatusFilter}
            onOpenRepair={openRepairModal}
            onCopyTrackingCode={(trackingCode, event) => void handleCopyTrackingCode(trackingCode, event)}
          />

          <StaffRepairsKanban
            repairs={visibleRepairs}
            draggingRepairId={draggingRepairId}
            dragOverColumn={dragOverColumn}
            onCardDragStart={handleCardDragStart}
            onCardDragEnd={handleCardDragEnd}
            onColumnDragOver={handleColumnDragOver}
            onColumnDragLeave={handleColumnDragLeave}
            onColumnDrop={handleColumnDrop}
            onOpenRepair={openRepairModal}
            onCopyTrackingCode={(trackingCode, event) => void handleCopyTrackingCode(trackingCode, event)}
          />
        </div>

        {isRepairFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closeRepairCreateModal}>
            <section
              className="modal-card modal-card-large repair-form-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Repair Intake</p>
                  <h3>Create Repair</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeRepairCreateModal}>
                  Close
                </button>
              </div>

              <form className="stack-form repair-form-stack" onSubmit={handleRepairSubmit}>
                <label>
                  <span>Vehicle</span>
                  <select
                    value={repairForm.vehicle_id}
                    onChange={(event) => setRepairForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                    required
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} • {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Owner</span>
                  <input value={selectedRepairVehicle?.customer.full_name ?? ""} type="text" readOnly />
                </label>

                <label>
                  <span>Master</span>
                  {isAdmin ? (
                    <select
                      value={repairForm.master_id}
                      onChange={(event) => setRepairForm((current) => ({ ...current, master_id: event.target.value }))}
                      required
                    >
                      <option value="">Select master</option>
                      {staffUsers.map((master) => (
                        <option key={master.id} value={master.id}>
                          {getStaffUserLabel(master)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={getStaffUserLabel(staffUsers.find((m) => m.id === user?.id) ?? { id: 0, email: user?.email ?? "", first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", role: "staff" })}
                      readOnly
                    />
                  )}
                </label>

                <label>
                  <span>Service</span>
                  <select
                    value={repairForm.service_key}
                    onChange={(event) => setRepairForm((current) => ({ ...current, service_key: event.target.value }))}
                    required
                  >
                    <option value="">Select service</option>
                    {repairServiceOptions.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </label>

                {repairForm.service_key === customRepairServiceOption ? (
                  <label>
                    <span>Custom Service</span>
                    <input
                      value={repairForm.custom_service}
                      onChange={(event) =>
                        setRepairForm((current) => ({ ...current, custom_service: event.target.value }))
                      }
                      type="text"
                      placeholder="Write your own service"
                      required
                    />
                  </label>
                ) : null}

                <div className="form-grid">
                  <label>
                    <span>Status</span>
                    <select
                      value={repairForm.status}
                      onChange={(event) =>
                        setRepairForm((current) => ({
                          ...current,
                          status: event.target.value as RepairStatus,
                        }))
                      }
                    >
                      {Object.entries(REPAIR_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Before Repair Photos</span>
                    <input accept="image/*" capture="environment" multiple onChange={handleRepairPhotosChange} type="file" disabled title="Photo upload coming soon" />
                  </label>
                </div>

                {repairPhotoPreviews.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairPhotoPreviews.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="Before repair preview" />
                    ))}
                  </div>
                ) : null}

                <label>
                  <span>Issue Notes</span>
                  <textarea
                    value={repairForm.issue_notes}
                    onChange={(event) => setRepairForm((current) => ({ ...current, issue_notes: event.target.value }))}
                    rows={4}
                  />
                </label>

                {repairError ? <p className="form-error">{repairError}</p> : null}

                <div className="form-actions repair-modal-actions">
                  <button type="submit" className="button" disabled={isSavingRepair}>
                    {isSavingRepair ? "Saving..." : "Create Repair"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeRepairCreateModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {selectedRepair ? (
          <div className="modal-overlay" role="presentation" onClick={closeRepairModal}>
            <section
              className="modal-card repair-update-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="repair-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Repair Update</p>
                  <h3 id="repair-modal-title">{selectedRepair.vehicle_label}</h3>
                </div>
                <div className="inline-actions">
                  {!isStaff && (
                    <button
                      type="button"
                      className="button button-danger"
                      onClick={() => void handleRepairDelete(selectedRepair)}
                    >
                      Delete Repair
                    </button>
                  )}
                  <button type="button" className="button button-secondary" onClick={closeRepairModal}>
                    Close
                  </button>
                </div>
              </div>

              {/* ── Status Switcher ────────────────────────────── */}
              <div className="status-switcher">
                <span className="status-switcher-label">Status</span>
                <div className="status-switcher-options">
                  {REPAIR_KANBAN_COLUMNS.map(({ status, label }) => (
                    <button
                      key={status}
                      type="button"
                      className={`status-btn ${getRepairStatusClass(status)} ${repairModalStatus === status ? "status-btn-active" : ""}`}
                      onClick={() => setRepairModalStatus(status)}
                    >
                      <span className="status-btn-dot" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="customer-detail-stack repair-modal-sections">
                <div className="detail-card repair-info-card">
                  <strong>Repair Info</strong>
                  <div className="repair-info-stack">
                    <div className="repair-info-row">
                      <span className="repair-info-label">Owner</span>
                      <p>{selectedRepair.owner_name}</p>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Service</span>
                      <p>{selectedRepair.service_name}</p>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Tracking</span>
                      <div className="tracking-chip-row">
                        <span className="tracking-chip">{selectedRepair.tracking_code}</span>
                        <button
                          type="button"
                          className="copy-chip"
                          aria-label={`Copy tracking code ${selectedRepair.tracking_code}`}
                          onClick={() => void handleCopyTrackingCode(selectedRepair.tracking_code)}
                        >
                          ⧉
                        </button>
                      </div>
                    </div>
                    <div className="repair-info-row repair-info-row-block">
                      <span className="repair-info-label">Issue</span>
                      <p className="repair-info-issue">{selectedRepair.issue_notes}</p>
                    </div>
                  </div>
                </div>

                <label className="detail-card repair-status-field repair-modal-panel">
                  <span>Master</span>
                  {isStaff ? (
                    <p>{selectedRepair.master_name}</p>
                  ) : (
                    <select
                      value={repairModalMasterId}
                      onChange={(event) => setRepairModalMasterId(event.target.value)}
                    >
                      {staffUsers.map((master) => (
                        <option key={master.id} value={master.id}>
                          {getStaffUserLabel(master)}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="detail-card repair-status-field repair-modal-panel">
                  <span>Add Repair Note</span>
                  <textarea
                    value={repairModalNewNote}
                    onChange={(event) => setRepairModalNewNote(event.target.value)}
                    rows={4}
                  />
                </label>
                <div className="form-actions repair-note-actions">
                  <button type="button" className="button button-secondary" onClick={() => void handleRepairNoteAdd()}>
                    Add Note
                  </button>
                </div>

                <div className="detail-card repair-modal-panel">
                  <strong>Repair Notes History</strong>
                  {selectedRepair.repair_notes.length === 0 ? (
                    <p className="workspace-note">No repair notes yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedRepair.repair_notes.map((note) => (
                        <article className="detail-item" key={note.id}>
                          <div className="note-header">
                            <strong>{note.author_name}</strong>
                            <span className="meta-line">{formatDisplayDate(note.created_at)}</span>
                          </div>
                          <p className="meta-line">{note.author_email}</p>
                          <p>{note.text}</p>
                          {note.author_email === user?.email ? (
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => void handleRepairNoteDelete(note.id)}
                            >
                              Delete note
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <label className="detail-card repair-status-field repair-modal-panel">
                  <span>Photos Before Repair</span>
                  <input accept="image/*" capture="environment" multiple onChange={handleRepairBeforePhotosChange} type="file" disabled title="Photo upload coming soon" />
                </label>
                {repairBeforePhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairBeforePhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="Before repair preview" />
                    ))}
                  </div>
                ) : null}

                <label className="detail-card repair-status-field repair-modal-panel">
                  <span>Photos During Repair</span>
                  <input accept="image/*" capture="environment" multiple onChange={handleRepairDuringPhotosChange} type="file" disabled title="Photo upload coming soon" />
                </label>
                {repairDuringPhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairDuringPhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="During repair preview" />
                    ))}
                  </div>
                ) : null}

                <label className="detail-card repair-status-field repair-modal-panel">
                  <span>Photos After Repair</span>
                  <input accept="image/*" capture="environment" multiple onChange={handleRepairAfterPhotosChange} type="file" disabled title="Photo upload coming soon" />
                </label>
                {repairAfterPhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairAfterPhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="After repair preview" />
                    ))}
                  </div>
                ) : null}

                <div className="form-actions repair-modal-actions">
                  <button type="button" className="button" onClick={() => void handleRepairModalSave()}>
                    Save Repair Update
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeRepairModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  function renderPurchasesSection() {
    return (
      <div className="workspace-stack purchases-workspace">
        <div className="kanban-topbar section-desktop-topbar">
          <div>
            <p className="eyebrow">Ordered Parts</p>
            <h2>Purchase Registry</h2>
            {purchaseCount > 0 ? <span className="registry-count">{purchaseCount} total</span> : null}
          </div>
          <div className="workspace-top-actions">
            <label className="kanban-search">
              <input
                value={purchaseSearch}
                onChange={(event) => setPurchaseSearch(event.target.value)}
                placeholder="Search purchases…"
                type="search"
              />
            </label>
            <button type="button" className="button" onClick={openPurchaseCreateModal}>
              + Add Purchase
            </button>
          </div>
        </div>

        <div className="registry-list">
          {visiblePurchases.length === 0 ? (
            <p className="workspace-note">No purchases match the current filter.</p>
          ) : (
            visiblePurchases.map((entry) => {
              const purchaseTotal = entry.quantity * entry.purchase_price;
              const saleTotal = entry.quantity * entry.sale_price;
              return (
                <article className="registry-card purchase-card purchase-card-clickable" key={entry.id} onClick={() => openPurchaseDetailModal(entry)}>
                  <div className="purchase-card-body">
                    <div className="purchase-card-info">
                      <h4 className="purchase-card-name">{entry.part_name}</h4>
                      <p className="purchase-card-supplier">{entry.supplier_name}</p>
                      <div className="purchase-card-chips">
                        {entry.repair_code ? <span className="tag">{entry.repair_code}</span> : null}
                        {entry.vehicle_label ? <span className="purchase-chip-muted">{entry.vehicle_label}</span> : null}
                        {entry.invoice_url ? (
                          <button
                            className="purchase-chip-muted purchase-chip-link"
                            onClick={(e) => { e.stopPropagation(); handleOpenInvoice(entry.invoice_url); }}
                            title="Open invoice"
                          >
                            {entry.invoice_name || "Invoice"}
                          </button>
                        ) : entry.invoice_name ? (
                          <span className="purchase-chip-muted">{entry.invoice_name}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="purchase-card-financials">
                      <div className="purchase-financials-header">
                        <span className="tag">{formatDisplayDate(entry.order_date)}</span>
                        {entry.approximate_delivery_date ? (
                          <span className="purchase-delivery-date">→ {formatDisplayDate(entry.approximate_delivery_date)}</span>
                        ) : null}
                      </div>
                      <div className="purchase-financials-total">{formatCurrency(saleTotal)}</div>
                      <div className="purchase-financials-grid">
                        <span className="purchase-financials-label">Buy</span>
                        <span>{formatCurrency(purchaseTotal)}</span>
                        <span className="purchase-financials-label">Qty</span>
                        <span>×{entry.quantity}</span>
                        <span className="purchase-financials-label">Margin</span>
                        <span className={saleTotal - purchaseTotal >= 0 ? "purchase-margin-pos" : "purchase-margin-neg"}>
                          {saleTotal - purchaseTotal >= 0 ? "+" : ""}{formatCurrency(saleTotal - purchaseTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
          {purchaseHasMore ? (
            <div className="load-more-bar">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadMorePurchases()}
                disabled={purchaseLoadingMore}
              >
                {purchaseLoadingMore ? "Loading…" : `Load more (${purchaseCount - visiblePurchases.length} remaining)`}
              </button>
            </div>
          ) : null}
        </div>

        {selectedPurchase ? (
          <div className="modal-overlay" role="presentation" onClick={closePurchaseDetailModal}>
            <section
              className="modal-card modal-card-large"
              role="dialog"
              aria-modal="true"
              aria-labelledby="purchase-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Purchase Details</p>
                  <h3 id="purchase-modal-title">{selectedPurchase.part_name}</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closePurchaseDetailModal}>
                  Close
                </button>
              </div>

              <div className="customer-detail-stack">
                <div className="detail-card">
                  <strong>Purchase Info</strong>
                  <div className="stack-form">
                    <div className="form-grid">
                      <label>
                        <span>Order Date</span>
                        <input
                          value={purchaseModalForm.order_date}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, order_date: event.target.value }))
                          }
                          type="date"
                        />
                      </label>

                      <label>
                        <span>Approximate Delivery Date</span>
                        <input
                          value={purchaseModalForm.approximate_delivery_date}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, approximate_delivery_date: event.target.value }))
                          }
                          type="date"
                        />
                      </label>

                      <label>
                        <span>Supplier</span>
                        <div className="autocomplete-wrapper">
                          <input
                            value={purchaseModalForm.supplier_name}
                            onChange={(event) => handleModalSupplierInput(event.target.value)}
                            onFocus={() => setShowModalSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowModalSuggestions(false), 150)}
                            type="text"
                          />
                          {modalSupplierSuggestions.length > 0 && (
                            <ul className="autocomplete-dropdown">
                              {modalSupplierSuggestions.map((s) => (
                                <li key={s.id} onMouseDown={() => handleModalSupplierSelect(s)}>
                                  <span>{s.name}</span>
                                  {s.nip && <span className="autocomplete-nip">{s.nip}</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </label>

                      <label>
                        <span>NIP</span>
                        <input
                          value={purchaseModalForm.supplier_nip}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, supplier_nip: event.target.value }))
                          }
                          type="text"
                          placeholder="1234567890"
                        />
                      </label>
                    </div>

                    <label>
                      <span>Part</span>
                      <input
                        value={purchaseModalForm.part_name}
                        onChange={(event) =>
                          setPurchaseModalForm((current) => ({ ...current, part_name: event.target.value }))
                        }
                        type="text"
                      />
                    </label>

                    <label>
                      <span>Vehicle</span>
                      <select
                        value={purchaseModalForm.vehicle_id}
                        onChange={(event) =>
                          setPurchaseModalForm((current) => ({ ...current, vehicle_id: event.target.value }))
                        }
                      >
                        <option value="">Optional</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.license_plate} • {vehicle.make} {vehicle.model}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="form-grid">
                      <label>
                        <span>Quantity</span>
                        <input
                          value={purchaseModalForm.quantity}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, quantity: event.target.value }))
                          }
                          type="number"
                          min="1"
                          step="1"
                        />
                      </label>

                      <label>
                        <span>Tracking</span>
                        <input
                          value={purchaseModalForm.repair_code}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, repair_code: event.target.value }))
                          }
                          type="text"
                          placeholder="TOR-0000"
                        />
                      </label>
                    </div>

                    <div className="form-grid">
                      <label>
                        <span>Purchase Price</span>
                        <input
                          value={purchaseModalForm.purchase_price}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, purchase_price: event.target.value }))
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </label>

                      <label>
                        <span>Sale Price</span>
                        <input
                          value={purchaseModalForm.sale_price}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, sale_price: event.target.value }))
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <strong>Invoice</strong>
                  <div className="invoice-panel">
                    <div className="invoice-summary">
                      <div className="invoice-copy">
                        <span className="invoice-label">Supplier Document</span>
                        <p className="invoice-file-name">{purchaseModalInvoiceName || "No invoice attached yet"}</p>
                        <p className="invoice-file-note">
                          {purchaseModalInvoiceName
                            ? "This file is linked to the purchase and can be opened, replaced or removed."
                            : "Attach a supplier invoice, scan or photo for this purchase."}
                        </p>
                      </div>
                      <span
                        className={
                          purchaseModalInvoiceName ? "invoice-status invoice-status-attached" : "invoice-status invoice-status-empty"
                        }
                      >
                        {purchaseModalInvoiceName ? "Attached" : "Empty"}
                      </span>
                    </div>

                    <input
                      id="purchase-modal-invoice-input"
                      className="hidden-file-input"
                      accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                      onChange={handlePurchaseModalInvoiceChange}
                      type="file"
                    />

                    <div className="invoice-actions">
                      <label htmlFor="purchase-modal-invoice-input" className="purchase-inline-action purchase-inline-action-primary">
                        {purchaseModalInvoiceName ? "Replace Invoice" : "Attach Invoice"}
                      </label>

                      {purchaseModalInvoiceUrl ? (
                        <>
                          <button
                            type="button"
                            className="purchase-inline-action"
                            onClick={() => handleOpenInvoice(purchaseModalInvoiceUrl)}
                          >
                            Open Invoice
                          </button>
                          <button
                            type="button"
                            className="purchase-inline-action purchase-inline-action-danger"
                            onClick={handlePurchaseModalInvoiceRemove}
                          >
                            Remove Invoice
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {purchaseModalError ? <p className="form-error">{purchaseModalError}</p> : null}

                <div className="form-actions">
                  <button type="button" className="button" onClick={handlePurchaseModalSave}>
                    Save Purchase
                  </button>
                  <button type="button" className="button button-secondary" onClick={closePurchaseDetailModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {isPurchaseFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closePurchaseFormModal}>
            <section className="modal-card modal-card-large" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">New Purchase</p>
                  <h3>Add Ordered Part</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closePurchaseFormModal}>
                  Close
                </button>
              </div>

              <form className="stack-form" onSubmit={handlePurchaseSubmit}>
                <div className="form-grid">
                  <label>
                    <span>Order Date</span>
                    <input
                      value={purchaseForm.order_date}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, order_date: event.target.value }))
                      }
                      type="date"
                      required
                    />
                  </label>

                  <label>
                    <span>Approximate Delivery Date</span>
                    <input
                      value={purchaseForm.approximate_delivery_date}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, approximate_delivery_date: event.target.value }))
                      }
                      type="date"
                    />
                  </label>

                  <label>
                    <span>Supplier</span>
                    <div className="autocomplete-wrapper">
                      <input
                        value={purchaseForm.supplier_name}
                        onChange={(event) => handleCreateSupplierInput(event.target.value)}
                        onFocus={() => setShowCreateSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCreateSuggestions(false), 150)}
                        type="text"
                        placeholder="Supplier name"
                        required
                      />
                      {createSupplierSuggestions.length > 0 && (
                        <ul className="autocomplete-dropdown">
                          {createSupplierSuggestions.map((s) => (
                            <li key={s.id} onMouseDown={() => handleCreateSupplierSelect(s)}>
                              <span>{s.name}</span>
                              {s.nip && <span className="autocomplete-nip">{s.nip}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </label>

                  <label>
                    <span>NIP</span>
                    <input
                      value={purchaseForm.supplier_nip}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, supplier_nip: event.target.value }))
                      }
                      type="text"
                      placeholder="1234567890"
                    />
                  </label>
                </div>

                <label>
                  <span>Part</span>
                  <input
                    value={purchaseForm.part_name}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, part_name: event.target.value }))}
                    type="text"
                    placeholder="Part or consumable"
                    required
                  />
                </label>

                <label>
                  <span>Vehicle</span>
                  <select
                    value={purchaseForm.vehicle_id}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                  >
                    <option value="">Optional</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} • {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid">
                  <label>
                    <span>Quantity</span>
                    <input
                      value={purchaseForm.quantity}
                      onChange={(event) => setPurchaseForm((current) => ({ ...current, quantity: event.target.value }))}
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                  </label>

                  <label>
                    <span>Repair Code</span>
                    <input
                      value={purchaseForm.repair_code}
                      onChange={(event) => setPurchaseForm((current) => ({ ...current, repair_code: event.target.value }))}
                      type="text"
                      placeholder="TOR-0000"
                    />
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    <span>Purchase Price</span>
                    <input
                      value={purchaseForm.purchase_price}
                      onChange={(event) => setPurchaseForm((current) => ({ ...current, purchase_price: event.target.value }))}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </label>

                  <label>
                    <span>Sale Price</span>
                    <input
                      value={purchaseForm.sale_price}
                      onChange={(event) => setPurchaseForm((current) => ({ ...current, sale_price: event.target.value }))}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </label>
                </div>

                <label>
                  <span>Invoice</span>
                  <input accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={handlePurchaseInvoiceChange} type="file" />
                  {purchaseInvoiceName ? <small className="field-hint">Attached: {purchaseInvoiceName}</small> : null}
                </label>

                {purchaseError ? <p className="form-error">{purchaseError}</p> : null}

                <div className="form-actions">
                  <button type="submit" className="button" disabled={isSavingPurchase}>
                    {isSavingPurchase ? "Saving..." : "Add Purchase"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={closePurchaseFormModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  function closeInvitePanel() {
    setShowInviteForm(false);
    setInviteEmail("");
    setInviteFirstName("");
    setInviteLastName("");
    setInviteRole("staff");
    setInviteResult(null);
    setInviteError("");
    setInviteLoading(false);
    setInviteCopied(false);
  }

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    try {
      const result: InviteResponse = await createInvite(inviteEmail, inviteRole, inviteFirstName, inviteLastName);
      setInviteResult({ url: result.invite_url });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setInviteError(axiosError.response?.data?.detail ?? "Failed to send invite.");
    } finally {
      setInviteLoading(false);
    }
  }

  function handleCopyInviteLink(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }

  function renderUsersSection() {
    return (
      <div className="workspace-stack users-workspace">
        <div className="kanban-topbar">
          <div>
            <p className="section-eyebrow">Team</p>
            <h2>User Management</h2>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span className="registry-count">{allUsers.length} users</span>
            {isAdmin && (
              <button className="button" onClick={() => setShowInviteForm((v) => !v)}>
                + Invite User
              </button>
            )}
          </div>
        </div>

        {showInviteForm && isAdmin && (
          <div className="invite-panel">
            <div className="invite-panel-header">
              <strong>{inviteResult ? "Invite link created" : "Invite New User"}</strong>
              <button type="button" className="invite-panel-close" aria-label="Close" onClick={closeInvitePanel}>
                ×
              </button>
            </div>

            {inviteResult ? (
              <div className="invite-panel-body">
                <p className="invite-panel-label">Share this link with the user:</p>
                <div className="invite-link-box">{inviteResult.url}</div>
                <button
                  type="button"
                  className="button"
                  onClick={() => handleCopyInviteLink(inviteResult.url)}
                >
                  {inviteCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>
            ) : (
              <form className="invite-panel-body" onSubmit={handleInviteSubmit}>
                <div className="invite-name-row">
                  <input
                    type="text"
                    className="invite-email-input"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    autoComplete="off"
                    placeholder="First name"
                  />
                  <input
                    type="text"
                    className="invite-email-input"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    autoComplete="off"
                    placeholder="Last name"
                  />
                </div>
                <input
                  type="email"
                  className="invite-email-input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="Email address"
                />
                <div className="invite-role-toggle">
                  <button
                    type="button"
                    className={`invite-role-btn${inviteRole === "staff" ? " invite-role-btn-active" : ""}`}
                    onClick={() => setInviteRole("staff")}
                  >
                    Master
                  </button>
                  <button
                    type="button"
                    className={`invite-role-btn${inviteRole === "admin" ? " invite-role-btn-active" : ""}`}
                    onClick={() => setInviteRole("admin")}
                  >
                    Admin
                  </button>
                </div>
                {inviteError ? <p className="form-error" style={{ flex: "1 0 100%", margin: 0 }}>{inviteError}</p> : null}
                <button type="submit" className="button" disabled={inviteLoading}>
                  {inviteLoading ? "…" : "Send Invite"}
                </button>
              </form>
            )}
          </div>
        )}

        {usersLoading ? (
          <p className="section-empty">Loading...</p>
        ) : allUsers.length === 0 ? (
          <p className="section-empty">No users found.</p>
        ) : (
          <div className="registry-list users-list">
            {allUsers.map((u) => {
              const isRegistered = u.has_usable_password;
              const isCurrentUser = u.email === user?.email;
              return (
                <article key={u.id} className="registry-card user-card">
                  <div className="user-card-info">
                    {editingUserId === u.id ? (
                      <div className="user-edit-row">
                        <input
                          className="user-edit-input"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First name"
                          autoFocus
                        />
                        <input
                          className="user-edit-input"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last name"
                        />
                        <button className="button" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={() => void saveEditUser(u.id)}>Save</button>
                        <button className="button-secondary" style={{ padding: "0.4rem 0.7rem", fontSize: "0.82rem" }} onClick={cancelEditUser}>Cancel</button>
                      </div>
                    ) : (
                      <div className="user-card-name">
                        {u.first_name || u.last_name
                          ? `${u.first_name} ${u.last_name}`.trim()
                          : u.email}
                        {isCurrentUser && <span className="user-badge user-badge-you">You</span>}
                        {(isAdmin || isCurrentUser) && (
                          <button className="user-edit-btn" onClick={() => startEditUser(u)} title="Edit name" aria-label="Edit name">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                    {(u.first_name || u.last_name) && editingUserId !== u.id && (
                      <div className="user-card-email">{u.email}</div>
                    )}
                    <div className="user-card-meta">
                      <span className="user-badge" data-role={u.role}>{u.role}</span>
                      <span className={`user-badge ${isRegistered ? "user-badge-registered" : "user-badge-pending"}`}>
                        {isRegistered ? "Registered" : "Pending"}
                      </span>
                    </div>
                  </div>
                  {isAdmin && !isCurrentUser && (
                    <div className="user-card-actions">
                      <button
                        className="button-secondary"
                        onClick={() => handleResetUserPassword(u.id, u.email)}
                        title="Send a new invite / reset password link"
                      >
                        Reset Password
                      </button>
                      {resetLinkResult?.userId === u.id && (
                        <div className="invite-link-box">
                          <span className="invite-link-url">{resetLinkResult.url}</span>
                          <button
                            className={`icon-copy-btn${copiedResetUserId === u.id ? " icon-copy-btn-done" : ""}`}
                            onClick={() => {
                              void navigator.clipboard.writeText(resetLinkResult.url).then(() => {
                                setCopiedResetUserId(u.id);
                                setTimeout(() => setCopiedResetUserId(null), 2000);
                              });
                            }}
                            title={copiedResetUserId === u.id ? "Copied!" : "Copy link"}
                            aria-label="Copy invite link"
                          >
                            {copiedResetUserId === u.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderPrimaryAction() {
    switch (activeSection) {
      case "customers":
        return (
          <button type="button" className="button" onClick={() => onSelectSection("vehicles")}>
            Open Vehicles
          </button>
        );
      case "vehicles":
        return (
          <button type="button" className="button" onClick={() => onSelectSection("repairs")}>
            Open Repairs
          </button>
        );
      case "purchases":
        return (
          <button type="button" className="button" onClick={() => onSelectSection("users")}>
            Open Users
          </button>
        );
      default:
        return (
          <button type="button" className="button" onClick={() => onSelectSection("customers")}>
            Open Customers
          </button>
        );
    }
  }

  const currentSectionMeta = sectionMeta[activeSection];
  const showTopbar = !["dashboard", "customers", "vehicles", "repairs", "purchases", "users"].includes(activeSection);

  return (
    <div className="workspace">
      {showTopbar ? (
        <header className="workspace-topbar">
          <div>
            <p className="eyebrow">{currentSectionMeta.eyebrow}</p>
            <h2>{currentSectionMeta.title}</h2>
            <p className="workspace-copy">{currentSectionMeta.copy}</p>
          </div>
          <div className="workspace-top-actions">
            <button type="button" className="button button-secondary" onClick={() => void loadRegistries()}>
              Refresh Data
            </button>
            {renderPrimaryAction()}
          </div>
        </header>
      ) : null}

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {isLoading ? <p className="workspace-note">Loading registries...</p> : null}

      {activeSection === "dashboard" ? renderDashboard() : null}
      {activeSection === "customers" ? renderCustomersSection() : null}
      {activeSection === "vehicles" ? renderVehiclesSection() : null}
      {activeSection === "repairs" ? renderRepairsPreview() : null}
      {activeSection === "purchases" ? renderPurchasesSection() : null}
      {activeSection === "users" ? renderUsersSection() : null}

      {copyToast ? <div className="copy-toast">{copyToast}</div> : null}
    </div>
  );
}
