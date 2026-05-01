import axios from "axios";
import { useDeferredValue, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import api from "../../../api/client";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "../hooks/useMediaQuery";
import { RegistersHelpDisclosure } from "./RegistersHelpDisclosure";

export type RegistersCustomerRow = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  notes: string;
  vehicle_count: number;
};

type RegistersCustomersPanelProps = {
  customers: RegistersCustomerRow[];
  onRefresh: () => void | Promise<void>;
};

function useCustomerRowEditing(customer: RegistersCustomerRow, onRefresh: () => void | Promise<void>) {
  const [fullName, setFullName] = useState(customer.full_name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    setFullName(customer.full_name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setNotes(customer.notes ?? "");
  }, [customer.id, customer.full_name, customer.phone, customer.email, customer.notes]);

  const dirty =
    fullName.trim() !== customer.full_name ||
    phone.trim() !== (customer.phone ?? "") ||
    email.trim() !== (customer.email ?? "") ||
    notes.trim() !== (customer.notes ?? "");

  async function handleSave() {
    const nextName = fullName.trim();
    if (!nextName) {
      setRowError("Name is required.");
      return;
    }
    setBusy(true);
    setRowError("");
    try {
      await api.patch(`/customers/${customer.id}`, {
        full_name: nextName,
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      });
      await onRefresh();
    } catch (err) {
      setRowError(axios.isAxiosError(err) ? String(err.response?.data?.detail ?? err.message) : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete customer "${customer.full_name}"?`)) return;
    setBusy(true);
    setRowError("");
    try {
      await api.delete(`/customers/${customer.id}`);
      await onRefresh();
    } catch (err) {
      setRowError(axios.isAxiosError(err) ? String(err.response?.data?.detail ?? err.message) : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return {
    fullName,
    setFullName,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    busy,
    rowError,
    dirty,
    handleSave,
    handleDelete,
  };
}

function CustomerRow({ customer, onRefresh }: { customer: RegistersCustomerRow; onRefresh: () => void | Promise<void> }) {
  const { fullName, setFullName, phone, setPhone, email, setEmail, notes, setNotes, busy, rowError, dirty, handleSave, handleDelete } =
    useCustomerRowEditing(customer, onRefresh);

  return (
    <tr>
      <td>
        <input
          type="text"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={fullName}
          onChange={(ev) => setFullName(ev.target.value)}
          disabled={busy}
          aria-label={`Customer name (${customer.id})`}
          autoComplete="name"
        />
      </td>
      <td>
        <input
          type="tel"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          disabled={busy}
          aria-label={`Phone for ${customer.full_name}`}
          autoComplete="tel"
        />
      </td>
      <td>
        <input
          type="email"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          disabled={busy}
          aria-label={`Email for ${customer.full_name}`}
          autoComplete="email"
        />
      </td>
      <td>
        <input
          type="text"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={notes}
          onChange={(ev) => setNotes(ev.target.value)}
          disabled={busy}
          aria-label={`Notes for ${customer.full_name}`}
        />
      </td>
      <td>{customer.vehicle_count}</td>
      <td>
        <div className="uom-admin-row-actions registers-customers-actions">
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

function CustomerRowMobile({
  customer,
  expanded,
  onToggleExpanded,
  onRefresh,
}: {
  customer: RegistersCustomerRow;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  const summaryId = useId();
  const detailRegionId = useId();
  const { fullName, setFullName, phone, setPhone, email, setEmail, notes, setNotes, busy, rowError, dirty, handleSave, handleDelete } =
    useCustomerRowEditing(customer, onRefresh);

  const displayName = fullName.trim() || customer.full_name;
  const subLine =
    phone.trim() !== ""
      ? phone.trim()
      : email.trim() !== ""
        ? email.trim()
        : "No phone or email";

  const hasVehicles = customer.vehicle_count > 0;

  return (
    <li className={`uom-mobile-unit-item${expanded ? " uom-mobile-unit-item--expanded" : ""}`}>
      <button
        id={summaryId}
        type="button"
        className={`uom-mobile-unit-summary uom-mobile-unit-summary--${hasVehicles ? "on" : "off"}`}
        aria-expanded={expanded}
        aria-controls={detailRegionId}
        onClick={onToggleExpanded}
      >
        <span className="uom-mobile-unit-summary-accent" aria-hidden />
        <span className="uom-mobile-unit-summary-text">
          <span className="uom-mobile-unit-name">{displayName}</span>
          <span className="uom-mobile-unit-code">{subLine}</span>
        </span>
        <span className="uom-mobile-unit-status-pill" data-active={hasVehicles ? "true" : "false"}>
          {customer.vehicle_count} veh.
        </span>
        <span className={`uom-mobile-unit-chevron${expanded ? " uom-mobile-unit-chevron--open" : ""}`} aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div id={detailRegionId} role="region" aria-labelledby={summaryId} className="uom-mobile-unit-detail">
          <label className="uom-mobile-field">
            <span>Name</span>
            <input
              type="text"
              className="uom-admin-cell-input"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              disabled={busy}
              aria-label={`Customer name (${customer.id})`}
              autoComplete="name"
            />
          </label>

          <label className="uom-mobile-field">
            <span>Phone</span>
            <input
              type="tel"
              className="uom-admin-cell-input"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
              disabled={busy}
              aria-label={`Phone for ${customer.full_name}`}
              autoComplete="tel"
            />
          </label>

          <label className="uom-mobile-field">
            <span>Email</span>
            <input
              type="email"
              className="uom-admin-cell-input"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={busy}
              aria-label={`Email for ${customer.full_name}`}
              autoComplete="email"
            />
          </label>

          <label className="uom-mobile-field">
            <span>Notes</span>
            <input
              type="text"
              className="uom-admin-cell-input"
              value={notes}
              onChange={(ev) => setNotes(ev.target.value)}
              disabled={busy}
              aria-label={`Notes for ${customer.full_name}`}
            />
          </label>

          <div className="uom-mobile-field">
            <span className="uom-mobile-field-label">Vehicles linked</span>
            <p className="uom-mobile-customer-vehicles-readonly">{customer.vehicle_count}</p>
          </div>

          <div className="uom-mobile-unit-actions">
            <button type="button" className="button button-secondary" disabled={busy || !dirty} onClick={() => void handleSave()}>
              Save
            </button>
            <button type="button" className="button button-danger uom-delete-row-btn" disabled={busy} onClick={() => void handleDelete()}>
              Delete
            </button>
          </div>
          {rowError ? <p className="workspace-note uom-admin-row-error">{rowError}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

export function RegistersCustomersPanel({ customers, onRefresh }: RegistersCustomersPanelProps) {
  const dialogTitleId = useId();
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim().toLowerCase());

  const filtered = useMemo(() => {
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [customers, q]);

  const compactRegistersLayout = useMediaQuery(REGISTERS_MOBILE_BREAKPOINT);
  const [expandedMobileCustomerId, setExpandedMobileCustomerId] = useState<number | null>(null);

  useEffect(() => {
    if (expandedMobileCustomerId === null) return;
    if (!filtered.some((c) => c.id === expandedMobileCustomerId)) {
      setExpandedMobileCustomerId(null);
    }
  }, [filtered, expandedMobileCustomerId]);

  function toggleMobileCustomerRow(customerId: number) {
    setExpandedMobileCustomerId((cur) => (cur === customerId ? null : customerId));
  }

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!creating) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        setCreating(false);
        setError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [creating, saving]);

  function openCreate() {
    setCreating(true);
    setForm({ full_name: "", phone: "", email: "", notes: "" });
    setError("");
  }

  function closeModal() {
    if (saving) return;
    setCreating(false);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!creating) return;
    const full_name = form.full_name.trim();
    if (!full_name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        full_name,
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      };
      await api.post("/customers/", payload);
      await onRefresh();
      setCreating(false);
    } catch (err) {
      setError(axios.isAxiosError(err) ? String(err.response?.data?.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="uom-admin-page registers-customers-page" aria-labelledby="registers-customers-title">
        <div className="registers-embedded-section-head">
          <h3 id="registers-customers-title" className="uom-admin-subtitle">
            Customers
          </h3>
          <button type="button" className="button" onClick={openCreate}>
            + Add customer
          </button>
        </div>
        <RegistersHelpDisclosure summary="Customers in registry">
          <p className="workspace-note uom-admin-lead registers-help-disclosure-inner">
            Owners in the workshop registry. Edit contact details; vehicle links stay on the <strong>Vehicles</strong> screen.
          </p>
        </RegistersHelpDisclosure>

        <div className="registers-search-toolbar">
          <label className="registers-search-field">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Name, phone, email…"
              autoComplete="off"
              aria-label="Search customers with vehicles"
            />
          </label>
        </div>

        {compactRegistersLayout ? (
          <ul className="uom-mobile-unit-list" aria-label="Customers registry">
            {filtered.length === 0 ? (
              <li className="uom-mobile-unit-empty">
                <p className="workspace-note">{customers.length === 0 ? "No customers yet." : "No matches for this search."}</p>
              </li>
            ) : (
              filtered.map((c) => (
                <CustomerRowMobile
                  key={c.id}
                  customer={c}
                  expanded={expandedMobileCustomerId === c.id}
                  onToggleExpanded={() => toggleMobileCustomerRow(c.id)}
                  onRefresh={onRefresh}
                />
              ))
            )}
          </ul>
        ) : (
          <div className="uom-admin-table-wrap registers-table-wrap">
            <table className="uom-admin-table uom-admin-table--compact registers-editor-table registers-customers-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Email</th>
                  <th scope="col">Notes</th>
                  <th scope="col">Vehicles</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <p className="workspace-note">
                        {customers.length === 0 ? "No customers yet." : "No matches for this search."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => <CustomerRow key={c.id} customer={c} onRefresh={onRefresh} />)
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {creating ? (
        <div className="modal-overlay uom-add-overlay" role="presentation" onClick={closeModal}>
          <section
            className="modal-card modal-card-large uom-add-unit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer</p>
                <h3 id={dialogTitleId}>Add customer</h3>
              </div>
            </div>
            <form className="stack-form" onSubmit={(e) => void handleSubmit(e)}>
              <label>
                <span>Full name</span>
                <input
                  value={form.full_name}
                  onChange={(ev) => setForm((f) => ({ ...f, full_name: ev.target.value }))}
                  disabled={saving}
                  autoComplete="name"
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={(ev) => setForm((f) => ({ ...f, phone: ev.target.value }))}
                  disabled={saving}
                  autoComplete="tel"
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
                  disabled={saving}
                  autoComplete="email"
                />
              </label>
              <label>
                <span>Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(ev) => setForm((f) => ({ ...f, notes: ev.target.value }))}
                  disabled={saving}
                  rows={3}
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="form-actions uom-add-unit-actions">
                <button type="submit" className="button" disabled={saving}>
                  {saving ? "Saving…" : "Create customer"}
                </button>
                <button type="button" className="button button-secondary" disabled={saving} onClick={closeModal}>
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
