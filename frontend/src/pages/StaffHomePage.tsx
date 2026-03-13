import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { StaffSection } from "../App";
import api from "../api/client";

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  notes: string;
  vehicle_count: number;
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
};

type CustomerFormState = {
  full_name: string;
  phone: string;
  email: string;
  notes: string;
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

const emptyCustomerForm: CustomerFormState = {
  full_name: "",
  phone: "",
  email: "",
  notes: "",
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

const sectionMeta: Record<StaffSection, { eyebrow: string; title: string; copy: string }> = {
  dashboard: {
    eyebrow: "Workshop Overview",
    title: "Operations Dashboard",
    copy: "Track the shape of the workshop and jump straight into the next customer or vehicle action.",
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(emptyVehicleForm);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

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
      setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
      setVehicles(Array.isArray(vehiclesResponse.data) ? vehiclesResponse.data : []);
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
      if (editingCustomerId) {
        await api.patch(`/customers/${editingCustomerId}`, payload);
      } else {
        const response = await api.post("/customers/", payload);
        setVehicleForm((current) => ({
          ...current,
          customer_id: current.customer_id || String(response.data.id),
        }));
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
      if (editingVehicleId) {
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
      await api.delete(`/customers/${customer.id}`);
      await loadRegistries();
      if (editingCustomerId === customer.id) {
        resetCustomerForm();
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
      await api.delete(`/vehicles/${vehicle.id}`);
      await loadRegistries();
      if (editingVehicleId === vehicle.id) {
        resetVehicleForm(vehicleForm.customer_id);
      }
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

  const customersWithoutVehicles = customers.filter((customer) => customer.vehicle_count === 0);
  const recentCustomers = customers.slice(0, 3);
  const recentVehicles = vehicles.slice(0, 3);

  function renderDashboard() {
    return (
      <div className="workspace-stack">
        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">Workshop Control</p>
            <h2>Customers And Vehicles Are Ready</h2>
            <p>
              The workspace now starts like an actual operations tool: records on one side, repair flow queued
              as the next primary module.
            </p>
          </div>
          <div className="hero-actions">
            <button type="button" className="button" onClick={() => onSelectSection("customers")}>
              Create Customer
            </button>
            <button type="button" className="button button-ghost" onClick={() => onSelectSection("vehicles")}>
              Register Vehicle
            </button>
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span className="metric-label">Customers</span>
            <strong>{customers.length}</strong>
            <p>Owner records already in the workspace.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Vehicles</span>
            <strong>{vehicles.length}</strong>
            <p>Registered vehicles ready for future repair orders.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Needs Vehicle</span>
            <strong>{customersWithoutVehicles.length}</strong>
            <p>Customers created but not yet tied to a car.</p>
          </article>
          <article className="metric-card metric-card-accent">
            <span className="metric-label">Repairs</span>
            <strong>Next</strong>
            <p>The next slice turns this registry base into an actual workshop board.</p>
          </article>
        </section>

        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Action Queue</p>
                <h3>What To Do Next</h3>
              </div>
            </div>
            <div className="queue-list">
              <article className="queue-item">
                <strong>Capture new owners first</strong>
                <p>Use the customer registry before building vehicles and repairs.</p>
                <button type="button" className="text-action" onClick={() => onSelectSection("customers")}>
                  Open customer registry
                </button>
              </article>
              <article className="queue-item">
                <strong>Register vehicles with unique plates</strong>
                <p>The vehicle registry is the launch point for future repair history.</p>
                <button type="button" className="text-action" onClick={() => onSelectSection("vehicles")}>
                  Open vehicle registry
                </button>
              </article>
              <article className="queue-item">
                <strong>Repairs are the next module</strong>
                <p>Statuses, photos, parts and documents will land in the repairs section next.</p>
                <button type="button" className="text-action" onClick={() => onSelectSection("repairs")}>
                  See repair roadmap
                </button>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Fresh Records</p>
                <h3>Recent Customers</h3>
              </div>
            </div>
            <div className="compact-list">
              {recentCustomers.length === 0 ? (
                <p className="workspace-note">No customers yet.</p>
              ) : (
                recentCustomers.map((customer) => (
                  <article className="compact-card" key={customer.id}>
                    <div>
                      <h4>{customer.full_name}</h4>
                      <p>{customer.phone}</p>
                    </div>
                    <span className="tag">{customer.vehicle_count} vehicles</span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Fleet Pulse</p>
                <h3>Recent Vehicles</h3>
              </div>
            </div>
            <div className="compact-list">
              {recentVehicles.length === 0 ? (
                <p className="workspace-note">No vehicles yet.</p>
              ) : (
                recentVehicles.map((vehicle) => (
                  <article className="compact-card" key={vehicle.id}>
                    <div>
                      <h4>{vehicle.license_plate}</h4>
                      <p>
                        {vehicle.make} {vehicle.model}
                        {vehicle.year ? `, ${vehicle.year}` : ""}
                      </p>
                    </div>
                    <span className="tag">{vehicle.customer.full_name}</span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel panel-dark">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Repair Board</p>
                <h3>Upcoming States</h3>
              </div>
            </div>
            <div className="status-strip">
              {["draft", "diagnosed", "in_progress", "completed", "delivered"].map((status) => (
                <span className="status-pill" key={status}>
                  {status}
                </span>
              ))}
            </div>
            <p className="panel-dark-copy">
              This is where the workshop board will grow next, on top of the customer and vehicle registries
              already in place.
            </p>
          </section>
        </div>
      </div>
    );
  }

  function renderCustomersSection() {
    return (
      <div className="workspace-stack">
        <div className="section-split">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer Intake</p>
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
                <p className="eyebrow">Registry</p>
                <h3>Customer List</h3>
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
                  <article className="registry-card" key={customer.id}>
                    <div>
                      <h4>{customer.full_name}</h4>
                      <p>{customer.phone}</p>
                      {customer.email ? <p>{customer.email}</p> : null}
                      <p className="meta-line">Vehicles: {customer.vehicle_count}</p>
                    </div>
                    <div className="inline-actions">
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setEditingCustomerId(customer.id);
                          setCustomerError("");
                          setCustomerForm({
                            full_name: customer.full_name,
                            phone: customer.phone,
                            email: customer.email,
                            notes: customer.notes,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => void handleCustomerDelete(customer)}
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
              <span className="panel-tip">Each vehicle belongs to one active customer in v1.</span>
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
                  <input
                    value={vehicleForm.year}
                    onChange={(event) => setVehicleForm((current) => ({ ...current, year: event.target.value }))}
                    inputMode="numeric"
                    type="text"
                  />
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
        <section className="panel panel-dark panel-dark-large">
          <p className="eyebrow">Next Module</p>
          <h3>Repair Board Is The Next Build</h3>
          <p className="panel-dark-copy">
            This section is intentionally staged ahead of implementation so the workspace already reflects the
            future operating model: customers and vehicles feed into repair intake, diagnostics, execution and
            completion.
          </p>
          <div className="status-strip">
            {["draft", "diagnosed", "in_progress", "completed", "delivered"].map((status) => (
              <span className="status-pill" key={status}>
                {status}
              </span>
            ))}
          </div>
        </section>

        <section className="metric-grid">
          <article className="metric-card">
            <span className="metric-label">Input Sources</span>
            <strong>2</strong>
            <p>Customer registry and vehicle registry already prepare this flow.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">Planned Blocks</span>
            <strong>5</strong>
            <p>Works, parts, suppliers, photos and completion act.</p>
          </article>
          <article className="metric-card">
            <span className="metric-label">First Flow</span>
            <strong>1</strong>
            <p>Create customer, add vehicle, open repair order.</p>
          </article>
        </section>
      </div>
    );
  }

  const currentSectionMeta = sectionMeta[activeSection];

  return (
    <div className="workspace">
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
          <button type="button" className="button" onClick={() => onSelectSection("repairs")}>
            Open Repair Roadmap
          </button>
        </div>
      </header>

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {isLoading ? <p className="workspace-note">Loading registries...</p> : null}

      {activeSection === "dashboard" ? renderDashboard() : null}
      {activeSection === "customers" ? renderCustomersSection() : null}
      {activeSection === "vehicles" ? renderVehiclesSection() : null}
      {activeSection === "repairs" ? renderRepairsPreview() : null}
    </div>
  );
}
