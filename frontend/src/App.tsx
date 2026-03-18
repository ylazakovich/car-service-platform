import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { ClientPortalPage } from "./pages/ClientPortalPage";
import { LoginPage } from "./pages/LoginPage";
import { StaffHomePage } from "./pages/StaffHomePage";

export type StaffSection =
  | "dashboard"
  | "customers"
  | "vehicles"
  | "repairs"
  | "purchases"
  | "users";

const sectionLabels: Record<StaffSection, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  vehicles:  "Vehicles",
  repairs:   "Repairs",
  purchases: "Purchases",
  users:     "Users",
};

const sectionOrder: StaffSection[] = [
  "dashboard",
  "customers",
  "vehicles",
  "repairs",
  "purchases",
  "users",
];

/* ── Nav icons (16 × 16 stroke SVG) ────────────────────── */

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconCustomers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
    </svg>
  );
}

function IconVehicles() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 9l1.5-4h9L13 9" />
      <rect x="1" y="9" width="14" height="4" rx="1.5" />
      <circle cx="4.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconRepairs() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2.5a4 4 0 0 1-5 5.5L2 11.5A1.5 1.5 0 0 0 4 13.5l3.5-2.5A4 4 0 0 1 13 6" />
      <circle cx="12" cy="3.5" r="1.5" />
    </svg>
  );
}

function IconPurchases() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h1.5l2 7h7l1.5-5H5" />
      <circle cx="7" cy="13" r="1" />
      <circle cx="12" cy="13" r="1" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 14c0-2.76 2.24-4.5 5-4.5s5 1.74 5 4.5" />
      <path d="M11 2a2.5 2.5 0 0 1 0 5" />
      <path d="M13.5 14c.3-.7.5-1.44.5-2.2 0-1.1-.4-2.12-1.1-2.9" />
    </svg>
  );
}

const sectionIcons: Record<StaffSection, JSX.Element> = {
  dashboard: <IconDashboard />,
  customers: <IconCustomers />,
  vehicles:  <IconVehicles />,
  repairs:   <IconRepairs />,
  purchases: <IconPurchases />,
  users:     <IconUsers />,
};

/* ── Section groups ─────────────────────────────────────── */

const navGroups: { label: string; items: StaffSection[] }[] = [
  { label: "Overview",  items: ["dashboard"] },
  { label: "Records",   items: ["customers", "vehicles"] },
  { label: "Operations",items: ["repairs", "purchases"] },
  { label: "Settings",  items: ["users"] },
];

/* ── LocalStorage helpers ───────────────────────────────── */

const staffSectionStorageKey = "staff-active-section";

function readStoredStaffSection(): string | null {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage as { getItem?: (key: string) => string | null } | undefined;
  if (typeof storage?.getItem !== "function") return null;
  return storage.getItem(staffSectionStorageKey);
}

function writeStoredStaffSection(section: StaffSection) {
  if (typeof window === "undefined") return;
  const storage = window.localStorage as { setItem?: (key: string, value: string) => void } | undefined;
  if (typeof storage?.setItem !== "function") return;
  storage.setItem(staffSectionStorageKey, section);
}

function getInitialStaffSection(): StaffSection {
  const stored = readStoredStaffSection();
  if (stored && sectionOrder.includes(stored as StaffSection)) {
    return stored as StaffSection;
  }
  return "dashboard";
}

/* ── Staff Shell ────────────────────────────────────────── */

function StaffShell() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<StaffSection>(getInitialStaffSection);

  useEffect(() => {
    writeStoredStaffSection(activeSection);
  }, [activeSection]);

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div className="shell-sidebar-top">

          {/* Brand */}
          <div className="brand-block">
            <div className="brand-logo">
              <span>CS</span>
            </div>
            <h1>Car Service</h1>
            <p className="shell-copy">Internal workspace for the team.</p>
          </div>

          {/* Navigation */}
          <nav className="shell-nav" aria-label="Staff sections">
            {navGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <span className="nav-group-label">{group.label}</span>
                {group.items.map((section) => (
                  <button
                    key={section}
                    type="button"
                    className={`nav-link ${activeSection === section ? "nav-link-active" : ""}`}
                    onClick={() => setActiveSection(section)}
                  >
                    <span className="nav-link-icon">{sectionIcons[section]}</span>
                    <span>{sectionLabels[section]}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Quick focus */}
          <section className="sidebar-panel">
            <p className="eyebrow">Quick Focus</p>
            <h2>Start with records.</h2>
            <p>
              Customers and vehicles are live. Repairs are the next vertical slice.
            </p>
            <div className="sidebar-actions">
              <button type="button" className="button" onClick={() => setActiveSection("vehicles")}>
                Add Vehicle
              </button>
              <button type="button" className="button button-ghost" onClick={() => setActiveSection("customers")}>
                New Customer
              </button>
            </div>
          </section>
        </div>

        {/* User */}
        <div className="shell-user">
          <div className="shell-user-info">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div>
              <span className="user-label">Signed in as</span>
              <strong>{user?.email}</strong>
            </div>
          </div>
          <button type="button" className="button button-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <StaffHomePage activeSection={activeSection} onSelectSection={setActiveSection} />
      </main>
    </div>
  );
}

/* ── App router ─────────────────────────────────────────── */

export default function App() {
  return (
    <Routes>
      <Route path="/"    element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/:accessCode" element={<ClientPortalPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <StaffShell />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
