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
  vehicles: "Vehicles",
  repairs: "Repairs",
  purchases: "Purchases",
  users: "Users",
};

const sectionOrder: StaffSection[] = [
  "dashboard",
  "customers",
  "vehicles",
  "repairs",
  "purchases",
  "users",
];

const staffSectionStorageKey = "staff-active-section";

function readStoredStaffSection(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage as { getItem?: (key: string) => string | null } | undefined;
  if (typeof storage?.getItem !== "function") {
    return null;
  }

  return storage.getItem(staffSectionStorageKey);
}

function writeStoredStaffSection(section: StaffSection) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage as { setItem?: (key: string, value: string) => void } | undefined;
  if (typeof storage?.setItem !== "function") {
    return;
  }

  storage.setItem(staffSectionStorageKey, section);
}

function getInitialStaffSection(): StaffSection {
  const storedSection = readStoredStaffSection();
  if (storedSection && sectionOrder.includes(storedSection as StaffSection)) {
    return storedSection as StaffSection;
  }

  return "dashboard";
}

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
          <div className="brand-block">
            <p className="eyebrow">Service Desk</p>
            <h1>Car Service Platform</h1>
            <p className="shell-copy">
              Workshop operations, customer records and repair workflow in one internal workspace.
            </p>
          </div>

          <nav className="shell-nav" aria-label="Staff sections">
            {sectionOrder.map((section) => (
              <button
                key={section}
                type="button"
                className={`nav-link ${activeSection === section ? "nav-link-active" : ""}`}
                onClick={() => setActiveSection(section)}
              >
                <span>{sectionLabels[section]}</span>
              </button>
            ))}
          </nav>

          <section className="sidebar-panel">
            <p className="eyebrow">Quick Focus</p>
            <h2>Start with records.</h2>
            <p>
              Customers and vehicles are already live. Repairs are the next vertical slice and stay visible as
              the primary direction.
            </p>
            <div className="sidebar-actions">
              <button
                type="button"
                className="button"
                onClick={() => setActiveSection("vehicles")}
              >
                Add Vehicle
              </button>
              <button type="button" className="button button-ghost" onClick={() => setActiveSection("customers")}>
                New Customer
              </button>
            </div>
          </section>
        </div>

        <div className="shell-user">
          <div>
            <span className="user-label">Signed in as</span>
            <strong>{user?.email}</strong>
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
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
