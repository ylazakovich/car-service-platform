import axios from "axios";
import { useDeferredValue, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import api from "../../../api/client";
import { formatPolishPhoneDisplay } from "../../../lib/formatPolishPhone";

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

export function RegistersCustomersPanel({ customers, onRefresh }: RegistersCustomersPanelProps) {
  const dialogTitleId = useId();
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim().toLowerCase());

  const withVehicles = useMemo(
    () => customers.filter((c) => (c.vehicle_count ?? 0) > 0),
    [customers],
  );

  const filtered = useMemo(() => {
    if (!q) return withVehicles;
    return withVehicles.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [withVehicles, q]);

  const [editing, setEditing] = useState<RegistersCustomerRow | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) {
        setEditing(null);
        setError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, saving]);

  function openEdit(c: RegistersCustomerRow) {
    setEditing(c);
    setForm({
      full_name: c.full_name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setError("");
  }

  function closeModal() {
    if (saving) return;
    setEditing(null);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const full_name = form.full_name.trim();
    if (!full_name) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.patch(`/customers/${editing.id}`, {
        full_name,
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      });
      await onRefresh();
      setEditing(null);
    } catch (err) {
      setError(axios.isAxiosError(err) ? String(err.response?.data?.detail ?? err.message) : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="uom-admin-page registers-customers-page" aria-labelledby="registers-customers-title">
        <h3 id="registers-customers-title" className="uom-admin-subtitle">
          Customers with vehicles
        </h3>
        <p className="workspace-note uom-admin-lead">
          Owners who have at least one vehicle in the workshop registry. Edit contact details; vehicle links stay on the{" "}
          <strong>Vehicles</strong> screen.
        </p>

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

        <div className="uom-admin-table-wrap">
          <table className="uom-admin-table uom-admin-table--compact">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Email</th>
                <th scope="col">Vehicles</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className="workspace-note">
                      {withVehicles.length === 0
                        ? "No customers with vehicles yet."
                        : "No matches for this search."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.full_name}</td>
                    <td className="phone-display">{c.phone ? formatPolishPhoneDisplay(c.phone) : "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td>{c.vehicle_count}</td>
                    <td>
                      <button type="button" className="button button-secondary" onClick={() => openEdit(c)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
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
                <h3 id={dialogTitleId}>Edit {editing.full_name}</h3>
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
                  {saving ? "Saving…" : "Save"}
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
