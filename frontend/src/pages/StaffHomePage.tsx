import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import type { StaffSection } from "../App";
import api from "../api/client";
import {
  exportRepairPdf,
  fetchStaffUsers,
  openRepairPdfForPreview,
  type StaffUser,
} from "../api/repairs";
import { PdfPreviewModal } from "../components/PdfPreviewModal";
import { RepairCreateModal } from "../components/repairs/RepairCreateModal";
import { RepairEditModal } from "../components/repairs/RepairEditModal";
import { RequiredChips } from "../components/repairs/RepairModal";
import { FieldRow, SectionHead } from "../components/repairs/FieldRow";
import { createInvite, fetchUsers, resetInvite, updateUserName, type InviteResponse, type UserItem } from "../api/users";
import {
  fetchDashboardAnalytics,
  type DashboardAnalyticsResponse,
  type DashboardWarehouseSupplierRow,
} from "../api/analytics";
import { fetchServices, type ServiceItem } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { createSupplier, updateSupplier, type SupplierItem } from "../api/purchases";
import {
  usePurchases,
  type PurchaseEntry,
  type PurchaseLineFormState,
} from "../features/staff/hooks/usePurchases";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "../features/staff/hooks/useMediaQuery";
import { PurchaseInvoiceImportBlock } from "../features/staff/components/PurchaseInvoiceImportBlock";
import { RegistersCustomersPanel } from "../features/staff/components/RegistersCustomersPanel";
import { RegistersHelpDisclosure } from "../features/staff/components/RegistersHelpDisclosure";
import { ServicesRegisterPanel } from "../features/staff/components/ServicesRegisterPanel";
import { UnitsOfMeasureAdminPanel } from "../features/staff/components/UnitsOfMeasureAdminPanel";
import {
  IconEmail,
  IconNote,
  IconPhone,
  VehicleMetaRow,
  VehicleVinRow,
} from "../features/staff/components/VehicleDetailMeta";
import { useRepairs, sanitizeImageUrl } from "../features/staff/hooks/useRepairs";
import { StaffRepairsMobileList } from "../features/staff/mobile/StaffRepairsMobileList";
import { StaffVehicleMobileDetail } from "../features/staff/mobile/StaffVehicleMobileDetail";
import { StaffVehiclesMobileList } from "../features/staff/mobile/StaffVehiclesMobileList";
import {
  formatRepairServicesSummary,
  getLastRecordedOdometerFromRepairs,
  getRepairStatusClass,
  parseVehicleProfileMileageKm,
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
  type VehicleOwnerDetails,
  type VehicleUiDetails,
} from "../features/staff/shared/vehicles";
import { StaffRepairsKanban } from "../features/staff/web/StaffRepairsKanban";
import { StaffVehicleDetailPanel } from "../features/staff/web/StaffVehicleDetailPanel";
import { StaffVehiclesRegistry } from "../features/staff/web/StaffVehiclesRegistry";
import { formatPolishPhoneDisplay } from "../lib/formatPolishPhone";

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

export type RepairCounts = {
  open: number;
  waiting: number;
  ready: number;
};

type StaffHomePageProps = {
  activeSection: StaffSection;
  onSelectSection: (section: StaffSection) => void;
  openRepairComposerRequest: number;
  onRepairCountsChange?: (counts: RepairCounts) => void;
};

type UserAccessTab = "owner" | "admins" | "masters";
type PurchasesWorkspaceTab = "warehouse" | "consumables" | "suppliers";
type ReferenceWorkspaceTab = "units" | "services" | "customers";
type DashboardTab = "moneyflow" | "service_board" | "warehouse" | "consumables";
type DashboardDateRange = {
  start_date: string;
  end_date: string;
};
type DashboardCalendarLane = {
  repair: RepairEntry;
  linkedParts: PurchaseEntry[];
  visibleStartDate: string;
  visibleEndDate: string;
  startColumn: number;
  span: number;
  isOverdue: boolean;
  partCount: number;
  partQuantity: number;
  partNames: string[];
  partsVisibleStartDate: string | null;
  partsVisibleEndDate: string | null;
  partsStartColumn: number | null;
  partsSpan: number;
};

type DashboardCalendarDay = {
  date: string;
  dayNumber: string;
  weekdayLabel: string;
  isWeekend: boolean;
  isToday: boolean;
  isMonthStart: boolean;
};

type DashboardCalendarMonthSegment = {
  key: string;
  label: string;
  monthNumber: string;
  year: string;
  span: number;
};

type DashboardCalendarGridDay = {
  date: string;
  dayNumber: string;
  weekdayLabel: string;
  isWeekend: boolean;
  isToday: boolean;
  isInRange: boolean;
  weekIndex: number;
};

type DashboardCalendarBarSegment = {
  key: string;
  repair: RepairEntry;
  layer: "repairs" | "parts";
  purchase: PurchaseEntry | null;
  weekIndex: number;
  startColumn: number;
  span: number;
  stackIndex: number;
  label: string;
  isActive: boolean;
  isOverdue: boolean;
};

type DashboardCalendarWeek = {
  weekIndex: number;
  days: DashboardCalendarGridDay[];
  repairSegments: DashboardCalendarBarSegment[];
  repairStackCount: number;
  partSegments: DashboardCalendarBarSegment[];
  partStackCount: number;
};

type DashboardCalendarTooltipState = {
  repairId: number;
  layer: "repairs" | "parts";
  purchaseId: number | null;
  top: number;
  left: number;
  pinned: boolean;
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

function buildPurchaseInvoiceLineMeta(
  row: PurchaseLineFormState,
  unitsOfMeasure: { id: number | string; code: string }[]
): string | null {
  const bits: string[] = [];
  const q = row.quantity.trim();
  if (q) {
    bits.push(`Qty ${q}`);
  }
  const u = unitsOfMeasure.find((x) => String(x.id) === row.unit_of_measure_id);
  if (u?.code) {
    bits.push(String(u.code));
  }
  const pp = row.purchase_price.trim();
  if (pp) {
    bits.push(pp);
  }
  return bits.length > 0 ? bits.join(" · ") : null;
}

function getPurchaseInvoiceLinePrimaryDisplay(
  row: PurchaseLineFormState,
  mode: "warehouse" | "consumables",
  totalLines: number
): { text: string; title?: string } {
  const raw = row.part_name.trim();
  const emptyLabel = mode === "warehouse" ? "Part not set yet" : "Item not set yet";
  if (!raw) {
    return { text: emptyLabel };
  }
  const maxLen = totalLines > 1 ? 52 : 72;
  if (raw.length > maxLen) {
    return { text: `${raw.slice(0, maxLen - 1)}…`, title: raw };
  }
  return { text: raw, title: raw };
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

function addDaysToIsoDate(value: string, days: number): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return value;
  }
  parsed.setDate(parsed.getDate() + days);
  return formatIsoLocalDate(parsed);
}

function diffIsoDays(startDate: string, endDate: string): number {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / millisecondsPerDay);
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

function getRepairLaborSaleTotal(repair: RepairEntry, priceByName: Map<string, number>): number {
  const lines = repair.service_lines.filter((l) => l.name.trim());
  if (lines.length === 0) {
    return priceByName.get(repair.service_name.trim()) ?? 0;
  }
  return lines.reduce((sum, l) => sum + (priceByName.get(l.name.trim()) ?? 0), 0);
}

const calendarWeekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const dashboardCalendarWeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const calendarMonthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});
const calendarMonthLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
});
const warehouseWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
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

/** Desktop/mobile consumables: Open when URL exists; else filename when invoice_name only; else em dash. */
function renderPurchaseInvoiceCellContent(
  entry: Pick<PurchaseEntry, "invoice_name" | "invoice_url">,
  onOpenUrl: (url: string) => void,
  options?: { openButtonClassName?: string }
): ReactNode {
  const url = entry.invoice_url?.trim();
  if (url) {
    return (
      <button
        type="button"
        className={options?.openButtonClassName ?? "purchase-inline-action"}
        onClick={(event) => {
          event.stopPropagation();
          onOpenUrl(url);
        }}
      >
        Open
      </button>
    );
  }
  const invoiceName = entry.invoice_name?.trim();
  if (invoiceName) {
    return (
      <span className="purchases-registry-invoice-filename" title={invoiceName}>
        {invoiceName}
      </span>
    );
  }
  return "—";
}

function formatInventoryInputValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function quantityRequiresWholeUnits(unitCode: string | undefined): boolean {
  return !unitCode || unitCode.trim().toLowerCase() === "pcs";
}

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
      ariaLabel: `Choose ${iso}`,
    };
  });
}

function normalizeDashboardDateRange(range: DashboardDateRange): DashboardDateRange {
  if (range.start_date && range.end_date && range.end_date < range.start_date) {
    return {
      start_date: range.end_date,
      end_date: range.start_date,
    };
  }
  return range;
}

function formatDateRangeInputValue(startValue: string, endValue: string): string {
  if (startValue && endValue) {
    return `${formatDateInputValue(startValue)} - ${formatDateInputValue(endValue)}`;
  }
  if (startValue) {
    return `${formatDateInputValue(startValue)} - ...`;
  }
  if (endValue) {
    return `... - ${formatDateInputValue(endValue)}`;
  }
  return "";
}

type FriendlyDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
};

function FriendlyDateInput({
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  placeholder = "dd-mm-yyyy",
  ariaLabel,
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
          aria-label={ariaLabel}
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
                  aria-label={day.ariaLabel}
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

type FriendlyDateRangeInputProps = {
  startValue: string;
  endValue: string;
  onChange: (range: DashboardDateRange) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
};

function FriendlyDateRangeInput({
  startValue,
  endValue,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = "dd-mm-yyyy - dd-mm-yyyy",
}: FriendlyDateRangeInputProps) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const normalizedRange = normalizeDashboardDateRange({ start_date: startValue, end_date: endValue });
  const [isOpen, setIsOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DashboardDateRange>(normalizedRange);
  const [selectionStep, setSelectionStep] = useState<"start" | "end">("start");
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialCalendarMonth(normalizedRange.start_date || normalizedRange.end_date, min, max)
  );

  useEffect(() => {
    setDraftRange(normalizedRange);
  }, [normalizedRange.end_date, normalizedRange.start_date]);

  useEffect(() => {
    if (isOpen) {
      setDraftRange(normalizedRange);
      setSelectionStep(normalizedRange.start_date && !normalizedRange.end_date ? "end" : "start");
      setVisibleMonth(getInitialCalendarMonth(normalizedRange.start_date || normalizedRange.end_date, min, max));
    }
  }, [isOpen, max, min, normalizedRange.end_date, normalizedRange.start_date]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setDraftRange(normalizedRange);
        setSelectionStep("start");
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setDraftRange(normalizedRange);
        setSelectionStep("start");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [normalizedRange.end_date, normalizedRange.start_date]);

  const minMonth = min ? getMonthStart(parseIsoDate(min) ?? getInitialCalendarMonth(startValue || endValue, min, max)) : null;
  const maxMonth = max ? getMonthStart(parseIsoDate(max) ?? getInitialCalendarMonth(startValue || endValue, min, max)) : null;
  const canGoPrevMonth = !minMonth || getMonthIndex(visibleMonth) > getMonthIndex(minMonth);
  const canGoNextMonth = !maxMonth || getMonthIndex(visibleMonth) < getMonthIndex(maxMonth);
  const calendarDays = buildCalendarDays(visibleMonth);
  const hasCompleteRange = Boolean(draftRange.start_date && draftRange.end_date);

  const helperText =
    selectionStep === "end" && draftRange.start_date
      ? "Choose the end date to finish the range."
      : hasCompleteRange
        ? "Click any day to start a new range."
        : "Choose the start date to begin the range.";

  function handleDaySelect(iso: string) {
    if (selectionStep === "start" || !draftRange.start_date || (draftRange.start_date && draftRange.end_date)) {
      setDraftRange({ start_date: iso, end_date: "" });
      setSelectionStep("end");
      return;
    }

    const nextRange =
      iso < draftRange.start_date
        ? { start_date: iso, end_date: draftRange.start_date }
        : { start_date: draftRange.start_date, end_date: iso };

    const normalizedNextRange = normalizeDashboardDateRange(nextRange);
    setDraftRange(normalizedNextRange);
    onChange(normalizedNextRange);
    setSelectionStep("start");
    setIsOpen(false);
  }

  return (
    <div className={`friendly-date friendly-date-range ${isOpen ? "friendly-date-open" : ""}`} ref={rootRef}>
      <div className="friendly-date-input-wrap">
        <input
          id={inputId}
          className="friendly-date-input friendly-date-range-input"
          value={formatDateRangeInputValue(normalizedRange.start_date, normalizedRange.end_date)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          readOnly
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={`${inputId}-calendar`}
        />
      </div>

      {isOpen ? (
        <div
          id={`${inputId}-calendar`}
          className="friendly-date-popover friendly-date-range-popover"
          role="dialog"
          aria-modal="false"
          aria-label="Date range calendar"
        >
          <div className="friendly-date-range-summary">
            <div className={`friendly-date-range-chip ${selectionStep === "start" ? "friendly-date-range-chip-active" : ""}`}>
              <span>Start</span>
              <strong>{draftRange.start_date ? formatDateInputValue(draftRange.start_date) : "Pick date"}</strong>
            </div>
            <div className={`friendly-date-range-chip ${selectionStep === "end" ? "friendly-date-range-chip-active" : ""}`}>
              <span>End</span>
              <strong>{draftRange.end_date ? formatDateInputValue(draftRange.end_date) : "Pick date"}</strong>
            </div>
          </div>
          <p className="friendly-date-range-copy">{helperText}</p>

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
              const isDisabled = !isIsoDateWithinBounds(day.iso, min, max);
              const isStart = day.iso === draftRange.start_date;
              const isEnd = day.iso === draftRange.end_date;
              const isInRange =
                Boolean(draftRange.start_date && draftRange.end_date) &&
                day.iso > draftRange.start_date &&
                day.iso < draftRange.end_date;

              return (
                <button
                  key={day.iso}
                  type="button"
                  className={[
                    "friendly-date-day",
                    day.isCurrentMonth ? "" : "friendly-date-day-muted",
                    isInRange ? "friendly-date-day-in-range" : "",
                    isStart || isEnd ? "friendly-date-day-selected friendly-date-day-range-boundary" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    handleDaySelect(day.iso);
                  }}
                  disabled={isDisabled}
                  aria-label={day.ariaLabel}
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

type ServiceBoardInfoButtonProps = {
  title: string;
  summary: string;
  formula?: string;
  notes?: string[];
};

function ServiceBoardInfoButton({ title, summary, formula, notes = [] }: ServiceBoardInfoButtonProps) {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={`service-board-info ${isOpen ? "service-board-info-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="service-board-info-trigger"
        aria-label={`More info about ${title}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onClick={() => setIsOpen((current) => !current)}
      >
        i
      </button>

      {isOpen ? (
        <div id={popoverId} className="service-board-info-popover" role="dialog" aria-modal="false" aria-label={`${title} details`}>
          <div className="service-board-info-popover-head">
            <strong>{title}</strong>
            <button
              type="button"
              className="service-board-info-close"
              aria-label={`Close info about ${title}`}
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <p>{summary}</p>
          {formula ? (
            <div className="service-board-info-block">
              <span>Formula</span>
              <p>{formula}</p>
            </div>
          ) : null}
          {notes.length > 0 ? (
            <div className="service-board-info-block">
              <span>Notes</span>
              <ul className="service-board-info-list">
                {notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
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
  reference: {
    eyebrow: "Settings",
    title: "Registers",
    copy: "Reference data for the workshop: units of measure, service catalog prices, and customers who own registered vehicles.",
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

const ACT_EXPORT_ODOMETER_REQUIRED_MESSAGE =
  "Fill in Odometer when returned (km) before exporting the act.";
const ODOMETER_NUMBER_MESSAGE = "Odometer must be a whole number (km), or leave empty.";

/**
 * Two-option delivery status card that toggles a purchase's `delivered` state.
 *
 * @param delivered - Current delivery state; `false` means not at workshop, `true` means received.
 * @param onChange - Called with the updated `delivered` value when the user selects a segment.
 */
function PurchaseDeliveryStatusCard({
  delivered,
  onChange,
}: {
  delivered: boolean;
  onChange: (delivered: boolean) => void;
}) {
  return (
    <div className="purchase-delivery-kanban-card">
      <div className="purchase-delivery-kanban-card__strip" role="radiogroup" aria-label="Receipt at workshop">
        <button
          type="button"
          role="radio"
          aria-checked={!delivered}
          className={`purchase-delivery-kanban-card__segment purchase-delivery-kanban-card__segment--pending${
            !delivered ? " purchase-delivery-kanban-card__segment--active" : ""
          }`}
          onClick={() => onChange(false)}
        >
          <span className="purchase-delivery-kanban-card__segment-label">Not received</span>
          <span className="purchase-delivery-kanban-card__segment-hint">In transit or expected</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={delivered}
          className={`purchase-delivery-kanban-card__segment purchase-delivery-kanban-card__segment--done${
            delivered ? " purchase-delivery-kanban-card__segment--active" : ""
          }`}
          onClick={() => onChange(true)}
        >
          <span className="purchase-delivery-kanban-card__segment-label">Received at workshop</span>
          <span className="purchase-delivery-kanban-card__segment-hint">Saved as delivered</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Staff workspace UI component that renders and manages the entire staff interface:
 * dashboard, customers, vehicles, repairs, purchases, reference registers, and users.
 *
 * The component performs data loading, maintains local UI state for registries, modals,
 * filters, calendars and analytics, wires up repair and purchase hooks, and renders
 * all workspace pages and related modals. When provided, `onRepairCountsChange` is
 * invoked with a derived { open, waiting, ready } repair counts object whenever the
 * repairs list changes.
 *
 * @param onRepairCountsChange - Optional callback invoked with current repair counts: `{ open, waiting, ready }`.
 * @returns The staff workspace JSX element.
 */
export function StaffHomePage({ activeSection, onSelectSection, openRepairComposerRequest, onRepairCountsChange }: StaffHomePageProps) {
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
  const [moneyflowCalendarTooltip, setMoneyflowCalendarTooltip] = useState<DashboardCalendarTooltipState | null>(null);
  const [showMoneyflowRepairLayer, setShowMoneyflowRepairLayer] = useState(true);
  const [showMoneyflowPartsLayer, setShowMoneyflowPartsLayer] = useState(true);
  const [serviceBoardDateRange, setServiceBoardDateRange] = useState<DashboardDateRange>({ start_date: "", end_date: "" });
  const [apiServices, setApiServices] = useState<ServiceItem[]>([]);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [dashboardAnalyticsLoading, setDashboardAnalyticsLoading] = useState(true);
  const [dashboardAnalyticsError, setDashboardAnalyticsError] = useState("");
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [vehicleFromRepairModal, setVehicleFromRepairModal] = useState(false);
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
  const moneyflowCalendarWrapRef = useRef<HTMLDivElement | null>(null);
  const [resetLinkResult, setResetLinkResult] = useState<{ userId: number; url: string } | null>(null);
  const [repairPdfBlob, setRepairPdfBlob] = useState<Blob | null>(null);
  const [repairPdfLoading, setRepairPdfLoading] = useState(false);
  const [repairPdfExportBusy, setRepairPdfExportBusy] = useState(false);

  const deferredVehicleSearch = useDeferredValue(vehicleSearch);

  const customers = useMemo(() => [...serverCustomers, ...demoCustomers], [serverCustomers, demoCustomers]);
  const vehicles = useMemo(() => [...serverVehicles, ...demoVehicles], [serverVehicles, demoVehicles]);

  const [activePurchasesTab, setActivePurchasesTab] = useState<PurchasesWorkspaceTab>("warehouse");
  const [showOutOfStockConsumables, setShowOutOfStockConsumables] = useState(false);
  const compactStaffNarrowLayout = useMediaQuery(REGISTERS_MOBILE_BREAKPOINT);
  const [expandedConsumableId, setExpandedConsumableId] = useState<number | null>(null);
  const [activeReferenceTab, setActiveReferenceTab] = useState<ReferenceWorkspaceTab>("units");
  const [supplierRegistrySearch, setSupplierRegistrySearch] = useState("");

  const {
    unitsOfMeasure,
    purchases,
    purchaseSearch,
    setPurchaseSearch,
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
    isConsumablesLoading,
    loadMoreConsumables,
    openPurchaseDetailModal,
    closePurchaseDetailModal,
    handlePurchaseSubmit,
    handlePurchaseOrderDownload,
    handlePurchaseModalSave,
    handlePurchaseDelete,
    getConsumableInventoryDraft,
    isConsumableInventoryDraftDirty,
    updateConsumableInventoryDraft,
    handleConsumableStockSave,
    attachPurchaseCreateInvoiceFile,
    handlePurchaseModalInvoiceChange,
    handlePurchaseModalInvoiceRemove,
    handleOpenInvoice,
    purchaseCount,
    purchaseHasMore,
    purchaseLoadingMore,
    isPurchasesLoading,
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
    refreshUnitsOfMeasure,
    refreshSuppliers,
    applyPurchaseLineImport,
    approveImportedUnitOfMeasure,
    purchaseImportSupplierNeedsAttention,
    purchaseImportLineNeedsAttention,
  } = usePurchases(vehicles, {
    enableConsumablesFetch: activeSection === "purchases" && activePurchasesTab === "consumables",
  });

  useEffect(() => {
    setExpandedConsumableId(null);
  }, [activePurchasesTab]);

  useEffect(() => {
    if (expandedConsumableId === null) return;
    if (!consumablePurchases.some((c) => c.id === expandedConsumableId)) {
      setExpandedConsumableId(null);
    }
  }, [consumablePurchases, expandedConsumableId]);

  const [purchaseLineExpandById, setPurchaseLineExpandById] = useState<Record<string, boolean>>({});
  const purchaseCreateModalWasOpenRef = useRef(false);
  const purchaseLinesExpandSigRef = useRef("");

  useEffect(() => {
    if (!isPurchaseCreateModalOpen) {
      purchaseCreateModalWasOpenRef.current = false;
      return;
    }

    const justOpened = !purchaseCreateModalWasOpenRef.current;
    purchaseCreateModalWasOpenRef.current = true;

    const lineSig = purchaseLineRows.map((r) => r.clientLineId).join(",");
    const flagSig = purchaseImportLineNeedsAttention.map((f) => (f ? "1" : "0")).join("");
    const sig = `${lineSig}|${flagSig}|${purchaseLineRows.length}`;
    const linesOrFlagsChanged = sig !== purchaseLinesExpandSigRef.current;
    if (linesOrFlagsChanged) {
      purchaseLinesExpandSigRef.current = sig;
    }

    if (!justOpened && !linesOrFlagsChanged) {
      return;
    }

    const applyAttention = (target: Record<string, boolean>) => {
      for (let i = 0; i < purchaseLineRows.length; i++) {
        if (purchaseImportLineNeedsAttention[i] === true) {
          const id = purchaseLineRows[i]?.clientLineId;
          if (id) {
            target[id] = true;
          }
        }
      }
    };

    if (justOpened) {
      purchaseLinesExpandSigRef.current = sig;
      setPurchaseLineExpandById(() => {
        const next: Record<string, boolean> = {};
        applyAttention(next);
        return next;
      });
      return;
    }

    if (linesOrFlagsChanged) {
      purchaseLinesExpandSigRef.current = sig;
      setPurchaseLineExpandById((prev) => {
        const existingIds = new Set(purchaseLineRows.map((r) => r.clientLineId));
        const next: Record<string, boolean> = {};
        for (const [id, open] of Object.entries(prev)) {
          if (existingIds.has(id)) {
            next[id] = open;
          }
        }
        applyAttention(next);
        return next;
      });
    }
  }, [isPurchaseCreateModalOpen, purchaseLineRows, purchaseImportLineNeedsAttention]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierRegistrySearch.trim().toLowerCase();
    if (!q) {
      return suppliers;
    }
    return suppliers.filter((s) => {
      const hay = `${s.name} ${s.nip ?? ""} ${s.email ?? ""} ${s.phone ?? ""} ${s.registered_address ?? ""} ${s.notes ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [supplierRegistrySearch, suppliers]);

  const getQuantityFieldProps = useCallback(
    (unitIdValue: string) => {
      const unitCode = unitsOfMeasure.find((u) => String(u.id) === unitIdValue)?.code;
      return quantityRequiresWholeUnits(unitCode)
        ? { min: "1", step: "1" }
        : { min: "0.01", step: "0.01" };
    },
    [unitsOfMeasure]
  );

  const [purchaseDetailModalTab, setPurchaseDetailModalTab] = useState<"order" | "invoice">("order");
  const [supplierCreateOpen, setSupplierCreateOpen] = useState(false);
  const [supplierCreateForm, setSupplierCreateForm] = useState({
    name: "",
    nip: "",
    phone: "",
    email: "",
    registered_address: "",
    notes: "",
  });
  const [supplierCreateError, setSupplierCreateError] = useState("");
  const [supplierCreateSaving, setSupplierCreateSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [supplierEditForm, setSupplierEditForm] = useState({
    name: "",
    nip: "",
    phone: "",
    email: "",
    registered_address: "",
    notes: "",
  });
  const [supplierEditError, setSupplierEditError] = useState("");
  const [supplierEditSaving, setSupplierEditSaving] = useState(false);

  function openSupplierEditModal(supplier: SupplierItem) {
    setSelectedSupplier(supplier);
    setSupplierEditForm({
      name: supplier.name,
      nip: supplier.nip,
      phone: supplier.phone,
      email: supplier.email,
      registered_address: supplier.registered_address ?? "",
      notes: supplier.notes,
    });
    setSupplierEditError("");
  }

  function closeSupplierEditModal() {
    setSelectedSupplier(null);
    setSupplierEditError("");
  }

  async function handleSupplierCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupplierCreateError("");
    const name = supplierCreateForm.name.trim();
    if (!name) {
      setSupplierCreateError("Supplier name is required.");
      return;
    }
    setSupplierCreateSaving(true);
    try {
      await createSupplier({
        name,
        nip: supplierCreateForm.nip.trim() || undefined,
        phone: supplierCreateForm.phone.trim() || undefined,
        email: supplierCreateForm.email.trim() || undefined,
        registered_address: supplierCreateForm.registered_address.trim() || undefined,
        notes: supplierCreateForm.notes.trim() || undefined,
      });
      await refreshSuppliers();
      setSupplierCreateOpen(false);
      setSupplierCreateForm({ name: "", nip: "", phone: "", email: "", registered_address: "", notes: "" });
    } catch {
      setSupplierCreateError("Could not create supplier. The name may already exist.");
    } finally {
      setSupplierCreateSaving(false);
    }
  }

  async function handleSupplierEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSupplier) {
      return;
    }

    setSupplierEditError("");
    const name = supplierEditForm.name.trim();
    if (!name) {
      setSupplierEditError("Supplier name is required.");
      return;
    }

    setSupplierEditSaving(true);
    try {
      await updateSupplier(selectedSupplier.id, {
        name,
        nip: supplierEditForm.nip.trim(),
        phone: supplierEditForm.phone.trim(),
        email: supplierEditForm.email.trim(),
        registered_address: supplierEditForm.registered_address.trim(),
        notes: supplierEditForm.notes.trim(),
      });
      await refreshSuppliers();
      closeSupplierEditModal();
    } catch {
      setSupplierEditError("Could not update supplier. The name may already exist.");
    } finally {
      setSupplierEditSaving(false);
    }
  }

  function toggleMoneyflowCalendarLayer(layer: "repairs" | "parts") {
    if (layer === "repairs") {
      if (showMoneyflowRepairLayer && !showMoneyflowPartsLayer) {
        return;
      }
      setShowMoneyflowRepairLayer((current) => !current);
      return;
    }

    if (showMoneyflowPartsLayer && !showMoneyflowRepairLayer) {
      return;
    }
    setShowMoneyflowPartsLayer((current) => !current);
  }

  function showMoneyflowCalendarTooltip(
    segment: {
      repairId: number;
      layer: "repairs" | "parts";
      purchaseId: number | null;
    },
    anchor: HTMLElement,
    options?: {
      pinned?: boolean;
    }
  ) {
    if (moneyflowCalendarTooltip?.pinned && !options?.pinned) {
      return;
    }

    const wrap = moneyflowCalendarWrapRef.current;
    if (!wrap) {
      setActiveMoneyflowCalendarRepairId(segment.repairId);
      return;
    }

    const wrapRect = wrap.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const tooltipHalfWidth = 170;
    const rawLeft = anchorRect.left - wrapRect.left + anchorRect.width / 2;
    const left = Math.min(Math.max(rawLeft, tooltipHalfWidth), Math.max(wrapRect.width - tooltipHalfWidth, tooltipHalfWidth));
    const top = anchorRect.bottom - wrapRect.top + 10;

    setActiveMoneyflowCalendarRepairId(segment.repairId);
    setMoneyflowCalendarTooltip({
      repairId: segment.repairId,
      layer: segment.layer,
      purchaseId: segment.purchaseId,
      top,
      left,
      pinned: Boolean(options?.pinned),
    });
  }

  function clearMoneyflowCalendarTooltip() {
    setActiveMoneyflowCalendarRepairId(null);
    setMoneyflowCalendarTooltip(null);
  }

  function togglePinnedMoneyflowCalendarTooltip(
    segment: {
      repairId: number;
      layer: "repairs" | "parts";
      purchaseId: number | null;
    },
    anchor: HTMLElement
  ) {
    if (
      moneyflowCalendarTooltip?.pinned &&
      moneyflowCalendarTooltip.repairId === segment.repairId &&
      moneyflowCalendarTooltip.layer === segment.layer &&
      moneyflowCalendarTooltip.purchaseId === segment.purchaseId
    ) {
      clearMoneyflowCalendarTooltip();
      return;
    }

    showMoneyflowCalendarTooltip(segment, anchor, { pinned: true });
  }

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
    selectedRepairId,
    repairModalStatus,
    setRepairModalStatus,
    repairModalOpenedAsCompleted,
    repairModalMasterId,
    setRepairModalMasterId,
    repairModalCompletedAt,
    setRepairModalCompletedAt,
    repairModalMileageAtService,
    setRepairModalMileageAtService,
    repairModalNeedsMileageAttention,
    repairModalNeedsMasterAttention,
    repairModalNewNote,
    setRepairModalNewNote,
    repairModalServiceLines,
    setRepairModalServiceLines,
    repairModalIssueNotes,
    setRepairModalIssueNotes,
    prefillHandoffRepairCreate,
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
    requestRepairMileageAttention,
    handleRepairSubmit,
    handleRepairNoteAdd,
    handleRepairNoteDelete,
    handleRepairModalSave,
    handleRepairDelete,
    repairStatusChanging,
    handleRepairStatusChange,
    handleRepairReopen,
    handleRepairPickUp,
    handleRepairUndoPickUp,
    deleteRepairFromModal,
    submitRepairCreate,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
    dragOverCardId,
    handleCardDragOver,
    handleCardDrop,
    handleCopyTrackingCode,
    handleCopyPortalLink,
    handleRegeneratePortalLink,
    markRepairPdfAvailable,
    repairModalEstimatedDate,
    setRepairModalEstimatedDate,
  } = useRepairs(vehicles, staffUsers, user?.role === "staff" ? user?.id : undefined);

  useEffect(() => {
    if (!onRepairCountsChange) return;
    onRepairCountsChange({
      open:    repairs.filter((r) => r.status === "new" || r.status === "in_progress").length,
      waiting: repairs.filter((r) => r.status === "waiting_parts").length,
      ready:   repairs.filter((r) => r.status === "completed").length,
    });
  }, [repairs, onRepairCountsChange]);
  const currentUserLabel = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Unknown User";
  const repairMileageInputRef = useRef<HTMLInputElement | null>(null);
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

  const refreshServiceCatalog = useCallback(() => {
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

  function getActOdometerValidationMessage(repairId: number): string | null {
    const repair = repairs.find((item) => item.id === repairId);
    if (!repair) {
      return null;
    }
    if (selectedRepair?.id === repairId && repairModalStatus === "completed") {
      const normalized = repairModalMileageAtService.trim().replace(/,/g, "").replace(/\s/g, "");
      if (!normalized) {
        return ACT_EXPORT_ODOMETER_REQUIRED_MESSAGE;
      }
      if (!/^\d+$/.test(normalized)) {
        return ODOMETER_NUMBER_MESSAGE;
      }
      return null;
    }
    return repair.mileage_at_service == null ? ACT_EXPORT_ODOMETER_REQUIRED_MESSAGE : null;
  }

  async function handleDownloadRepairPdf(repairId: number) {
    const odometerMessage = getActOdometerValidationMessage(repairId);
    if (odometerMessage) {
      requestRepairMileageAttention();
      window.alert(odometerMessage);
      return;
    }
    setRepairPdfLoading(true);
    try {
      const blob = await openRepairPdfForPreview(repairId);
      setRepairPdfBlob(blob);
      markRepairPdfAvailable(repairId);
    } catch (error) {
      window.alert(getErrorMessage(error, "Unable to open the act."));
    } finally {
      setRepairPdfLoading(false);
    }
  }

  async function handleExportNewRepairPdfVersion(repairId: number) {
    const odometerMessage = getActOdometerValidationMessage(repairId);
    if (odometerMessage) {
      requestRepairMileageAttention();
      window.alert(odometerMessage);
      return;
    }
    setRepairPdfExportBusy(true);
    try {
      const blob = await exportRepairPdf(repairId);
      setRepairPdfBlob(blob);
      markRepairPdfAvailable(repairId);
    } catch (error) {
      window.alert(getErrorMessage(error, "Unable to export a new act version."));
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
    if (!repairModalNeedsMileageAttention || selectedRepairId === null || repairModalStatus !== "completed") {
      return;
    }

    const input = repairMileageInputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.scrollIntoView === "function") {
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }, [repairModalNeedsMileageAttention, repairModalStatus, selectedRepairId]);

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
      if (isPurchaseCreateModalOpen) {
        closePurchaseCreateModal();
      } else if (supplierCreateOpen) {
        setSupplierCreateOpen(false);
        setSupplierCreateError("");
      } else if (selectedSupplier) {
        closeSupplierEditModal();
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
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isPurchaseCreateModalOpen,
    supplierCreateOpen,
    selectedSupplier,
    closeSupplierEditModal,
    closePurchaseCreateModal,
    selectedPurchaseId,
    isVehicleFormOpen,
    selectedVehicleId,
    isCustomerFormOpen,
    selectedCustomerId,
    isRepairFormOpen,
    closePurchaseDetailModal,
    closeVehicleFormModal,
    closeVehicleDetailModal,
    closeCustomerFormModal,
    closeCustomerDetailModal,
    closeRepairCreateModal,
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

  function openVehicleCreateModal(fromRepairModal = false) {
    resetVehicleForm("");
    setIsInlineCustomerOpen(false);
    setInlineCustomerForm({ full_name: "", phone: "", email: "" });
    setInlineCustomerError("");
    setVehicleFromRepairModal(fromRepairModal);
    if (fromRepairModal) {
      closeRepairCreateModal();
    }
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
        const created = await api.post("/vehicles/", payload);
        if (vehicleFromRepairModal && created?.data?.id) {
          await loadRegistries();
          resetVehicleForm("");
          setIsVehicleFormOpen(false);
          setVehicleFromRepairModal(false);
          openRepairCreateModal({
            vehicleId: String(created.data.id),
            vehicleQuery: `${created.data.license_plate} • ${created.data.make} ${created.data.model}`,
          });
          return;
        }
      }
      await loadRegistries();
      resetVehicleForm("");
      setIsVehicleFormOpen(false);
      if (vehicleFromRepairModal) {
        setVehicleFromRepairModal(false);
        openRepairCreateModal();
      }
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

  const vehicleIdsNeedingActExport = useMemo(() => {
    const ids = new Set<number>();
    for (const repair of repairs) {
      if ((repair.status === "completed" || repair.status === "picked_up") && !repair.has_pdf) {
        ids.add(repair.vehicle_id);
      }
    }
    return ids;
  }, [repairs]);

  const selectedRepairVehicle = vehicles.find((vehicle) => String(vehicle.id) === repairForm.vehicle_id) ?? null;
  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? null;
  const canEditRepairWorkDetails =
    isAdmin ||
    (Boolean(selectedRepair?.master_id) && String(selectedRepair?.master_id) === String(user?.id));

  const repairOdometerReminderLead = useMemo(() => {
    if (!selectedRepair || repairModalStatus !== "completed" || repairModalMileageAtService.trim()) {
      return null;
    }
    const fromHistory = getLastRecordedOdometerFromRepairs(repairs, selectedRepair.vehicle_id);
    if (fromHistory) {
      return `The last recorded odometer for this vehicle was ${fromHistory.km.toLocaleString("en-US")} km (${fromHistory.tracking_code}).`;
    }
    const profileKm = parseVehicleProfileMileageKm(vehicleUiDetails[selectedRepair.vehicle_id]?.mileage);
    if (profileKm != null) {
      return `The vehicle profile still lists ${profileKm.toLocaleString("en-US")} km — enter the reading when the car was returned if it has changed.`;
    }
    return null;
  }, [
    repairModalMileageAtService,
    repairModalStatus,
    repairs,
    selectedRepair,
    vehicleUiDetails,
  ]);

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
  const purchaseModalRepairOptions = purchaseModalForm.vehicle_id
    ? repairs.filter((repair) => String(repair.vehicle_id) === purchaseModalForm.vehicle_id)
    : repairs;
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
  const moneyflowCalendarDays = useMemo<DashboardCalendarDay[]>(() => {
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
        isMonthStart: parsed ? parsed.getDate() === 1 : date.slice(-2) === "01",
      };
    });
  }, [moneyflowDateRange.end_date, moneyflowDateRange.start_date]);
  const moneyflowCalendarMonthSegments = useMemo<DashboardCalendarMonthSegment[]>(() => {
    const next: DashboardCalendarMonthSegment[] = [];

    moneyflowCalendarDays.forEach((day) => {
      const parsed = parseIsoDate(day.date);
      const monthKey = day.date.slice(0, 7);

      if (!parsed) {
        return;
      }

      const previous = next[next.length - 1];
      if (previous?.key === monthKey) {
        previous.span += 1;
        return;
      }

      next.push({
        key: monthKey,
        label: calendarMonthLabelFormatter.format(parsed),
        monthNumber: String(parsed.getMonth() + 1).padStart(2, "0"),
        year: String(parsed.getFullYear()),
        span: 1,
      });
    });

    return next;
  }, [moneyflowCalendarDays]);
  const moneyflowCalendarDisplayRange = useMemo(() => {
    const rangeStart = parseIsoDate(moneyflowDateRange.start_date);
    const rangeEnd = parseIsoDate(moneyflowDateRange.end_date);
    if (!rangeStart || !rangeEnd || rangeStart > rangeEnd) {
      return null;
    }

    const gridStart = new Date(rangeStart);
    gridStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
    const gridEnd = new Date(rangeEnd);
    gridEnd.setDate(rangeEnd.getDate() + (6 - ((rangeEnd.getDay() + 6) % 7)));

    return {
      start_date: formatIsoLocalDate(gridStart),
      end_date: formatIsoLocalDate(gridEnd),
    };
  }, [moneyflowDateRange.end_date, moneyflowDateRange.start_date]);
  const moneyflowCalendarLanes = useMemo<DashboardCalendarLane[]>(() => {
    const rangeStart = moneyflowCalendarDisplayRange?.start_date;
    const rangeEnd = moneyflowCalendarDisplayRange?.end_date;
    if (!rangeStart || !rangeEnd) {
      return [];
    }

    const dayIndexByDate = new Map(createIsoDateRange(rangeStart, rangeEnd).map((date, index) => [date, index]));
    const todayKey = getLocalTodayDate();
    const statusPriority: Record<RepairStatus, number> = {
      waiting_parts: 0,
      in_progress: 1,
      new: 2,
      completed: 3,
      picked_up: 4,
    };

    return repairs
      .map((repair) => {
        const linkedParts = purchases.filter(
          (entry) => !entry.is_shop_consumable && entry.repair_code.trim() === repair.tracking_code
        );
        const createdKey = toIsoDateKey(repair.created_at);
        if (!createdKey) {
          return null;
        }

        const completedKey = toIsoDateKey(repair.completed_at ?? "");
        const repairRawEndDate = completedKey || todayKey;
        const repairIntersectsRange = createdKey <= rangeEnd && repairRawEndDate >= rangeStart;

        const linkedPartDates = linkedParts
          .map((entry) => toIsoDateKey(entry.order_date))
          .filter((date): date is string => Boolean(date))
          .sort();
        const rawPartsStartDate = linkedPartDates[0] ?? null;
        const rawPartsEndDate = linkedPartDates[linkedPartDates.length - 1] ?? null;
        const partsVisibleStartDate =
          rawPartsStartDate && rawPartsStartDate <= rangeEnd
            ? rawPartsStartDate < rangeStart
              ? rangeStart
              : rawPartsStartDate
            : null;
        const partsVisibleEndDate =
          rawPartsEndDate && rawPartsEndDate >= rangeStart
            ? rawPartsEndDate > rangeEnd
              ? rangeEnd
              : rawPartsEndDate
            : null;
        const partsIntersectRange = Boolean(partsVisibleStartDate && partsVisibleEndDate);

        if (!repairIntersectsRange && !partsIntersectRange) {
          return null;
        }

        const visibleStartDate = createdKey < rangeStart ? rangeStart : createdKey;
        const repairVisibleEndCandidate = repairRawEndDate > rangeEnd ? rangeEnd : repairRawEndDate;
        const visibleEndDate = repairVisibleEndCandidate < rangeStart ? rangeStart : repairVisibleEndCandidate;
        const startColumn = dayIndexByDate.get(visibleStartDate);
        const endColumn = dayIndexByDate.get(visibleEndDate);

        if (startColumn == null || endColumn == null || endColumn < startColumn) {
          return null;
        }

        const partsStartColumn = partsVisibleStartDate ? dayIndexByDate.get(partsVisibleStartDate) ?? null : null;
        const partsEndColumn = partsVisibleEndDate ? dayIndexByDate.get(partsVisibleEndDate) ?? null : null;
        const partNames = Array.from(new Set(linkedParts.map((entry) => entry.part_name.trim()).filter(Boolean)));
        const estimatedKey = toIsoDateKey(repair.estimated_date ?? "");
        return {
          repair,
          linkedParts,
          visibleStartDate,
          visibleEndDate,
          startColumn,
          span: endColumn - startColumn + 1,
          isOverdue: Boolean(estimatedKey && estimatedKey < todayKey),
          partCount: linkedParts.length,
          partQuantity: linkedParts.reduce((sum, entry) => sum + entry.quantity, 0),
          partNames: partNames.slice(0, 3),
          partsVisibleStartDate,
          partsVisibleEndDate,
          partsStartColumn,
          partsSpan:
            partsStartColumn != null && partsEndColumn != null && partsEndColumn >= partsStartColumn
              ? partsEndColumn - partsStartColumn + 1
              : 0,
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
  }, [moneyflowCalendarDisplayRange, purchases, repairs]);
  const totalPartsSales = useMemo(
    () =>
      purchases.reduce(
        (sum, entry) =>
          entry.repair_code &&
          !entry.is_shop_consumable &&
          completedRepairCodesInMoneyflowRange.has(entry.repair_code)
            ? sum + entry.sale_price * entry.quantity
            : sum,
        0
      ),
    [completedRepairCodesInMoneyflowRange, purchases]
  );
  const totalServiceSales = useMemo(
    () =>
      completedRepairsForServiceSales.reduce(
        (sum, repair) => sum + getRepairLaborSaleTotal(repair, servicePriceByName),
        0
      ),
    [completedRepairsForServiceSales, servicePriceByName]
  );
  const visibleMoneyflowCalendarLanes = useMemo(
    () =>
      showMoneyflowRepairLayer || !showMoneyflowPartsLayer
        ? moneyflowCalendarLanes
        : moneyflowCalendarLanes.filter(
            (lane) => lane.partCount > 0 && lane.partsVisibleStartDate !== null && lane.partsVisibleEndDate !== null
          ),
    [moneyflowCalendarLanes, showMoneyflowPartsLayer, showMoneyflowRepairLayer]
  );
  const moneyflowCalendarGridDays = useMemo<DashboardCalendarGridDay[]>(() => {
    if (!moneyflowCalendarDisplayRange) {
      return [];
    }

    const todayKey = getLocalTodayDate();
    const next: DashboardCalendarGridDay[] = [];
    const cursor = parseIsoDate(moneyflowCalendarDisplayRange.start_date);
    const gridEnd = parseIsoDate(moneyflowCalendarDisplayRange.end_date);

    if (!cursor || !gridEnd) {
      return [];
    }

    while (cursor <= gridEnd) {
      const date = formatIsoLocalDate(cursor);
      const weekdayIndex = (cursor.getDay() + 6) % 7;
      next.push({
        date,
        dayNumber: String(cursor.getDate()),
        weekdayLabel: dashboardCalendarWeekdayLabels[weekdayIndex] ?? "",
        isWeekend: weekdayIndex >= 5,
        isToday: date === todayKey,
        isInRange: date >= moneyflowDateRange.start_date && date <= moneyflowDateRange.end_date,
        weekIndex: Math.floor(next.length / 7),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return next;
  }, [moneyflowCalendarDisplayRange, moneyflowDateRange.end_date, moneyflowDateRange.start_date]);
  const moneyflowCalendarWeeks = useMemo<DashboardCalendarWeek[]>(() => {
    if (moneyflowCalendarGridDays.length === 0) {
      return [];
    }

    const displayStart = moneyflowCalendarDisplayRange?.start_date ?? moneyflowDateRange.start_date;
    const displayEnd = moneyflowCalendarDisplayRange?.end_date ?? moneyflowDateRange.end_date;
    const repairSegmentsByWeek = new Map<number, DashboardCalendarBarSegment[]>();
    const partSegmentsByWeek = new Map<number, DashboardCalendarBarSegment[]>();
    const partsLanes = visibleMoneyflowCalendarLanes.filter((lane) => lane.partCount > 0);
    const todayKey = getLocalTodayDate();
    let nextPartStackIndex = 0;

    function pushSegment(
      bucketMap: Map<number, DashboardCalendarBarSegment[]>,
      definition: {
        key: string;
        startDate: string;
        endDate: string;
        layer: "repairs" | "parts";
        purchase: PurchaseEntry | null;
        label: string;
        stackIndex: number;
      },
      lane: DashboardCalendarLane
    ) {
      let cursor = definition.startDate;

      while (cursor <= definition.endDate) {
        const parsedCursor = parseIsoDate(cursor);
        if (!parsedCursor) {
          break;
        }

        const weekIndex = Math.floor(diffIsoDays(moneyflowCalendarGridDays[0].date, cursor) / 7);
        const normalizedWeekdayIndex = (parsedCursor.getDay() + 6) % 7;
        const weekEndDate = addDaysToIsoDate(cursor, 6 - normalizedWeekdayIndex);
        const segmentEnd = weekEndDate < definition.endDate ? weekEndDate : definition.endDate;
        const startColumn = normalizedWeekdayIndex + 1;
        const span = diffIsoDays(cursor, segmentEnd) + 1;
        const bucket = bucketMap.get(weekIndex) ?? [];

        bucket.push({
          key: `${definition.key}-${cursor}`,
          repair: lane.repair,
          layer: definition.layer,
          purchase: definition.purchase,
          weekIndex,
          startColumn,
          span,
          stackIndex: definition.stackIndex,
          label: definition.label,
          isActive: activeMoneyflowCalendarRepairId === lane.repair.id,
          isOverdue: lane.isOverdue,
        });
        bucketMap.set(weekIndex, bucket);
        cursor = addDaysToIsoDate(segmentEnd, 1);
      }
    }

    if (showMoneyflowRepairLayer) {
      visibleMoneyflowCalendarLanes.forEach((lane, laneIndex) => {
        pushSegment(
          repairSegmentsByWeek,
          {
            key: `repairs-${lane.repair.id}`,
            startDate: lane.visibleStartDate,
            endDate: lane.visibleEndDate,
            layer: "repairs",
            purchase: null,
            label: lane.repair.tracking_code,
            stackIndex: laneIndex,
          },
          lane
        );
      });
    }

    if (showMoneyflowPartsLayer) {
      partsLanes.forEach((lane) => {
        [...lane.linkedParts]
          .sort((left, right) => {
            const leftDate = toIsoDateKey(left.order_date) ?? "";
            const rightDate = toIsoDateKey(right.order_date) ?? "";
            if (leftDate !== rightDate) {
              return leftDate.localeCompare(rightDate);
            }
            return left.id - right.id;
          })
          .forEach((part) => {
            const orderDate = toIsoDateKey(part.order_date);
            if (!orderDate) {
              return;
            }

            const approximateDeliveryDate = toIsoDateKey(part.approximate_delivery_date);
            const rawEndDate = part.delivered ? approximateDeliveryDate || orderDate : approximateDeliveryDate || todayKey;
            const normalizedEndDate = rawEndDate < orderDate ? orderDate : rawEndDate;
            if (orderDate > displayEnd || normalizedEndDate < displayStart) {
              return;
            }

            const visiblePartStartDate = orderDate < displayStart ? displayStart : orderDate;
            const visiblePartEndDate = normalizedEndDate > displayEnd ? displayEnd : normalizedEndDate;
            if (visiblePartEndDate < visiblePartStartDate) {
              return;
            }

            pushSegment(
              partSegmentsByWeek,
              {
                key: `parts-${lane.repair.id}-${part.id}`,
                startDate: visiblePartStartDate,
                endDate: visiblePartEndDate,
                layer: "parts",
                purchase: part,
                label: part.part_name,
                stackIndex: nextPartStackIndex++,
              },
              lane
            );
          });
      });
    }

    return Array.from({ length: Math.ceil(moneyflowCalendarGridDays.length / 7) }, (_, weekIndex) => {
      const days = moneyflowCalendarGridDays.slice(weekIndex * 7, weekIndex * 7 + 7);
      const repairSegments = (repairSegmentsByWeek.get(weekIndex) ?? [])
        .sort((left, right) => {
          if (left.stackIndex !== right.stackIndex) {
            return left.stackIndex - right.stackIndex;
          }
          return left.startColumn - right.startColumn;
        })
        .map((segment, stackIndex) => ({ ...segment, stackIndex }));
      const partSegments = (partSegmentsByWeek.get(weekIndex) ?? [])
        .sort((left, right) => {
          if (left.stackIndex !== right.stackIndex) {
            return left.stackIndex - right.stackIndex;
          }
          return left.startColumn - right.startColumn;
        })
        .map((segment, stackIndex) => ({ ...segment, stackIndex }));

      return {
        weekIndex,
        days,
        repairSegments,
        repairStackCount: Math.max(repairSegments.length, 1),
        partSegments,
        partStackCount: Math.max(partSegments.length, 1),
      };
    });
  }, [
    activeMoneyflowCalendarRepairId,
    moneyflowCalendarDisplayRange,
    moneyflowCalendarGridDays,
    showMoneyflowPartsLayer,
    showMoneyflowRepairLayer,
    visibleMoneyflowCalendarLanes,
  ]);
  const activeMoneyflowCalendarLane =
    visibleMoneyflowCalendarLanes.find((lane) => lane.repair.id === activeMoneyflowCalendarRepairId) ?? null;
  const activeMoneyflowCalendarPurchase =
    moneyflowCalendarTooltip?.purchaseId != null
      ? purchases.find((purchase) => purchase.id === moneyflowCalendarTooltip.purchaseId) ?? null
      : null;
  const primaryMoneyflowMonthSegment = moneyflowCalendarMonthSegments[0] ?? null;
  useEffect(() => {
    if (visibleMoneyflowCalendarLanes.length === 0) {
      clearMoneyflowCalendarTooltip();
      return;
    }

    setActiveMoneyflowCalendarRepairId((current) =>
      current && visibleMoneyflowCalendarLanes.some((lane) => lane.repair.id === current) ? current : null
    );
    setMoneyflowCalendarTooltip((current) =>
      current && visibleMoneyflowCalendarLanes.some((lane) => lane.repair.id === current.repairId) ? current : null
    );
  }, [visibleMoneyflowCalendarLanes]);
  const dashboardTabs: Array<{ id: DashboardTab; label: string; shortLabel: string }> = [
    { id: "moneyflow", label: "MoneyFlow", shortLabel: "Money" },
    { id: "warehouse", label: "Warehouse", shortLabel: "Stock" },
    { id: "consumables", label: "Consumables", shortLabel: "Consumables" },
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

  function formatCount(value: number) {
    return new Intl.NumberFormat("pl-PL", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercent(value: number | null) {
    if (value == null) {
      return "—";
    }
    return new Intl.NumberFormat("pl-PL", {
      style: "percent",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDateTimeLabel(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "now";
    }
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
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
    const pdfTotals = dashboardAnalytics?.pdf?.latest_act_totals;
    const serviceToActDelta = pdfTotals ? pdfTotals.labor_total - totalServiceSales : null;
    const partsToActDelta = pdfTotals ? pdfTotals.parts_client_total - totalPartsSales : null;
    const combinedLiveTotal = totalServiceSales + totalPartsSales;
    const combinedToActDelta = pdfTotals ? pdfTotals.document_total - combinedLiveTotal : null;
    const pdfLag = dashboardAnalytics?.pdf?.completed_to_first_export_lag_days ?? null;
    const pdfAnalytics = dashboardAnalytics?.pdf ?? null;
    const serviceBoardAnalytics = dashboardAnalytics?.service_board ?? null;
    const warehouseAnalytics = dashboardAnalytics?.warehouse ?? null;
    const warehouseToday = new Date();
    const warehouseTodayDay = String(warehouseToday.getDate()).padStart(2, "0");
    const warehouseTodayMonth = calendarMonthLabelFormatter.format(warehouseToday).toUpperCase();
    const warehouseTodayYear = String(warehouseToday.getFullYear());
    const warehouseTodayWeekday = warehouseWeekdayFormatter.format(warehouseToday).toUpperCase();
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
    const setActiveDateRange = (updater: (current: DashboardDateRange) => DashboardDateRange) => {
      if (activeDashboardTab === "service_board") {
        setServiceBoardDateRange((current) => normalizeDashboardDateRange(updater(current)));
        return;
      }
      setMoneyflowDateRange((current) => normalizeDashboardDateRange(updater(current)));
    };
    const replaceActiveDateRange = (range: DashboardDateRange) => {
      setActiveDateRange(() => range);
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
    const renderWarehouseValuePanel = (
      title: string,
      description: string,
      values: { buy_total: number; sale_total: number; margin_total: number },
      toneClassName: string,
      info: ServiceBoardInfoButtonProps
    ) => (
      <article className={`dashboard-warehouse-value-card service-board-card-with-info ${toneClassName}`}>
        <ServiceBoardInfoButton {...info} />
        <div className="dashboard-warehouse-value-head">
          <span className="metric-label">{title}</span>
          <p>{description}</p>
        </div>
        <dl className="dashboard-warehouse-value-list">
          <div>
            <dt>Buy</dt>
            <dd>{formatCurrency(values.buy_total)}</dd>
          </div>
          <div>
            <dt>Sale</dt>
            <dd>{formatCurrency(values.sale_total)}</dd>
          </div>
          <div>
            <dt>Margin</dt>
            <dd>{formatCurrency(values.margin_total)}</dd>
          </div>
        </dl>
      </article>
    );
    const renderWarehouseSupplierPortfolioCell = (quantity: number | null | undefined, amount: number) => (
      <div className="dashboard-table-metric-cell">
        <strong>{formatCount(typeof quantity === "number" && Number.isFinite(quantity) ? quantity : 0)} pcs</strong>
        <span>{formatCurrency(amount)}</span>
      </div>
    );
    const renderWarehouseSupplierBreakdown = (rows: DashboardWarehouseSupplierRow[]) => (
      <table className="dashboard-table dashboard-supplier-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>On stock</th>
            <th>In transit</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((row) => {
            const supplierKey = `${row.supplier_id}-${row.supplier_name}`;
            const supplierRow = (
              <tr key={`supplier-${supplierKey}`} className="dashboard-supplier-table-row dashboard-supplier-table-row-supplier">
                <td>
                  <div className="dashboard-supplier-table-name">
                    <strong>{row.supplier_name || `ID ${row.supplier_id}`}</strong>
                    <span>{formatCount(row.parts.length)} {row.parts.length === 1 ? "part" : "parts"}</span>
                  </div>
                </td>
                <td>
                  {renderWarehouseSupplierPortfolioCell(
                    row.in_stock_quantity_total ?? (row.in_stock_buy_total > 0 ? row.quantity_total : 0),
                    row.in_stock_buy_total
                  )}
                </td>
                <td>
                  {renderWarehouseSupplierPortfolioCell(
                    row.in_transit_quantity_total ?? (row.in_transit_buy_total > 0 ? row.quantity_total : 0),
                    row.in_transit_buy_total
                  )}
                </td>
                <td>{renderWarehouseSupplierPortfolioCell(row.current_quantity_total ?? row.quantity_total ?? 0, row.current_buy_total)}</td>
              </tr>
            );
            const partRows = (row.parts ?? []).map((part) => (
              <tr key={`part-${supplierKey}-${part.part_name}`} className="dashboard-supplier-table-row dashboard-supplier-table-row-part">
                <td>
                  <span className="dashboard-supplier-table-part-name">{part.part_name}</span>
                </td>
                <td>{renderWarehouseSupplierPortfolioCell(part.in_stock_quantity_total, part.in_stock_buy_total)}</td>
                <td>{renderWarehouseSupplierPortfolioCell(part.in_transit_quantity_total, part.in_transit_buy_total)}</td>
                <td>{renderWarehouseSupplierPortfolioCell(part.current_quantity_total, part.current_buy_total)}</td>
              </tr>
            ));
            return [supplierRow, ...partRows];
          })}
        </tbody>
      </table>
    );
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
            {activeDashboardTab !== "warehouse" ? (
              <div className="dashboard-date-bar">
                <label className="dashboard-date-field dashboard-date-range-field">
                  <span>Date range</span>
                  <FriendlyDateRangeInput
                    startValue={activeDateRange.start_date}
                    endValue={activeDateRange.end_date}
                    onChange={replaceActiveDateRange}
                  />
                </label>
              </div>
            ) : null}
            {dashboardAnalyticsError && !dashboardAnalyticsLoading ? (
              <p className="workspace-note" role="alert">
                {dashboardAnalyticsError}
              </p>
            ) : null}
            {activeDashboardTab === "moneyflow" && (
              dashboardAnalyticsLoading ? (
                <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple" aria-live="polite">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="metric-card metric-card-skeleton" aria-hidden="true" />
                  ))}
                </div>
              ) : (
              <div className="workspace-stack">
                <section
                  className="dashboard-report-section dashboard-report-section-plan"
                  aria-label="Sales Plan"
                >
                  <p className="eyebrow">Planned movement</p>
                  <p className="workspace-copy">
                    Live estimate from the current service catalog and current purchase lines for repairs completed in
                    the selected period.
                  </p>

                  <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple">
                    <article className="metric-card metric-card-plan service-board-card-with-info">
                      <ServiceBoardInfoButton
                        title="Service sales (live)"
                        summary="This card estimates service revenue from the current service catalog for repairs completed in the selected period."
                        formula="Sum current catalog prices for services attached to repairs completed inside the selected date range."
                        notes={["The value is live and may differ from acts if service prices changed after repair completion."]}
                      />
                      <span className="metric-label">Service sales (live)</span>
                      <strong>{formatCurrency(totalServiceSales)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.labor_total ?? null, serviceToActDelta)}
                      <p>From the service catalog API for the selected period.</p>
                    </article>
                    <article className="metric-card metric-card-plan service-board-card-with-info">
                      <ServiceBoardInfoButton
                        title="Parts sales (live)"
                        summary="This card estimates parts resale revenue from purchase lines linked to repairs completed in the selected range."
                        formula="Sum purchase line sale prices for lines attached to repairs completed inside the selected date range."
                      />
                      <span className="metric-label">Parts sales (live)</span>
                      <strong>{formatCurrency(totalPartsSales)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.parts_client_total ?? null, partsToActDelta)}
                      <p>Purchase lines tied to repairs completed in the selected range.</p>
                    </article>
                    <article className="metric-card metric-card-accent service-board-card-with-info">
                      <ServiceBoardInfoButton
                        title="Combined live (services + parts)"
                        summary="This card combines live service and live parts estimates for completed jobs in the selected period."
                        formula="Combined live = Service sales (live) + Parts sales (live)."
                      />
                      <span className="metric-label">Combined live (services + parts)</span>
                      <strong>{formatCurrency(combinedLiveTotal)}</strong>
                      {renderMetricComparison("Acts", pdfTotals?.document_total ?? null, combinedToActDelta)}
                      <p>Live estimate: services plus parts resale for completed jobs in range.</p>
                    </article>
                  </div>
                </section>

                <section
                  className="dashboard-report-section dashboard-report-section-fact"
                  aria-label="Acts Coverage"
                >
                  <p className="eyebrow">Act coverage</p>
                  <p className="workspace-copy">
                    Track how many completed repairs already have an exported act in the selected period.
                  </p>

                  {pdfAnalytics ? (
                    <div className="dashboard-report-stack">
                      <article className={`dashboard-fact-hero dashboard-fact-hero-${coverageState} service-board-card-with-info`}>
                        <ServiceBoardInfoButton
                          title="Coverage status"
                          summary="This hero card shows how much of the completed work in the selected range already has at least one exported act."
                          formula="Coverage % = repairs with latest act / completed repairs in range × 100."
                          notes={["The status label is derived from whether coverage is empty, missing, partial, or complete."]}
                        />
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
                        <article className="metric-card metric-card-fact service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Missing acts"
                            summary="This card counts completed repairs in the selected range that still do not have their first act export."
                            formula="Completed repairs in range - repairs with latest act."
                          />
                          <span className="metric-label">Missing acts</span>
                          <strong>{missingActs}</strong>
                          <p>Completed repairs still waiting for their first act.</p>
                        </article>
                        <article className="metric-card metric-card-fact service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Median time to first act"
                            summary="This card shows the typical delay between repair completion and the first stored act export."
                            formula="Median(first act export date - repair completion date) across covered completed repairs in range."
                          />
                          <span className="metric-label">Median time to first act</span>
                          <strong>{pdfLag?.median != null ? `${pdfLag.median} d` : "—"}</strong>
                          <p>
                            {pdfLag?.sample_size
                              ? "From repair completion to first export."
                              : "No completed repairs with an exported act yet."}
                          </p>
                        </article>
                        <article className="metric-card metric-card-fact service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Re-exported repairs"
                            summary="This card counts completed repairs whose acts were exported more than once."
                            formula="Count completed repairs in range with more than one stored act version."
                          />
                          <span className="metric-label">Re-exported repairs</span>
                          <strong>{pdfAnalytics.completed_repairs_with_multiple_exports}</strong>
                          <p>Completed repairs with more than one stored act version.</p>
                        </article>
                        <article className="metric-card metric-card-fact service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Act exports in period"
                            summary="This card counts every act export event created inside the selected period."
                            formula="Count stored act export records with created date inside the selected range."
                          />
                          <span className="metric-label">Act exports in period</span>
                          <strong>{pdfAnalytics.exports_in_period}</strong>
                          <p>Stored act exports created inside the selected period.</p>
                        </article>
                      </div>
                    </div>
                  ) : (
                    <p className="workspace-note">Billing analytics unavailable (check connection or sign-in).</p>
                  )}
                </section>

                {serviceBoardAnalytics ? (
                  <section className="dashboard-report-section" aria-label="Masters">
                    <div className="dashboard-report-head">
                      <div>
                        <p className="eyebrow">Masters</p>
                        <h3>Current load and performance</h3>
                        <p className="workspace-copy">
                          {formatCount(serviceBoardAnalytics.all_time_totals.masters_total)} masters in the workshop roster.
                        </p>
                      </div>
                    </div>
                    <div className="dashboard-grid">
                      <section className="panel dashboard-mini-panel">
                        <div className="panel-header">
                          <div>
                            <p className="eyebrow">Current load</p>
                            <h3>Assigned now</h3>
                          </div>
                        </div>
                        <div className="dashboard-worker-grid dashboard-worker-grid-masters">
                          {serviceBoardAnalytics.masters_current.length === 0 ? (
                            <p className="workspace-note">No masters configured yet.</p>
                          ) : null}
                          {serviceBoardAnalytics.masters_current.map((master) => (
                            <article
                              className="dashboard-worker-card dashboard-worker-card-master dashboard-worker-card-master-current service-board-card-with-info"
                              key={`current-${master.master_id}`}
                            >
                              <ServiceBoardInfoButton
                                title={`${master.display_name} current load`}
                                summary="This card shows the current live workload for the selected master."
                                formula="Open now = New + In progress + Waiting parts for repairs currently assigned to this master and not yet completed."
                                notes={[
                                  "These counts reflect the current board state, not a historical range snapshot.",
                                  "Money is intentionally not shown here; financial value stays in Completed work.",
                                ]}
                              />
                              <div className="dashboard-worker-topline">
                                <strong>{master.display_name}</strong>
                                <span className="tag">{formatCount(master.assigned_open_current)} open</span>
                              </div>
                              <div
                                className="dashboard-worker-status-grid dashboard-worker-status-grid-master"
                                aria-label={`${master.display_name} current status breakdown`}
                              >
                                <div className="dashboard-worker-status-cell">
                                  <span>New</span>
                                  <strong>{formatCount(master.current_status_counts.new)}</strong>
                                </div>
                                <div className="dashboard-worker-status-cell">
                                  <span>In progress</span>
                                  <strong>{formatCount(master.current_status_counts.in_progress)}</strong>
                                </div>
                                <div className="dashboard-worker-status-cell">
                                  <span>Waiting parts</span>
                                  <strong>{formatCount(master.current_status_counts.waiting_parts)}</strong>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="panel dashboard-mini-panel">
                        <div className="panel-header">
                          <div>
                            <p className="eyebrow">Range performance</p>
                            <h3>Completed work</h3>
                          </div>
                        </div>
                        <div className="dashboard-worker-grid dashboard-worker-grid-masters">
                          {serviceBoardAnalytics.masters_range.length === 0 ? (
                            <p className="workspace-note">No range performance data available.</p>
                          ) : null}
                          {serviceBoardAnalytics.masters_range.map((master) => (
                            <article
                              className="dashboard-worker-card dashboard-worker-card-master dashboard-worker-card-master-range service-board-card-with-info"
                              key={`range-${master.master_id}`}
                            >
                              <ServiceBoardInfoButton
                                title={`${master.display_name} range performance`}
                                summary="This card shows how the selected master performed inside the active Service Board range."
                                formula="Done = completed repairs in range; Median = median cycle time for the master's completed repairs in range; Actual = sum of completed service value in range."
                              />
                              <div className="dashboard-worker-topline">
                                <strong>{master.display_name}</strong>
                                <span className="tag">{formatCount(master.completed_in_range)} done</span>
                              </div>
                              <div className="dashboard-worker-stats">
                                <span>
                                  Median{" "}
                                  {master.median_cycle_time_days != null ? `${master.median_cycle_time_days} d` : "—"}
                                </span>
                                <span>Actual {formatCurrency(master.actual_service_value_completed)}</span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  </section>
                ) : null}
              </div>
              )
            )}

            {activeDashboardTab === "warehouse" ? (
              <div className="workspace-stack">
                <section className="dashboard-report-section dashboard-report-section-warehouse dashboard-report-section-warehouse-open">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Live stock</p>
                      <h3>Current Stock Position</h3>
                    </div>
                    <div className="dashboard-warehouse-date-window" aria-label="Current date">
                      <div className="dashboard-warehouse-date-window-main">
                        <strong className="dashboard-warehouse-date-window-day">{warehouseTodayDay}</strong>
                        <div className="dashboard-warehouse-date-window-copy">
                          <span>{warehouseTodayMonth}. {warehouseTodayYear}</span>
                          <small>{warehouseTodayWeekday}</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="workspace-copy">
                    Live stock snapshot for the full purchase portfolio, independent from the paginated Purchases list
                    and the currently selected date range.
                  </p>

                  {warehouseAnalytics ? (
                    <div className="dashboard-report-stack">
                      <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-warehouse-hero">
                        <article className="metric-card metric-card-warehouse dashboard-warehouse-hero-card service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="On stock total"
                            summary="This card shows every delivered unit currently present in the live stock snapshot."
                            formula="Count all delivered quantities currently on stock."
                          />
                          <span className="metric-label">On stock total</span>
                          <strong>{formatCount(warehouseAnalytics.stock_totals.delivered_quantity_total)}</strong>
                          <p>All delivered units currently in the live stock snapshot.</p>
                        </article>
                        <article className="metric-card metric-card-warehouse dashboard-warehouse-hero-card service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Assigned"
                            summary="This card shows delivered units already reserved against a repair through a repair code."
                            formula="Count delivered quantities whose purchase lines are linked to a repair code."
                          />
                          <span className="metric-label">Assigned</span>
                          <strong>{formatCount(warehouseAnalytics.stock_totals.assigned_quantity_total)}</strong>
                          <p>Delivered units already linked to a repair via repair code.</p>
                        </article>
                        <article className="metric-card metric-card-warehouse dashboard-warehouse-hero-card service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="Free / unassigned"
                            summary="This card shows delivered units that are still not assigned to any repair."
                            formula="Count delivered quantities without a linked repair code."
                          />
                          <span className="metric-label">Free / unassigned</span>
                          <strong>{formatCount(warehouseAnalytics.stock_totals.free_quantity_total)}</strong>
                          <p>Delivered units still free from any repair assignment.</p>
                        </article>
                        <article className="metric-card metric-card-warehouse dashboard-warehouse-hero-card dashboard-warehouse-hero-card-transit service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="In transit"
                            summary="This card shows ordered quantities that have not yet been marked as delivered."
                            formula="Count ordered quantities on lines where delivered = false."
                          />
                          <span className="metric-label">In transit</span>
                          <strong>{formatCount(warehouseAnalytics.stock_totals.in_transit_quantity_total)}</strong>
                          <p>Ordered units that have not been marked as delivered yet.</p>
                        </article>
                      </div>

                      <div className="dashboard-warehouse-value-grid">
                        {renderWarehouseValuePanel(
                          "In stock value",
                          "Delivered lines valued by purchase and resale totals.",
                          warehouseAnalytics.valuations.in_stock,
                          "dashboard-warehouse-value-card-stock",
                          {
                            title: "In stock value",
                            summary: "This card values the currently delivered portfolio using purchase cost, resale value, and implied margin.",
                            formula: "Buy = sum purchase totals on delivered lines; Sale = sum resale totals on delivered lines; Margin = Sale - Buy.",
                          }
                        )}
                        {renderWarehouseValuePanel(
                          "In transit value",
                          "Open incoming lines valued before they land on stock.",
                          warehouseAnalytics.valuations.in_transit,
                          "dashboard-warehouse-value-card-transit",
                          {
                            title: "In transit value",
                            summary: "This card values the open incoming portfolio before items are marked as delivered.",
                            formula: "Buy = sum purchase totals on undelivered lines; Sale = sum resale totals on undelivered lines; Margin = Sale - Buy.",
                          }
                        )}
                      </div>

                      <div className="dashboard-warehouse-cumulative-strip" aria-label="Cumulative totals">
                        <div className="dashboard-warehouse-cumulative-cell service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="All-time buy"
                            summary="This cell shows total purchase cost across the cumulative tracked warehouse portfolio."
                            formula="Sum cumulative buy totals across in-stock and in-transit warehouse valuations."
                          />
                          <span className="metric-label">All-time buy</span>
                          <strong>{formatCurrency(warehouseAnalytics.valuations.cumulative.buy_total)}</strong>
                        </div>
                        <div className="dashboard-warehouse-cumulative-cell service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="All-time sale"
                            summary="This cell shows total resale value across the cumulative tracked warehouse portfolio."
                            formula="Sum cumulative sale totals across in-stock and in-transit warehouse valuations."
                          />
                          <span className="metric-label">All-time sale</span>
                          <strong>{formatCurrency(warehouseAnalytics.valuations.cumulative.sale_total)}</strong>
                        </div>
                        <div className="dashboard-warehouse-cumulative-cell service-board-card-with-info">
                          <ServiceBoardInfoButton
                            title="All-time margin"
                            summary="This cell shows the cumulative gross margin implied by tracked purchase and resale values."
                            formula="All-time margin = All-time sale - All-time buy."
                          />
                          <span className="metric-label">All-time margin</span>
                          <strong>{formatCurrency(warehouseAnalytics.valuations.cumulative.margin_total)}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="workspace-note">Warehouse snapshot unavailable (check connection or sign-in).</p>
                  )}
                </section>

                <section className="dashboard-report-section">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Invoice split</p>
                      <h3>Invoice Coverage</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Invoice presence is based on either an uploaded invoice name or an invoice URL on the purchase line.
                  </p>
                  {warehouseAnalytics ? (
                    <div className="dashboard-warehouse-invoice-grid">
                      <article className="metric-card dashboard-warehouse-invoice-card dashboard-warehouse-invoice-card-covered service-board-card-with-info">
                        <ServiceBoardInfoButton
                          title="With invoice"
                          summary="This card counts purchase lines that already have invoice evidence attached."
                          formula="Count lines where invoice name or invoice URL is present."
                        />
                        <span className="metric-label">With invoice</span>
                        <strong>{formatCount(warehouseAnalytics.invoice_split.with_invoice.line_count)} lines</strong>
                        <p>
                          Qty {formatCount(warehouseAnalytics.invoice_split.with_invoice.quantity_total)} • Buy{" "}
                          {formatCurrency(warehouseAnalytics.invoice_split.with_invoice.buy_total)}
                        </p>
                      </article>
                      <article className="metric-card dashboard-warehouse-invoice-card dashboard-warehouse-invoice-card-missing service-board-card-with-info">
                        <ServiceBoardInfoButton
                          title="Without invoice"
                          summary="This card counts purchase lines that still have no uploaded invoice name and no invoice URL."
                          formula="Count lines where both invoice name and invoice URL are missing."
                        />
                        <span className="metric-label">Without invoice</span>
                        <strong>{formatCount(warehouseAnalytics.invoice_split.without_invoice.line_count)} lines</strong>
                        <p>
                          Qty {formatCount(warehouseAnalytics.invoice_split.without_invoice.quantity_total)} • Buy{" "}
                          {formatCurrency(warehouseAnalytics.invoice_split.without_invoice.buy_total)}
                        </p>
                      </article>
                    </div>
                  ) : (
                    <p className="workspace-note">Invoice coverage unavailable.</p>
                  )}
                </section>

                <section className="dashboard-report-section">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Current portfolio</p>
                      <h3>Supplier portfolio</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Full current supplier portfolio with supplier totals and part-level stock/transit breakdown.
                  </p>
                  {warehouseAnalytics?.suppliers_top_current?.length ? (
                    renderWarehouseSupplierBreakdown(warehouseAnalytics.suppliers_top_current)
                  ) : (
                    <p className="workspace-note">No suppliers in the current stock portfolio.</p>
                  )}
                </section>

              </div>
            ) : null}

            {activeDashboardTab === "consumables" ? (
              <div className="workspace-stack">
                <section className="dashboard-report-section" aria-label="Shop consumables">
                  <div className="dashboard-report-head">
                    <div>
                      <p className="eyebrow">Outside completion act</p>
                      <h3>Shop consumables</h3>
                    </div>
                  </div>
                  <p className="workspace-copy">
                    Shop supplies (chemistry, gloves, fluids, etc.) recorded as purchases. They are excluded from
                    completion act totals and from warehouse stock KPIs. Range totals here mirror MoneyFlow; each line
                    is listed under Purchases → Consumables.
                  </p>
                  {dashboardAnalytics?.moneyflow?.shop_consumables ? (
                    <div className="metric-grid dashboard-metric-grid dashboard-metric-grid-triple">
                      <article className="metric-card">
                        <span className="metric-label">Lines in range</span>
                        <strong>{formatCount(dashboardAnalytics.moneyflow.shop_consumables.line_count)}</strong>
                        <p>Purchase lines flagged as shop consumables.</p>
                      </article>
                      <article className="metric-card">
                        <span className="metric-label">Buy total (range)</span>
                        <strong>{formatCurrency(dashboardAnalytics.moneyflow.shop_consumables.buy_total)}</strong>
                        <p>Sum of quantity × purchase price in the selected period.</p>
                      </article>
                    </div>
                  ) : null}
                  <p className="workspace-note">
                    Line-level consumables are listed under Purchases → Consumables.
                  </p>
                </section>
              </div>
            ) : null}

            {activeDashboardTab === "service_board" ? (
              <div className="workspace-stack">
                {serviceBoardAnalytics ? (
                  <>
                    <section className="dashboard-report-section" aria-label="Selected range">
                      <div className="dashboard-report-head">
                        <div>
                          <p className="eyebrow">Selected range</p>
                          <h3>Service Board KPIs</h3>
                        </div>
                      </div>
                      <p className="workspace-copy">
                        Range cards use the selected Service Board window. Open repairs are calculated as backlog at the
                        end of that range.
                      </p>
                      <div className="dashboard-grid dashboard-grid-service-board-range">
                        <section className="panel dashboard-mini-panel">
                          <div className="panel-header">
                            <div>
                              <p className="eyebrow">Operations in range</p>
                              <h3>Repair flow</h3>
                            </div>
                          </div>
                          <div className="metric-grid service-board-range-flow-grid">
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Open repairs"
                                summary="This card shows backlog at the end of the selected Service Board range."
                                formula="Count repairs that were still not completed on the selected range end date."
                                notes={[
                                  "This is a historical end-of-range snapshot, not the live value right now.",
                                  "Use it to compare backlog pressure between different date windows.",
                                ]}
                              />
                              <span className="metric-label">Open repairs</span>
                              <strong>{formatCount(serviceBoardAnalytics.range_summary.open_repairs_end_of_range)}</strong>
                              <p>Repairs still not completed by the range end date.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Waiting parts"
                                summary="This card shows how many repairs are currently blocked by missing parts."
                                formula="Count current open repairs where the latest status is Waiting parts."
                                notes={[
                                  "This is a live snapshot based on the current status.",
                                  "It is not recalculated as a historical value for the selected range.",
                                ]}
                              />
                              <span className="metric-label">Waiting parts</span>
                              <strong>{formatCount(serviceBoardAnalytics.current_snapshot.waiting_parts_current)}</strong>
                              <p>Live-only metric based on the current status.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Completed"
                                summary="This card counts repairs that were finished inside the selected Service Board window."
                                formula="Count repairs whose completion date falls inside the selected range."
                              />
                              <span className="metric-label">Completed</span>
                              <strong>{formatCount(serviceBoardAnalytics.range_summary.completed_repairs_in_range)}</strong>
                              <p>Closed jobs used for range performance.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Median cycle time"
                                summary="This card shows the typical turnaround time for repairs completed in the selected range."
                                formula="Median(completion date - repair created date) for repairs completed in the selected range."
                                notes={["A median is used so one extreme repair does not skew the whole card."]}
                              />
                              <span className="metric-label">Median cycle time</span>
                              <strong>
                                {serviceBoardAnalytics.range_summary.median_cycle_time_days != null
                                  ? `${serviceBoardAnalytics.range_summary.median_cycle_time_days} d`
                                  : "—"}
                              </strong>
                              <p>For repairs completed in the selected range.</p>
                            </article>
                          </div>
                        </section>

                        <section className="panel dashboard-mini-panel">
                          <div className="panel-header">
                            <div>
                              <p className="eyebrow">Customer base in range</p>
                              <h3>Vehicles and clients</h3>
                            </div>
                          </div>
                          <div className="metric-grid service-board-range-customer-grid">
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Vehicles"
                                summary="This card shows how many unique vehicles were represented by repairs intersecting the selected range."
                                formula="Count distinct vehicles linked to repairs that overlap the selected range."
                              />
                              <span className="metric-label">Vehicles</span>
                              <strong>{formatCount(serviceBoardAnalytics.range_summary.vehicles_in_range)}</strong>
                              <p>Unique vehicles with repairs intersecting the range.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Customers"
                                summary="This card shows how many unique customers were represented by repairs intersecting the selected range."
                                formula="Count distinct customers linked to repairs that overlap the selected range."
                              />
                              <span className="metric-label">Customers</span>
                              <strong>{formatCount(serviceBoardAnalytics.range_summary.customers_in_range)}</strong>
                              <p>Unique customers represented by those repairs.</p>
                            </article>
                          </div>
                        </section>
                      </div>
                    </section>

                    <section className="dashboard-report-section" aria-label="All-time totals">
                      <div className="dashboard-report-head">
                        <div>
                          <p className="eyebrow">All-time totals</p>
                          <h3>Registry baseline</h3>
                        </div>
                      </div>
                      <div className="dashboard-grid">
                        <section className="panel dashboard-mini-panel">
                          <div className="panel-header">
                            <div>
                              <p className="eyebrow">Registry totals</p>
                              <h3>Workshop objects</h3>
                            </div>
                          </div>
                          <div className="metric-grid metric-grid-three">
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Repairs"
                                summary="This card shows the total number of repair records stored in the system."
                                formula="Count all repair records."
                              />
                              <span className="metric-label">Repairs</span>
                              <strong>{formatCount(serviceBoardAnalytics.all_time_totals.repairs_total)}</strong>
                              <p>All repair records in the system.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Vehicles"
                                summary="This card shows how many distinct vehicles have at least one repair in history."
                                formula="Count distinct vehicles with at least one repair history entry."
                              />
                              <span className="metric-label">Vehicles</span>
                              <strong>{formatCount(serviceBoardAnalytics.all_time_totals.vehicles_total)}</strong>
                              <p>Total vehicles with at least one repair history entry.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info">
                              <ServiceBoardInfoButton
                                title="Customers"
                                summary="This card shows how many distinct customers appear in repair history."
                                formula="Count distinct customers represented in repair history."
                              />
                              <span className="metric-label">Customers</span>
                              <strong>{formatCount(serviceBoardAnalytics.all_time_totals.customers_total)}</strong>
                              <p>Total customers represented in repair history.</p>
                            </article>
                          </div>
                        </section>

                        <section className="panel dashboard-mini-panel">
                          <div className="panel-header">
                            <div>
                              <p className="eyebrow">Customer totals</p>
                              <h3>Loyalty split</h3>
                            </div>
                          </div>
                          <div className="metric-grid service-board-loyalty-grid">
                            <article className="metric-card service-board-card-with-info service-board-loyalty-card">
                              <ServiceBoardInfoButton
                                title="Returning customers"
                                summary="This card shows customers who came back for at least one additional repair."
                                formula="Count customers with two or more repairs across the full history."
                              />
                              <span className="metric-label">Returning customers</span>
                              <strong>{formatCount(serviceBoardAnalytics.all_time_totals.returning_customers_total)}</strong>
                              <p>Customers with two or more repairs across the full history.</p>
                            </article>
                            <article className="metric-card service-board-card-with-info service-board-loyalty-card">
                              <ServiceBoardInfoButton
                                title="Non-returning customers"
                                summary="This card shows customers who have only one repair in the system so far."
                                formula="Count customers with exactly one repair across the full history."
                              />
                              <span className="metric-label">Non-returning customers</span>
                              <strong>{formatCount(serviceBoardAnalytics.all_time_totals.non_returning_customers_total)}</strong>
                              <p>Customers with only one repair in the full history.</p>
                            </article>
                          </div>
                        </section>
                      </div>
                    </section>
                  </>
                ) : (
                  <p className="workspace-note">Service Board analytics unavailable for this range.</p>
                )}
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
                    <p className="phone-display">{formatPolishPhoneDisplay(customer.phone) || "—"}</p>
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
            <section className="modal-card modal-card-large customer-form-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Customer Intake</p>
                  <h3>{editingCustomerId ? "Edit Customer" : "Create Customer"}</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeCustomerFormModal}>
                  Close
                </button>
              </div>

              <form className="stack-form customer-form-stack" onSubmit={handleCustomerSubmit}>
                <div className="customer-form-modal-scroll">
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

                </div>

                <div className="form-actions repair-modal-footer-bar">
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
              className="modal-card modal-card-large customer-detail-modal"
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

              <div className="modal-body-scroll">
              <div className="customer-detail-stack">
                <div className="detail-card">
                  <strong>Contact</strong>
                  <VehicleMetaRow
                    icon={<IconPhone />}
                    text={formatPolishPhoneDisplay(selectedCustomer.phone) || "—"}
                    title="Phone"
                    textClassName="phone-display"
                  />
                  <VehicleMetaRow
                    icon={<IconEmail />}
                    text={selectedCustomer.email || "No email provided"}
                    title="Email"
                  />
                  <VehicleMetaRow icon={<IconNote />} text={selectedCustomer.notes || "No notes yet"} title="Notes" />
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
                          {vehicle.vin ? <VehicleVinRow vin={vehicle.vin} /> : null}
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
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  function renderVehicleFormModal() {
    if (!isVehicleFormOpen) return null;
    return (
      <div className="modal-overlay repair-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="vehicle-form-modal-title" onClick={closeVehicleFormModal}>
        <div
          className={`modal${compactStaffNarrowLayout ? " modal--mobile" : " modal--lg"}`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-header__titles">
              <p className="modal-header__eyebrow">Vehicle Intake</p>
              <h2 className="modal-header__title" id="vehicle-form-modal-title">{editingVehicleId ? "Edit Vehicle" : "Register Vehicle"}</h2>
            </div>
            <div className="modal-header__actions">
              <button type="button" className="icon-btn" aria-label="Close" onClick={closeVehicleFormModal}>×</button>
            </div>
          </div>

          <form className="modal-form" onSubmit={handleVehicleSubmit}>
            <div className="modal-body">

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
                        {customer.full_name}
                        {customer.phone ? ` · ${formatPolishPhoneDisplay(customer.phone)}` : ""}
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
                  <div className="modal-footer__primary-cluster" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="button button-secondary" onClick={() => setIsInlineCustomerOpen(false)}>
                      Cancel
                    </button>
                    <button type="button" className="button" disabled={isSavingInlineCustomer} onClick={() => void handleInlineCustomerSave()}>
                      {isSavingInlineCustomer ? "Creating…" : "Create & Select"}
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
                    ariaLabel="Last Service Date"
                    value={vehicleForm.last_service_date}
                    onChange={(nextValue) => setVehicleForm((current) => ({ ...current, last_service_date: nextValue }))}
                  />
                </label>
              </div>

              <label>
                <span>Date Added</span>
                <FriendlyDateInput
                  ariaLabel="Date Added"
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

            </div>

            {(() => {
              const vehicleMissingFields = [
                ...(!vehicleForm.customer_id ? ["Owner"] : []),
                ...(!vehicleForm.license_plate.trim() ? ["License plate"] : []),
                ...(!vehicleForm.make.trim() ? ["Make"] : []),
                ...(!vehicleForm.model.trim() ? ["Model"] : []),
              ];
              return (
                <div className={`modal-footer${vehicleMissingFields.length > 0 ? " modal-footer--stacked" : " modal-footer--right"}`}>
                  <div className="modal-footer__primary-cluster">
                    <button type="button" className="button button-secondary" onClick={closeVehicleFormModal}>
                      Cancel
                    </button>
                    <button type="submit" className="button" disabled={isSavingVehicle || vehicleMissingFields.length > 0}>
                      {isSavingVehicle ? "Saving..." : editingVehicleId ? "Update Vehicle" : "Create Vehicle"}
                    </button>
                  </div>
                  <RequiredChips fields={vehicleMissingFields} />
                </div>
              );
            })()}
          </form>
        </div>
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
            <button type="button" className="button" onClick={() => openVehicleCreateModal()}>
              + Add Vehicle
            </button>
          </div>
        </div>

        <div className="purchases-list-outer">
          {emptyServerList ? (
            <div className="purchases-empty-panel">
              <p className="workspace-note">
                {vehicleSearch.trim() ? "No vehicles match your search." : "No vehicles yet."}
              </p>
              {!vehicleSearch.trim() ? (
                <>
                  <p className="workspace-note purchases-empty-copy">{meta.copy}</p>
                  <button type="button" className="button" onClick={() => openVehicleCreateModal()}>
                    + Add Vehicle
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <StaffVehiclesMobileList
                vehicles={sectionVehicles}
                getVehicleDetails={getVehicleDetails}
                vehicleNeedsActExport={(vehicleId) => vehicleIdsNeedingActExport.has(vehicleId)}
                onOpenVehicle={openVehicleDetailModal}
              />

              <StaffVehiclesRegistry
                vehicles={sectionVehicles}
                getVehicleDetails={getVehicleDetails}
                vehicleNeedsActExport={(vehicleId) => vehicleIdsNeedingActExport.has(vehicleId)}
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

              <div className="modal-body-scroll">
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
                  onOpenRepair={(repair) => {
                    closeVehicleDetailModal();
                    openRepairModal(repair);
                  }}
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
                  onOpenRepair={(repair) => {
                    closeVehicleDetailModal();
                    openRepairModal(repair);
                  }}
                />
              </div>
              </div>

              <div className="form-actions vehicle-modal-actions repair-modal-footer-bar">
                <button type="button" className="button button-secondary" onClick={closeVehicleDetailModal}>
                  Cancel
                </button>
              </div>
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

        {/* Topbar — hidden on mobile for staff (mobile rail); visible for admins like Vehicles */}
        <div
          className={`kanban-topbar repairs-section-topbar${
            isStaff ? " repairs-section-topbar--staff-mobile-skip" : ""
          }`}
        >
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
            onCopyTrackingCode={handleCopyTrackingCode}
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
          />
        </div>
      </div>
    );
  }

  function renderPurchasesSection() {
    const emptyWarehouse = purchases.length === 0;
    const warehouseLoadedRemaining = Math.max(0, purchaseCount - purchases.length);
    const emptyConsumables = consumablePurchases.length === 0;
    const consumableLoadedRemaining = Math.max(0, consumableCount - consumablePurchases.length);
    const notInventoriedConsumables = consumablePurchases.filter(
      (entry) => entry.current_stock_quantity == null && !entry.inventory_checked_on
    );
    const activeConsumables = consumablePurchases.filter(
      (entry) => entry.current_stock_quantity != null && entry.current_stock_quantity > 0 && Boolean(entry.inventory_checked_on)
    );
    const outOfStockConsumables = consumablePurchases.filter(
      (entry) => entry.current_stock_quantity === 0 && Boolean(entry.inventory_checked_on)
    );
    const visibleConsumables = [...notInventoriedConsumables, ...activeConsumables];
    const meta = sectionMeta.purchases;

    const purchasesWorkspaceTabs: Array<{ id: PurchasesWorkspaceTab; label: string; shortLabel: string }> = [
      { id: "warehouse", label: "Warehouse", shortLabel: "Stock" },
      { id: "consumables", label: "Consumables", shortLabel: "Consume" },
      { id: "suppliers", label: "Suppliers", shortLabel: "Supp." },
    ];

    const purchasesAddButtonLabel =
      activePurchasesTab === "warehouse"
        ? "+ Add part line"
        : activePurchasesTab === "consumables"
          ? "+ Add consumable"
          : "+ Add supplier";

    function handlePurchasesPrimaryAdd() {
      if (activePurchasesTab === "warehouse") {
        openPurchaseCreateModal("warehouse");
      } else if (activePurchasesTab === "consumables") {
        openPurchaseCreateModal("consumables");
      } else {
        setSupplierCreateForm({ name: "", nip: "", phone: "", email: "", registered_address: "", notes: "" });
        setSupplierCreateError("");
        setSupplierCreateOpen(true);
      }
    }

    function toggleConsumableExpand(id: number) {
      setExpandedConsumableId((cur) => (cur === id ? null : id));
    }

    function renderConsumableMobileItem(entry: PurchaseEntry, muted: boolean) {
      const draft = getConsumableInventoryDraft(entry);
      const isDirty = isConsumableInventoryDraftDirty(entry);
      const expanded = expandedConsumableId === entry.id;
      const buyTotal = formatCurrency(entry.purchase_price * entry.quantity);

      return (
        <li
          key={`${muted ? "oos" : "vis"}-${entry.id}`}
          className={`purchases-mobile-consumable-item${expanded ? " purchases-mobile-consumable-item--expanded" : ""}${muted ? " purchases-mobile-consumable-item--muted" : ""}`}
        >
          <button
            type="button"
            className="purchases-mobile-consumable-summary"
            aria-expanded={expanded}
            onClick={() => toggleConsumableExpand(entry.id)}
          >
            <span className="purchases-mobile-consumable-summary-text">
              <span className="purchases-mobile-consumable-name">{entry.part_name}</span>
              <span className="purchases-mobile-consumable-meta">
                {entry.supplier_name}
                <span className="purchases-mobile-consumable-sep" aria-hidden>
                  ·
                </span>
                {buyTotal}
              </span>
            </span>
            <span
              className={`purchases-mobile-consumable-chevron${expanded ? " purchases-mobile-consumable-chevron--open" : ""}`}
              aria-hidden
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          {expanded ? (
            <div className="purchases-mobile-consumable-detail">
              <div className="purchases-mobile-consumable-detail-grid">
                <div className="purchases-mobile-consumable-readonly">
                  <span className="purchases-mobile-field-label">Order</span>
                  <span>{formatDisplayDate(entry.order_date)}</span>
                </div>
                <div className="purchases-mobile-consumable-readonly">
                  <span className="purchases-mobile-field-label">Bought</span>
                  <span>{formatInventoryInputValue(entry.quantity)}</span>
                </div>
                <div className="purchases-mobile-consumable-readonly">
                  <span className="purchases-mobile-field-label">Unit</span>
                  <span>{entry.unit_of_measure_code}</span>
                </div>
                <div className="purchases-mobile-consumable-readonly">
                  <span className="purchases-mobile-field-label">Buy</span>
                  <span>{buyTotal}</span>
                </div>
                <div className="purchases-mobile-consumable-invoice-row">
                  <span className="purchases-mobile-field-label">Invoice</span>
                  <span className="purchases-mobile-consumable-invoice-value">
                    {renderPurchaseInvoiceCellContent(entry, handleOpenInvoice, {
                      openButtonClassName: "button button-secondary button-sm purchase-inline-action",
                    })}
                  </span>
                </div>
              </div>

              <label className="uom-mobile-field">
                <span>Inventory date</span>
                <input
                  className="inventory-stock-input"
                  aria-label={`Inventory date ${entry.part_name}`}
                  type="date"
                  value={draft.inventory_checked_on}
                  onChange={(event) =>
                    updateConsumableInventoryDraft(entry, {
                      inventory_checked_on: event.target.value,
                      error: "",
                    })
                  }
                  placeholder="Not inventoried"
                />
                {entry.inventory_checked_on == null && draft.current_stock_quantity.trim() === "" ? (
                  <small className="consumable-inventory-hint">Not inventoried</small>
                ) : null}
              </label>

              <label className="uom-mobile-field">
                <span>On hand</span>
                <input
                  className="inventory-stock-input"
                  value={draft.current_stock_quantity}
                  aria-label={`On hand ${entry.part_name}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Not inventoried"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue.trim() !== "") {
                      const numericValue = Number(nextValue.replace(",", "."));
                      if (Number.isFinite(numericValue) && numericValue > entry.quantity) {
                        updateConsumableInventoryDraft(entry, {
                          current_stock_quantity: formatInventoryInputValue(entry.quantity),
                          error: "",
                        });
                        return;
                      }
                    }
                    updateConsumableInventoryDraft(entry, {
                      current_stock_quantity: nextValue,
                      error: "",
                    });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleConsumableStockSave(entry);
                    }
                  }}
                />
              </label>

              <div className="consumable-inventory-actions">
                <button
                  type="button"
                  className="button button-secondary consumable-save-button"
                  onClick={() => void handleConsumableStockSave(entry)}
                  disabled={!isDirty || draft.isSaving}
                >
                  {draft.isSaving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="button" onClick={() => openPurchaseDetailModal(entry)}>
                  Full details
                </button>
                {draft.error ? <small className="form-error consumable-inventory-error">{draft.error}</small> : null}
              </div>
            </div>
          ) : null}
        </li>
      );
    }

    return (
      <div className="workspace-stack purchases-workspace">
        <div className="kanban-topbar purchases-section-topbar">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2>{meta.title}</h2>
            {activePurchasesTab === "warehouse" && purchaseCount > 0 ? (
              <span className="registry-count">
                {purchaseCount} total
                {purchases.length !== purchaseCount ? ` · ${purchases.length} loaded` : ""}
              </span>
            ) : null}
            {activePurchasesTab === "consumables" && consumableCount > 0 ? (
              <span className="registry-count">
                {consumableCount} total
                {consumablePurchases.length !== consumableCount ? ` · ${consumablePurchases.length} loaded` : ""}
              </span>
            ) : null}
            {activePurchasesTab === "suppliers" && suppliers.length > 0 ? (
              <span className="registry-count">
                {suppliers.length} {suppliers.length === 1 ? "supplier" : "suppliers"}
              </span>
            ) : null}
          </div>
          <div className="workspace-top-actions purchases-top-actions">
            {activePurchasesTab === "warehouse" ? (
              <label className="kanban-search">
                <input
                  value={purchaseSearch}
                  onChange={(event) => setPurchaseSearch(event.target.value)}
                  placeholder="Search warehouse lines…"
                  type="search"
                />
              </label>
            ) : null}
            {activePurchasesTab === "consumables" ? (
              <label className="kanban-search">
                <input
                  value={consumableSearch}
                  onChange={(event) => setConsumableSearch(event.target.value)}
                  placeholder="Search consumables…"
                  type="search"
                />
              </label>
            ) : null}
            {activePurchasesTab === "suppliers" ? (
              <label className="kanban-search">
                <input
                  value={supplierRegistrySearch}
                  onChange={(event) => setSupplierRegistrySearch(event.target.value)}
                  placeholder="Search suppliers…"
                  type="search"
                />
              </label>
            ) : null}
            <button type="button" className="button" onClick={handlePurchasesPrimaryAdd}>
              {purchasesAddButtonLabel}
            </button>
          </div>
        </div>

        <div className="dashboard-folder-tabs purchases-folder-tabs" role="tablist" aria-label="Purchases sections">
          {purchasesWorkspaceTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={activePurchasesTab === tab.id}
              className={`dashboard-folder-tab ${activePurchasesTab === tab.id ? "dashboard-folder-tab-active" : ""}`}
              onClick={() => setActivePurchasesTab(tab.id)}
            >
              <span className="dashboard-folder-label">
                <span className="dashboard-folder-label-long">{tab.label}</span>
                <span className="dashboard-folder-label-short">{tab.shortLabel}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="dashboard-folder-panel purchases-folder-panel">
          {activePurchasesTab === "warehouse" ? (
            <div className="purchases-list-outer">
              {isPurchasesLoading ? (
                <div className="purchases-skeleton" aria-live="polite">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="purchases-skeleton-row" aria-hidden="true" />
                  ))}
                </div>
              ) : emptyWarehouse ? (
                <div className="purchases-empty-panel">
                  <p className="workspace-note">
                    {purchaseSearch.trim() ? "No warehouse lines match your search." : "No warehouse lines yet."}
                  </p>
                </div>
              ) : compactStaffNarrowLayout ? (
                <ul className="purchases-mobile-stock-list" aria-label="Warehouse lines">
                  {purchases.map((entry) => {
                    const saleTotal = entry.quantity * entry.sale_price;
                    const overdue =
                      !entry.delivered && isPurchaseDeliveryOverdue(entry.approximate_delivery_date);
                    const missingInv = !hasPurchaseInvoice(entry);
                    const attention = overdue || missingInv;
                    const hints: string[] = [];
                    if (overdue) {
                      hints.push("Delivery overdue");
                    }
                    if (missingInv) {
                      hints.push("No invoice");
                    }
                    if (!entry.vehicle_id && !entry.vehicle_label?.trim()) {
                      hints.push("No vehicle");
                    }
                    if (!entry.repair_code.trim()) {
                      hints.push("No repair");
                    }
                    const deliveryLabel = entry.approximate_delivery_date
                      ? formatDisplayDate(entry.approximate_delivery_date)
                      : "";
                    return (
                      <li
                        key={entry.id}
                        className={`purchases-mobile-stock-item${attention ? " purchases-mobile-stock-item--attention" : ""}`}
                      >
                        <button
                          type="button"
                          className="purchases-mobile-stock-row"
                          onClick={() => openPurchaseDetailModal(entry)}
                          title={hints.length ? hints.join(" · ") : undefined}
                        >
                          <span className="purchases-mobile-stock-accent" aria-hidden />
                          <span className="purchases-mobile-stock-text">
                            <span className="purchases-mobile-stock-name">{entry.part_name}</span>
                            <span className="purchases-mobile-stock-meta">
                              <span className="purchases-mobile-stock-delivery">{deliveryLabel}</span>
                              <span className="purchases-mobile-stock-sale">{formatCurrency(saleTotal)}</span>
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="purchases-registry-table-wrap">
                  <table className="dashboard-table purchases-registry-table">
                    <colgroup>
                      <col className="purchases-registry-col--warehouse-part" />
                      <col className="purchases-registry-col--warehouse-supplier" />
                      <col className="purchases-registry-col--warehouse-date" />
                      <col className="purchases-registry-col--warehouse-date" />
                      <col className="purchases-registry-col--warehouse-qty" />
                      <col className="purchases-registry-col--warehouse-repair" />
                      <col className="purchases-registry-col--warehouse-money" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Part</th>
                        <th>Supplier</th>
                        <th>Order</th>
                        <th>Delivery</th>
                        <th>Qty</th>
                        <th>Repair</th>
                        <th>Sale</th>
                      </tr>
                    </thead>
                    <tbody className="purchases-compact-list">
                      {purchases.map((entry) => {
                        const saleTotal = entry.quantity * entry.sale_price;
                        const overdue =
                          !entry.delivered && isPurchaseDeliveryOverdue(entry.approximate_delivery_date);
                        const missingInv = !hasPurchaseInvoice(entry);
                        const attention = overdue || missingInv;
                        const hints: string[] = [];
                        if (overdue) {
                          hints.push("Delivery overdue");
                        }
                        if (missingInv) {
                          hints.push("No invoice");
                        }
                        if (!entry.vehicle_id && !entry.vehicle_label?.trim()) {
                          hints.push("No vehicle");
                        }
                        if (!entry.repair_code.trim()) {
                          hints.push("No repair");
                        }
                        const repairLabel = entry.repair_code.trim() || "—";
                        return (
                          <tr
                            key={entry.id}
                            role="button"
                            tabIndex={0}
                            className={`purchases-compact-row${attention ? " purchases-compact-row--attention" : ""}`}
                            onClick={() => openPurchaseDetailModal(entry)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openPurchaseDetailModal(entry);
                              }
                            }}
                            title={hints.length ? hints.join(" · ") : undefined}
                          >
                            <td>{entry.part_name}</td>
                            <td>{entry.supplier_name}</td>
                            <td>{formatDisplayDate(entry.order_date)}</td>
                            <td>
                              {entry.approximate_delivery_date ? formatDisplayDate(entry.approximate_delivery_date) : "—"}
                            </td>
                            <td>{entry.quantity}</td>
                            <td>{repairLabel}</td>
                            <td>{formatCurrency(saleTotal)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {purchaseHasMore && !emptyWarehouse ? (
                <div className="load-more-bar">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void loadMorePurchases()}
                    disabled={purchaseLoadingMore}
                  >
                    {purchaseLoadingMore ? "Loading…" : `Load more (${warehouseLoadedRemaining} remaining)`}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {activePurchasesTab === "consumables" ? (
            <div className="purchases-list-outer">
              {isConsumablesLoading ? (
                <div className="purchases-skeleton" aria-live="polite">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="purchases-skeleton-row" aria-hidden="true" />
                  ))}
                </div>
              ) : emptyConsumables ? (
                <div className="purchases-empty-panel">
                  <p className="workspace-note">
                    {consumableSearch.trim() ? "No consumables match your search." : "No shop consumables yet."}
                  </p>
                </div>
              ) : (
                <div className="purchases-consumables-layout">
                  {visibleConsumables.length > 0 ? (
                    compactStaffNarrowLayout ? (
                      <ul className="purchases-mobile-consumable-list">
                        {visibleConsumables.map((entry) => renderConsumableMobileItem(entry, false))}
                      </ul>
                    ) : (
                      <div className="purchases-registry-table-wrap">
                        <table className="dashboard-table purchases-registry-table purchases-registry-table--wide">
                          <colgroup>
                            <col className="purchases-registry-col--part" />
                            <col className="purchases-registry-col--supplier" />
                            <col className="purchases-registry-col--date" />
                            <col className="purchases-registry-col--qty" />
                            <col className="purchases-registry-col--unit" />
                            <col className="purchases-registry-col--money" />
                            <col className="purchases-registry-col--invoice" />
                            <col className="purchases-registry-col--inventory-date" />
                            <col className="purchases-registry-col--inventory-qty" />
                            <col className="purchases-registry-col--action" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th>Supplier</th>
                              <th>Order</th>
                              <th>Bought</th>
                              <th>Unit</th>
                              <th>Buy</th>
                              <th>Invoice</th>
                              <th>Inv. date</th>
                              <th>On hand</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody className="purchases-compact-list">
                            {visibleConsumables.map((entry) => {
                              const draft = getConsumableInventoryDraft(entry);
                              const isDirty = isConsumableInventoryDraftDirty(entry);
                              return (
                                <tr
                                  key={entry.id}
                                  role="button"
                                  tabIndex={0}
                                  className="purchases-compact-row"
                                  onClick={() => openPurchaseDetailModal(entry)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      openPurchaseDetailModal(entry);
                                    }
                                  }}
                                >
                                <td>{entry.part_name}</td>
                                <td>{entry.supplier_name}</td>
                                <td>{formatDisplayDate(entry.order_date)}</td>
                                <td>{formatInventoryInputValue(entry.quantity)}</td>
                                <td>{entry.unit_of_measure_code}</td>
                                <td>{formatCurrency(entry.purchase_price * entry.quantity)}</td>
                                <td>{renderPurchaseInvoiceCellContent(entry, handleOpenInvoice)}</td>
                                <td>
                                  <input
                                    className="inventory-stock-input"
                                    aria-label={`Inventory date ${entry.part_name}`}
                                    type="date"
                                    value={draft.inventory_checked_on}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) =>
                                      updateConsumableInventoryDraft(entry, {
                                        inventory_checked_on: event.target.value,
                                        error: "",
                                      })
                                    }
                                    placeholder="Not inventoried"
                                  />
                                  {entry.inventory_checked_on == null && draft.current_stock_quantity.trim() === "" ? (
                                    <small className="consumable-inventory-hint">Not inventoried</small>
                                  ) : null}
                                </td>
                                <td>
                                  <input
                                    className="inventory-stock-input"
                                    value={draft.current_stock_quantity}
                                    aria-label={`On hand ${entry.part_name}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Not inventoried"
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      if (nextValue.trim() !== "") {
                                        const numericValue = Number(nextValue.replace(",", "."));
                                        if (Number.isFinite(numericValue) && numericValue > entry.quantity) {
                                          updateConsumableInventoryDraft(entry, {
                                            current_stock_quantity: formatInventoryInputValue(entry.quantity),
                                            error: "",
                                          });
                                          return;
                                        }
                                      }
                                      updateConsumableInventoryDraft(entry, {
                                        current_stock_quantity: nextValue,
                                        error: "",
                                      });
                                    }}
                                    onKeyDown={(event) => {
                                      event.stopPropagation();
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        void handleConsumableStockSave(entry);
                                      }
                                    }}
                                  />
                                </td>
                                <td>
                                  <div className="consumable-inventory-actions" onClick={(event) => event.stopPropagation()}>
                                    <button
                                      type="button"
                                      className="button button-secondary consumable-save-button"
                                      onClick={() => void handleConsumableStockSave(entry)}
                                      disabled={!isDirty || draft.isSaving}
                                    >
                                      {draft.isSaving ? "Saving…" : "Save"}
                                    </button>
                                    {draft.error ? <small className="form-error consumable-inventory-error">{draft.error}</small> : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    )
                  ) : (
                    <div className="purchases-empty-panel">
                      <p className="workspace-note">All inventoried consumables are currently out of stock.</p>
                    </div>
                  )}

                  {outOfStockConsumables.length > 0 ? (
                    <section className="consumable-out-of-stock-section" aria-label="Out of stock consumables">
                      <button
                        type="button"
                        className="button button-secondary consumable-out-of-stock-toggle"
                        onClick={() => setShowOutOfStockConsumables((current) => !current)}
                      >
                        {showOutOfStockConsumables ? "Hide" : "Show"} Out of stock ({outOfStockConsumables.length})
                      </button>
                      {showOutOfStockConsumables ? (
                        compactStaffNarrowLayout ? (
                          <ul className="purchases-mobile-consumable-list purchases-mobile-consumable-list--oos">
                            {outOfStockConsumables.map((entry) => renderConsumableMobileItem(entry, true))}
                          </ul>
                        ) : (
                          <div className="purchases-registry-table-wrap">
                            <table className="dashboard-table purchases-registry-table purchases-registry-table--wide">
                              <colgroup>
                                <col className="purchases-registry-col--part" />
                                <col className="purchases-registry-col--supplier" />
                                <col className="purchases-registry-col--date" />
                                <col className="purchases-registry-col--qty" />
                                <col className="purchases-registry-col--unit" />
                                <col className="purchases-registry-col--money" />
                                <col className="purchases-registry-col--invoice" />
                                <col className="purchases-registry-col--inventory-date" />
                                <col className="purchases-registry-col--inventory-qty" />
                                <col className="purchases-registry-col--action" />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>Part</th>
                                  <th>Supplier</th>
                                  <th>Order</th>
                                  <th>Bought</th>
                                  <th>Unit</th>
                                  <th>Buy</th>
                                  <th>Invoice</th>
                                  <th>Inv. date</th>
                                  <th>On hand</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody className="purchases-compact-list">
                                {outOfStockConsumables.map((entry) => {
                                  const draft = getConsumableInventoryDraft(entry);
                                  const isDirty = isConsumableInventoryDraftDirty(entry);
                                  return (
                                    <tr
                                      key={entry.id}
                                      role="button"
                                      tabIndex={0}
                                      className="purchases-compact-row purchases-compact-row--muted"
                                      onClick={() => openPurchaseDetailModal(entry)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          openPurchaseDetailModal(entry);
                                        }
                                      }}
                                    >
                                    <td>{entry.part_name}</td>
                                    <td>{entry.supplier_name}</td>
                                    <td>{formatDisplayDate(entry.order_date)}</td>
                                    <td>{formatInventoryInputValue(entry.quantity)}</td>
                                    <td>{entry.unit_of_measure_code}</td>
                                    <td>{formatCurrency(entry.purchase_price * entry.quantity)}</td>
                                    <td>{renderPurchaseInvoiceCellContent(entry, handleOpenInvoice)}</td>
                                    <td>
                                      <input
                                        className="inventory-stock-input"
                                        aria-label={`Inventory date ${entry.part_name} out of stock`}
                                        type="date"
                                        value={draft.inventory_checked_on}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                          updateConsumableInventoryDraft(entry, {
                                            inventory_checked_on: event.target.value,
                                            error: "",
                                          })
                                        }
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="inventory-stock-input"
                                        value={draft.current_stock_quantity}
                                        aria-label={`On hand ${entry.part_name} out of stock`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) => {
                                          const nextValue = event.target.value;
                                          if (nextValue.trim() !== "") {
                                            const numericValue = Number(nextValue.replace(",", "."));
                                            if (Number.isFinite(numericValue) && numericValue > entry.quantity) {
                                              updateConsumableInventoryDraft(entry, {
                                                current_stock_quantity: formatInventoryInputValue(entry.quantity),
                                                error: "",
                                              });
                                              return;
                                            }
                                          }
                                          updateConsumableInventoryDraft(entry, {
                                            current_stock_quantity: nextValue,
                                            error: "",
                                          });
                                        }}
                                        onKeyDown={(event) => {
                                          event.stopPropagation();
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void handleConsumableStockSave(entry);
                                          }
                                        }}
                                      />
                                    </td>
                                    <td>
                                      <div className="consumable-inventory-actions" onClick={(event) => event.stopPropagation()}>
                                        <button
                                          type="button"
                                          className="button button-secondary consumable-save-button"
                                          onClick={() => void handleConsumableStockSave(entry)}
                                          disabled={!isDirty || draft.isSaving}
                                        >
                                          {draft.isSaving ? "Saving…" : "Save"}
                                        </button>
                                        {draft.error ? <small className="form-error consumable-inventory-error">{draft.error}</small> : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        )
                      ) : null}
                    </section>
                  ) : null}
                </div>
              )}
              {consumableHasMore && !emptyConsumables ? (
                <div className="load-more-bar">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => void loadMoreConsumables()}
                    disabled={consumableLoadingMore}
                  >
                    {consumableLoadingMore ? "Loading…" : `Load more (${consumableLoadedRemaining} remaining)`}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {activePurchasesTab === "suppliers" ? (
            <div className="purchases-list-outer">
              {filteredSuppliers.length === 0 ? (
                <div className="purchases-empty-panel">
                  <p className="workspace-note">
                    {supplierRegistrySearch.trim() ? "No suppliers match your search." : "No suppliers yet."}
                  </p>
                </div>
              ) : compactStaffNarrowLayout ? (
                <ul className="purchases-mobile-supplier-list" aria-label="Suppliers">
                  {filteredSuppliers.map((s) => {
                    const phoneLabel = s.phone ? formatPolishPhoneDisplay(s.phone) : "";
                    const emailLabel = s.email?.trim() ? s.email.trim() : "";
                    return (
                      <li key={s.id} className="purchases-mobile-supplier-item">
                        <button
                          type="button"
                          className="purchases-mobile-supplier-row"
                          onClick={() => openSupplierEditModal(s)}
                        >
                          <span className="purchases-mobile-supplier-accent" aria-hidden />
                          <span className="purchases-mobile-supplier-body">
                            <span className="purchases-mobile-supplier-name">{s.name}</span>
                            <span className="purchases-mobile-supplier-meta">
                              <span className="purchases-mobile-supplier-line">
                                {s.nip?.trim() ? `NIP ${s.nip.trim()}` : "No NIP"}
                                {phoneLabel ? ` · ${phoneLabel}` : ""}
                              </span>
                              {emailLabel ? (
                                <span className="purchases-mobile-supplier-line purchases-mobile-supplier-line--muted">
                                  {emailLabel}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="purchases-registry-table-wrap">
                  <table className="dashboard-table purchases-registry-table">
                    <colgroup>
                      <col className="purchases-registry-col--supplier-name" />
                      <col className="purchases-registry-col--supplier-nip" />
                      <col className="purchases-registry-col--supplier-phone" />
                      <col className="purchases-registry-col--supplier-email" />
                      <col className="purchases-registry-col--supplier-address" />
                      <col className="purchases-registry-col--supplier-notes" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>NIP</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Reg. Address</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody className="purchases-compact-list">
                      {filteredSuppliers.map((s) => (
                        <tr
                          key={s.id}
                          role="button"
                          tabIndex={0}
                          className="purchases-compact-row"
                          onClick={() => openSupplierEditModal(s)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openSupplierEditModal(s);
                            }
                          }}
                        >
                          <td>{s.name}</td>
                          <td>{s.nip || "—"}</td>
                          <td className="phone-display">{s.phone ? formatPolishPhoneDisplay(s.phone) : "—"}</td>
                          <td>{s.email || "—"}</td>
                          <td>{s.registered_address || "—"}</td>
                          <td>{s.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {selectedPurchase ? (
          <div
            className="modal-overlay repair-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-modal-title"
            onClick={closePurchaseDetailModal}
          >
            <div
              className="modal modal--lg"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-header__titles">
                  <p className="modal-header__eyebrow">Purchases</p>
                  <h2 className="modal-header__title" id="purchase-modal-title">{selectedPurchase.part_name}</h2>
                  <div className="modal-header__meta" role="tablist" aria-label="Purchase detail sections">
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
                </div>
                <div className="modal-header__actions">
                  <button type="button" className="icon-btn" aria-label="Close" onClick={closePurchaseDetailModal}>×</button>
                </div>
              </div>

              <div className="purchase-modal-delivery-strip purchase-modal-delivery-strip--detail">
                <PurchaseDeliveryStatusCard
                  delivered={purchaseModalForm.delivered}
                  onChange={(nextDelivered) =>
                    setPurchaseModalForm((current) => ({ ...current, delivered: nextDelivered }))
                  }
                />
              </div>

              <div className="modal-body">
                {purchaseDetailModalTab === "order" ? (
                <div className="detail-card">
                  <strong>Purchase Info</strong>
                  <div className="stack-form">
                    <div className="form-grid purchase-detail-date-grid">
                      <label>
                        <span>Order Date</span>
                        <FriendlyDateInput
                          ariaLabel="Order Date"
                          value={purchaseModalForm.order_date}
                          onChange={(nextValue) =>
                            setPurchaseModalForm((current) => ({ ...current, order_date: nextValue }))
                          }
                        />
                      </label>

                      <label>
                        <span>Delivery Date</span>
                        <FriendlyDateInput
                          ariaLabel="Delivery Date"
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
                          min={getQuantityFieldProps(purchaseModalForm.unit_of_measure_id).min}
                          step={getQuantityFieldProps(purchaseModalForm.unit_of_measure_id).step}
                        />
                      </label>
                      <label>
                        <span>Unit of measure</span>
                        <select
                          value={purchaseModalForm.unit_of_measure_id}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, unit_of_measure_id: event.target.value }))
                          }
                        >
                          {unitsOfMeasure.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.code})
                            </option>
                          ))}
                        </select>
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
                      <span className="purchases-delivered-field__control">
                        <input
                          type="checkbox"
                          className="purchases-delivered-field__input"
                          checked={purchaseModalForm.is_shop_consumable}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({
                              ...current,
                              is_shop_consumable: event.target.checked,
                            }))
                          }
                        />
                        <span className="purchases-delivered-field__check" aria-hidden="true" />
                      </span>
                      <span className="purchases-delivered-field__text">Shop consumable (excluded from completion act)</span>
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

              </div>

              <div className="modal-footer modal-footer--split">
                <button type="button" className="button button-danger" onClick={() => void handlePurchaseDelete()}>
                  Delete Purchase
                </button>
                <div className="modal-footer__primary-cluster">
                  <button type="button" className="button button-secondary" onClick={closePurchaseDetailModal}>
                    Cancel
                  </button>
                  <button type="button" className="button" onClick={handlePurchaseModalSave}>
                    Save Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isPurchaseCreateModalOpen && purchaseCreateMode ? (
          <div
            className="modal-overlay repair-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-create-modal-title"
            onClick={closePurchaseCreateModal}
          >
            <div
              className={`modal${compactStaffNarrowLayout ? " modal--mobile" : " modal--lg"}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <p className="modal-header__eyebrow">New Invoice</p>
                <h2 className="modal-header__title" id="purchase-create-modal-title">
                  {purchaseCreateMode === "warehouse" ? "Warehouse purchase" : "Shop consumables"}
                </h2>
                <div className="modal-header__actions">
                  <button type="button" className="icon-btn" aria-label="Close" onClick={closePurchaseCreateModal}>×</button>
                </div>
              </div>

              <form
                className="modal-form"
                onSubmit={handlePurchaseSubmit}
                onDragOver={(event) => {
                  if ([...event.dataTransfer.types].includes("Files")) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }
                }}
              >
                <div className="modal-body">
                <div className="purchase-modal-delivery-strip purchase-modal-delivery-strip--create">
                  <PurchaseDeliveryStatusCard
                    delivered={purchaseForm.delivered}
                    onChange={(nextDelivered) =>
                      setPurchaseForm((current) => ({ ...current, delivered: nextDelivered }))
                    }
                  />
                </div>
                  <PurchaseInvoiceImportBlock
                    onApplyParsed={applyPurchaseLineImport}
                    linkInvoiceFileAfterScan={attachPurchaseCreateInvoiceFile}
                  />
                  <div className="form-grid">
                    <label>
                      <span>Order Date</span>
                      <FriendlyDateInput
                        ariaLabel="Order Date"
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
                        ariaLabel="Approximate Delivery Date"
                        value={purchaseForm.approximate_delivery_date}
                        onChange={(nextValue) =>
                          setPurchaseForm((current) => ({ ...current, approximate_delivery_date: nextValue }))
                        }
                      />
                    </label>

                    <label className={purchaseImportSupplierNeedsAttention ? "purchase-field--needs-attention" : undefined}>
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

                  {purchaseLineRows.length > 1 ? (
                    <p className="workspace-note purchase-invoice-lines-hint">
                      Lines start collapsed — tap a row to edit. Rows that need review after import open
                      automatically.
                    </p>
                  ) : (
                    <p className="workspace-note purchase-invoice-lines-hint">
                      Line starts collapsed — tap the row to edit part, prices, and links.
                    </p>
                  )}

                  <div className="purchase-invoice-lines">
                    {purchaseLineRows.map((row, lineIndex) => {
                      const lineRepairOptions = row.vehicle_id
                        ? repairs.filter((repair) => String(repair.vehicle_id) === row.vehicle_id)
                        : repairs;
                      const lineImportNeedsAttention = purchaseImportLineNeedsAttention[lineIndex] === true;
                      const lineMeta = buildPurchaseInvoiceLineMeta(row, unitsOfMeasure);
                      const primary = getPurchaseInvoiceLinePrimaryDisplay(
                        row,
                        purchaseCreateMode === "consumables" ? "consumables" : "warehouse",
                        purchaseLineRows.length
                      );
                      const lineAria =
                        purchaseLineRows.length > 1
                          ? `Invoice row ${lineIndex + 1}: ${row.part_name.trim() || "empty part name"}`
                          : `Invoice line: ${row.part_name.trim() || "empty part name"}`;
                      const lineDetailsId = `purchase-line-details-${row.clientLineId}`;
                      const lineExpandedExplicit = purchaseLineExpandById[row.clientLineId];
                      const lineExpanded = lineExpandedExplicit === true;
                      return (
                        <div
                          key={row.clientLineId}
                          className={`purchase-invoice-line-card${
                            lineExpanded ? " purchase-invoice-line-card--expanded" : ""
                          }`}
                          role="group"
                          aria-label={lineAria}
                        >
                          <div className="purchase-invoice-line-card-header">
                            <button
                              type="button"
                              className="purchase-invoice-line-toggle"
                              aria-expanded={lineExpanded}
                              aria-controls={lineDetailsId}
                              onClick={() =>
                                setPurchaseLineExpandById((prev) => {
                                  const current = prev[row.clientLineId] === true;
                                  return { ...prev, [row.clientLineId]: !current };
                                })
                              }
                            >
                              <span className="purchase-invoice-line-chevron-wrap" aria-hidden="true">
                                <svg
                                  className="purchase-invoice-line-chevron"
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M9 6l6 6-6 6"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                              <div className="purchase-invoice-line-heading">
                                {purchaseLineRows.length > 1 ? (
                                  <span className="purchase-invoice-line-badge" aria-hidden="true">
                                    {lineIndex + 1}
                                  </span>
                                ) : null}
                                <div className="purchase-invoice-line-heading-text">
                                  <span
                                    className={`purchase-invoice-line-primary${
                                      row.part_name.trim() ? "" : " purchase-invoice-line-primary--placeholder"
                                    }`}
                                    title={primary.title}
                                  >
                                    {primary.text}
                                  </span>
                                  {lineMeta || lineImportNeedsAttention ? (
                                    <span className="purchase-invoice-line-heading-meta-row">
                                      {lineMeta ? (
                                        <span className="purchase-invoice-line-meta">{lineMeta}</span>
                                      ) : null}
                                      {lineImportNeedsAttention ? (
                                        <span className="purchase-invoice-line-review-pill">Needs review</span>
                                      ) : null}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                            {purchaseLineRows.length > 1 ? (
                              <button
                                type="button"
                                className="purchase-inline-action purchase-inline-action-danger"
                                onClick={() => removePurchaseLineRowAt(lineIndex)}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>

                          <div
                            id={lineDetailsId}
                            className="purchase-invoice-line-details"
                            hidden={!lineExpanded}
                          >
                          <label
                            className={lineImportNeedsAttention ? "purchase-field--needs-attention" : undefined}
                          >
                            <span>{purchaseCreateMode === "warehouse" ? "Part" : "Item"}</span>
                            <input
                              value={row.part_name}
                              onChange={(event) =>
                                updatePurchaseLineRow(lineIndex, { part_name: event.target.value })
                              }
                              type="text"
                              placeholder={
                                purchaseCreateMode === "warehouse" ? "Part name or SKU" : "Consumable name"
                              }
                              required
                            />
                          </label>

                          {purchaseCreateMode === "warehouse" ? (
                            <>
                              <label>
                                <span>Vehicle</span>
                                <select
                                  value={row.vehicle_id}
                                  onChange={(event) =>
                                    updatePurchaseLineRow(lineIndex, {
                                      vehicle_id: event.target.value,
                                      repair_code: "",
                                    })
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
                                  value={row.repair_code}
                                  onChange={(event) => {
                                    const linkedRepair = repairs.find(
                                      (repair) => repair.tracking_code === event.target.value
                                    );
                                    updatePurchaseLineRow(lineIndex, {
                                      repair_code: event.target.value,
                                      vehicle_id: linkedRepair
                                        ? String(linkedRepair.vehicle_id)
                                        : row.vehicle_id,
                                    });
                                  }}
                                >
                                  <option value="">No repair linked</option>
                                  {lineRepairOptions.map((repair) => (
                                    <option key={repair.id} value={repair.tracking_code}>
                                      {repair.tracking_code} • {repair.vehicle_label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {row.repair_code ? (
                                <div className="inline-actions">
                                  <button
                                    type="button"
                                    className="purchase-inline-action"
                                    onClick={() => updatePurchaseLineRow(lineIndex, { repair_code: "" })}
                                  >
                                    Unlink repair
                                  </button>
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          <div className="form-grid">
                            <label>
                              <span>Quantity</span>
                              <input
                                value={row.quantity}
                                onChange={(event) =>
                                  updatePurchaseLineRow(lineIndex, { quantity: event.target.value })
                                }
                                type="number"
                                min={getQuantityFieldProps(row.unit_of_measure_id).min}
                                step={getQuantityFieldProps(row.unit_of_measure_id).step}
                                required
                              />
                            </label>
                            <label
                              className={lineImportNeedsAttention ? "purchase-field--needs-attention" : undefined}
                            >
                              <span>Unit of measure</span>
                              <select
                                value={row.unit_of_measure_id}
                                onChange={(event) =>
                                  updatePurchaseLineRow(lineIndex, {
                                    unit_of_measure_id: event.target.value,
                                  })
                                }
                              >
                                {unitsOfMeasure.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name} ({u.code})
                                  </option>
                                ))}
                              </select>
                            </label>
                            {lineImportNeedsAttention ? (
                              <div className="purchase-import-uom-callout">
                                {row.import_uom_raw ? (
                                  <>
                                    <p className="workspace-note purchase-import-uom-callout-text">
                                      No unit for <strong>{row.import_uom_raw}</strong> in the catalog.
                                    </p>
                                    <button
                                      type="button"
                                      className="button button-secondary"
                                      onClick={() => void approveImportedUnitOfMeasure(lineIndex)}
                                    >
                                      Add “{row.import_uom_raw}” to catalog
                                    </button>
                                  </>
                                ) : (
                                  <p className="workspace-note purchase-import-uom-callout-text">
                                    Confirm unit of measure.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>

                          <div className="form-grid">
                            <label>
                              <span>Purchase Price</span>
                              <input
                                value={row.purchase_price}
                                onChange={(event) =>
                                  updatePurchaseLineRow(lineIndex, { purchase_price: event.target.value })
                                }
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
                                value={row.sale_price}
                                onChange={(event) =>
                                  updatePurchaseLineRow(lineIndex, { sale_price: event.target.value })
                                }
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                disabled={purchaseCreateMode === "consumables"}
                              />
                            </label>
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="purchase-invoice-add-line-wrap">
                    <button type="button" className="button button-secondary" onClick={addPurchaseLineRow}>
                      + Add another line
                    </button>
                  </div>

                  {purchaseCreateMode === "warehouse" ? (
                    <p className="workspace-note">
                      Leave vehicle and repair empty on a line for stock or parts not tied to a job yet.
                    </p>
                  ) : null}

                  {purchaseError ? <p className="form-error">{purchaseError}</p> : null}
                </div>

                {(() => {
                  const purchaseMissingFields = [
                    ...(!purchaseForm.supplier_name.trim() ? ["Supplier"] : []),
                    ...(!purchaseLineRows.some(row => row.part_name.trim().length > 0) ? ["Part name"] : []),
                  ];
                  const canSavePurchase = !!purchaseForm.order_date && purchaseMissingFields.length === 0;
                  return (
                    <div className={`modal-footer${purchaseMissingFields.length > 0 ? " modal-footer--stacked" : " modal-footer--right"}`}>
                      <div className="modal-footer__primary-cluster">
                        <button type="button" className="button button-secondary" onClick={closePurchaseCreateModal}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => void handlePurchaseOrderDownload()}
                          disabled={isDownloadingPurchaseOrder}
                        >
                          {isDownloadingPurchaseOrder ? "Preparing PO…" : "Download PO"}
                        </button>
                        <button
                          type="submit"
                          className="button"
                          disabled={isSavingPurchase || !canSavePurchase}
                        >
                          {isSavingPurchase
                            ? "Saving…"
                            : purchaseLineRows.length > 1
                              ? `Save invoice (${purchaseLineRows.length} lines)`
                              : "Save line"}
                        </button>
                      </div>
                      <RequiredChips fields={purchaseMissingFields} />
                    </div>
                  );
                })()}
              </form>
            </div>
          </div>
        ) : null}

        {supplierCreateOpen ? (
          <div
            className="modal-overlay"
            role="presentation"
            onClick={() => {
              setSupplierCreateOpen(false);
              setSupplierCreateError("");
            }}
          >
            <section
              className="modal-card modal-card-large"
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-create-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Directory</p>
                  <h3 id="supplier-create-title">Add supplier</h3>
                </div>
              </div>
              <form className="stack-form" onSubmit={handleSupplierCreateSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    value={supplierCreateForm.name}
                    onChange={(event) =>
                      setSupplierCreateForm((current) => ({ ...current, name: event.target.value }))
                    }
                    type="text"
                    required
                    autoComplete="organization"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    <span>NIP</span>
                    <input
                      value={supplierCreateForm.nip}
                      onChange={(event) =>
                        setSupplierCreateForm((current) => ({ ...current, nip: event.target.value }))
                      }
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input
                      value={supplierCreateForm.phone}
                      onChange={(event) =>
                        setSupplierCreateForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      type="text"
                    />
                  </label>
                </div>
                <label>
                  <span>Email</span>
                  <input
                    value={supplierCreateForm.email}
                    onChange={(event) =>
                      setSupplierCreateForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>Reg. Address</span>
                  <textarea
                    value={supplierCreateForm.registered_address}
                    onChange={(event) =>
                      setSupplierCreateForm((current) => ({ ...current, registered_address: event.target.value }))
                    }
                    rows={3}
                    autoComplete="street-address"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea
                    value={supplierCreateForm.notes}
                    onChange={(event) =>
                      setSupplierCreateForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={3}
                  />
                </label>
                {supplierCreateError ? <p className="form-error">{supplierCreateError}</p> : null}
                <div className="form-actions repair-modal-footer-bar">
                  <button type="submit" className="button" disabled={supplierCreateSaving}>
                    {supplierCreateSaving ? "Saving…" : "Create supplier"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      setSupplierCreateOpen(false);
                      setSupplierCreateError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {selectedSupplier ? (
          <div className="modal-overlay" role="presentation" onClick={closeSupplierEditModal}>
            <section
              className="modal-card modal-card-large"
              role="dialog"
              aria-modal="true"
              aria-labelledby="supplier-edit-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Directory</p>
                  <h3 id="supplier-edit-title">Edit supplier</h3>
                </div>
              </div>
              <form className="stack-form" onSubmit={handleSupplierEditSubmit}>
                <label>
                  <span>Name</span>
                  <input
                    value={supplierEditForm.name}
                    onChange={(event) =>
                      setSupplierEditForm((current) => ({ ...current, name: event.target.value }))
                    }
                    type="text"
                    required
                    autoComplete="organization"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    <span>NIP</span>
                    <input
                      value={supplierEditForm.nip}
                      onChange={(event) =>
                        setSupplierEditForm((current) => ({ ...current, nip: event.target.value }))
                      }
                      type="text"
                    />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input
                      value={supplierEditForm.phone}
                      onChange={(event) =>
                        setSupplierEditForm((current) => ({ ...current, phone: event.target.value }))
                      }
                      type="text"
                    />
                  </label>
                </div>
                <label>
                  <span>Email</span>
                  <input
                    value={supplierEditForm.email}
                    onChange={(event) =>
                      setSupplierEditForm((current) => ({ ...current, email: event.target.value }))
                    }
                    type="email"
                    autoComplete="email"
                  />
                </label>
                <label>
                  <span>Reg. Address</span>
                  <textarea
                    value={supplierEditForm.registered_address}
                    onChange={(event) =>
                      setSupplierEditForm((current) => ({ ...current, registered_address: event.target.value }))
                    }
                    rows={3}
                    autoComplete="street-address"
                  />
                </label>
                <label>
                  <span>Notes</span>
                  <textarea
                    value={supplierEditForm.notes}
                    onChange={(event) =>
                      setSupplierEditForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    rows={3}
                  />
                </label>
                {supplierEditError ? <p className="form-error">{supplierEditError}</p> : null}
                <div className="form-actions repair-modal-footer-bar">
                  <button type="submit" className="button" disabled={supplierEditSaving}>
                    {supplierEditSaving ? "Saving…" : "Save supplier"}
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeSupplierEditModal}>
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

  function renderReferenceSection() {
    const meta = sectionMeta.reference;
    if (!isAdmin) {
      return (
        <div className="workspace-stack reference-workspace">
          <p className="section-empty">This section is available to administrators only.</p>
        </div>
      );
    }

    const referenceWorkspaceTabs: Array<{ id: ReferenceWorkspaceTab; label: string; shortLabel: string }> = [
      { id: "units", label: "Units of measure", shortLabel: "Units" },
      { id: "services", label: "Services", shortLabel: "Serv." },
      { id: "customers", label: "Customers", shortLabel: "Cust." },
    ];

    return (
      <div className="workspace-stack reference-workspace">
        <div className="kanban-topbar purchases-section-topbar registers-shell-header">
          <div>
            <p className="eyebrow">{meta.eyebrow}</p>
            <h2>{meta.title}</h2>
            {compactStaffNarrowLayout ? (
              <RegistersHelpDisclosure summary="About Registers">
                <p className="workspace-copy registers-help-disclosure-copy">{meta.copy}</p>
              </RegistersHelpDisclosure>
            ) : null}
          </div>
        </div>

        <div className="dashboard-folder-tabs purchases-folder-tabs" role="tablist" aria-label="Registers sections">
          {referenceWorkspaceTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={activeReferenceTab === tab.id}
              className={`dashboard-folder-tab ${activeReferenceTab === tab.id ? "dashboard-folder-tab-active" : ""}`}
              onClick={() => setActiveReferenceTab(tab.id)}
            >
              <span className="dashboard-folder-label">
                <span className="dashboard-folder-label-long">{tab.label}</span>
                <span className="dashboard-folder-label-short">{tab.shortLabel}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="dashboard-folder-panel purchases-folder-panel">
          {activeReferenceTab === "units" ? (
            <UnitsOfMeasureAdminPanel
              embedded
              sectionEyebrow={meta.eyebrow}
              sectionTitle={meta.title}
              sectionCopy={meta.copy}
              onSaved={() => void refreshUnitsOfMeasure()}
            />
          ) : null}
          {activeReferenceTab === "services" ? (
            <ServicesRegisterPanel onServicesChanged={refreshServiceCatalog} />
          ) : null}
          {activeReferenceTab === "customers" ? (
            <RegistersCustomersPanel customers={customers} onRefresh={() => void loadRegistries()} />
          ) : null}
        </div>
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
  const showTopbar = !["dashboard", "customers", "vehicles", "repairs", "purchases", "reference", "users"].includes(
    activeSection,
  );

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
      {activeSection === "reference" ? renderReferenceSection() : null}
      {activeSection === "users" ? renderUsersSection() : null}

        <RepairCreateModal
          open={isRepairFormOpen}
          form={repairForm}
          vehicles={vehicles}
          staffUsers={staffUsers}
          catalog={apiServices}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          currentUserEmail={user?.email}
          currentUserFirstName={user?.first_name}
          currentUserLastName={user?.last_name}
          saving={isSavingRepair}
          formError={repairError}
          getStaffUserLabel={getStaffUserLabel}
          onClose={closeRepairCreateModal}
          onFormChange={setRepairForm}
          onSubmit={() => void submitRepairCreate()}
          onAddNewVehicle={() => openVehicleCreateModal(true)}
        />

        {selectedRepair ? (
          <RepairEditModal
            repair={selectedRepair}
            status={repairModalStatus}
            openedAsCompleted={repairModalOpenedAsCompleted}
            masterId={repairModalMasterId}
            needsMasterAttention={repairModalNeedsMasterAttention}
            serviceLines={repairModalServiceLines}
            issueNotes={repairModalIssueNotes}
            estimatedDate={repairModalEstimatedDate}
            staffUsers={staffUsers}
            catalog={apiServices}
            vehicles={vehicles}
            isStaff={isStaff}
            isAdmin={isAdmin}
            canEditWorkDetails={canEditRepairWorkDetails}
            saving={isSavingRepair}
            statusChanging={repairStatusChanging}
            portalUrl={`${window.location.origin}/portal/${selectedRepair.portal_token}`}
            getStaffUserLabel={getStaffUserLabel}
            onClose={handleCloseRepairModal}
            onStatusChange={(next) => void handleRepairStatusChange(next)}
            onMasterChange={setRepairModalMasterId}
            onServiceLinesChange={setRepairModalServiceLines}
            onIssueNotesChange={setRepairModalIssueNotes}
            onEstimatedDateChange={setRepairModalEstimatedDate}
            onSave={() => void handleRepairModalSave()}
            onDelete={() => deleteRepairFromModal(selectedRepair)}
            onReopen={() => handleRepairReopen()}
            onPickUp={handleRepairPickUp ? () => void handleRepairPickUp() : undefined}
            onUndoPickUp={handleRepairUndoPickUp ? () => void handleRepairUndoPickUp() : undefined}
            onHandoffCreate={() => prefillHandoffRepairCreate(selectedRepair)}
            onExportPdf={
              selectedRepair.status === "completed" || repairModalStatus === "completed" || selectedRepair.status === "picked_up" || repairModalStatus === "picked_up"
                ? () => void handleDownloadRepairPdf(selectedRepair.id)
                : undefined
            }
            onCopyPortalLink={() => void handleCopyPortalLink(selectedRepair.portal_token)}
            onRegeneratePortalLink={
              isAdmin ? () => void handleRegeneratePortalLink(selectedRepair.id) : undefined
            }
            mileageExtension={
              repairModalStatus === "completed" && !repairModalOpenedAsCompleted ? (
                <>
                  <FieldRow label="Completed date">
                    <FriendlyDateInput
                      ariaLabel="Completed Date"
                      value={repairModalCompletedAt}
                      onChange={setRepairModalCompletedAt}
                      required
                    />
                  </FieldRow>
                  <div
                    className={
                      repairModalNeedsMileageAttention && !repairModalMileageAtService.trim()
                        ? "repair-modal-mileage-at-service repair-modal-mileage-at-service--attention"
                        : "repair-modal-mileage-at-service"
                    }
                  >
                    <FieldRow label="Odometer when returned (km)">
                      {canEditRepairWorkDetails ? (
                        <input
                          ref={repairMileageInputRef}
                          type="text"
                          inputMode="numeric"
                          className={`field ${repairModalNeedsMileageAttention && !repairModalMileageAtService.trim() ? "repair-modal-mileage-input--attention" : ""}`}
                          autoComplete="off"
                          placeholder="e.g. 87400"
                          value={repairModalMileageAtService}
                          onChange={(event) => setRepairModalMileageAtService(event.target.value)}
                          aria-label="Odometer reading in kilometers when vehicle was returned"
                        />
                      ) : (
                        <input
                          className="field"
                          type="text"
                          readOnly
                          value={
                            selectedRepair.mileage_at_service != null
                              ? selectedRepair.mileage_at_service.toLocaleString()
                              : "—"
                          }
                        />
                      )}
                    </FieldRow>
                    {!repairModalMileageAtService.trim() ? (
                      <p className="field-row__hint" role="status">
                        {repairOdometerReminderLead ? <span>{repairOdometerReminderLead} </span> : null}
                        Add the odometer reading when the vehicle was returned so service history and vehicle mileage
                        stay accurate.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null
            }
            extension={
              <>
                <div className="field-section">
                  <SectionHead label="Linked parts" />
                  {selectedRepairPurchases.length === 0 ? (
                    <p className="field-row__hint">No ordered parts linked to this repair yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedRepairPurchases.map((entry) => (
                        <article className="detail-item" key={entry.id}>
                          <h4>
                            {entry.part_name}
                            {entry.is_shop_consumable ? (
                              <span className="field-row__hint"> — shop consumable (not on act)</span>
                            ) : null}
                          </h4>
                          <p>{entry.supplier_name}</p>
                          <p className="meta-line">
                            Qty {entry.quantity} {entry.unit_of_measure_code} • Buy {formatCurrency(entry.purchase_price)}{" "}
                            • Sell {formatCurrency(entry.sale_price)}
                          </p>
                          <p className="meta-line">Ordered {formatDisplayDate(entry.order_date)}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
                {(selectedRepair.status !== "completed" && selectedRepair.status !== "picked_up") ? (
                  <div className="field-section">
                    <SectionHead label="Repair notes" />
                    <FieldRow label="Add repair note">
                      <textarea
                        className="field"
                        value={repairModalNewNote}
                        onChange={(event) => setRepairModalNewNote(event.target.value)}
                        rows={4}
                      />
                    </FieldRow>
                    <button type="button" className="button button-secondary button-sm" onClick={() => void handleRepairNoteAdd()}>
                      Add note
                    </button>
                    {selectedRepair.repair_notes.length === 0 ? (
                      <p className="field-row__hint">No repair notes yet.</p>
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
                              <button type="button" className="text-action" onClick={() => void handleRepairNoteDelete(note.id)}>
                                Delete note
                              </button>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
                {repairBeforePhotos.length > 0 ? (
                  <div className="field-section">
                    <SectionHead label="Photos before repair" />
                    <div className="photo-preview-grid">
                      {repairBeforePhotos.map((preview) => (
                        <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="Before repair preview" />
                      ))}
                    </div>
                  </div>
                ) : null}
                {repairDuringPhotos.length > 0 ? (
                  <div className="field-section">
                    <SectionHead label="Photos during repair" />
                    <div className="photo-preview-grid">
                      {repairDuringPhotos.map((preview) => (
                        <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="During repair preview" />
                      ))}
                    </div>
                  </div>
                ) : null}
                {repairAfterPhotos.length > 0 ? (
                  <div className="field-section">
                    <SectionHead label="Photos after repair" />
                    <div className="photo-preview-grid">
                      {repairAfterPhotos.map((preview) => (
                        <img className="photo-preview" key={preview} src={sanitizeImageUrl(preview)} alt="After repair preview" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            }
          />
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

      {renderVehicleFormModal()}
      {copyToast ? <div className="copy-toast">{copyToast}</div> : null}
    </div>
  );
}
