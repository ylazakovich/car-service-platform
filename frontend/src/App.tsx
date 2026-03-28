import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { updateUserName } from "./api/users";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
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
  { label: "Overview",   items: ["dashboard"] },
  { label: "Records",    items: ["vehicles"] },
  { label: "Operations", items: ["repairs", "purchases"] },
  { label: "Settings",   items: ["users"] },
];

/* ── LocalStorage helpers ───────────────────────────────── */

const staffSectionStorageKey = "staff-active-section";

function readStoredStaffSection(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(staffSectionStorageKey);
  } catch {
    return null;
  }
}

function writeStoredStaffSection(section: StaffSection) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(staffSectionStorageKey, section);
  } catch {
    // Ignore storage failures to keep the UI usable.
  }
}

function getInitialStaffSection(): StaffSection {
  const stored = readStoredStaffSection();
  if (stored && sectionOrder.includes(stored as StaffSection)) {
    return stored as StaffSection;
  }
  return "dashboard";
}

const STAFF_ALLOWED_SECTIONS: StaffSection[] = ["vehicles", "repairs"];

/* ── Staff Shell ────────────────────────────────────────── */

function StaffShell() {
  const { user, logout, isStaff, setUser } = useAuth();
  const [activeSection, setActiveSection] = useState<StaffSection>(getInitialStaffSection);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [openRepairComposerRequest, setOpenRepairComposerRequest] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const profileFirstRef = useRef<HTMLInputElement>(null);

  function startEditProfile() {
    setProfileFirstName(user?.first_name ?? "");
    setProfileLastName(user?.last_name ?? "");
    setEditingProfile(true);
    window.requestAnimationFrame(() => profileFirstRef.current?.focus());
  }

  async function saveProfile() {
    if (!user) return;
    try {
      const updated = await updateUserName(user.id, profileFirstName.trim(), profileLastName.trim());
      setUser(updated);
      setEditingProfile(false);
    } catch {
    }
  }

  const visibleNavGroups = isStaff
    ? [
        { label: "Records",    items: ["vehicles"] as StaffSection[] },
        { label: "Operations", items: ["repairs"]  as StaffSection[] },
      ]
    : navGroups;
  const mobileSections = visibleNavGroups.flatMap((group) => group.items);

  useEffect(() => {
    writeStoredStaffSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (isStaff && !STAFF_ALLOWED_SECTIONS.includes(activeSection)) {
      setActiveSection("vehicles");
    }
  }, [isStaff, activeSection]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("mobile-nav-open", isMobileNavOpen);
    return () => {
      document.body.classList.remove("mobile-nav-open");
    };
  }, [isMobileNavOpen]);

  function handleSectionChange(section: StaffSection) {
    setActiveSection(section);
    setIsMobileNavOpen(false);
  }

  function handleOpenRepairComposer() {
    setActiveSection("repairs");
    setOpenRepairComposerRequest((current) => current + 1);
    setIsMobileNavOpen(false);
  }

  return (
    <div className="shell">
      <header className="shell-mobile-bar">
        <button
          type="button"
          className="mobile-menu-button"
          aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMobileNavOpen}
          onClick={() => setIsMobileNavOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>
        <div className="shell-mobile-context">
          <span className="mobile-section-pill">{isStaff ? "Staff Flow" : "Workspace"}</span>
          <strong>{sectionLabels[activeSection]}</strong>
        </div>
        <button type="button" className="button button-secondary mobile-signout-button" onClick={logout}>
          Sign Out
        </button>
      </header>

      {isMobileNavOpen ? <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setIsMobileNavOpen(false)} /> : null}

      <aside className={`shell-sidebar ${isMobileNavOpen ? "shell-sidebar-mobile-open" : ""}`}>
        <div className="shell-sidebar-top">
          <div className="shell-sidebar-header">
            <span className="mobile-section-pill">{isStaff ? "Staff Menu" : "Workspace Menu"}</span>
            <button type="button" className="shell-sidebar-close" onClick={() => setIsMobileNavOpen(false)}>
              Close
            </button>
          </div>

          {/* Brand */}
          <div className="brand-block">
            <div className="brand-logo">
              <span>CS</span>
            </div>
            <h1>Car Service</h1>
            <p className="shell-copy">Run the entire workshop from one board.</p>
          </div>

          {/* Navigation */}
          <nav className="shell-nav" aria-label="Staff sections">
            {visibleNavGroups.map((group) => (
              <div key={group.label} className="nav-group">
                <span className="nav-group-label">{group.label}</span>
                {group.items.map((section) => (
                  <button
                    key={section}
                    type="button"
                    className={`nav-link ${activeSection === section ? "nav-link-active" : ""}`}
                    onClick={() => handleSectionChange(section)}
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
              Create repair jobs, assign masters, and keep every vehicle moving through the workshop.
            </p>
            <div className="sidebar-actions">
              <button type="button" className="button" onClick={handleOpenRepairComposer}>
                Add New Repair
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
            <div className="shell-user-details">
              <span className="user-label">Signed in as</span>
              <strong>{user?.email}</strong>
              {editingProfile ? (
                <div className="profile-edit-row">
                  <input
                    ref={profileFirstRef}
                    className="user-edit-input"
                    value={profileFirstName}
                    onChange={(e) => setProfileFirstName(e.target.value)}
                    placeholder="First name"
                  />
                  <input
                    className="user-edit-input"
                    value={profileLastName}
                    onChange={(e) => setProfileLastName(e.target.value)}
                    placeholder="Last name"
                  />
                  <div className="profile-edit-actions">
                    <button type="button" className="button" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={saveProfile}>Save</button>
                    <button type="button" className="button button-secondary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={() => setEditingProfile(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="profile-edit-trigger" onClick={startEditProfile}>
                  {user?.first_name || user?.last_name
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : "Set your name"}
                </button>
              )}
            </div>
          </div>
          <button type="button" className="button button-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <StaffHomePage
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          openRepairComposerRequest={openRepairComposerRequest}
        />
      </main>

      {isStaff ? (
        <nav className="mobile-tabbar" aria-label="Staff quick navigation">
          {mobileSections.map((section) => (
            <button
              key={section}
              type="button"
              className={`mobile-tabbar-link ${activeSection === section ? "mobile-tabbar-link-active" : ""}`}
              onClick={() => handleSectionChange(section)}
            >
              <span className="nav-link-icon">{sectionIcons[section]}</span>
              <span>{sectionLabels[section]}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

/* ── App router ─────────────────────────────────────────── */

export default function App() {
  return (
    <Routes>
      <Route path="/"    element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite/accept" element={<AcceptInvitePage />} />
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
