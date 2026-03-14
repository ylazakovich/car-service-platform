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
  notes: string;
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
  work_code: string;
  vehicle_label: string;
};

type PurchaseFormState = {
  order_date: string;
  supplier_name: string;
  part_name: string;
  quantity: string;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  work_code: string;
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
  work_code: "",
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
    work_code: "RW-BRAKE-01",
    vehicle_label: "WB 1234K • Toyota Corolla",
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
    work_code: "RW-OIL-02",
    vehicle_label: "WX 9088P • BMW X3",
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
    work_code: "RW-AIR-01",
    vehicle_label: "GD 4477M • Audi A4",
  },
];

const repairServiceOptions = [
  "Oil Change",
  "Brake Service",
  "Diagnostics",
  "Suspension Repair",
  "Engine Check",
  "Custom Service",
];

const repairStatusLabels: Record<RepairStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_parts: "Waiting Parts",
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
    repair_notes: [
      {
        id: "note-1",
        author_name: "Ivan Petrenko",
        author_email: "master.one@autoservice.local",
        created_at: "2026-03-13 09:10",
        text: "Client reported issue during morning drop-off.",
      },
    ],
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
    repair_notes: [
      {
        id: "note-2",
        author_name: "Oleh Bondar",
        author_email: "master.two@autoservice.local",
        created_at: "2026-03-14 11:35",
        text: "Initial diagnostics started, waiting for test results.",
      },
    ],
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
    repair_notes: [
      {
        id: "note-3",
        author_name: "Ivan Petrenko",
        author_email: "master.one@autoservice.local",
        created_at: "2026-03-15 14:05",
        text: "Part identified, supplier confirmation pending.",
      },
    ],
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
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
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
  const [copyToast, setCopyToast] = useState("");

  const customers = useMemo(() => [...serverCustomers, ...demoCustomers], [serverCustomers, demoCustomers]);
  const vehicles = useMemo(() => [...serverVehicles, ...demoVehicles], [serverVehicles, demoVehicles]);
  const currentUserLabel = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : "Unknown User";

  useEffect(() => {
    void loadRegistries();
  }, []);

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
    setVehicleForm({ ...emptyVehicleForm, customer_id: nextCustomerId });
    setEditingVehicleId(null);
    setVehicleError("");
  }

  function resetPurchaseForm() {
    setPurchaseForm(emptyPurchaseForm);
    setPurchaseError("");
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
        setSelectedCustomerId(response.data.id);
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
          notes: payload.notes,
          is_demo: true,
        };

        setDemoVehicles((current) => {
          if (editingVehicleId) {
            return current.map((vehicle) => (vehicle.id === editingVehicleId ? demoPayload : vehicle));
          }
          return [demoPayload, ...current];
        });
      } else if (editingVehicleId) {
        await api.patch(`/vehicles/${editingVehicleId}`, payload);
      } else {
        await api.post("/vehicles/", payload);
      }
      await loadRegistries();
      resetVehicleForm(vehicleForm.customer_id);
    } catch (error) {
      setVehicleError(getErrorMessage(error, "Unable to save vehicle."));
    } finally {
      setIsSavingVehicle(false);
    }
  }

  async function handleCustomerDelete(customer: Customer) {
    setCustomerError("");
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
      work_code: purchaseForm.work_code.trim() || "Unassigned",
      vehicle_label: selectedVehicle
        ? `${selectedVehicle.license_plate} • ${selectedVehicle.make} ${selectedVehicle.model}`
        : "Stock / Unassigned",
    };

    setPurchases((current) => [nextEntry, ...current]);
    resetPurchaseForm();
    setIsSavingPurchase(false);
  }

  function handlePurchaseDelete(entryId: number) {
    setPurchases((current) => current.filter((entry) => entry.id !== entryId));
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
      repairForm.service_key === "Custom Service" ? repairForm.custom_service.trim() : repairForm.service_key;
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
          `${entry.order_date} ${entry.supplier_name} ${entry.part_name} ${entry.repair_code} ${entry.work_code} ${entry.vehicle_label}`.toLowerCase();
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

  const purchaseMetrics = useMemo(() => {
    return purchases.reduce(
      (accumulator, entry) => {
        const purchaseTotal = entry.quantity * entry.purchase_price;
        const saleTotal = entry.quantity * entry.sale_price;
        return {
          lines: accumulator.lines + 1,
          purchaseTotal: accumulator.purchaseTotal + purchaseTotal,
          saleTotal: accumulator.saleTotal + saleTotal,
        };
      },
      { lines: 0, purchaseTotal: 0, saleTotal: 0 }
    );
  }, [purchases]);

  const purchaseMargin = purchaseMetrics.saleTotal - purchaseMetrics.purchaseTotal;
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

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  }

  function renderDashboard() {
    return null;
  }

  function renderCustomersSection() {
    return (
      <div className="workspace-stack">
        <div className="customer-layout">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>{editingCustomerId ? "Edit Customer" : "Create Customer"}</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={() => void loadRegistries()}>
                Refresh
              </button>
            </div>

            <form className="stack-form" onSubmit={handleCustomerSubmit}>
              <label>
                <span>Full Name</span>
                <input
                  value={customerForm.full_name}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, full_name: event.target.value }))}
                  type="text"
                  required
                />
              </label>

              <label>
                <span>Phone</span>
                <input
                  value={customerForm.phone}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))}
                  type="text"
                  required
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  value={customerForm.email}
                  onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))}
                  type="email"
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
                  rows={4}
                />
              </label>

              {customerError ? <p className="form-error">{customerError}</p> : null}

              <div className="form-actions">
                <button type="submit" className="button" disabled={isSavingCustomer}>
                  {isSavingCustomer ? "Saving..." : editingCustomerId ? "Update Customer" : "Create Customer"}
                </button>
                {editingCustomerId ? (
                  <button type="button" className="button button-secondary" onClick={resetCustomerForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Customers</h3>
              </div>
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
                  <article
                    className={`registry-card customer-card ${
                      selectedCustomer?.id === customer.id ? "customer-card-active" : ""
                    }`}
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    <div>
                      <h4>{customer.full_name}</h4>
                      <p>{customer.phone}</p>
                      {customer.email ? <p>{customer.email}</p> : null}
                      <p className="meta-line">Vehicles: {customerVehicleCounts[customer.id] ?? 0}</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedCustomerId(customer.id);
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
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCustomerDelete(customer);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>{selectedCustomer ? selectedCustomer.full_name : "Customer Details"}</h3>
              </div>
            </div>

            {selectedCustomer ? (
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
                  {selectedCustomerVehicles.length === 0 ? (
                    <p className="workspace-note">Repair history will appear after vehicles and repairs are linked.</p>
                  ) : (
                    <div className="detail-list">
                      {selectedCustomerVehicles.map((vehicle, index) => (
                        <article className="detail-item" key={`${vehicle.id}-repair`}>
                          <h4>{vehicle.license_plate}</h4>
                          <p>Status: repair module pending</p>
                          <p className="meta-line">Tracking: TOR-{selectedCustomer.id}-{index + 1}</p>
                          <p className="meta-line">Repairs will appear here once the first repair order is created.</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="workspace-note">Select a customer to open the full profile.</p>
            )}
          </section>
        </div>
      </div>
    );
  }

  function renderVehiclesSection() {
    return (
      <div className="workspace-stack">
        <div className="section-split">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Vehicle Intake</p>
                <h3>{editingVehicleId ? "Edit Vehicle" : "Register Vehicle"}</h3>
              </div>
            </div>

            <form className="stack-form" onSubmit={handleVehicleSubmit}>
                <label>
                  <span>Owner</span>
                  <select
                  value={vehicleForm.customer_id}
                  onChange={(event) => setVehicleForm((current) => ({ ...current, customer_id: event.target.value }))}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-grid">
                <label>
                  <span>License Plate</span>
                  <input
                    value={vehicleForm.license_plate}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, license_plate: event.target.value }))}
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
                    type="text"
                    required
                  />
                </label>

                <label>
                  <span>Model</span>
                  <input
                    value={vehicleForm.model}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, model: event.target.value }))}
                    type="text"
                    required
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  <span>VIN</span>
                  <input
                    value={vehicleForm.vin}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, vin: event.target.value }))}
                    type="text"
                  />
                </label>

                <label>
                  <span>Color</span>
                  <input
                    value={vehicleForm.color}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, color: event.target.value }))}
                    type="text"
                  />
                </label>
              </div>

              <label>
                <span>Notes</span>
                <textarea
                  value={vehicleForm.notes}
                  onChange={(event) => setVehicleForm((current) => ({ ...current, notes: event.target.value }))}
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
                {editingVehicleId ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => resetVehicleForm(vehicleForm.customer_id)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Registry</p>
                <h3>Vehicle List</h3>
              </div>
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
                  <article className="registry-card" key={vehicle.id}>
                    <div>
                      <h4>{vehicle.license_plate}</h4>
                      <p>
                        {vehicle.make} {vehicle.model}
                        {vehicle.year ? `, ${vehicle.year}` : ""}
                      </p>
                      <p>{vehicle.customer.full_name}</p>
                      {vehicle.vin ? <p className="meta-line">VIN: {vehicle.vin}</p> : null}
                      {vehicle.color ? <p className="meta-line">Color: {vehicle.color}</p> : null}
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
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
                            notes: vehicle.notes,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => void handleVehicleDelete(vehicle)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  function renderRepairsPreview() {
    return (
      <div className="workspace-stack">
        <div className="section-split repairs-layout">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Repair Intake</p>
                <h3>Create Repair</h3>
              </div>
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

              {repairForm.service_key === "Custom Service" ? (
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
                <button type="button" className="button button-secondary" onClick={resetRepairForm}>
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Current Repairs</p>
                <h3>Repair List</h3>
              </div>
            </div>

            <label className="search-field search-field-tight">
              <span>Search repairs</span>
              <input
                value={repairSearch}
                onChange={(event) => setRepairSearch(event.target.value)}
                placeholder="Tracking, vehicle, owner, service or status"
                type="search"
              />
            </label>

            <div className="registry-list">
              {visibleRepairs.map((repair) => (
                <article className="registry-card repair-card repair-card-clickable" key={repair.id} onClick={() => openRepairModal(repair)}>
                  <div className="repair-card-main">
                    <div className="repair-card-topline">
                      <h4>{repair.vehicle_label}</h4>
                      <span className="tag">{repairStatusLabels[repair.status]}</span>
                    </div>
                    <p>{repair.owner_name}</p>
                    <p>Master: {repair.master_name}</p>
                    <p>{repair.service_name}</p>
                    <div className="tracking-chip-row">
                      <span className="tracking-chip">Tracking: {repair.tracking_code}</span>
                      <button
                        type="button"
                        className="copy-chip"
                        aria-label={`Copy tracking code ${repair.tracking_code}`}
                        onClick={(event) => void handleCopyTrackingCode(repair.tracking_code, event)}
                      >
                        ⧉
                      </button>
                    </div>
                    <p className="meta-line">Created: {repair.created_at}</p>
                    <p className="meta-line">{repair.issue_notes}</p>
                    <p className="meta-line">Notes: {repair.repair_notes.length}</p>
                    <p className="meta-line">
                      Photos: before {repair.before_photos.length}, during {repair.during_photos.length}, after {repair.after_photos.length}
                    </p>
                  </div>
                </article>
              ))}
              {visibleRepairs.length === 0 ? <p className="workspace-note">No repairs match the current filter.</p> : null}
            </div>
          </section>
        </div>

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
                <button type="button" className="button button-secondary" onClick={closeRepairModal}>
                  Close
                </button>
              </div>

              <div className="customer-detail-stack">
                <div className="detail-card">
                  <strong>Repair Info</strong>
                  <p>{selectedRepair.owner_name}</p>
                  <p>Master: {selectedRepair.master_name}</p>
                  <p>{selectedRepair.service_name}</p>
                  <div className="tracking-chip-row">
                    <span className="tracking-chip">Tracking: {selectedRepair.tracking_code}</span>
                    <button
                      type="button"
                      className="copy-chip"
                      aria-label={`Copy tracking code ${selectedRepair.tracking_code}`}
                      onClick={() => void handleCopyTrackingCode(selectedRepair.tracking_code)}
                    >
                      ⧉
                    </button>
                  </div>
                  <p className="meta-line">Issue: {selectedRepair.issue_notes}</p>
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
                  <span>Status</span>
                  <select
                    value={repairModalStatus}
                    onChange={(event) => setRepairModalStatus(event.target.value as RepairStatus)}
                  >
                    {Object.entries(repairStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
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
        <div className="metric-grid metric-grid-three">
          <article className="metric-card">
            <span className="metric-label">Purchase Lines</span>
            <strong>{purchaseMetrics.lines}</strong>
            <p>All ordered part positions currently tracked in the frontend workspace.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Purchase Total</span>
            <strong>{formatCurrency(purchaseMetrics.purchaseTotal)}</strong>
            <p>Total supplier-side spend across all listed purchase entries.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Projected Margin</span>
            <strong>{formatCurrency(purchaseMargin)}</strong>
            <p>Difference between purchase totals and sale totals for the current screen.</p>
          </article>
        </div>

        <div className="section-split purchases-layout">
          <section className="panel">
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
                    inputMode="numeric"
                    type="text"
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
                    onChange={(event) =>
                      setPurchaseForm((current) => ({ ...current, purchase_price: event.target.value }))
                    }
                    inputMode="decimal"
                    type="text"
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span>Sale Price</span>
                  <input
                    value={purchaseForm.sale_price}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, sale_price: event.target.value }))}
                    inputMode="decimal"
                    type="text"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label>
                <span>Work Code</span>
                <input
                  value={purchaseForm.work_code}
                  onChange={(event) => setPurchaseForm((current) => ({ ...current, work_code: event.target.value }))}
                  type="text"
                  placeholder="Optional line or work code"
                />
              </label>

              {purchaseError ? <p className="form-error">{purchaseError}</p> : null}

              <div className="form-actions">
                <button type="submit" className="button" disabled={isSavingPurchase}>
                  {isSavingPurchase ? "Saving..." : "Add Purchase"}
                </button>
                <button type="button" className="button button-secondary" onClick={resetPurchaseForm}>
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Ordered Parts</p>
                <h3>Purchase Registry</h3>
              </div>
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
                    <article className="registry-card purchase-card" key={entry.id}>
                      <div className="purchase-card-main">
                        <div className="purchase-card-topline">
                          <h4>{entry.part_name}</h4>
                          <span className="tag">{entry.order_date}</span>
                        </div>
                        <p>{entry.supplier_name}</p>
                        <p>{entry.vehicle_label}</p>
                        <p className="meta-line">
                          Tracking: {entry.repair_code} • Work: {entry.work_code}
                        </p>
                        <div className="purchase-amounts">
                          <span>Qty {entry.quantity}</span>
                          <span>Buy {formatCurrency(entry.purchase_price)}</span>
                          <span>Sell {formatCurrency(entry.sale_price)}</span>
                          <span>Total Buy {formatCurrency(purchaseTotal)}</span>
                          <span>Total Sell {formatCurrency(saleTotal)}</span>
                        </div>
                      </div>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => handlePurchaseDelete(entry.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
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
