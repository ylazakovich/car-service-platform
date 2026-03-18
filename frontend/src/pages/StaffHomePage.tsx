import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { StaffSection } from "../App";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  notes: string;
  vehicle_count: number;
  is_demo?: boolean;
};

type Vehicle = {
  id: number;
  customer: {
    id: number;
    full_name: string;
  };
  license_plate: string;
  make: string;
  model: string;
  year: number | null;
  vin: string;
  color: string;
  notes: string;
  mileage?: number | null;
  last_service_date?: string;
  added_date?: string;
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

type VehicleUiDetails = {
  mileage: string;
  last_service_date: string;
  added_date: string;
};

type StaffHomePageProps = {
  activeSection: StaffSection;
  onSelectSection: (section: StaffSection) => void;
};

type UserAccessTab = "owner" | "admins" | "masters";

type PurchaseEntry = {
  id: number;
  order_date: string;
  supplier_name: string;
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

type PurchaseFormState = {
  order_date: string;
  supplier_name: string;
  part_name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  vehicle_id: string;
};

type RepairStatus = "new" | "in_progress" | "waiting_parts" | "completed";

type RepairNote = {
  id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  text: string;
};

type RepairEntry = {
  id: number;
  created_at: string;
  vehicle_id: number;
  vehicle_label: string;
  owner_name: string;
  master_id: string;
  master_name: string;
  service_name: string;
  issue_notes: string;
  repair_notes: RepairNote[];
  status: RepairStatus;
  tracking_code: string;
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
};

type RepairFormState = {
  vehicle_id: string;
  master_id: string;
  service_key: string;
  custom_service: string;
  issue_notes: string;
  status: RepairStatus;
};

type MasterProfile = {
  id: string;
  name: string;
  login: string;
  password: string;
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

const emptyPurchaseForm: PurchaseFormState = {
  order_date: "",
  supplier_name: "",
  part_name: "",
  quantity: "1",
  purchase_price: "",
  sale_price: "",
  repair_code: "",
  vehicle_id: "",
};

const emptyRepairForm: RepairFormState = {
  vehicle_id: "",
  master_id: "",
  service_key: "",
  custom_service: "",
  issue_notes: "",
  status: "new",
};

const masterProfiles: MasterProfile[] = [
  {
    id: "master-1",
    name: "Ivan Petrenko",
    login: "master.one@autoservice.local",
    password: "master12345",
  },
  {
    id: "master-2",
    name: "Oleh Bondar",
    login: "master.two@autoservice.local",
    password: "master67890",
  },
];

const initialPurchases: PurchaseEntry[] = [
  {
    id: 1,
    order_date: "2026-03-13",
    supplier_name: "Auto Parts Hub",
    part_name: "Brake Pad Set",
    quantity: 1,
    purchase_price: 220,
    sale_price: 320,
    repair_code: "TOR-1042",
    vehicle_id: -201,
    vehicle_label: "WB 1234K • Toyota Corolla",
    invoice_name: "",
    invoice_url: "",
  },
  {
    id: 2,
    order_date: "2026-03-14",
    supplier_name: "Motor Line",
    part_name: "Engine Oil 5W-30",
    quantity: 4,
    purchase_price: 32,
    sale_price: 54,
    repair_code: "TOR-1047",
    vehicle_id: -202,
    vehicle_label: "WX 9088P • BMW X3",
    invoice_name: "",
    invoice_url: "",
  },
  {
    id: 3,
    order_date: "2026-03-15",
    supplier_name: "Nordic Garage Supply",
    part_name: "Air Filter",
    quantity: 2,
    purchase_price: 18,
    sale_price: 34,
    repair_code: "TOR-1053",
    vehicle_id: -203,
    vehicle_label: "GD 4477M • Audi A4",
    invoice_name: "",
    invoice_url: "",
  },
];

const customRepairServiceOption = "Custom Service";

const presetRepairServiceOptions = [
  "Oil Change",
  "Brake Service",
  "Diagnostics",
  "Suspension Repair",
  "Engine Check",
];

const repairServicesStorageKey = "repair-service-options";
const vehicleDetailsStorageKey = "vehicle-ui-details";

function getLocalTodayDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function readStoredRepairServices(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storage = window.localStorage as { getItem?: (key: string) => string | null } | undefined;
  if (typeof storage?.getItem !== "function") {
    return [];
  }

  const rawValue = storage.getItem(repairServicesStorageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return [];
  }
}

function readStoredVehicleDetails(): Record<number, VehicleUiDetails> {
  if (typeof window === "undefined") {
    return {};
  }

  const storage = window.localStorage as { getItem?: (key: string) => string | null } | undefined;
  if (typeof storage?.getItem !== "function") {
    return {};
  }

  const rawValue = storage.getItem(vehicleDetailsStorageKey);
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<Record<number, VehicleUiDetails>>((accumulator, [key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        "mileage" in value &&
        "last_service_date" in value
      ) {
        accumulator[Number(key)] = {
          mileage: String((value as VehicleUiDetails).mileage ?? ""),
          last_service_date: String((value as VehicleUiDetails).last_service_date ?? ""),
          added_date: String((value as VehicleUiDetails).added_date ?? ""),
        };
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
}

function writeStoredVehicleDetails(details: Record<number, VehicleUiDetails>) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage as { setItem?: (key: string, value: string) => void } | undefined;
  if (typeof storage?.setItem !== "function") {
    return;
  }

  storage.setItem(vehicleDetailsStorageKey, JSON.stringify(details));
}

function writeStoredRepairServices(services: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage as { setItem?: (key: string, value: string) => void } | undefined;
  if (typeof storage?.setItem !== "function") {
    return;
  }

  storage.setItem(repairServicesStorageKey, JSON.stringify(services));
}

function getDefaultVehicleForm(nextCustomerId = ""): VehicleFormState {
  return {
    ...emptyVehicleForm,
    customer_id: nextCustomerId,
    added_date: getLocalTodayDate(),
  };
}

const repairStatusLabels: Record<RepairStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_parts: "Waiting for Parts",
  completed: "Completed",
};

const initialRepairs: RepairEntry[] = [
  {
    id: 1,
    created_at: "2026-03-13",
    vehicle_id: -201,
    vehicle_label: "KR 2048A • Toyota Yaris",
    owner_name: "Anna Kowalska",
    master_id: "master-1",
    master_name: "Ivan Petrenko",
    service_name: "Brake Service",
    issue_notes: "Front brake pads worn out, noise during braking.",
    repair_notes: [],
    status: "new",
    tracking_code: "TOR-6201",
    before_photos: [],
    during_photos: [],
    after_photos: [],
  },
  {
    id: 2,
    created_at: "2026-03-14",
    vehicle_id: -202,
    vehicle_label: "WX 9088P • BMW X3",
    owner_name: "Marek Zielinski",
    master_id: "master-2",
    master_name: "Oleh Bondar",
    service_name: "Diagnostics",
    issue_notes: "Dashboard warning light and unstable idle.",
    repair_notes: [],
    status: "in_progress",
    tracking_code: "TOR-6202",
    before_photos: [],
    during_photos: [],
    after_photos: [],
  },
  {
    id: 3,
    created_at: "2026-03-15",
    vehicle_id: -203,
    vehicle_label: "GD 4477M • Audi A4",
    owner_name: "Julia Nowak",
    master_id: "master-1",
    master_name: "Ivan Petrenko",
    service_name: "Suspension Repair",
    issue_notes: "Customer reports knocking sound on front axle.",
    repair_notes: [],
    status: "waiting_parts",
    tracking_code: "TOR-6203",
    before_photos: [],
    during_photos: [],
    after_photos: [],
  },
];

const demoCustomersSeed: Customer[] = [
  {
    id: -101,
    full_name: "Anna Kowalska",
    phone: "+48 600 100 100",
    email: "anna.demo@test.local",
    notes: "Demo customer for intake testing",
    vehicle_count: 1,
    is_demo: true,
  },
  {
    id: -102,
    full_name: "Marek Zielinski",
    phone: "+48 600 200 200",
    email: "marek.demo@test.local",
    notes: "Demo customer for repair history layout",
    vehicle_count: 1,
    is_demo: true,
  },
  {
    id: -103,
    full_name: "Julia Nowak",
    phone: "+48 600 300 300",
    email: "julia.demo@test.local",
    notes: "Demo customer for purchases and tracking",
    vehicle_count: 1,
    is_demo: true,
  },
];

const demoVehiclesSeed: Vehicle[] = [
  {
    id: -201,
    customer: { id: -101, full_name: "Anna Kowalska" },
    license_plate: "KR 2048A",
    make: "Toyota",
    model: "Yaris",
    year: 2020,
    vin: "JTNB1234567890001",
    color: "Silver",
    mileage: 78210,
    last_service_date: "2026-02-10",
    added_date: "2025-11-04",
    notes: "Demo vehicle",
    is_demo: true,
  },
  {
    id: -202,
    customer: { id: -102, full_name: "Marek Zielinski" },
    license_plate: "WX 9088P",
    make: "BMW",
    model: "X3",
    year: 2019,
    vin: "WBA1234567890002",
    color: "Black",
    mileage: 114380,
    last_service_date: "2026-01-28",
    added_date: "2025-09-18",
    notes: "Demo vehicle",
    is_demo: true,
  },
  {
    id: -203,
    customer: { id: -103, full_name: "Julia Nowak" },
    license_plate: "GD 4477M",
    make: "Audi",
    model: "A4",
    year: 2021,
    vin: "WAU1234567890003",
    color: "White",
    mileage: 46890,
    last_service_date: "2026-03-02",
    added_date: "2026-01-12",
    notes: "Demo vehicle",
    is_demo: true,
  },
];

const vehicleYearOptions = Array.from(
  { length: new Date().getFullYear() - 1979 },
  (_, index) => new Date().getFullYear() - index
);

const sectionMeta: Record<StaffSection, { eyebrow: string; title: string; copy: string }> = {
  dashboard: {
    eyebrow: "Reserved Space",
    title: "Operations Dashboard",
    copy: "This area stays intentionally empty until the base registries and working flows are fully defined.",
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

export function StaffHomePage({ activeSection, onSelectSection }: StaffHomePageProps) {
  const { user } = useAuth();
  const [serverCustomers, setServerCustomers] = useState<Customer[]>([]);
  const [serverVehicles, setServerVehicles] = useState<Vehicle[]>([]);
  const [demoCustomers, setDemoCustomers] = useState<Customer[]>(demoCustomersSeed);
  const [demoVehicles, setDemoVehicles] = useState<Vehicle[]>(demoVehiclesSeed);
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(initialPurchases);
  const [repairs, setRepairs] = useState<RepairEntry[]>(initialRepairs);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [repairSearch, setRepairSearch] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [repairForm, setRepairForm] = useState<RepairFormState>(emptyRepairForm);
  const [vehicleUiDetails, setVehicleUiDetails] = useState<Record<number, VehicleUiDetails>>(readStoredVehicleDetails);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseModalError, setPurchaseModalError] = useState("");
  const [repairError, setRepairError] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isSavingRepair, setIsSavingRepair] = useState(false);
  const [activeUserTab, setActiveUserTab] = useState<UserAccessTab>("owner");
  const [repairPhotoPreviews, setRepairPhotoPreviews] = useState<string[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [repairModalStatus, setRepairModalStatus] = useState<RepairStatus>("new");
  const [repairModalMasterId, setRepairModalMasterId] = useState("");
  const [repairModalNewNote, setRepairModalNewNote] = useState("");
  const [repairBeforePhotos, setRepairBeforePhotos] = useState<string[]>([]);
  const [repairDuringPhotos, setRepairDuringPhotos] = useState<string[]>([]);
  const [repairAfterPhotos, setRepairAfterPhotos] = useState<string[]>([]);
  const [purchaseInvoiceName, setPurchaseInvoiceName] = useState("");
  const [purchaseInvoiceUrl, setPurchaseInvoiceUrl] = useState("");
  const [purchaseModalForm, setPurchaseModalForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [purchaseModalInvoiceName, setPurchaseModalInvoiceName] = useState("");
  const [purchaseModalInvoiceUrl, setPurchaseModalInvoiceUrl] = useState("");
  const [copyToast, setCopyToast] = useState("");
  const [savedRepairServices, setSavedRepairServices] = useState<string[]>(readStoredRepairServices);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isInlineCustomerOpen, setIsInlineCustomerOpen] = useState(false);
  const [draggingRepairId, setDraggingRepairId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RepairStatus | null>(null);
  const [inlineCustomerForm, setInlineCustomerForm] = useState({ full_name: "", phone: "", email: "" });
  const [inlineCustomerError, setInlineCustomerError] = useState("");
  const [isSavingInlineCustomer, setIsSavingInlineCustomer] = useState(false);
  const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);

  const customers = useMemo(() => [...serverCustomers, ...demoCustomers], [serverCustomers, demoCustomers]);
  const vehicles = useMemo(() => [...serverVehicles, ...demoVehicles], [serverVehicles, demoVehicles]);
  const currentUserLabel = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Unknown User";
  const repairServiceOptions = useMemo(
    () => [...presetRepairServiceOptions, ...savedRepairServices, customRepairServiceOption],
    [savedRepairServices]
  );

  useEffect(() => {
    void loadRegistries();
  }, []);

  useEffect(() => {
    writeStoredRepairServices(savedRepairServices);
  }, [savedRepairServices]);

  useEffect(() => {
    writeStoredVehicleDetails(vehicleUiDetails);
  }, [vehicleUiDetails]);

  async function loadRegistries() {
    setLoadError("");
    setIsLoading(true);
    try {
      const [customersResponse, vehiclesResponse] = await Promise.all([
        api.get("/customers/"),
        api.get("/vehicles/"),
      ]);
      setServerCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
      setServerVehicles(Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : []);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Unable to load customers and vehicles."));
    } finally {
      setIsLoading(false);
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
      mileage: vehicleUiDetails[vehicle.id]?.mileage ?? (vehicle.mileage ? String(vehicle.mileage) : ""),
      last_service_date: vehicleUiDetails[vehicle.id]?.last_service_date ?? vehicle.last_service_date ?? "",
      added_date: vehicleUiDetails[vehicle.id]?.added_date ?? vehicle.added_date ?? "",
    };
  }

  function resetPurchaseForm() {
    setPurchaseForm(emptyPurchaseForm);
    setPurchaseError("");
    setPurchaseInvoiceName("");
    setPurchaseInvoiceUrl("");
  }

  function resetRepairForm() {
    setRepairForm(emptyRepairForm);
    setRepairError("");
    setRepairPhotoPreviews([]);
  }

  function closeRepairModal() {
    setSelectedRepairId(null);
    setRepairModalStatus("new");
    setRepairModalMasterId("");
    setRepairModalNewNote("");
    setRepairBeforePhotos([]);
    setRepairDuringPhotos([]);
    setRepairAfterPhotos([]);
  }

  function closePurchaseDetailModal() {
    setSelectedPurchaseId(null);
    setPurchaseModalForm(emptyPurchaseForm);
    setPurchaseModalInvoiceName("");
    setPurchaseModalInvoiceUrl("");
    setPurchaseModalError("");
  }

  function openPurchaseDetailModal(entry: PurchaseEntry) {
    setSelectedPurchaseId(entry.id);
    setPurchaseModalError("");
    setPurchaseModalForm({
      order_date: entry.order_date,
      supplier_name: entry.supplier_name,
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

  async function handleInlineCustomerSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  function openRepairCreateModal() {
    resetRepairForm();
    setIsRepairFormOpen(true);
  }

  function closeRepairCreateModal() {
    resetRepairForm();
    setIsRepairFormOpen(false);
  }

  function openPurchaseCreateModal() {
    resetPurchaseForm();
    setIsPurchaseFormOpen(true);
  }

  function closePurchaseFormModal() {
    resetPurchaseForm();
    setIsPurchaseFormOpen(false);
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
        setVehicleUiDetails((current) => ({
          ...current,
          [editingVehicleId]: nextVehicleDetails,
        }));
      } else {
        const response = await api.post("/vehicles/", payload);
        const nextId = response?.data?.id;
        if (typeof nextId === "number") {
          setVehicleUiDetails((current) => ({
            ...current,
            [nextId]: nextVehicleDetails,
          }));
        }
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

  function handlePurchaseSubmit(event: FormEvent<HTMLFormElement>) {
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

    const nextEntry: PurchaseEntry = {
      id: Date.now(),
      order_date: purchaseForm.order_date,
      supplier_name: purchaseForm.supplier_name.trim(),
      part_name: purchaseForm.part_name.trim(),
      quantity,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      repair_code: purchaseForm.repair_code.trim() || "Unassigned",
      vehicle_id: selectedVehicle?.id ?? null,
      vehicle_label: selectedVehicle
        ? `${selectedVehicle.license_plate} • ${selectedVehicle.make} ${selectedVehicle.model}`
        : "Stock / Unassigned",
      invoice_name: purchaseInvoiceName,
      invoice_url: purchaseInvoiceUrl,
    };

    setPurchases((current) => [nextEntry, ...current]);
    resetPurchaseForm();
    setIsPurchaseFormOpen(false);
    setIsSavingPurchase(false);
  }

  function handlePurchaseInvoiceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPurchaseInvoiceName("");
      setPurchaseInvoiceUrl("");
      return;
    }

    setPurchaseInvoiceName(file.name);
    setPurchaseInvoiceUrl(URL.createObjectURL(file));
  }

  function handlePurchaseModalInvoiceChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPurchaseModalInvoiceName(file.name);
    setPurchaseModalInvoiceUrl(URL.createObjectURL(file));
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

  function handlePurchaseModalSave() {
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

    setPurchases((current) =>
      current.map((entry) =>
        entry.id === selectedPurchase.id
          ? {
              ...entry,
              order_date: purchaseModalForm.order_date,
              supplier_name: purchaseModalForm.supplier_name.trim(),
              part_name: purchaseModalForm.part_name.trim(),
              quantity,
              purchase_price: purchasePrice,
              sale_price: salePrice,
              repair_code: purchaseModalForm.repair_code.trim() || "Unassigned",
              vehicle_id: selectedVehicle?.id ?? null,
              vehicle_label: selectedVehicle
                ? `${selectedVehicle.license_plate} • ${selectedVehicle.make} ${selectedVehicle.model}`
                : "Stock / Unassigned",
              invoice_name: purchaseModalInvoiceName,
              invoice_url: purchaseModalInvoiceUrl,
            }
          : entry
      )
    );

    closePurchaseDetailModal();
  }

  function handleRepairPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairPhotoPreviews(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRepairDuringPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairDuringPhotos(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRepairBeforePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairBeforePhotos(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRepairAfterPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairAfterPhotos(files.map((file) => URL.createObjectURL(file)));
  }

  function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRepairError("");
    setIsSavingRepair(true);

    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === repairForm.vehicle_id);
    const serviceName =
      repairForm.service_key === customRepairServiceOption ? repairForm.custom_service.trim() : repairForm.service_key;
    const selectedMaster = masterProfiles.find((master) => master.id === repairForm.master_id);

    if (!selectedVehicle) {
      setRepairError("Select a vehicle for this repair.");
      setIsSavingRepair(false);
      return;
    }

    if (!selectedMaster) {
      setRepairError("Select a master for this repair.");
      setIsSavingRepair(false);
      return;
    }

    if (!serviceName) {
      setRepairError("Choose a service or write your own.");
      setIsSavingRepair(false);
      return;
    }

    if (
      repairForm.service_key === customRepairServiceOption &&
      !presetRepairServiceOptions.includes(serviceName) &&
      !savedRepairServices.includes(serviceName)
    ) {
      setSavedRepairServices((current) => [...current, serviceName]);
    }

    const nextRepair: RepairEntry = {
      id: Date.now(),
      created_at: new Date().toISOString().slice(0, 10),
      vehicle_id: selectedVehicle.id,
      vehicle_label: `${selectedVehicle.license_plate} • ${selectedVehicle.make} ${selectedVehicle.model}`,
      owner_name: selectedVehicle.customer.full_name,
      master_id: selectedMaster.id,
      master_name: selectedMaster.name,
      service_name: serviceName,
      issue_notes: repairForm.issue_notes.trim() || "No issue notes provided yet.",
      repair_notes: [],
      status: repairForm.status,
      tracking_code: `TOR-${String(Date.now()).slice(-4)}`,
      before_photos: repairPhotoPreviews,
      during_photos: [],
      after_photos: [],
    };

    setRepairs((current) => [nextRepair, ...current]);
    resetRepairForm();
    setIsRepairFormOpen(false);
    setIsSavingRepair(false);
  }

  function openRepairModal(repair: RepairEntry) {
    setSelectedRepairId(repair.id);
    setRepairModalStatus(repair.status);
    setRepairModalMasterId(repair.master_id);
    setRepairModalNewNote("");
    setRepairBeforePhotos(repair.before_photos);
    setRepairDuringPhotos(repair.during_photos);
    setRepairAfterPhotos(repair.after_photos);
  }

  function handleRepairNoteAdd() {
    if (!selectedRepairId || !repairModalNewNote.trim()) {
      return;
    }

    const nextNote: RepairNote = {
      id: `note-${Date.now()}`,
      author_name: currentUserLabel,
      author_email: user?.email ?? "unknown@local",
      created_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      text: repairModalNewNote.trim(),
    };

    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId ? { ...repair, repair_notes: [...repair.repair_notes, nextNote] } : repair
      )
    );
    setRepairModalNewNote("");
  }

  function handleRepairNoteDelete(noteId: string) {
    if (!selectedRepairId || !selectedRepair || !user?.email) {
      return;
    }

    const note = selectedRepair.repair_notes.find((entry) => entry.id === noteId);
    if (!note || note.author_email !== user.email) {
      return;
    }

    const shouldDelete = window.confirm("Delete this repair note?");
    if (!shouldDelete) {
      return;
    }

    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId
          ? { ...repair, repair_notes: repair.repair_notes.filter((entry) => entry.id !== noteId) }
          : repair
      )
    );
  }

  function handleRepairModalSave() {
    if (!selectedRepairId || !selectedRepair) {
      return;
    }

    if (selectedRepair.status !== repairModalStatus) {
      const shouldChange = window.confirm(
        `Change repair ${selectedRepair.tracking_code} status from ${repairStatusLabels[selectedRepair.status]} to ${repairStatusLabels[repairModalStatus]}?`
      );

      if (!shouldChange) {
        return;
      }
    }

    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId
          ? {
              ...repair,
              status: repairModalStatus,
              master_id: repairModalMasterId,
              master_name: masterProfiles.find((master) => master.id === repairModalMasterId)?.name ?? repair.master_name,
              before_photos: repairBeforePhotos,
              during_photos: repairDuringPhotos,
              after_photos: repairAfterPhotos,
            }
          : repair
      )
    );

    closeRepairModal();
  }

  function handleRepairDelete(repair: RepairEntry, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();

    const shouldDelete = window.confirm(`Delete repair ${repair.tracking_code}?`);
    if (!shouldDelete) {
      return;
    }

    setRepairs((current) => current.filter((entry) => entry.id !== repair.id));
    if (selectedRepairId === repair.id) {
      closeRepairModal();
    }
  }

  function handleCardDragStart(repairId: number, event: React.DragEvent) {
    event.dataTransfer.setData("repair-id", String(repairId));
    event.dataTransfer.effectAllowed = "move";
    setDraggingRepairId(repairId);
  }

  function handleCardDragEnd() {
    setDraggingRepairId(null);
    setDragOverColumn(null);
  }

  function handleColumnDragOver(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  function handleColumnDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  }

  function handleColumnDrop(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    const repairId = Number(event.dataTransfer.getData("repair-id"));
    if (repairId) {
      setRepairs((current) =>
        current.map((r) => (r.id === repairId ? { ...r, status } : r))
      );
    }
    setDraggingRepairId(null);
    setDragOverColumn(null);
  }

  async function handleCopyTrackingCode(trackingCode: string, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();
    await navigator.clipboard.writeText(trackingCode);
    setCopyToast(`Copied ${trackingCode}`);
    window.setTimeout(() => {
      setCopyToast((current) => (current === `Copied ${trackingCode}` ? "" : current));
    }, 1600);
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

  const visiblePurchases = useMemo(
    () =>
      purchases.filter((entry) => {
        const haystack =
          `${entry.order_date} ${entry.supplier_name} ${entry.part_name} ${entry.repair_code} ${entry.vehicle_label}`.toLowerCase();
        return haystack.includes(purchaseSearch.trim().toLowerCase());
      }),
    [purchaseSearch, purchases]
  );

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
  const selectedPurchase = purchases.find((entry) => entry.id === selectedPurchaseId) ?? null;

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
  const selectedVehicleRepairs = selectedVehicle
    ? repairs.filter((repair) => repair.vehicle_id === selectedVehicle.id)
    : [];
  const selectedVehiclePurchases = selectedVehicle
    ? purchases.filter((entry) => entry.vehicle_id === selectedVehicle.id)
    : [];

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function getRepairStatusClass(status: RepairStatus) {
    return `repair-status-chip repair-status-${status}`;
  }

  function renderDashboard() {
    return null;
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
                  <button type="button" className="button button-danger" onClick={() => void handleCustomerDelete(selectedCustomer)}>
                    Delete Customer
                  </button>
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
                            <span className={getRepairStatusClass(repair.status)}>{repairStatusLabels[repair.status]}</span>
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
      <div className="workspace-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Registry</p>
              <h3>Vehicle List</h3>
            </div>
            <button type="button" className="button" onClick={openVehicleCreateModal}>
              Add New Vehicle
            </button>
          </div>

          <label className="search-field search-field-tight">
            <span>Search vehicles</span>
            <input
              value={vehicleSearch}
              onChange={(event) => setVehicleSearch(event.target.value)}
              placeholder="Plate, make, model, VIN or customer"
              type="search"
            />
          </label>

          <div className="registry-list">
            {visibleVehicles.length === 0 ? (
              <p className="workspace-note">No vehicles yet.</p>
            ) : (
              visibleVehicles.map((vehicle) => (
                <article className="registry-card customer-card" key={vehicle.id} onClick={() => openVehicleDetailModal(vehicle)}>
                  <div>
                    <h4>{vehicle.license_plate}</h4>
                    <p>
                      {vehicle.make} {vehicle.model}
                      {vehicle.year ? `, ${vehicle.year}` : ""}
                    </p>
                    <p>{vehicle.customer.full_name}</p>
                    {getVehicleDetails(vehicle).mileage ? <p className="meta-line">Mileage: {getVehicleDetails(vehicle).mileage} km</p> : null}
                    {getVehicleDetails(vehicle).last_service_date ? (
                      <p className="meta-line">Last Service: {getVehicleDetails(vehicle).last_service_date}</p>
                    ) : null}
                    {getVehicleDetails(vehicle).added_date ? (
                      <p className="meta-line">Added: {getVehicleDetails(vehicle).added_date}</p>
                    ) : null}
                    {vehicle.vin ? <p className="meta-line">VIN: {vehicle.vin}</p> : null}
                    {vehicle.color ? <p className="meta-line">Color: {vehicle.color}</p> : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {selectedVehicle ? (
          <div className="modal-overlay" role="presentation" onClick={closeVehicleDetailModal}>
            <section
              className="modal-card modal-card-large"
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
                  <button type="button" className="button button-secondary" onClick={closeVehicleDetailModal}>
                    Close
                  </button>
                </div>
              </div>

              <div className="customer-detail-stack">
                <div className="detail-card">
                  <strong>Vehicle Info</strong>
                  <p>
                    {selectedVehicle.make} {selectedVehicle.model}
                    {selectedVehicle.year ? `, ${selectedVehicle.year}` : ""}
                  </p>
                  <p>Owner: {selectedVehicle.customer.full_name}</p>
                  {getVehicleDetails(selectedVehicle).mileage ? (
                    <p>Mileage: {getVehicleDetails(selectedVehicle).mileage} km</p>
                  ) : null}
                  {getVehicleDetails(selectedVehicle).last_service_date ? (
                    <p>Last Service Date: {getVehicleDetails(selectedVehicle).last_service_date}</p>
                  ) : null}
                  {getVehicleDetails(selectedVehicle).added_date ? (
                    <p>Date Added: {getVehicleDetails(selectedVehicle).added_date}</p>
                  ) : null}
                  {selectedVehicle.vin ? <p>VIN: {selectedVehicle.vin}</p> : null}
                  {selectedVehicle.color ? <p>Color: {selectedVehicle.color}</p> : null}
                  <p className="meta-line">{selectedVehicle.notes || "No notes yet"}</p>
                </div>

                <div className="detail-card">
                  <strong>Repairs And Tracking</strong>
                  {selectedVehicleRepairs.length === 0 ? (
                    <p className="workspace-note">No repairs linked to this vehicle yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedVehicleRepairs.map((repair) => (
                        <article className="detail-item" key={repair.id}>
                          <h4>{repair.service_name}</h4>
                          <p>Owner: {repair.owner_name}</p>
                          <p>Master: {repair.master_name}</p>
                          <div className="tracking-chip-row">
                            <span className={getRepairStatusClass(repair.status)}>{repairStatusLabels[repair.status]}</span>
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

                <div className="detail-card">
                  <strong>Linked Purchases</strong>
                  {selectedVehiclePurchases.length === 0 ? (
                    <p className="workspace-note">No purchases linked to this vehicle yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedVehiclePurchases.map((entry) => (
                        <article className="detail-item" key={entry.id}>
                          <h4>{entry.part_name}</h4>
                          <p>{entry.supplier_name}</p>
                          <p className="meta-line">Tracking: {entry.repair_code}</p>
                          <p className="meta-line">
                            Qty {entry.quantity} • Buy {formatCurrency(entry.purchase_price)} • Sell {formatCurrency(entry.sale_price)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {isVehicleFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closeVehicleFormModal}>
            <section className="modal-card modal-card-large" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Vehicle Intake</p>
                  <h3>{editingVehicleId ? "Edit Vehicle" : "Register Vehicle"}</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeVehicleFormModal}>
                  Close
                </button>
              </div>

              <form className="stack-form" onSubmit={handleVehicleSubmit}>

                {/* Owner field + inline customer creation */}
                <div className="inline-owner-block">
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
                      {isInlineCustomerOpen ? "Cancel" : "+ New customer"}
                    </button>
                  </div>

                  {isInlineCustomerOpen ? (
                    <form className="inline-customer-form" onSubmit={handleInlineCustomerSave}>
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
                      <div className="form-actions">
                        <button type="submit" className="button" disabled={isSavingInlineCustomer}>
                          {isSavingInlineCustomer ? "Creating…" : "Create & Select"}
                        </button>
                        <button type="button" className="button button-secondary" onClick={() => setIsInlineCustomerOpen(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : null}
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

                {customers.length === 0 ? (
                  <p className="workspace-note">Create a customer first, then attach the vehicle.</p>
                ) : null}
                {vehicleError ? <p className="form-error">{vehicleError}</p> : null}

                <div className="form-actions">
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

  const kanbanColumns: { status: RepairStatus; label: string }[] = [
    { status: "new",           label: "New" },
    { status: "in_progress",   label: "In Progress" },
    { status: "waiting_parts", label: "Waiting Parts" },
    { status: "completed",     label: "Completed" },
  ];

  function renderRepairsPreview() {
    return (
      <div className="workspace-stack">

        {/* Topbar */}
        <div className="kanban-topbar">
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
            <button type="button" className="button" onClick={openRepairCreateModal}>
              + New Repair
            </button>
          </div>
        </div>

        {/* Board */}
        <div className="kanban-board">
          {kanbanColumns.map(({ status, label }) => {
            const colRepairs = visibleRepairs.filter((r) => r.status === status);
            const isDropTarget = dragOverColumn === status;
            return (
              <div
                key={status}
                className={`kanban-col ${isDropTarget ? "kanban-col-drop-target" : ""}`}
                onDragOver={(e) => handleColumnDragOver(status, e)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(status, e)}
              >
                {/* Column header */}
                <div className="kanban-col-header">
                  <span className={getRepairStatusClass(status)}>{label}</span>
                  <span className="kanban-count">{colRepairs.length}</span>
                </div>

                {/* Cards */}
                <div className="kanban-cards">
                  {colRepairs.map((repair) => (
                    <article
                      key={repair.id}
                      className={`kanban-card ${draggingRepairId === repair.id ? "kanban-card-dragging" : ""}`}
                      draggable
                      onDragStart={(e) => handleCardDragStart(repair.id, e)}
                      onDragEnd={handleCardDragEnd}
                      onClick={() => openRepairModal(repair)}
                    >
                      <div className="kanban-card-top">
                        <h4 className="kanban-card-vehicle">{repair.vehicle_label}</h4>
                        <span className="kanban-drag-handle" title="Drag to move">⠿</span>
                      </div>

                      <p className="kanban-card-owner">{repair.owner_name}</p>
                      <p className="kanban-card-service">{repair.service_name}</p>

                      {repair.issue_notes ? (
                        <p className="kanban-card-issue">{repair.issue_notes}</p>
                      ) : null}

                      <div className="kanban-card-footer">
                        <span className="tracking-chip">#{repair.tracking_code}</span>
                        <button
                          type="button"
                          className="copy-chip"
                          aria-label={`Copy tracking code ${repair.tracking_code}`}
                          onClick={(event) => void handleCopyTrackingCode(repair.tracking_code, event)}
                        >
                          ⧉
                        </button>
                      </div>

                      <div className="kanban-card-meta">
                        <span>{repair.master_name}</span>
                        <span>{repair.created_at}</span>
                      </div>
                    </article>
                  ))}

                  {colRepairs.length === 0 ? (
                    <div className={`kanban-empty ${isDropTarget ? "kanban-empty-active" : ""}`}>
                      <span>{isDropTarget ? "Drop here" : "No repairs"}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {isRepairFormOpen ? (
          <div className="modal-overlay" role="presentation" onClick={closeRepairCreateModal}>
            <section className="modal-card modal-card-large" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Repair Intake</p>
                  <h3>Create Repair</h3>
                </div>
                <button type="button" className="button button-secondary" onClick={closeRepairCreateModal}>
                  Close
                </button>
              </div>

              <form className="stack-form" onSubmit={handleRepairSubmit}>
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
                  <select
                    value={repairForm.master_id}
                    onChange={(event) => setRepairForm((current) => ({ ...current, master_id: event.target.value }))}
                    required
                  >
                    <option value="">Select master</option>
                    {masterProfiles.map((master) => (
                      <option key={master.id} value={master.id}>
                        {master.name}
                      </option>
                    ))}
                  </select>
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
                      {Object.entries(repairStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Before Repair Photos</span>
                    <input accept="image/*" multiple onChange={handleRepairPhotosChange} type="file" />
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

                <div className="form-actions">
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
              className="modal-card"
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
                  <button
                    type="button"
                    className="button button-danger"
                    onClick={() => handleRepairDelete(selectedRepair)}
                  >
                    Delete Repair
                  </button>
                  <button type="button" className="button button-secondary" onClick={closeRepairModal}>
                    Close
                  </button>
                </div>
              </div>

              {/* ── Status Switcher ────────────────────────────── */}
              <div className="status-switcher">
                <span className="status-switcher-label">Status</span>
                <div className="status-switcher-options">
                  {kanbanColumns.map(({ status, label }) => (
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

              <div className="customer-detail-stack">
                <div className="detail-card repair-info-card">
                  <strong>Repair Info</strong>
                  <div className="repair-info-stack">
                    <div className="repair-info-row">
                      <span className="repair-info-label">Owner</span>
                      <p>{selectedRepair.owner_name}</p>
                    </div>
                    <div className="repair-info-row">
                      <span className="repair-info-label">Master</span>
                      <p>{selectedRepair.master_name}</p>
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

                <label className="repair-status-field">
                  <span>Master</span>
                  <select
                    value={repairModalMasterId}
                    onChange={(event) => setRepairModalMasterId(event.target.value)}
                  >
                    {masterProfiles.map((master) => (
                      <option key={master.id} value={master.id}>
                        {master.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="repair-status-field">
                  <span>Add Repair Note</span>
                  <textarea
                    value={repairModalNewNote}
                    onChange={(event) => setRepairModalNewNote(event.target.value)}
                    rows={4}
                  />
                </label>
                <div className="form-actions">
                  <button type="button" className="button button-secondary" onClick={handleRepairNoteAdd}>
                    Add Note
                  </button>
                </div>

                <div className="detail-card">
                  <strong>Repair Notes History</strong>
                  {selectedRepair.repair_notes.length === 0 ? (
                    <p className="workspace-note">No repair notes yet.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedRepair.repair_notes.map((note) => (
                        <article className="detail-item" key={note.id}>
                          <div className="note-header">
                            <strong>{note.author_name}</strong>
                            <span className="meta-line">{note.created_at}</span>
                          </div>
                          <p className="meta-line">{note.author_email}</p>
                          <p>{note.text}</p>
                          {note.author_email === user?.email ? (
                            <button
                              type="button"
                              className="text-action"
                              onClick={() => handleRepairNoteDelete(note.id)}
                            >
                              Delete note
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <label className="repair-status-field">
                  <span>Photos Before Repair</span>
                  <input accept="image/*" multiple onChange={handleRepairBeforePhotosChange} type="file" />
                </label>
                {repairBeforePhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairBeforePhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="Before repair preview" />
                    ))}
                  </div>
                ) : null}

                <label className="repair-status-field">
                  <span>Photos During Repair</span>
                  <input accept="image/*" multiple onChange={handleRepairDuringPhotosChange} type="file" />
                </label>
                {repairDuringPhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairDuringPhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="During repair preview" />
                    ))}
                  </div>
                ) : null}

                <label className="repair-status-field">
                  <span>Photos After Repair</span>
                  <input accept="image/*" multiple onChange={handleRepairAfterPhotosChange} type="file" />
                </label>
                {repairAfterPhotos.length > 0 ? (
                  <div className="photo-preview-grid">
                    {repairAfterPhotos.map((preview) => (
                      <img className="photo-preview" key={preview} src={preview} alt="After repair preview" />
                    ))}
                  </div>
                ) : null}

                <div className="form-actions">
                  <button type="button" className="button" onClick={handleRepairModalSave}>
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
      <div className="workspace-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Ordered Parts</p>
              <h3>Purchase Registry</h3>
            </div>
            <button type="button" className="button" onClick={openPurchaseCreateModal}>
              Add New Purchase
            </button>
          </div>

          <label className="search-field search-field-tight">
            <span>Search purchases</span>
            <input
              value={purchaseSearch}
              onChange={(event) => setPurchaseSearch(event.target.value)}
              placeholder="Supplier, part, repair code or vehicle"
              type="search"
            />
          </label>

          <div className="registry-list">
            {visiblePurchases.length === 0 ? (
              <p className="workspace-note">No purchases match the current filter.</p>
            ) : (
              visiblePurchases.map((entry) => {
                const purchaseTotal = entry.quantity * entry.purchase_price;
                const saleTotal = entry.quantity * entry.sale_price;
                return (
                  <article className="registry-card purchase-card purchase-card-clickable" key={entry.id} onClick={() => openPurchaseDetailModal(entry)}>
                    <div className="purchase-card-main">
                      <div className="purchase-card-topline">
                        <h4>{entry.part_name}</h4>
                        <span className="tag">{entry.order_date}</span>
                      </div>
                      <p>{entry.supplier_name}</p>
                      <p>{entry.vehicle_label}</p>
                      <p className="meta-line">Tracking: {entry.repair_code}</p>
                      {entry.invoice_name ? <p className="meta-line">Invoice: {entry.invoice_name}</p> : null}
                      <div className="purchase-amounts">
                        <span>Qty {entry.quantity}</span>
                        <span>Buy {formatCurrency(entry.purchase_price)}</span>
                        <span>Sell {formatCurrency(entry.sale_price)}</span>
                        <span>Total Buy {formatCurrency(purchaseTotal)}</span>
                        <span>Total Sell {formatCurrency(saleTotal)}</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

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
                        <span>Supplier</span>
                        <input
                          value={purchaseModalForm.supplier_name}
                          onChange={(event) =>
                            setPurchaseModalForm((current) => ({ ...current, supplier_name: event.target.value }))
                          }
                          type="text"
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
                    <span>Supplier</span>
                    <input
                      value={purchaseForm.supplier_name}
                      onChange={(event) =>
                        setPurchaseForm((current) => ({ ...current, supplier_name: event.target.value }))
                      }
                      type="text"
                      placeholder="Supplier name"
                      required
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

  function renderUsersSection() {
    const userTabMeta: Record<UserAccessTab, { title: string; login: string; password: string; note: string }> = {
      owner: {
        title: "Owner",
        login: user?.email ?? "owner@autoservice.local",
        password: "Current owner session",
        note: "Full access to the entire system.",
      },
      admins: {
        title: "Admins",
        login: "admin@autoservice.local",
        password: "admin12345",
        note: "Placeholder admin account for the next implementation step.",
      },
      masters: {
        title: "Masters",
        login: masterProfiles[0].login,
        password: masterProfiles[0].password,
        note: "Demo masters are available below for repair assignment testing.",
      },
    };

    const currentUserTab = userTabMeta[activeUserTab];

    return (
      <div className="workspace-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Role Layers</p>
              <h3>User Access Structure</h3>
            </div>
          </div>

          <div className="subnav-tabs" role="tablist" aria-label="User access levels">
            {(["owner", "admins", "masters"] as UserAccessTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeUserTab === tab}
                className={`subnav-tab ${activeUserTab === tab ? "subnav-tab-active" : ""}`}
                onClick={() => setActiveUserTab(tab)}
              >
                {tab === "owner" ? "Owner" : tab === "admins" ? "Admins" : "Masters"}
              </button>
            ))}
          </div>

          <div className="role-card">
            <h3>{currentUserTab.title}</h3>
            <div className="credential-list">
              <article className="role-item">
                <strong>Login</strong>
                <p>{currentUserTab.login}</p>
              </article>
              <article className="role-item">
                <strong>Password</strong>
                <p>{currentUserTab.password}</p>
              </article>
              <article className="role-item">
                <strong>Note</strong>
                <p>{currentUserTab.note}</p>
              </article>
              {activeUserTab === "masters"
                ? masterProfiles.map((master) => (
                    <article className="role-item" key={master.id}>
                      <strong>{master.name}</strong>
                      <p>Login: {master.login}</p>
                      <p>Password: {master.password}</p>
                    </article>
                  ))
                : null}
            </div>
          </div>
        </section>
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
