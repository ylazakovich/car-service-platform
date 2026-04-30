import axios from "axios";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { createService, deleteService, fetchServices, updateService, type ServiceItem } from "../../../api/services";

type ServicesRegisterPanelProps = {
  onServicesChanged?: () => void;
};

function CatalogActiveToggle({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="services-active-toggle" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className={`services-active-toggle__btn${!value ? " services-active-toggle__btn--selected-inactive" : ""}`}
        aria-pressed={!value}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        Inactive
      </button>
      <button
        type="button"
        className={`services-active-toggle__btn${value ? " services-active-toggle__btn--selected-active" : ""}`}
        aria-pressed={value}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        Active
      </button>
    </div>
  );
}

function ServiceRow({
  service,
  onReload,
  onCatalogChanged,
}: {
  service: ServiceItem;
  onReload: () => Promise<void>;
  onCatalogChanged?: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description ?? "");
  const [price, setPrice] = useState(service.price ?? "");
  const [isActive, setIsActive] = useState(service.is_active);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    setName(service.name);
    setDescription(service.description ?? "");
    setPrice(service.price ?? "");
    setIsActive(service.is_active);
  }, [service.id, service.name, service.description, service.price, service.is_active]);

  const dirty =
    name.trim() !== service.name ||
    (description.trim() || "") !== (service.description ?? "") ||
    (price.trim() || "") !== (service.price ?? "") ||
    isActive !== service.is_active;

  async function handleSave() {
    setBusy(true);
    setRowError("");
    const priceTrim = price.trim();
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: priceTrim === "" ? null : priceTrim,
      is_active: isActive,
    };
    try {
      await updateService(service.id, payload);
      await onReload();
      onCatalogChanged?.();
    } catch (e) {
      setRowError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove service “${service.name}” from the catalog?`)) return;
    setBusy(true);
    setRowError("");
    try {
      await deleteService(service.id);
      await onReload();
      onCatalogChanged?.();
    } catch (e) {
      setRowError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <td>
        <input
          type="text"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          disabled={busy}
          aria-label={`Service name (${service.id})`}
        />
      </td>
      <td>
        <textarea
          className="uom-admin-cell-input--compact"
          rows={2}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
          disabled={busy}
          aria-label={`Description for ${service.name}`}
        />
      </td>
      <td>
        <input
          type="text"
          inputMode="decimal"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={price}
          onChange={(ev) => setPrice(ev.target.value)}
          disabled={busy}
          placeholder="0.00"
          aria-label={`Price for ${service.name}`}
        />
      </td>
      <td>
        <CatalogActiveToggle
          value={isActive}
          onChange={setIsActive}
          disabled={busy}
          ariaLabel={`Catalog status for ${service.name}`}
        />
      </td>
      <td>
        <div className="uom-admin-row-actions">
          <button type="button" className="button button-secondary" disabled={busy || !dirty} onClick={() => void handleSave()}>
            Save
          </button>
          <button type="button" className="button button-danger uom-delete-row-btn" disabled={busy} onClick={() => void handleDelete()}>
            Delete
          </button>
        </div>
        {rowError ? <p className="workspace-note uom-admin-row-error">{rowError}</p> : null}
      </td>
    </tr>
  );
}

export function ServicesRegisterPanel({ onServicesChanged }: ServicesRegisterPanelProps) {
  const addDialogTitleId = useId();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const svcQuery = useDeferredValue(svcSearch.trim().toLowerCase());
  const filteredServices = useMemo(() => {
    if (!svcQuery) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(svcQuery) ||
        (s.description || "").toLowerCase().includes(svcQuery) ||
        (s.price || "").toLowerCase().includes(svcQuery),
    );
  }, [services, svcQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchServices();
      setServices(data);
    } catch {
      setLoadError("Failed to load services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!addOpen) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !createBusy) {
        setAddOpen(false);
        setCreateError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addOpen, createBusy]);

  function closeAddModal() {
    if (createBusy) return;
    setAddOpen(false);
    setCreateError("");
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setCreateError("Name is required.");
      return;
    }
    const priceTrim = newPrice.trim();
    setCreateBusy(true);
    setCreateError("");
    try {
      await createService({
        name,
        description: newDescription.trim(),
        price: priceTrim === "" ? null : priceTrim,
        is_active: newActive,
      });
      setNewName("");
      setNewDescription("");
      setNewPrice("");
      setNewActive(true);
      setAddOpen(false);
      await load();
      onServicesChanged?.();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        const detail = typeof body?.detail === "string" ? body.detail : null;
        const nameErr = body?.name;
        setCreateError(detail ?? (Array.isArray(nameErr) ? nameErr.join(" ") : "Could not create service."));
      } else {
        setCreateError("Could not create service.");
      }
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <>
      <section className="uom-admin-page services-register-page" aria-labelledby="services-register-title">
        <div className="registers-embedded-section-head">
          <h3 id="services-register-title" className="uom-admin-subtitle">
            Services
          </h3>
          <button
            type="button"
            className="button"
            disabled={loading}
            onClick={() => {
              setAddOpen(true);
              setCreateError("");
            }}
          >
            + Add service
          </button>
        </div>
        <p className="workspace-note uom-admin-lead">
          Edit values <strong>directly in the table</strong> (name, description, price, active). Press <strong>Save</strong> on the
          row to persist changes. Catalog prices feed repair lines and estimates; <strong>Active</strong> hides a service from
          pickers but keeps history.
        </p>

        <div className="registers-search-toolbar">
          <label className="registers-search-field">
            <span>Search</span>
            <input
              type="search"
              value={svcSearch}
              onChange={(ev) => setSvcSearch(ev.target.value)}
              placeholder="Name, description, or price…"
              autoComplete="off"
              aria-label="Search services"
            />
          </label>
        </div>

        {loadError ? <p className="workspace-note">{loadError}</p> : null}
        {loading ? <p className="workspace-note">Loading…</p> : null}

        {!loading && !loadError ? (
          <>
            <p className="services-register-table-hint" id="services-register-table-hint">
              Edit in the table, then <strong>Save</strong> on each row.
            </p>
            <div className="uom-admin-table-wrap registers-table-wrap services-register-table-wrap">
              <table
                className="uom-admin-table uom-admin-table--compact registers-editor-table services-register-editor-table"
                aria-describedby="services-register-table-hint"
              >
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Price</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <p className="workspace-note">
                          {services.length === 0
                            ? "No services yet. Add one to build the catalog."
                            : "No services match this search."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((s) => (
                      <ServiceRow key={s.id} service={s} onReload={load} onCatalogChanged={onServicesChanged} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      {addOpen ? (
        <div className="modal-overlay uom-add-overlay" role="presentation" onClick={closeAddModal}>
          <section
            className="modal-card modal-card-large uom-add-unit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={addDialogTitleId}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Services</p>
                <h3 id={addDialogTitleId}>Add service</h3>
              </div>
            </div>
            <form className="stack-form" onSubmit={(e) => void handleCreate(e)}>
              <label>
                <span>Name</span>
                <input value={newName} onChange={(ev) => setNewName(ev.target.value)} autoComplete="off" disabled={createBusy} />
              </label>
              <label>
                <span>Description</span>
                <input value={newDescription} onChange={(ev) => setNewDescription(ev.target.value)} autoComplete="off" disabled={createBusy} />
              </label>
              <label>
                <span>Price (optional)</span>
                <input
                  value={newPrice}
                  onChange={(ev) => setNewPrice(ev.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  autoComplete="off"
                  disabled={createBusy}
                />
              </label>
              <label>
                <span>Catalog status</span>
                <CatalogActiveToggle
                  value={newActive}
                  onChange={setNewActive}
                  disabled={createBusy}
                  ariaLabel="Catalog status for new service"
                />
              </label>
              {createError ? <p className="form-error">{createError}</p> : null}
              <div className="form-actions uom-add-unit-actions">
                <button type="submit" className="button" disabled={createBusy}>
                  {createBusy ? "Adding…" : "Add service"}
                </button>
                <button type="button" className="button button-secondary" disabled={createBusy} onClick={closeAddModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
