import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { StaffSection } from "../App";
import api from "../api/client";
import { exportRepairPdf, fetchStaffUsers, openRepairPdfForPreview, type StaffUser } from "../api/repairs";
import { PdfPreviewModal } from "../components/PdfPreviewModal";
import { createInvite, fetchUsers, resetInvite, updateUserName, type InviteResponse, type UserItem } from "../api/users";
import { fetchDashboardAnalytics, type DashboardAnalyticsResponse } from "../api/analytics";
import { fetchServices, type ServiceItem } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { usePurchases, type PurchaseEntry } from "../features/staff/hooks/usePurchases";
import { useRepairs, customRepairServiceOption, sanitizeImageUrl } from "../features/staff/hooks/useRepairs";
import { StaffRepairsMobileList } from "../features/staff/mobile/StaffRepairsMobileList";
import { StaffVehicleMobileDetail } from "../features/staff/mobile/StaffVehicleMobileDetail";
import { StaffVehiclesMobileList } from "../features/staff/mobile/StaffVehiclesMobileList";
import {
  getRepairStatusClass,
  REPAIR_KANBAN_COLUMNS,
  REPAIR_STATUS_LABELS,
  type RepairEntry,
  type RepairPartsSummary,
  type RepairStatus,
  type RepairStatusFilter,
} from "../features/staff/shared/repairs";
import {
  formatVehicleTitle,
  type Vehicle,
  type VehicleListGroup,
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
type DashboardTab = "moneyflow" | "service_board" | "warehouse";
type DashboardDateRange = {
  start_date: string;
  end_date: string;
};
type DashboardCalendarLane = {
  repair: RepairEntry;
  visibleStartDate: string;
  visibleEndDate: string;
  startColumn: number;
  span: number;
  isOverdue: boolean;
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

function formatIsoLocalDate(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalDateWithOffset(days: number): string {
  const base = new Date();
  const localDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  localDate.setDate(localDate.getDate() + days);
  return formatIsoLocalDate(localDate);
}

function getLocalTodayDate(): string {
  return getLocalDateWithOffset(0);
}

function getMoneyflowDefaultDateRange(): DashboardDateRange {
  return {
    start_date: getLocalDateWithOffset(-30),
    end_date: getLocalTodayDate(),
  };
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

function toIsoDateKey(value: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
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

function createIsoDateRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end || start > end) {
    return [];
  }

  const next: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    next.push(formatIsoLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return next;
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

function getRepairServiceSaleValue(serviceName: string, priceByName: Map<string, number>) {
  if (serviceName === customRepairServiceOption) {
    return 0;
  }
  return priceByName.get(serviceName) ?? 0;
}

const calendarWeekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const calendarMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

function parseIsoDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }

  return parsed;
}

function parsePurchaseDayStart(value: string): Date | null {
  const key = toIsoDateKey(value);
  return key ? parseIsoDate(key) : null;
}

function purchaseWeekMondayKey(orderDate: string): string {
  const d = parsePurchaseDayStart(orderDate);
  if (!d) {
    return "unknown";
  }
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dayNum = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

function isPurchaseDeliveryOverdue(approximateDeliveryDate: string): boolean {
  const d = parsePurchaseDayStart(approximateDeliveryDate);
  if (!d) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(d);
  delivery.setHours(0, 0, 0, 0);
  return delivery.getTime() < today.getTime();
}

function hasPurchaseInvoice(entry: Pick<PurchaseEntry, "invoice_name" | "invoice_url">): boolean {
  return Boolean(entry.invoice_name?.trim() || entry.invoice_url?.trim());
}

type PurchaseDisplayGroup = { key: string; label: string; entries: PurchaseEntry[] };

function formatDateInputValue(value: string): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());
  return `${day}-${month}-${year}`;
}

function parseDateInputValue(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const isoCandidate = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoCandidate) {
    return parseIsoDate(normalized) ? normalized : null;
  }

  const match = normalized.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return parseIsoDate(iso) ? iso : null;
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function getMonthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function isIsoDateWithinBounds(value: string, min?: string, max?: string): boolean {
  if (min && value < min) {
    return false;
  }
  if (max && value > max) {
    return false;
  }
  return true;
}

function getInitialCalendarMonth(value: string, min?: string, max?: string): Date {
  const candidate = parseIsoDate(value) ?? parseIsoDate(min ?? "") ?? parseIsoDate(max ?? "") ?? new Date();
  return getMonthStart(candidate);
}

function buildCalendarDays(visibleMonth: Date) {
  const firstDayOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const iso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    return {
      iso,
      label: String(date.getDate()),
      isCurrentMonth: date.getMonth() === visibleMonth.getMonth(),
    };
  });
}

type FriendlyDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function FriendlyDateInput({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = "dd-mm-yyyy",
}: FriendlyDateInputProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(formatDateInputValue(value));
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialCalendarMonth(value, min, max));

  useEffect(() => {
    setDraftValue(formatDateInputValue(value));
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      setVisibleMonth(getInitialCalendarMonth(value, min, max));
    }
  }, [isOpen, max, min, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setDraftValue(formatDateInputValue(value));
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setDraftValue(formatDateInputValue(value));
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [value]);

  const minMonth = min ? getMonthStart(parseIsoDate(min) ?? getInitialCalendarMonth(value, min, max)) : null;
  const maxMonth = max ? getMonthStart(parseIsoDate(max) ?? getInitialCalendarMonth(value, min, max)) : null;
  const canGoPrevMonth = !minMonth || getMonthIndex(visibleMonth) > getMonthIndex(minMonth);
  const canGoNextMonth = !maxMonth || getMonthIndex(visibleMonth) < getMonthIndex(maxMonth);
  const calendarDays = buildCalendarDays(visibleMonth);

  function commitDraft() {
    const normalized = parseDateInputValue(draftValue);
    if (normalized === "") {
      onChange("");
      setDraftValue("");
      return;
    }

    if (normalized && isIsoDateWithinBounds(normalized, min, max)) {
      onChange(normalized);
      setDraftValue(formatDateInputValue(normalized));
      return;
    }

    setDraftValue(formatDateInputValue(value));
  }

  return (
    <div className={`friendly-date ${isOpen ? "friendly-date-open" : ""}`} ref={rootRef}>
      <div className="friendly-date-input-wrap">
        <input
          id={inputId}
          className="friendly-date-input"
          value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onFocus={() => setIsOpen(true)}
      onClick={() => setIsOpen(true)}
      onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
          required={required}
          disabled={disabled}
        />
      </div>

      {isOpen ? (
        <div className="friendly-date-popover" role="dialog" aria-modal="false" aria-label="Calendar">
          <div className="friendly-date-header">
            <button
              type="button"
              className="friendly-date-nav"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              disabled={!canGoPrevMonth}
              aria-label="Previous month"
            >
              Prev
            </button>
            <strong>{calendarMonthFormatter.format(visibleMonth)}</strong>
            <button
              type="button"
              className="friendly-date-nav"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              disabled={!canGoNextMonth}
              aria-label="Next month"
            >
              Next
            </button>
          </div>

          <div className="friendly-date-weekdays" aria-hidden="true">
            {calendarWeekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="friendly-date-grid">
            {calendarDays.map((day) => {
              const isSelected = day.iso === value;
              const isDisabled = !isIsoDateWithinBounds(day.iso, min, max);
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={[
                    "friendly-date-day",
                    day.isCurrentMonth ? "" : "friendly-date-day-muted",
                    isSelected ? "friendly-date-day-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    onChange(day.iso);
                    setDraftValue(formatDateInputValue(day.iso));
                    setVisibleMonth(getMonthStart(parseIsoDate(day.iso) ?? visibleMonth));
                    setIsOpen(false);
                  }}
                  disabled={isDisabled}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
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
  const dashboardMoneyflowDatesInitialized = useRef(false);
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
  const [moneyflowDateRange, setMoneyflowDateRange] = useState<DashboardDateRange>(() => getMoneyflowDefaultDateRange());
  const [activeMoneyflowCalendarRepairId, setActiveMoneyflowCalendarRepairId] = useState<number | null>(null);
  const [serviceBoardDateRange, setServiceBoardDateRange] = useState<DashboardDateRange>({ start_date: "", end_date: "" });
  const [apiServices, setApiServices] = useState<ServiceItem[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [dashboardAnalyticsLoading, setDashboardAnalyticsLoading] = useState(false);
  const [dashboardAnalyticsError, setDashboardAnalyticsError] = useState("");
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
  const [repairPdfBlob, setRepairPdfBlob] = useState<Blob | null>(null);
  const [repairPdfLoading, setRepairPdfLoading] = useState(false);
  const [repairPdfExportBusy, setRepairPdfExportBusy] = useState(false);

  const deferredVehicleSearch = useDeferredValue(vehicleSearch);

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

  const [purchaseListView, setPurchaseListView] = useState<"cards" | "compact">("cards");
  const [purchaseGroupBy, setPurchaseGroupBy] = useState<"none" | "week" | "supplier">("none");
  const [purchaseSort, setPurchaseSort] = useState<
    "order_date_desc" | "order_date_asc" | "delivery_asc" | "delivery_desc" | "margin_desc" | "margin_asc"
  >("order_date_desc");
  const [purchaseDetailModalTab, setPurchaseDetailModalTab] = useState<"order" | "invoice">("order");

  const [vehicleListView, setVehicleListView] = useState<"cards" | "compact">("cards");
  const [vehicleGroupBy, setVehicleGroupBy] = useState<"none" | "owner">("none");
  const [vehicleSort, setVehicleSort] = useState<
    | "plate_asc"
    | "plate_desc"
    | "owner_asc"
    | "make_asc"
    | "added_desc"
    | "added_asc"
    | "service_desc"
    | "service_asc"
  >("plate_asc");

  useEffect(() => {
    if (selectedPurchaseId !== null) {
      setPurchaseDetailModalTab("order");
    }
  }, [selectedPurchaseId]);

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
    repairModalCompletedAt,
    setRepairModalCompletedAt,
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
    dragOverCardId,
    handleCardDragOver,
    handleCardDrop,
    handleCopyPortalLink,
    handleRegeneratePortalLink,
    markRepairPdfAvailable,
    repairModalEstimatedDate,
    setRepairModalEstimatedDate,
  } = useRepairs(vehicles, staffUsers, user?.role === "staff" ? user?.id : undefined);
  const currentUserLabel = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Unknown User";
  const repairServiceOptions = useMemo(
    () => [...apiServices.map((s) => s.name), customRepairServiceOption],
    [apiServices]
  );
  const servicePriceByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of apiServices) {
      if (s.price != null && s.price !== "") {
        const n = Number(s.price);
        if (!Number.isNaN(n)) {
          m.set(s.name, n);
        }
      }
    }
    return m;
  }, [apiServices]);
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
    if (activeSection === "dashboard") {
      if (!dashboardMoneyflowDatesInitialized.current) {
        dashboardMoneyflowDatesInitialized.current = true;
        setMoneyflowDateRange(getMoneyflowDefaultDateRange());
      }
    } else {
      dashboardMoneyflowDatesInitialized.current = false;
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "dashboard") {
      return;
    }
    const mfStart = moneyflowDateRange.start_date;
    const mfEnd = moneyflowDateRange.end_date;
    if (!mfStart || !mfEnd) {
      return;
    }
    const opStart = serviceBoardDateRange.start_date || mfStart;
    const opEnd = serviceBoardDateRange.end_date || mfEnd;
    let cancelled = false;
    setDashboardAnalyticsLoading(true);
    setDashboardAnalyticsError("");
    void fetchDashboardAnalytics({
      start_date: mfStart,
      end_date: mfEnd,
      operational_start_date: opStart,
      operational_end_date: opEnd,
    })
      .then((data) => {
        if (!cancelled) {
          setDashboardAnalytics(data);
          setDashboardAnalyticsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDashboardAnalytics(null);
          setDashboardAnalyticsLoading(false);
          setDashboardAnalyticsError(getErrorMessage(err, "Unable to load dashboard analytics."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeSection,
    moneyflowDateRange.start_date,
    moneyflowDateRange.end_date,
    serviceBoardDateRange.start_date,
    serviceBoardDateRange.end_date,
  ]);

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

  async function handleDownloadRepairPdf(repairId: number) {
    setRepairPdfLoading(true);
    try {
      const blob = await openRepairPdfForPreview(repairId);
      setRepairPdfBlob(blob);
      markRepairPdfAvailable(repairId);
    } catch {
      // silently ignore
    } finally {
      setRepairPdfLoading(false);
    }
  }

  async function handleExportNewRepairPdfVersion(repairId: number) {
    setRepairPdfExportBusy(true);
    try {
      const blob = await exportRepairPdf(repairId);
      setRepairPdfBlob(blob);
      markRepairPdfAvailable(repairId);
    } catch {
      // silently ignore
    } finally {
      setRepairPdfExportBusy(false);
    }
  }

  function handleCloseRepairModal() {
    setRepairPdfBlob(null);
    setRepairPdfLoading(false);
    closeRepairModal();
  }

  useEffect(() => {
    let ignore = false;

    void loadSectionVehicles(deferredVehicleSearch, 1, false, () => ignore);

    return () => {
      ignore = true;
    };
  }, [deferredVehicleSearch]);

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
        setRepairPdfBlob(null);
        setRepairPdfLoading(false);
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

  async function loadSectionVehicles(q: string, page: number, append: boolean, shouldIgnore?: () => boolean) {
    if (page === 1) setSectionVehiclesLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "50", page: String(page) });
      if (q.trim()) params.set("q", q.trim());
      const response = await api.get(`/vehicles/?${params.toString()}`);
      if (shouldIgnore?.()) {
        return;
      }
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
      if (!shouldIgnore?.()) {
        setSectionVehiclesLoading(false);
      }
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

  const [repairDateFilter, setRepairDateFilter] = useState<"7d" | "30d" | "90d" | "all">("all");

  const visibleRepairs = useMemo(() => {
    const cutoffDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const cutoff = repairDateFilter !== "all"
      ? new Date(Date.now() - cutoffDays[repairDateFilter] * 86_400_000)
      : null;

    return repairs.filter((repair) => {
      if (cutoff && new Date(repair.created_at) < cutoff) return false;
      const haystack =
        `${repair.created_at} ${repair.vehicle_label} ${repair.owner_name} ${repair.master_name} ${repair.service_name} ${repair.status} ${repair.tracking_code} ${repair.issue_notes} ${repair.repair_notes
          .map((note) => `${note.author_name} ${note.text}`)
          .join(" ")}`.toLowerCase();
      return haystack.includes(repairSearch.trim().toLowerCase());
    });
  }, [repairSearch, repairs, repairDateFilter]);

  const purchaseDisplayGroups = useMemo(() => {
    const rows = [...purchases];

    const margin = (e: PurchaseEntry) => e.quantity * (e.sale_price - e.purchase_price);
    const deliveryTs = (e: PurchaseEntry) => {
      const d = e.approximate_delivery_date?.trim();
      if (!d) {
        return Number.POSITIVE_INFINITY;
      }
      const parsed = parsePurchaseDayStart(d);
      if (!parsed) {
        return Number.POSITIVE_INFINITY;
      }
      return parsed.getTime();
    };
    const orderTs = (e: PurchaseEntry) => {
      const parsed = parsePurchaseDayStart(e.order_date);
      return parsed ? parsed.getTime() : 0;
    };

    rows.sort((a, b) => {
      switch (purchaseSort) {
        case "order_date_asc":
          return orderTs(a) - orderTs(b);
        case "order_date_desc":
          return orderTs(b) - orderTs(a);
        case "delivery_asc":
          return deliveryTs(a) - deliveryTs(b);
        case "delivery_desc":
          return deliveryTs(b) - deliveryTs(a);
        case "margin_asc":
          return margin(a) - margin(b);
        case "margin_desc":
          return margin(b) - margin(a);
        default:
          return 0;
      }
    });

    let groups: PurchaseDisplayGroup[];
    if (purchaseGroupBy === "none") {
      groups = [{ key: "all", label: "", entries: rows }];
    } else if (purchaseGroupBy === "supplier") {
      const map = new Map<string, PurchaseEntry[]>();
      for (const e of rows) {
        const k = e.supplier_name.trim() || "—";
        if (!map.has(k)) {
          map.set(k, []);
        }
        map.get(k)!.push(e);
      }
      groups = [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entries]) => ({ key, label: key, entries }));
    } else {
      const map = new Map<string, PurchaseEntry[]>();
      for (const e of rows) {
        const k = purchaseWeekMondayKey(e.order_date);
        if (!map.has(k)) {
          map.set(k, []);
        }
        map.get(k)!.push(e);
      }
      const keys = [...map.keys()].filter((k) => k !== "unknown").sort().reverse();
      if (map.has("unknown")) {
        keys.push("unknown");
      }
      groups = keys.map((key) => ({
        key,
        label: key === "unknown" ? "Unknown date" : `Week of ${formatDisplayDate(key)}`,
        entries: map.get(key)!,
      }));
    }

    return groups;
  }, [purchases, purchaseSort, purchaseGroupBy]);

  const vehicleDisplayGroups = useMemo((): VehicleListGroup[] => {
    const rows = [...sectionVehicles];
    const addedTs = (v: Vehicle) => {
      const raw = (vehicleUiDetails[v.id]?.added_date ?? v.added_date ?? "").trim();
      const parsed = parsePurchaseDayStart(raw);
      return parsed ? parsed.getTime() : 0;
    };
    const serviceTs = (v: Vehicle) => {
      const raw = (vehicleUiDetails[v.id]?.last_service_date ?? v.last_service_date ?? "").trim();
      const parsed = parsePurchaseDayStart(raw);
      return parsed ? parsed.getTime() : 0;
    };

    rows.sort((a, b) => {
      switch (vehicleSort) {
        case "plate_asc":
          return a.license_plate.localeCompare(b.license_plate, undefined, { sensitivity: "base" });
        case "plate_desc":
          return b.license_plate.localeCompare(a.license_plate, undefined, { sensitivity: "base" });
        case "owner_asc":
          return a.customer.full_name.localeCompare(b.customer.full_name, undefined, { sensitivity: "base" });
        case "make_asc":
          return formatVehicleTitle(a).localeCompare(formatVehicleTitle(b), undefined, { sensitivity: "base" });
        case "added_asc":
          return addedTs(a) - addedTs(b);
        case "added_desc":
          return addedTs(b) - addedTs(a);
        case "service_asc":
          return serviceTs(a) - serviceTs(b);
        case "service_desc":
          return serviceTs(b) - serviceTs(a);
        default:
          return 0;
      }
    });

    if (vehicleGroupBy === "none") {
      return [{ key: "all", label: "", vehicles: rows }];
    }

    const map = new Map<string, Vehicle[]>();
    for (const v of rows) {
      const k = v.customer.full_name.trim() || "—";
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k)!.push(v);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, grouped]) => ({ key, label: key, vehicles: grouped }));
  }, [sectionVehicles, vehicleSort, vehicleGroupBy, vehicleUiDetails]);

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
  const repairPartSummaries = useMemo(() => {
    const next: Record<string, RepairPartsSummary> = {};

    purchases.forEach((entry) => {
      const repairCode = entry.repair_code.trim();
      if (!repairCode) {
        return;
      }

      const current = next[repairCode] ?? { lineCount: 0, totalQuantity: 0, preview: [] };
      current.lineCount += 1;
      current.totalQuantity += entry.quantity;
      if (current.preview.length < 2) {
        current.preview.push(entry.part_name);
      }
      next[repairCode] = current;
    });

    return next;
  }, [purchases]);
  const selectedRepairPurchases = selectedRepair
    ? purchases.filter((entry) => entry.repair_code === selectedRepair.tracking_code)
    : [];
  const purchaseCreateRepairOptions = purchaseForm.vehicle_id
    ? repairs.filter((repair) => String(repair.vehicle_id) === purchaseForm.vehicle_id)
    : repairs;
  const purchaseModalRepairOptions = purchaseModalForm.vehicle_id
    ? repairs.filter((repair) => String(repair.vehicle_id) === purchaseModalForm.vehicle_id)
    : repairs;
  const filteredMoneyflowPurchases = useMemo(
    () =>
      purchases.filter((entry) =>
        isDateWithinRange(entry.order_date, moneyflowDateRange.start_date, moneyflowDateRange.end_date)
      ),
    [moneyflowDateRange.end_date, moneyflowDateRange.start_date, purchases]
  );
  const completedRepairsForServiceSales = useMemo(
    () =>
      repairs.filter(
        (repair) =>
          repair.status === "completed" &&
          isDateWithinRange(repair.completed_at, moneyflowDateRange.start_date, moneyflowDateRange.end_date)
      ),
    [moneyflowDateRange.end_date, moneyflowDateRange.start_date, repairs]
  );
  const completedRepairCodesInMoneyflowRange = useMemo(
    () => new Set(completedRepairsForServiceSales.map((repair) => repair.tracking_code)),
    [completedRepairsForServiceSales]
  );
  const moneyflowCalendarDays = useMemo(() => {
    const todayKey = getLocalTodayDate();
    return createIsoDateRange(moneyflowDateRange.start_date, moneyflowDateRange.end_date).map((date) => {
      const parsed = parseIsoDate(date);
      const weekdayIndex = parsed ? (parsed.getDay() + 6) % 7 : 0;
      return {
        date,
        dayNumber: parsed ? String(parsed.getDate()) : date.slice(-2),
        weekdayLabel: calendarWeekdayLabels[weekdayIndex] ?? "",
        isWeekend: weekdayIndex >= 5,
        isToday: date === todayKey,
      };
    });
  }, [moneyflowDateRange.end_date, moneyflowDateRange.start_date]);
  const moneyflowCalendarLanes = useMemo<DashboardCalendarLane[]>(() => {
    const rangeStart = moneyflowDateRange.start_date;
    const rangeEnd = moneyflowDateRange.end_date;
    if (!rangeStart || !rangeEnd || moneyflowCalendarDays.length === 0) {
      return [];
    }

    const dayIndexByDate = new Map(moneyflowCalendarDays.map((day, index) => [day.date, index]));
    const todayKey = getLocalTodayDate();
    const statusPriority: Record<RepairStatus, number> = {
      waiting_parts: 0,
      in_progress: 1,
      new: 2,
      completed: 3,
    };

    return repairs
      .filter((repair) => repair.status === "in_progress" || repair.status === "waiting_parts")
      .map((repair) => {
        const createdKey = toIsoDateKey(repair.created_at);
        if (!createdKey || createdKey > rangeEnd) {
          return null;
        }

        const visibleStartDate = createdKey < rangeStart ? rangeStart : createdKey;
        const visibleEndDate = rangeEnd;
        const startColumn = dayIndexByDate.get(visibleStartDate);
        const endColumn = dayIndexByDate.get(visibleEndDate);

        if (startColumn == null || endColumn == null || endColumn < startColumn) {
          return null;
        }

        const estimatedKey = toIsoDateKey(repair.estimated_date ?? "");
        return {
          repair,
          visibleStartDate,
          visibleEndDate,
          startColumn,
          span: endColumn - startColumn + 1,
          isOverdue: Boolean(estimatedKey && estimatedKey < todayKey),
        };
      })
      .filter((lane): lane is DashboardCalendarLane => lane !== null)
      .sort((left, right) => {
        const byStatus = statusPriority[left.repair.status] - statusPriority[right.repair.status];
        if (byStatus !== 0) {
          return byStatus;
        }
        return right.repair.updated_at.localeCompare(left.repair.updated_at);
      });
  }, [moneyflowCalendarDays, moneyflowDateRange.end_date, moneyflowDateRange.start_date, repairs]);
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
    () =>
      purchases.reduce(
        (sum, entry) =>
          entry.repair_code && completedRepairCodesInMoneyflowRange.has(entry.repair_code)
            ? sum + entry.sale_price * entry.quantity
            : sum,
        0
      ),
    [completedRepairCodesInMoneyflowRange, purchases]
  );
  const totalServiceSales = useMemo(
    () =>
      completedRepairsForServiceSales.reduce(
        (sum, repair) => sum + getRepairServiceSaleValue(repair.service_name, servicePriceByName),
        0
      ),
    [completedRepairsForServiceSales, servicePriceByName]
  );
  const projectedMargin = totalPartsSales - totalPurchaseCost;
  const activeMoneyflowCalendarLane =
    moneyflowCalendarLanes.find((lane) => lane.repair.id === activeMoneyflowCalendarRepairId) ??
    moneyflowCalendarLanes[0] ??
    null;
  useEffect(() => {
    if (moneyflowCalendarLanes.length === 0) {
      setActiveMoneyflowCalendarRepairId(null);
      return;
    }

    setActiveMoneyflowCalendarRepairId((current) =>
      current && moneyflowCalendarLanes.some((lane) => lane.repair.id === current)
        ? current
        : moneyflowCalendarLanes[0].repair.id
    );
  }, [moneyflowCalendarLanes]);
  const dashboardWorkerLoad = useMemo(
    () =>
      staffUsers.map((master) => {
        const masterLabel = getStaffUserLabel(master);
        const assignedRepairs = filteredServiceBoardRepairs.filter((repair) => Number(repair.master_id) === master.id);
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
  const dashboardTabs: Array<{ id: DashboardTab; label: string; shortLabel: string }> = [
    { id: "moneyflow", label: "MoneyFlow", shortLabel: "Money" },
    { id: "warehouse", label: "Warehouse", shortLabel: "Stock" },
    { id: "service_board", label: "ServiceBoard", shortLabel: "Jobs" },
  ];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatSignedCurrency(value: number) {
    return `${value > 0 ? "+" : ""}${formatCurrency(value)}`;
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
    const recentRepairs = [...filteredServiceBoardRepairs]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 5);
    const funnelStatuses: RepairStatus[] = ["new", "in_progress", "waiting_parts", "completed"];
    const opAnalytics = dashboardAnalytics?.operational;
    const activeWorkloadFromApi = opAnalytics?.active_workload_preview ?? [];
    const recentlyCreatedFromApi = opAnalytics?.recently_created_preview ?? [];
    const activeWorkloadRepairsFallback = [...activeRepairs].sort((left, right) =>
      right.updated_at.localeCompare(left.updated_at)
    );
    const pdfTotals = dashboardAnalytics?.pdf?.latest_act_totals;
    const serviceToActDelta = pdfTotals ? pdfTotals.labor_total - totalServiceSales : null;
    const partsToActDelta = pdfTotals ? pdfTotals.parts_client_total - totalPartsSales : null;
    const combinedLiveTotal = totalServiceSales + totalPartsSales;
    const combinedToActDelta = pdfTotals ? pdfTotals.document_total - combinedLiveTotal : null;
    const pdfLag = dashboardAnalytics?.pdf?.completed_to_first_export_lag_days ?? null;
    const pdfAnalytics = dashboardAnalytics?.pdf ?? null;
    const completedInRange = pdfAnalytics?.coverage.completed_in_range ?? 0;
    const missingActs = pdfAnalytics?.coverage.completed_without_pdf ?? 0;
    const repairsWithLatestAct = pdfAnalytics?.latest_act_totals.repairs_with_latest_act ?? 0;
    const coveragePercent =
      completedInRange > 0 ? Math.round((repairsWithLatestAct / completedInRange) * 100) : null;
    const coverageState =
      completedInRange === 0
        ? "empty"
        : repairsWithLatestAct === 0
          ? "missing"
          : repairsWithLatestAct === completedInRange
            ? "healthy"
            : "partial";
    const coverageStatusLabel =
      coverageState === "empty"
        ? "No completed repairs"
        : coverageState === "missing"
          ? "No act coverage"
          : coverageState === "healthy"
            ? "Fully covered"
            : "Partial coverage";
    const coverageHeroValue = coveragePercent == null ? "—" : `${coveragePercent}%`;
    const coverageHeroCopy =
      completedInRange === 0
        ? "No completed repairs in this period."
        : `${repairsWithLatestAct} of ${completedInRange} completed repairs have an act.`;
    const coverageHeroNote =
      completedInRange === 0
        ? "Pick a date range with completed work to review act coverage."
        : missingActs > 0
          ? `${missingActs} completed repairs are still waiting for their first act.`
          : "All completed repairs in this range already have an act.";
    const activeDateRange =
      activeDashboardTab === "service_board" ? serviceBoardDateRange : moneyflowDateRange;
    const updateActiveDateRange = (field: keyof DashboardDateRange, value: string) => {
      if (activeDashboardTab === "service_board") {
        setServiceBoardDateRange((current) => {
          if (field === "start_date") {
            return {
              start_date: value,
              end_date: current.end_date && value && current.end_date < value ? value : current.end_date,
            };
          }

          return {
            start_date: current.start_date && value && current.start_date > value ? value : current.start_date,
            end_date: value,
          };
        });
        return;
      }
      setMoneyflowDateRange((current) => {
        if (field === "start_date") {
          return {
            start_date: value,
            end_date: current.end_date && value && current.end_date < value ? value : current.end_date,
          };
        }

        return {
          start_date: current.start_date && value && current.start_date > value ? value : current.start_date,
          end_date: value,
        };
      });
    };
    const renderMetricComparison = (label: string, comparisonValue: number | null, deltaValue: number | null) => {
      if (comparisonValue == null || deltaValue == null) {
        return null;
      }

      return (
        <div className="dashboard-metric-comparison">
          <span className="dashboard-metric-comparison-label">{label}</span>
          <div className="dashboard-metric-comparison-values">
            <span>{formatCurrency(comparisonValue)}</span>
            <span
              className={`dashboard-metric-delta ${
                deltaValue > 0
                  ? "dashboard-metric-delta-positive"
                  : deltaValue < 0
                    ? "dashboard-metric-delta-negative"
                    : "dashboard-metric-delta-neutral"
              }`}
            >
              Δ {formatSignedCurrency(deltaValue)}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="workspace-stack dashboard-workspace">
        <section className="dashboard-shell">
          <div className="dashboard-shell-head">
            <div>
              <p className="eyebrow">Workshop Command</p>
              <h2>Operations Dashboard</h2>
              <p className="workspace-copy">
                Track purchases, revenue, PDF completion acts, and service load in one staff workspace.
              </p>
            </div>
          </div>

          <div className="dashboard-folder-tabs" role="tablist" aria-label="Dashboard tabs">
            {dashboardTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-label={tab.label}
                aria-selected={activeDashboardTab === tab.id}
                className={`dashboard-folder-tab ${activeDashboardTab === tab.id ? "dashboard-folder-tab-active" : ""}`}
                onClick={() => setActiveDashboardTab(tab.id)}
              >
                <span className="dashboard-folder-label">
                  <span className="dashboard-folder-label-long">{tab.label}</span>
                  <span className="dashboard-folder-label-short">{tab.shortLabel}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="dashboard-folder-panel">
            <div className="dashboard-date-bar">
              <label className="dashboard-date-field">
                <span>Start date</span>
                <FriendlyDateInput
                  value={activeDateRange.start_date}
                  onChange={(nextValue) => updateActiveDateRange("start_date", nextValue)}
                />
              </label>
              <label className="dashboard-date-field">
                <span>End date</span>
                <FriendlyDateInput
                  value={activeDateRange.end_date}
                  onChange={(nextValue) => updateActiveDateRange("end_date", nextValue)}
                />
              </label>
            </div>
            {dashboardAnalyticsLoading ? (
              <p className="workspace-note" aria-live="polite">
                Loading analytics…
              </p>
            ) : null}
            {dashboardAnalyticsError && !dashboardAnalyticsLoading ? (
              <p className="workspace-note" role="alert">
                {dashboardAnalyticsError}
              </p>
            ) : null}
            {activeDashboardTab === "moneyflow" ? (
              <div className="workspace-stack">
                <section className="dashboard-report-section dashboard-report-section-plan">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Planned movement</p>
                      <h3>Sales Plan</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Live estimate from the current service catalog and current purchase lines for repairs completed in
                    the selected period.
                  </p>

                  <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple">
                    <article className="metric-card metric-card-plan">
                      <span className="metric-label">Service sales (live)</span>
                      <strong>{formatCurrency(totalServiceSales)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.labor_total ?? null, serviceToActDelta)}
                      <p>From the service catalog API for the selected period.</p>
                    </article>
                    <article className="metric-card metric-card-plan">
                      <span className="metric-label">Parts sales (live)</span>
                      <strong>{formatCurrency(totalPartsSales)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.parts_client_total ?? null, partsToActDelta)}
                      <p>Purchase lines tied to repairs completed in the selected range.</p>
                    </article>
                    <article className="metric-card metric-card-accent">
                      <span className="metric-label">Combined live (services + parts)</span>
                      <strong>{formatCurrency(combinedLiveTotal)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.document_total ?? null, combinedToActDelta)}
                      <p>Live estimate: services plus parts resale for completed jobs in range.</p>
                    </article>
                  </div>
                </section>

                <section className="dashboard-report-section dashboard-report-section-fact">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Act coverage</p>
                      <h3>Acts Coverage</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Track how many completed repairs already have an exported act in the selected period.
                  </p>

                  {pdfAnalytics ? (
                    <div className="dashboard-report-stack">
                      <article className={`dashboard-fact-hero dashboard-fact-hero-${coverageState}`}>
                        <div className="dashboard-fact-hero-head">
                          <span className="dashboard-fact-pill-label">Coverage status</span>
                          <span className={`dashboard-fact-status dashboard-fact-status-${coverageState}`}>
                            {coverageStatusLabel}
                          </span>
                        </div>
                        <strong>{coverageHeroValue}</strong>
                        <p className="dashboard-fact-hero-copy">{coverageHeroCopy}</p>
                        <p className="dashboard-fact-hero-note">{coverageHeroNote}</p>
                      </article>

                      <div className="metric-grid dashboard-metric-grid dashboard-fact-metric-grid">
                        <article className="metric-card metric-card-fact">
                          <span className="metric-label">Missing acts</span>
                          <strong>{missingActs}</strong>
                          <p>Completed repairs still waiting for their first act.</p>
                        </article>
                        <article className="metric-card metric-card-fact">
                          <span className="metric-label">Median time to first act</span>
                          <strong>{pdfLag?.median != null ? `${pdfLag.median} d` : "—"}</strong>
                          <p>
                            {pdfLag?.sample_size
                              ? "From repair completion to first export."
                              : "No completed repairs with an exported act yet."}
                          </p>
                        </article>
                        <article className="metric-card metric-card-fact">
                          <span className="metric-label">Re-exported repairs</span>
                          <strong>{pdfAnalytics.completed_repairs_with_multiple_exports}</strong>
                          <p>Completed repairs with more than one stored act version.</p>
                        </article>
                      </div>
                      <p className="dashboard-fact-meta">
                        Act exports in period: <strong>{pdfAnalytics.exports_in_period}</strong>
                      </p>
                    </div>
                  ) : (
                    <p className="workspace-note">Billing analytics unavailable (check connection or sign-in).</p>
                  )}
                </section>

                <section className="panel dashboard-calendar-panel">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Operational Window</p>
                      <h3>Repair Calendar</h3>
                    </div>
                    <div className="hero-actions">
                      <button type="button" className="button button-secondary" onClick={() => onSelectSection("repairs")}>
                        Open Repairs
                      </button>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Live jobs from the selected date window. Bars start at repair creation and continue through the
                    visible range while the repair stays open. Hover, focus, or click a lane to inspect details fast.
                  </p>
                  <div className="moneyflow-series-toggle-row" role="list" aria-label="Repair calendar legend">
                    <span className="moneyflow-series-toggle moneyflow-series-toggle-active" role="listitem">
                      <span className="moneyflow-series-swatch dashboard-calendar-swatch-in-progress" />
                      <span>{REPAIR_STATUS_LABELS.in_progress}</span>
                    </span>
                    <span className="moneyflow-series-toggle moneyflow-series-toggle-active" role="listitem">
                      <span className="moneyflow-series-swatch dashboard-calendar-swatch-waiting" />
                      <span>{REPAIR_STATUS_LABELS.waiting_parts}</span>
                    </span>
                  </div>

                  {moneyflowCalendarDays.length === 0 ? (
                    <p className="workspace-note">Choose a valid dashboard date range to render the calendar.</p>
                  ) : null}

                  {moneyflowCalendarDays.length > 0 && moneyflowCalendarLanes.length === 0 ? (
                    <p className="workspace-note">
                      No repairs currently in progress or waiting for parts inside this date window.
                    </p>
                  ) : null}

                  {moneyflowCalendarDays.length > 0 && moneyflowCalendarLanes.length > 0 ? (
                    <>
                      <div className="dashboard-calendar-shell" data-no-swipe-nav>
                        <div className="dashboard-calendar-header">
                          <div className="dashboard-calendar-label-spacer">Repair</div>
                          <div
                            className="dashboard-calendar-day-grid"
                            style={{
                              gridTemplateColumns: `repeat(${moneyflowCalendarDays.length}, minmax(2.75rem, 1fr))`,
                            }}
                          >
                            {moneyflowCalendarDays.map((day) => (
                              <div
                                key={`calendar-head-${day.date}`}
                                className={`dashboard-calendar-day-cell ${
                                  day.isWeekend ? "dashboard-calendar-day-cell-weekend" : ""
                                } ${day.isToday ? "dashboard-calendar-day-cell-today" : ""}`}
                              >
                                <span>{day.weekdayLabel}</span>
                                <strong>{day.dayNumber}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="dashboard-calendar-rows">
                          {moneyflowCalendarLanes.map((lane) => {
                            const isActive = activeMoneyflowCalendarLane?.repair.id === lane.repair.id;
                            const masterLabel = lane.repair.master_name || "Unassigned";

                            return (
                              <div className="dashboard-calendar-row" key={`moneyflow-calendar-${lane.repair.id}`}>
                                <button
                                  type="button"
                                  className={`dashboard-calendar-row-label ${isActive ? "dashboard-calendar-row-label-active" : ""}`}
                                  aria-label={`Open repair ${lane.repair.tracking_code}`}
                                  onMouseEnter={() => setActiveMoneyflowCalendarRepairId(lane.repair.id)}
                                  onFocus={() => setActiveMoneyflowCalendarRepairId(lane.repair.id)}
                                  onClick={() => openRepairModal(lane.repair)}
                                >
                                  <strong>{lane.repair.tracking_code}</strong>
                                  <span>{lane.repair.vehicle_label}</span>
                                  <span className="dashboard-calendar-row-meta">
                                    {REPAIR_STATUS_LABELS[lane.repair.status]} • {masterLabel}
                                  </span>
                                </button>

                                <div
                                  className="dashboard-calendar-lane-grid"
                                  style={{
                                    gridTemplateColumns: `repeat(${moneyflowCalendarDays.length}, minmax(2.75rem, 1fr))`,
                                  }}
                                >
                                  {moneyflowCalendarDays.map((day) => (
                                    <span
                                      key={`calendar-cell-${lane.repair.id}-${day.date}`}
                                      className={`dashboard-calendar-lane-cell ${
                                        day.isWeekend ? "dashboard-calendar-lane-cell-weekend" : ""
                                      } ${day.isToday ? "dashboard-calendar-lane-cell-today" : ""}`}
                                    />
                                  ))}
                                  <button
                                    type="button"
                                    className={`dashboard-calendar-bar dashboard-calendar-bar-${lane.repair.status} ${
                                      lane.isOverdue ? "dashboard-calendar-bar-overdue" : ""
                                    } ${isActive ? "dashboard-calendar-bar-active" : ""}`}
                                    style={{ gridColumn: `${lane.startColumn + 1} / span ${lane.span}`, gridRow: 1 }}
                                    aria-label={`Open repair ${lane.repair.tracking_code}`}
                                    onMouseEnter={() => setActiveMoneyflowCalendarRepairId(lane.repair.id)}
                                    onFocus={() => setActiveMoneyflowCalendarRepairId(lane.repair.id)}
                                    onClick={() => openRepairModal(lane.repair)}
                                  >
                                    <span>{lane.repair.tracking_code}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <section className="dashboard-calendar-detail" aria-live="polite">
                        {activeMoneyflowCalendarLane ? (
                          <>
                            <div className="dashboard-calendar-detail-copy">
                              <p className="eyebrow">Selected repair</p>
                              <h4>
                                {activeMoneyflowCalendarLane.repair.tracking_code} •{" "}
                                {activeMoneyflowCalendarLane.repair.vehicle_label}
                              </h4>
                              <p>{activeMoneyflowCalendarLane.repair.service_name}</p>
                              <p className="meta-line">
                                {activeMoneyflowCalendarLane.repair.issue_notes || "No issue notes provided."}
                              </p>
                            </div>
                            <div className="dashboard-calendar-detail-meta">
                              <span className={getRepairStatusClass(activeMoneyflowCalendarLane.repair.status)}>
                                {REPAIR_STATUS_LABELS[activeMoneyflowCalendarLane.repair.status]}
                              </span>
                              {activeMoneyflowCalendarLane.isOverdue ? <span className="tag">ETA overdue</span> : null}
                              <span className="tag">
                                Visible {formatDisplayDate(activeMoneyflowCalendarLane.visibleStartDate)} -&gt;{" "}
                                {formatDisplayDate(activeMoneyflowCalendarLane.visibleEndDate)}
                              </span>
                              <span className="tag">
                                Master {activeMoneyflowCalendarLane.repair.master_name || "Unassigned"}
                              </span>
                              <span className="tag">
                                Created {formatDisplayDate(activeMoneyflowCalendarLane.repair.created_at)}
                              </span>
                              {activeMoneyflowCalendarLane.repair.estimated_date ? (
                                <span className="tag">
                                  ETA {formatDisplayDate(activeMoneyflowCalendarLane.repair.estimated_date)}
                                </span>
                              ) : null}
                            </div>
                            <div className="hero-actions">
                              <button
                                type="button"
                                className="button"
                                onClick={() => openRepairModal(activeMoneyflowCalendarLane.repair)}
                              >
                                Open Repair
                              </button>
                              <button
                                type="button"
                                className="button button-secondary"
                                onClick={() => onSelectSection("repairs")}
                              >
                                Go To Repairs Tab
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="workspace-note">Hover or focus a repair lane to inspect the job details.</p>
                        )}
                      </section>
                    </>
                  ) : null}
                </section>
              </div>
            ) : null}

            {activeDashboardTab === "warehouse" ? (
              <div className="workspace-stack">
                <section className="dashboard-report-section dashboard-report-section-warehouse">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Mini stock</p>
                      <h3>Parts Results</h3>
                    </div>
                  </div>

                  <p className="workspace-copy">
                    Purchase movement and resale view for the same date range as MoneyFlow, grouped as a lightweight
                    warehouse workspace.
                  </p>

                  <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple">
                    <article className="metric-card metric-card-warehouse">
                      <span className="metric-label">Purchase spend</span>
                      <strong>{formatCurrency(totalPurchaseCost)}</strong>
                      <p>Sum of purchase orders by order date in the period.</p>
                    </article>
                    <article className="metric-card metric-card-warehouse">
                      <span className="metric-label">Parts sales to client</span>
                      <strong>{formatCurrency(totalPartsSales)}</strong>
                      <p>Purchase lines tied to completed repairs in range.</p>
                    </article>
                    <article className="metric-card metric-card-warehouse">
                      <span className="metric-label">Parts margin</span>
                      <strong>{formatCurrency(projectedMargin)}</strong>
                      <p>Parts sales minus purchase spend in the period.</p>
                    </article>
                  </div>
                </section>

                <section className="dashboard-report-section">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Purchasing</p>
                      <h3>Top suppliers by spend</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Sum of <code>purchase price × quantity</code> by order date in the selected range (same window as
                    the MoneyFlow tab).
                  </p>
                  {dashboardAnalytics?.moneyflow?.supplier_spend_top?.length ? (
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Supplier</th>
                          <th>Lines</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardAnalytics.moneyflow.supplier_spend_top.map((row) => (
                          <tr key={`${row.supplier_id}-${row.supplier_name}`}>
                            <td>{row.supplier_name || `ID ${row.supplier_id}`}</td>
                            <td>{row.line_count}</td>
                            <td>{formatCurrency(row.total_spend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="workspace-note">No purchases in this period.</p>
                  )}
                </section>

                <section className="dashboard-report-section">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Data quality</p>
                      <h3>Unlinked purchases</h3>
                    </div>
                  </div>
                  <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple">
                    <article className="metric-card">
                      <span className="metric-label">Lines without repair_code</span>
                      <strong>{dashboardAnalytics?.moneyflow?.purchases_unlinked.count ?? "—"}</strong>
                      <p>Orders in range with no repair code.</p>
                    </article>
                    <article className="metric-card">
                      <span className="metric-label">Unlinked spend</span>
                      <strong>
                        {dashboardAnalytics?.moneyflow
                          ? formatCurrency(dashboardAnalytics.moneyflow.purchases_unlinked.total_spend)
                          : "—"}
                      </strong>
                      <p>Same date range as MoneyFlow.</p>
                    </article>
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

                {opAnalytics ? (
                  <section className="dashboard-report-section">
                    <div className="metric-grid metric-grid-three">
                      <article className="metric-card">
                        <span className="metric-label">Median cycle time</span>
                        <strong>
                          {opAnalytics.cycle_time_days.median != null
                            ? `${opAnalytics.cycle_time_days.median} d`
                            : "—"}
                        </strong>
                        <p>Create → complete for jobs finished in the ServiceBoard date range.</p>
                      </article>
                      <article className="metric-card">
                        <span className="metric-label">Cycle p90</span>
                        <strong>
                          {opAnalytics.cycle_time_days.p90 != null ? `${opAnalytics.cycle_time_days.p90} d` : "—"}
                        </strong>
                        <p>Sample: {opAnalytics.cycle_time_days.sample_completed_in_range} completed.</p>
                      </article>
                      <article className="metric-card">
                        <span className="metric-label">Created in range</span>
                        <strong>{opAnalytics.repairs_created_in_range}</strong>
                        <p>Repairs with created date inside the ServiceBoard period.</p>
                      </article>
                    </div>
                    <p className="eyebrow" style={{ marginTop: "0.75rem" }}>
                      Status funnel (created in period)
                    </p>
                    <div className="moneyflow-series-toggle-row" role="list">
                      {funnelStatuses.map((status) => (
                        <span key={status} className="moneyflow-series-toggle moneyflow-series-toggle-active" role="listitem">
                          <span>{REPAIR_STATUS_LABELS[status]}</span>
                          <span className="moneyflow-series-state">{opAnalytics.funnel_by_status[status] ?? 0}</span>
                        </span>
                      ))}
                    </div>
                  </section>
                ) : (
                  <p className="workspace-note">Operational analytics unavailable for this range.</p>
                )}

                <section className="panel dashboard-mini-panel">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">Repair Flow</p>
                      <h3>Active workload</h3>
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
                  <p className="workspace-copy">
                    Non-completed jobs in the ServiceBoard period, ordered by last update (server) or the same filter
                    client-side if offline.
                  </p>
                  <div className="dashboard-inline-list">
                    {activeWorkloadFromApi.length === 0 && activeWorkloadRepairsFallback.length === 0 ? (
                      <p className="workspace-note">No active jobs in this period.</p>
                    ) : null}
                    {activeWorkloadFromApi.length > 0
                      ? activeWorkloadFromApi.map((row) => (
                          <article className="dashboard-inline-card" key={`api-active-${row.id}`}>
                            <div>
                              <h4>{row.service_name}</h4>
                              <p>{row.vehicle_label}</p>
                            </div>
                            <div className="dashboard-inline-meta">
                              <span className={getRepairStatusClass(row.status as RepairStatus)}>
                                {REPAIR_STATUS_LABELS[row.status as RepairStatus]}
                              </span>
                              <p>{row.tracking_code}</p>
                            </div>
                          </article>
                        ))
                      : activeWorkloadRepairsFallback.map((repair) => (
                          <article className="dashboard-inline-card" key={`local-active-${repair.id}`}>
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
                      <p className="eyebrow">Intake</p>
                      <h3>Recently created</h3>
                    </div>
                  </div>
                  <div className="dashboard-inline-list">
                    {recentlyCreatedFromApi.length === 0 && recentRepairs.length === 0 ? (
                      <p className="workspace-note">No repair jobs inside this period.</p>
                    ) : null}
                    {recentlyCreatedFromApi.length > 0
                      ? recentlyCreatedFromApi.map((row) => (
                          <article className="dashboard-inline-card" key={`api-recent-${row.id}`}>
                            <div>
                              <h4>{row.service_name}</h4>
                              <p>{row.vehicle_label}</p>
                            </div>
                            <div className="dashboard-inline-meta">
                              <span className={getRepairStatusClass(row.status as RepairStatus)}>
                                {REPAIR_STATUS_LABELS[row.status as RepairStatus]}
                              </span>
                              <p>{row.tracking_code}</p>
                            </div>
                          </article>
                        ))
                      : recentRepairs.map((repair) => (
                          <article className="dashboard-inline-card" key={`local-recent-${repair.id}`}>
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
    const meta = sectionMeta.vehicles;
    const emptyServerList = sectionVehicles.length === 0;
    const loadedRemaining = Math.max(0, sectionVehiclesCount - sectionVehicles.length);

    return (
      <div className="workspace-stack vehicles-workspace">
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

        <div
          className={`kanban-topbar purchases-section-topbar vehicles-section-topbar${
            isStaff ? " vehicles-section-topbar--staff-mobile-skip" : ""
          }`}
        >
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2>{meta.title}</h2>
            {sectionVehiclesCount > 0 ? (
              <span className="registry-count">
                {sectionVehiclesCount} total
                {sectionVehicles.length !== sectionVehiclesCount ? ` · ${sectionVehicles.length} loaded` : ""}
              </span>
            ) : null}
          </div>
          <div className="workspace-top-actions purchases-top-actions vehicles-top-actions">
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

        <div className="kanban-topbar purchases-controls-bar">
          <div className="purchases-controls-cluster" role="group" aria-label="List layout">
            <button
              type="button"
              className={vehicleListView === "cards" ? "purchases-seg purchases-seg-active" : "purchases-seg"}
              onClick={() => setVehicleListView("cards")}
            >
              Cards
            </button>
            <button
              type="button"
              className={vehicleListView === "compact" ? "purchases-seg purchases-seg-active" : "purchases-seg"}
              onClick={() => setVehicleListView("compact")}
            >
              Compact
            </button>
          </div>
          <div className="purchases-controls-selects">
            <select
              className="purchases-inline-select"
              value={vehicleSort}
              aria-label="Sort list"
              onChange={(event) =>
                setVehicleSort(
                  event.target.value as
                    | "plate_asc"
                    | "plate_desc"
                    | "owner_asc"
                    | "make_asc"
                    | "added_desc"
                    | "added_asc"
                    | "service_desc"
                    | "service_asc"
                )
              }
            >
              <option value="plate_asc">License plate A–Z</option>
              <option value="plate_desc">License plate Z–A</option>
              <option value="owner_asc">Owner name A–Z</option>
              <option value="make_asc">Make and model A–Z</option>
              <option value="added_desc">Newest added</option>
              <option value="added_asc">Oldest added</option>
              <option value="service_desc">Latest service</option>
              <option value="service_asc">Earliest service</option>
            </select>
            <select
              className="purchases-inline-select"
              value={vehicleGroupBy}
              aria-label="Group list"
              onChange={(event) => setVehicleGroupBy(event.target.value as "none" | "owner")}
            >
              <option value="none">No grouping</option>
              <option value="owner">By owner</option>
            </select>
          </div>
        </div>
        <p className="purchases-controls-footnote">
          Sort and grouping apply to loaded rows only — use search to change what the server returns.
        </p>

        <div className="purchases-list-outer">
          {emptyServerList ? (
            <div className="purchases-empty-panel">
              <p className="workspace-note">
                {vehicleSearch.trim() ? "No vehicles match your search." : "No vehicles yet."}
              </p>
              {!vehicleSearch.trim() ? (
                <>
                  <p className="workspace-note purchases-empty-copy">{meta.copy}</p>
                  <button type="button" className="button" onClick={openVehicleCreateModal}>
                    + Add Vehicle
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <StaffVehiclesMobileList
                groups={vehicleDisplayGroups}
                layout={vehicleListView}
                getVehicleDetails={getVehicleDetails}
                onOpenVehicle={openVehicleDetailModal}
              />

              <StaffVehiclesRegistry
                groups={vehicleDisplayGroups}
                layout={vehicleListView}
                getVehicleDetails={getVehicleDetails}
                onOpenVehicle={openVehicleDetailModal}
              />
            </>
          )}
          {sectionVehiclesHasMore && !emptyServerList ? (
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
                  : `Load more (${loadedRemaining} remaining)`}
              </button>
            </div>
          ) : null}
        </div>

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
                {!isStaff && (
                  <div className="inline-actions">
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
                    <button type="button" className="button button-danger" onClick={() => void handleVehicleDelete(selectedVehicle)}>
                      Delete Vehicle
                    </button>
                  </div>
                )}
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
                  onOpenRepairs={() => {
                    closeVehicleDetailModal();
                    onSelectSection("repairs");
                  }}
                />

                <StaffVehicleDetailPanel
                  vehicleId={selectedVehicle.id}
                  vehicle={selectedVehicle}
                  vehicleDetails={getVehicleDetails(selectedVehicle)}
                  owner={selectedVehicleOwner}
                  repairs={selectedVehicleRepairs}
                  purchases={selectedVehiclePurchases}
                  formatCurrency={formatCurrency}
                  getRepairStatusClass={getRepairStatusClass}
                  repairStatusLabels={REPAIR_STATUS_LABELS}
                />
              </div>

              <div className="form-actions vehicle-modal-actions">
                <button type="button" className="button button-secondary" onClick={closeVehicleDetailModal}>
                  Cancel
                </button>
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
                      <FriendlyDateInput
                        value={vehicleForm.last_service_date}
                        onChange={(nextValue) => setVehicleForm((current) => ({ ...current, last_service_date: nextValue }))}
                      />
                    </label>
                  </div>

                  <label>
                    <span>Date Added</span>
                    <FriendlyDateInput
                      value={vehicleForm.added_date}
                      onChange={(nextValue) => setVehicleForm((current) => ({ ...current, added_date: nextValue }))}
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
            <div className="kanban-date-filter">
              {(["7d", "30d", "90d", "all"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`kanban-date-chip${repairDateFilter === opt ? " active" : ""}`}
                  onClick={() => setRepairDateFilter(opt)}
                >
                  {opt === "7d" ? "7 days" : opt === "30d" ? "30 days" : opt === "90d" ? "90 days" : "All time"}
                </button>
              ))}
            </div>
            <label className="kanban-search">
              <input
                value={repairSearch}
                onChange={(event) => setRepairSearch(event.target.value)}
                placeholder="Search repairs…"
                type="search"
              />
            </label>
            <button type="button" className="button button-sm" onClick={handleOpenRepairCreate}>
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
            repairPartSummaries={repairPartSummaries}
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
            dragOverCardId={dragOverCardId}
            onCardDragOver={handleCardDragOver}
            onCardDrop={handleCardDrop}
            onOpenRepair={openRepairModal}
            repairPartSummaries={repairPartSummaries}
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
                      // lgtm[js/xss-through-dom] -- sanitizeImageUrl enforces protocol allowlist (blob:/https:/http:/); blob: URLs are browser-generated via URL.createObjectURL
                      <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="Before repair preview" />
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
          <div className="modal-overlay" role="presentation" onClick={handleCloseRepairModal}>
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
                {(selectedRepair.status === "completed" || !isStaff) && (
                  <div className="inline-actions">
                    {selectedRepair.status === "completed" && (
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={repairPdfLoading}
                        onClick={() => void handleDownloadRepairPdf(selectedRepair.id)}
                      >
                        {repairPdfLoading ? "Loading…" : selectedRepair.has_pdf ? "View PDF" : "Make Act"}
                      </button>
                    )}
                    {!isStaff && (
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => void handleRepairDelete(selectedRepair)}
                      >
                        Delete Repair
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Status Switcher ────────────────────────────── */}
              <div className="status-switcher">
                <span className="status-switcher-label">Status</span>
                <div className="status-switcher-options status-switcher-options-stacked">
                  <div className="status-switcher-row">
                    {REPAIR_KANBAN_COLUMNS.filter((col) => col.status === "new" || col.status === "in_progress").map(({ status, label }) => (
                      <button
                        key={status}
                        type="button"
                        className={`status-btn ${getRepairStatusClass(status)} ${repairModalStatus === status ? "status-btn-active" : ""}`}
                        onClick={() => {
                          setRepairModalStatus(status);
                        }}
                      >
                        <span className="status-btn-dot" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="status-switcher-row status-switcher-row-waiting">
                    {REPAIR_KANBAN_COLUMNS.filter((col) => col.status === "waiting_parts").map(({ status, label }) => (
                      <button
                        key={status}
                        type="button"
                        className={`status-btn ${getRepairStatusClass(status)} ${repairModalStatus === status ? "status-btn-active" : ""}`}
                        onClick={() => {
                          setRepairModalStatus(status);
                        }}
                      >
                        <span className="status-btn-dot" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="status-switcher-final">
                    <button
                      type="button"
                      className={`status-btn status-btn-completed-final ${getRepairStatusClass("completed")} ${repairModalStatus === "completed" ? "status-btn-active" : ""}`}
                      onClick={() => {
                        setRepairModalStatus("completed");
                        setRepairModalCompletedAt((current) => current || selectedRepair.completed_at || getLocalTodayDate());
                      }}
                    >
                      <span className="status-btn-dot" />
                      {REPAIR_KANBAN_COLUMNS.find((col) => col.status === "completed")?.label ?? "Completed"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="customer-detail-stack repair-modal-sections">
                <div className="detail-card repair-status-field repair-modal-panel repair-modal-assignment-card">
                  <div className="repair-modal-assignment-master">
                    <span className="repair-modal-field-label">Master</span>
                    {isStaff ? (
                      <p className="repair-modal-master-readonly">{selectedRepair.master_name || "Unassigned"}</p>
                    ) : (
                      <select
                        value={repairModalMasterId}
                        onChange={(event) => setRepairModalMasterId(event.target.value)}
                        aria-label="Assign master"
                      >
                        {staffUsers.map((master) => (
                          <option key={master.id} value={master.id}>
                            {getStaffUserLabel(master)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {repairModalStatus === "completed" ? (
                    <div className="repair-modal-completed-date repair-modal-assignment-completed">
                      <span className="repair-modal-field-label">Completed Date</span>
                      <FriendlyDateInput
                        value={repairModalCompletedAt}
                        onChange={setRepairModalCompletedAt}
                        required
                      />
                    </div>
                  ) : null}
                </div>

                <div className="detail-card repair-info-card">
                  <strong>Repair Info</strong>
                  <div className="repair-info-stack">
                    <div className="repair-info-row">
                      <span className="repair-info-label">Created</span>
                      <p>{formatDisplayDate(selectedRepair.created_at)}</p>
                    </div>
                    {selectedRepair.status === "completed" && selectedRepair.completed_at ? (
                      <div className="repair-info-row">
                        <span className="repair-info-label">Completed</span>
                        <p>{formatDisplayDate(selectedRepair.completed_at)}</p>
                      </div>
                    ) : null}
                    <div className="repair-info-row">
                      <span className="repair-info-label">Owner</span>
                      <p>{selectedRepair.owner_name}</p>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Service</span>
                      <p>{selectedRepair.service_name}</p>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Client Link</span>
                      <div className="tracking-chip-row">
                        <button
                          type="button"
                          className="copy-chip portal-link-chip"
                          aria-label="Copy client portal link"
                          onClick={() => void handleCopyPortalLink(selectedRepair.portal_token)}
                        >
                          Copy ⧉
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="copy-chip portal-link-chip portal-link-regenerate"
                            aria-label="Regenerate client portal link"
                            onClick={() => {
                              if (window.confirm("Regenerate portal link? The current link will stop working immediately.")) {
                                void handleRegeneratePortalLink(selectedRepair.id);
                              }
                            }}
                          >
                            Regenerate ↺
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Est. Completion</span>
                      <div className="repair-info-date-wrap">
                        <input
                          type="date"
                          className="repair-info-date-input"
                          value={repairModalEstimatedDate}
                          onChange={(e) => setRepairModalEstimatedDate(e.target.value)}
                          aria-label="Estimated completion date"
                        />
                      </div>
                    </div>
                    <div className="repair-info-row repair-info-row-block">
                      <span className="repair-info-label">Issue</span>
                      <p className="repair-info-issue">{selectedRepair.issue_notes}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-card repair-modal-panel">
                  <strong>Linked Parts</strong>
                  {selectedRepairPurchases.length === 0 ? (
                    <p className="workspace-note">No ordered parts linked to this repair yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedRepairPurchases.map((entry) => (
                        <article className="detail-item" key={entry.id}>
                          <h4>{entry.part_name}</h4>
                          <p>{entry.supplier_name}</p>
                          <p className="meta-line">
                            Qty {entry.quantity} • Buy {formatCurrency(entry.purchase_price)} • Sell {formatCurrency(entry.sale_price)}
                          </p>
                          <p className="meta-line">Ordered {formatDisplayDate(entry.order_date)}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

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
                      // lgtm[js/xss-through-dom] -- sanitizeImageUrl enforces protocol allowlist (blob:/https:/http:/); API-sourced URLs are validated before use
                      <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="Before repair preview" />
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
                      // lgtm[js/xss-through-dom] -- sanitizeImageUrl enforces protocol allowlist (blob:/https:/http:/); API-sourced URLs are validated before use
                      <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="During repair preview" />
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
                      // lgtm[js/xss-through-dom] -- sanitizeImageUrl enforces protocol allowlist (blob:/https:/http:/); API-sourced URLs are validated before use
                      <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="After repair preview" />
                    ))}
                  </div>
                ) : null}

                <div className="form-actions repair-modal-actions">
                  <button type="button" className="button" onClick={() => void handleRepairModalSave()}>
                    Save Repair Update
                  </button>
                  <button type="button" className="button button-secondary" onClick={handleCloseRepairModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {repairPdfBlob ? (
          <PdfPreviewModal
            blob={repairPdfBlob}
            filename={`act_${selectedRepair?.tracking_code ?? "repair"}.pdf`}
            onClose={() => setRepairPdfBlob(null)}
            onExportNewVersion={
              selectedRepair
                ? () => void handleExportNewRepairPdfVersion(selectedRepair.id)
                : undefined
            }
            exportNewVersionBusy={repairPdfExportBusy}
          />
        ) : null}
      </div>
    );
  }

  function renderPurchasesSection() {
    const emptyServerList = purchases.length === 0;
    const loadedRemaining = Math.max(0, purchaseCount - purchases.length);
    const meta = sectionMeta.purchases;

    return (
      <div className="workspace-stack purchases-workspace">
        <div className="kanban-topbar purchases-section-topbar">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2>{meta.title}</h2>
            {purchaseCount > 0 ? (
              <span className="registry-count">
                {purchaseCount} total
                {purchases.length !== purchaseCount ? ` · ${purchases.length} loaded` : ""}
              </span>
            ) : null}
          </div>
          <div className="workspace-top-actions purchases-top-actions">
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

        <div className="kanban-topbar purchases-controls-bar">
          <div className="purchases-controls-cluster" role="group" aria-label="List layout">
            <button
              type="button"
              className={purchaseListView === "cards" ? "purchases-seg purchases-seg-active" : "purchases-seg"}
              onClick={() => setPurchaseListView("cards")}
            >
              Cards
            </button>
            <button
              type="button"
              className={purchaseListView === "compact" ? "purchases-seg purchases-seg-active" : "purchases-seg"}
              onClick={() => setPurchaseListView("compact")}
            >
              Compact
            </button>
          </div>
          <div className="purchases-controls-selects">
            <select
              className="purchases-inline-select"
              value={purchaseSort}
              aria-label="Sort list"
              onChange={(event) =>
                setPurchaseSort(
                  event.target.value as
                    | "order_date_desc"
                    | "order_date_asc"
                    | "delivery_asc"
                    | "delivery_desc"
                    | "margin_desc"
                    | "margin_asc"
                )
              }
            >
              <option value="order_date_desc">Newest order date</option>
              <option value="order_date_asc">Oldest order date</option>
              <option value="delivery_asc">Soonest delivery</option>
              <option value="delivery_desc">Latest delivery</option>
              <option value="margin_desc">Highest margin</option>
              <option value="margin_asc">Lowest margin</option>
            </select>
            <select
              className="purchases-inline-select"
              value={purchaseGroupBy}
              aria-label="Group list"
              onChange={(event) =>
                setPurchaseGroupBy(event.target.value as "none" | "week" | "supplier")
              }
            >
              <option value="none">No grouping</option>
              <option value="week">By week</option>
              <option value="supplier">By supplier</option>
            </select>
          </div>
        </div>
        <p className="purchases-controls-footnote">
          Sort and grouping apply to loaded rows only — use search to change what the server returns.
        </p>

        <div className="purchases-list-outer">
          {emptyServerList ? (
            <div className="purchases-empty-panel">
              <p className="workspace-note">
                {purchaseSearch.trim() ? "No purchases match your search." : "No purchases yet."}
              </p>
              {!purchaseSearch.trim() ? (
                <>
                  <p className="workspace-note purchases-empty-copy">{meta.copy}</p>
                  <button type="button" className="button" onClick={openPurchaseCreateModal}>
                    + Add Purchase
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            purchaseDisplayGroups.map((group) => (
              <div className="purchases-group" key={group.key}>
                {group.label ? <h3 className="purchases-group-heading">{group.label}</h3> : null}
                <div className={purchaseListView === "compact" ? "purchases-compact-list" : "purchases-group-cards"}>
                  {group.entries.map((entry) => {
                    const saleTotal = entry.quantity * entry.sale_price;
                    const purchaseTotal = entry.quantity * entry.purchase_price;
                    const marginVal = saleTotal - purchaseTotal;
                    if (purchaseListView === "compact") {
                      return (
                        <button
                          type="button"
                          className="purchases-compact-row"
                          key={entry.id}
                          onClick={() => openPurchaseDetailModal(entry)}
                        >
                          <div className="purchases-compact-row-main">
                            <span className="purchases-compact-cell purchases-compact-part">
                              <span className="purchases-compact-part-text">{entry.part_name}</span>
                            </span>
                            <span className="purchases-compact-cell purchases-compact-supplier">{entry.supplier_name}</span>
                            <span className="purchases-compact-cell purchases-compact-narrow">
                              {formatDisplayDate(entry.order_date)}
                            </span>
                            <span className="purchases-compact-cell purchases-compact-narrow">
                              {entry.approximate_delivery_date ? formatDisplayDate(entry.approximate_delivery_date) : "—"}
                            </span>
                            <span
                              className="purchases-compact-cell purchases-compact-qty-cell"
                              title={`Quantity ${entry.quantity}`}
                            >
                              ×{entry.quantity}
                            </span>
                            <span className="purchases-compact-cell purchases-compact-money">{formatCurrency(saleTotal)}</span>
                            <span
                              className={`purchases-compact-cell purchases-compact-money${marginVal >= 0 ? " purchase-margin-pos" : " purchase-margin-neg"}`}
                            >
                              {marginVal >= 0 ? "+" : ""}
                              {formatCurrency(marginVal)}
                            </span>
                          </div>
                        </button>
                      );
                    }
                    const overdue =
                      !entry.delivered && isPurchaseDeliveryOverdue(entry.approximate_delivery_date);
                    const missingInv = !hasPurchaseInvoice(entry);
                    const missingVeh = !entry.vehicle_id && !entry.vehicle_label?.trim();
                    return (
                      <article
                        className="registry-card purchase-card purchase-card-clickable"
                        key={entry.id}
                        onClick={() => openPurchaseDetailModal(entry)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openPurchaseDetailModal(entry);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="purchase-card-body">
                          <div className="purchase-card-info">
                            <h4 className="purchase-card-name">{entry.part_name}</h4>
                            <p className="purchase-card-supplier">{entry.supplier_name}</p>
                            <div className="purchase-card-chips">
                              {entry.delivered ? (
                                <span className="purchase-chip-status purchase-chip-status-delivered">Delivered</span>
                              ) : null}
                              {missingInv ? (
                                <span className="purchase-chip-status purchase-chip-status-warn">No invoice</span>
                              ) : null}
                              {missingVeh ? (
                                <span className="purchase-chip-status purchase-chip-status-muted">No vehicle</span>
                              ) : null}
                              {!entry.repair_code.trim() ? (
                                <span className="purchase-chip-status purchase-chip-status-muted">No repair</span>
                              ) : null}
                              {overdue ? (
                                <span className="purchase-chip-status purchase-chip-status-danger">Delivery overdue</span>
                              ) : null}
                              {entry.vehicle_label ? (
                                <span className="purchase-chip-muted">{entry.vehicle_label}</span>
                              ) : null}
                              {entry.invoice_url ? (
                                <button
                                  className="purchase-chip-muted purchase-chip-link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenInvoice(entry.invoice_url);
                                  }}
                                  title="Open invoice"
                                  type="button"
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
                                <span
                                  className={
                                    overdue ? "purchase-delivery-date purchase-delivery-overdue" : "purchase-delivery-date"
                                  }
                                >
                                  → {formatDisplayDate(entry.approximate_delivery_date)}
                                </span>
                              ) : null}
                            </div>
                            <div className="purchase-financials-total">{formatCurrency(saleTotal)}</div>
                            <div className="purchase-financials-grid">
                              <span className="purchase-financials-label">Buy</span>
                              <span>{formatCurrency(purchaseTotal)}</span>
                              <span className="purchase-financials-label">Qty</span>
                              <span>×{entry.quantity}</span>
                              <span className="purchase-financials-label">Margin</span>
                              <span className={marginVal >= 0 ? "purchase-margin-pos" : "purchase-margin-neg"}>
                                {marginVal >= 0 ? "+" : ""}
                                {formatCurrency(marginVal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {purchaseHasMore && !emptyServerList ? (
            <div className="load-more-bar">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => void loadMorePurchases()}
                disabled={purchaseLoadingMore}
              >
                {purchaseLoadingMore ? "Loading…" : `Load more (${loadedRemaining} remaining)`}
              </button>
            </div>
          ) : null}
        </div>

        {selectedPurchase ? (
          <div
            className="modal-overlay purchase-detail-overlay"
            role="presentation"
            onClick={closePurchaseDetailModal}
          >
            <section
              className="modal-card modal-card-large purchase-detail-modal"
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
              </div>

              <div className="purchase-modal-tabs subnav-tabs" role="tablist" aria-label="Purchase detail sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={purchaseDetailModalTab === "order"}
                  className={purchaseDetailModalTab === "order" ? "subnav-tab subnav-tab-active" : "subnav-tab"}
                  onClick={() => setPurchaseDetailModalTab("order")}
                >
                  Order
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={purchaseDetailModalTab === "invoice"}
                  className={purchaseDetailModalTab === "invoice" ? "subnav-tab subnav-tab-active" : "subnav-tab"}
                  onClick={() => setPurchaseDetailModalTab("invoice")}
                >
                  Invoice
                </button>
              </div>

              <div className="customer-detail-stack purchase-modal-stack">
                {purchaseDetailModalTab === "order" ? (
                <div className="detail-card">
                  <strong>Purchase Info</strong>
                  <div className="stack-form">
                    <div className="form-grid">
                      <label>
                        <span>Order Date</span>
                        <FriendlyDateInput
                          value={purchaseModalForm.order_date}
                          onChange={(nextValue) =>
                            setPurchaseModalForm((current) => ({ ...current, order_date: nextValue }))
                          }
                        />
                      </label>

                      <label>
                        <span>Approximate Delivery Date</span>
                        <FriendlyDateInput
                          value={purchaseModalForm.approximate_delivery_date}
                          onChange={(nextValue) =>
                            setPurchaseModalForm((current) => ({ ...current, approximate_delivery_date: nextValue }))
                          }
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
                          setPurchaseModalForm((current) => ({
                            ...current,
                            vehicle_id: event.target.value,
                            repair_code: "",
                          }))
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

                    <label>
                      <span>Linked Repair</span>
                      <select
                        value={purchaseModalForm.repair_code}
                        onChange={(event) =>
                          setPurchaseModalForm((current) => {
                            const linkedRepair = repairs.find((repair) => repair.tracking_code === event.target.value);
                            return {
                              ...current,
                              repair_code: event.target.value,
                              vehicle_id: linkedRepair ? String(linkedRepair.vehicle_id) : current.vehicle_id,
                            };
                          })
                        }
                      >
                        <option value="">No repair linked</option>
                        {purchaseModalRepairOptions.map((repair) => (
                          <option key={repair.id} value={repair.tracking_code}>
                            {repair.tracking_code} • {repair.vehicle_label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {purchaseModalForm.repair_code ? (
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="purchase-inline-action"
                          onClick={() =>
                            setPurchaseModalForm((current) => ({
                              ...current,
                              repair_code: "",
                            }))
                          }
                        >
                          Unlink repair
                        </button>
                      </div>
                    ) : null}
                    <p className="workspace-note">Leave this empty for stock or reserve parts that are not tied to a repair.</p>

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

                    <label className="purchases-delivered-field">
                      <input
                        type="checkbox"
                        checked={purchaseModalForm.delivered}
                        onChange={(event) =>
                          setPurchaseModalForm((current) => ({ ...current, delivered: event.target.checked }))
                        }
                      />
                      <span>Delivered (received at workshop)</span>
                    </label>
                  </div>
                </div>
                ) : null}

                {purchaseDetailModalTab === "invoice" ? (
                <div className="detail-card">
                  <strong>Invoice</strong>
                  <div className="invoice-panel">
                    <div className="invoice-summary">
                      <div className="invoice-copy">
                        {purchaseModalInvoiceUrl ? (
                          <button
                            type="button"
                            className="invoice-file-trigger"
                            onClick={() => handleOpenInvoice(purchaseModalInvoiceUrl)}
                          >
                            {purchaseModalInvoiceName || "No invoice attached yet"}
                          </button>
                        ) : (
                          <p className="invoice-file-name">{purchaseModalInvoiceName || "No invoice attached yet"}</p>
                        )}
                        <p className="invoice-file-note">
                          {purchaseModalInvoiceName
                            ? "This file is linked to the purchase and can be replaced or deleted."
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
                        {purchaseModalInvoiceName ? "Replace Invoice" : "Add Invoice"}
                      </label>

                      {purchaseModalInvoiceUrl ? (
                        <button
                          type="button"
                          className="purchase-inline-action purchase-inline-action-danger"
                          onClick={handlePurchaseModalInvoiceRemove}
                        >
                          Delete Invoice
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                ) : null}

                {purchaseModalError ? <p className="form-error">{purchaseModalError}</p> : null}

                <div className="form-actions purchase-modal-actions">
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
            <section
              className="modal-card modal-card-large purchase-form-modal"
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">New Purchase</p>
                  <h3>Add Ordered Part</h3>
                </div>
              </div>

              <form className="stack-form" onSubmit={handlePurchaseSubmit}>
                <div className="form-grid">
                  <label>
                    <span>Order Date</span>
                    <FriendlyDateInput
                      value={purchaseForm.order_date}
                      onChange={(nextValue) =>
                        setPurchaseForm((current) => ({ ...current, order_date: nextValue }))
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>Approximate Delivery Date</span>
                    <FriendlyDateInput
                      value={purchaseForm.approximate_delivery_date}
                      onChange={(nextValue) =>
                        setPurchaseForm((current) => ({ ...current, approximate_delivery_date: nextValue }))
                      }
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
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        vehicle_id: event.target.value,
                        repair_code: "",
                      }))
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

                <label>
                  <span>Linked Repair</span>
                  <select
                    value={purchaseForm.repair_code}
                    onChange={(event) =>
                      setPurchaseForm((current) => {
                        const linkedRepair = repairs.find((repair) => repair.tracking_code === event.target.value);
                        return {
                          ...current,
                          repair_code: event.target.value,
                          vehicle_id: linkedRepair ? String(linkedRepair.vehicle_id) : current.vehicle_id,
                        };
                      })
                    }
                  >
                    <option value="">No repair linked</option>
                    {purchaseCreateRepairOptions.map((repair) => (
                      <option key={repair.id} value={repair.tracking_code}>
                        {repair.tracking_code} • {repair.vehicle_label}
                      </option>
                    ))}
                  </select>
                </label>
                {purchaseForm.repair_code ? (
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="purchase-inline-action"
                      onClick={() =>
                        setPurchaseForm((current) => ({
                          ...current,
                          repair_code: "",
                        }))
                      }
                    >
                      Unlink repair
                    </button>
                  </div>
                ) : null}
                <p className="workspace-note">Leave this empty for stock or reserve parts that are not tied to a repair.</p>

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

                <label className="purchases-delivered-field">
                  <input
                    type="checkbox"
                    checked={purchaseForm.delivered}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({ ...current, delivered: event.target.checked }))
                    }
                  />
                  <span>Delivered (received at workshop)</span>
                </label>

                <label>
                  <span>Invoice</span>
                  <input accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" onChange={handlePurchaseInvoiceChange} type="file" />
                  {purchaseInvoiceName ? <small className="field-hint">Attached: {purchaseInvoiceName}</small> : null}
                </label>

                {purchaseError ? <p className="form-error">{purchaseError}</p> : null}

                <div className="form-actions purchase-modal-actions">
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
    const meta = sectionMeta.users;
    return (
      <div className="workspace-stack users-workspace">
        <div className="kanban-topbar users-section-topbar">
          <div className="users-section-head">
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2>{meta.title}</h2>
          </div>
          <div className="users-section-actions">
            <span className="registry-count">
              {allUsers.length} {allUsers.length === 1 ? "user" : "users"}
            </span>
            {isAdmin ? (
              <button type="button" className="button" onClick={() => setShowInviteForm((v) => !v)}>
                + Invite user
              </button>
            ) : null}
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
