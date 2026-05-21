import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import * as React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToWorkspaceHeaderFab } from "./components/ScrollToWorkspaceHeaderFab";
import { BrandMark } from "./components/BrandMark";
import { useAuth } from "./context/AuthContext";
import { updateUserName } from "./api/users";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { ClientPortalPage } from "./pages/ClientPortalPage";
import { LoginPage } from "./pages/LoginPage";
import { StaffHomePage, type RepairCounts } from "./pages/StaffHomePage";

export type StaffSection =
  | "dashboard"
  | "customers"
  | "vehicles"
  | "repairs"
  | "purchases"
  | "reference"
  | "users";

const sectionLabels: Record<StaffSection, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  vehicles:  "Vehicles",
  repairs:   "Repairs",
  purchases: "Purchases",
  reference: "Registers",
  users:     "Users",
};

const sectionOrder: StaffSection[] = [
  "dashboard",
  "customers",
  "vehicles",
  "repairs",
  "purchases",
  "reference",
  "users",
];

/* ── Nav icons (20 × 20 stroke SVG) ────────────────────── */

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function IconDashboard() {
  return (
    <NavIcon>
      <rect x="2.5"  y="2.5"  width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5"  width="6" height="6" rx="1.5" />
      <rect x="2.5"  y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </NavIcon>
  );
}

function IconCustomers() {
  return (
    <NavIcon>
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17.5c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
    </NavIcon>
  );
}

function IconVehicles() {
  return (
    <NavIcon>
      <path d="M2.5 12.5h15" />
      <path d="M3.5 12.5l1.5-4.5a2 2 0 0 1 1.9-1.3h7.2a2 2 0 0 1 1.7 1l2 4.8" />
      <path d="M2.5 12.5v3M17.5 12.5v3" />
      <circle cx="6.5"  cy="15.5" r="1.5" />
      <circle cx="13.5" cy="15.5" r="1.5" />
    </NavIcon>
  );
}

function IconRepairs() {
  return (
    <NavIcon>
      <path d="M13.5 2.5a4 4 0 0 0-3.6 5.6L3 14.9a1.6 1.6 0 0 0 2.3 2.3l6.8-6.9a4 4 0 0 0 5-5L14.7 8 12 5.3z" />
    </NavIcon>
  );
}

function IconPurchases() {
  return (
    <NavIcon>
      <path d="M2 3h2.2l2 9.5h9.3" />
      <path d="M5.5 6h11.2l-1.6 5.5a1.2 1.2 0 0 1-1.2.9H6.2" />
      <circle cx="8"    cy="16.5" r="1.2" />
      <circle cx="14.5" cy="16.5" r="1.2" />
    </NavIcon>
  );
}

function IconReference() {
  return (
    <NavIcon>
      <rect x="3.5" y="3" width="13" height="14" rx="1.5" />
      <path d="M7 3v-.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 13 2.5V3" />
      <path d="M6.5 8h7M6.5 11h7M6.5 14h4.5" />
    </NavIcon>
  );
}

function IconUsers() {
  return (
    <NavIcon>
      <circle cx="7.5" cy="7" r="3" />
      <path d="M2 17c0-3.3 2.46-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <path d="M13.5 3.2A3 3 0 0 1 13.5 11" />
      <path d="M18 16.5c0-.83-.15-1.62-.43-2.34A6 6 0 0 0 14.8 11.5" />
    </NavIcon>
  );
}

const sectionIcons: Record<StaffSection, ReactElement> = {
  dashboard: <IconDashboard />,
  customers: <IconCustomers />,
  vehicles:  <IconVehicles />,
  repairs:   <IconRepairs />,
  purchases: <IconPurchases />,
  reference: <IconReference />,
  users:     <IconUsers />,
};

/* ── Section groups ─────────────────────────────────────── */

const navGroups: { label: string; items: StaffSection[] }[] = [
  { label: "Overview",   items: ["dashboard"] },
  { label: "Records",    items: ["vehicles"] },
  { label: "Operations", items: ["repairs", "purchases"] },
  { label: "Settings",   items: ["reference", "users"] },
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

const shellMobileMq = "(max-width: 820px)";

function shellMobileNarrowSnapshot() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia(shellMobileMq).matches;
}

function subscribeShellMobileNarrow(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  if (typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia(shellMobileMq);
  // Safari < 14 (and some WebViews): MediaQueryList only has addListener/removeListener.
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }
  mq.addListener(onChange);
  return () => mq.removeListener(onChange);
}

/** Viewport ≤820px: mobile shell (sticky header + picker), desktop sidebar hidden. */
function useShellMobileNarrow() {
  return useSyncExternalStore(subscribeShellMobileNarrow, shellMobileNarrowSnapshot, () => false);
}

/* ── Today Summary ──────────────────────────────────────── */

function TodaySummary({ onAddRepair, counts }: { onAddRepair: () => void; counts: RepairCounts }) {
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  }).format(new Date());
  return (
    <section className="sidebar-summary">
      <header className="sidebar-summary__head">
        <p className="eyebrow">Today · {today}</p>
        <span className="sidebar-summary__live">
          <span className="sidebar-summary__pulse" />live
        </span>
      </header>
      <ul className="sidebar-summary__stats">
        <li><span className="sidebar-summary__dot" data-status="open" /><span>Open</span><strong>{counts.open}</strong></li>
        <li><span className="sidebar-summary__dot" data-status="waiting" /><span>Waiting parts</span>
          <strong className={counts.waiting > 2 ? "is-alert" : ""}>{counts.waiting}</strong></li>
        <li><span className="sidebar-summary__dot" data-status="ready" /><span>Ready to pickup</span><strong>{counts.ready}</strong></li>
      </ul>
      <button type="button" className="sidebar-summary__cta" onClick={onAddRepair}>
        + Add new repair
      </button>
    </section>
  );
}

/* ── Staff Shell ────────────────────────────────────────── */

function StaffShell() {
  const shellMobileNarrow = useShellMobileNarrow();
  const { user, logout, isStaff, isAdmin, setUser } = useAuth();
  const [activeSection, setActiveSection] = useState<StaffSection>(getInitialStaffSection);
  const [repairCounts, setRepairCounts] = useState<RepairCounts>({ open: 0, waiting: 0, ready: 0 });
  const [isMobilePickerOpen, setIsMobilePickerOpen] = useState(false);
  const [openRepairComposerRequest, setOpenRepairComposerRequest] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const profileFirstRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const mobileStickyStackRef = useRef<HTMLDivElement>(null);
  const mobilePickerReturnFocusRef = useRef<HTMLElement | null>(null);
  const pickerFirstFocusRef = useRef<HTMLButtonElement>(null);

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

  const visibleNavGroups = useMemo(() => {
    if (isStaff) {
      return [
        { label: "Records",    items: ["vehicles"] as StaffSection[] },
        { label: "Operations", items: ["repairs"]  as StaffSection[] },
      ];
    }
    return navGroups.map((group) => {
      if (group.label !== "Settings") return group;
      const settingsItems: StaffSection[] = isAdmin ? ["reference", "users"] : ["users"];
      return { ...group, items: settingsItems };
    });
  }, [isStaff, isAdmin]);
  const pickerSections = useMemo(() => visibleNavGroups.flatMap((g) => g.items), [visibleNavGroups]);

  useEffect(() => {
    if (!shellMobileNarrow) setIsMobilePickerOpen(false);
  }, [shellMobileNarrow]);

  useEffect(() => {
    writeStoredStaffSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (isStaff && !STAFF_ALLOWED_SECTIONS.includes(activeSection)) {
      setActiveSection("vehicles");
    }
  }, [isStaff, activeSection]);

  useEffect(() => {
    if (activeSection === "reference" && !isAdmin) {
      setActiveSection("users");
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    setIsMobilePickerOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("mobile-shell-picker-open", isMobilePickerOpen);
    return () => {
      document.body.classList.remove("mobile-shell-picker-open");
    };
  }, [isMobilePickerOpen]);

  useEffect(() => {
    const shell = shellRef.current;
    const stack = mobileStickyStackRef.current;
    if (!shell || !stack) return undefined;
    const apply = () => {
      const cs = getComputedStyle(stack);
      const marginY =
        (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      shell.style.setProperty(
        "--shell-mobile-sticky-top",
        `${stack.offsetHeight + marginY}px`,
      );
    };
    apply();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    if (ro) {
      ro.observe(stack);
    }
    // Pinch-zoom / Ctrl±: layout size may not trigger ResizeObserver; visual viewport does.
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    const onViewportChange = () => {
      apply();
    };
    window.addEventListener("resize", onViewportChange);
    vv?.addEventListener("resize", onViewportChange);
    vv?.addEventListener("scroll", onViewportChange);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("resize", onViewportChange);
      vv?.removeEventListener("scroll", onViewportChange);
    };
  }, [activeSection, isMobilePickerOpen, shellMobileNarrow]);

  useEffect(() => {
    if (typeof window === "undefined" || !isMobilePickerOpen) return;
    window.requestAnimationFrame(() => pickerFirstFocusRef.current?.focus());
  }, [isMobilePickerOpen]);

  const openMobilePicker = useCallback((source: HTMLElement) => {
    mobilePickerReturnFocusRef.current = source;
    setIsMobilePickerOpen(true);
  }, []);

  const closeMobilePicker = useCallback((focusAfter?: HTMLElement | null) => {
    setIsMobilePickerOpen(false);
    const back = focusAfter ?? mobilePickerReturnFocusRef.current;
    mobilePickerReturnFocusRef.current = null;
    if (typeof window !== "undefined" && back) {
      window.requestAnimationFrame(() => back.focus());
    }
  }, []);

  useEffect(() => {
    if (!isMobilePickerOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobilePicker();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobilePickerOpen, closeMobilePicker]);

  function handleSectionChange(section: StaffSection) {
    setActiveSection(section);
    setIsMobilePickerOpen(false);
  }

  function handleOpenRepairComposer() {
    setActiveSection("repairs");
    setOpenRepairComposerRequest((current) => current + 1);
    setIsMobilePickerOpen(false);
  }

  return (
    <div className="shell" ref={shellRef}>
      <div
        className={`shell-mobile-sticky-stack${isMobilePickerOpen ? " shell-mobile-sticky-stack--menu-open" : ""}`}
        ref={mobileStickyStackRef}
      >
        <header className="shell-mobile-bar">
          <button
            type="button"
            className="shell-mobile-header-toggle"
            aria-expanded={isMobilePickerOpen}
            aria-controls={isMobilePickerOpen ? "mobile-section-picker" : undefined}
            aria-label={isMobilePickerOpen ? "Close workspace menu" : "Open workspace menu"}
            title="Tap to choose a section, account, or sign out"
            onClick={(e) =>
              isMobilePickerOpen ? closeMobilePicker(e.currentTarget) : openMobilePicker(e.currentTarget)
            }
          >
            <span className="shell-mobile-header-toggle-text">
              <span className="shell-mobile-context shell-mobile-context--title-only">
                <strong className="shell-mobile-section-title">{sectionLabels[activeSection]}</strong>
                <span className="shell-mobile-header-hint">Sections · account · sign out</span>
              </span>
              <span className="shell-mobile-header-chevron-wrap" aria-hidden>
                <span className="shell-mobile-header-chevron">{isMobilePickerOpen ? "▴" : "▾"}</span>
              </span>
            </span>
          </button>
        </header>

        {isMobilePickerOpen ? (
          <nav
            id="mobile-section-picker"
            className="shell-mobile-quick-nav shell-mobile-quick-nav--expanded"
            aria-label="Sections and account"
          >
            <div className="shell-mobile-quick-sections">
              {pickerSections.map((section, idx) => (
                <button
                  key={section}
                  ref={idx === 0 ? pickerFirstFocusRef : undefined}
                  type="button"
                  className={`shell-mobile-quick-section ${activeSection === section ? "shell-mobile-quick-section-active" : ""}`}
                  onClick={() => handleSectionChange(section)}
                >
                  <span className="nav-link-icon shell-mobile-quick-section-icon">{sectionIcons[section]}</span>
                  <span className="shell-mobile-quick-section-label">{sectionLabels[section]}</span>
                </button>
              ))}
            </div>

            {isStaff ? (
              <button type="button" className="button shell-mobile-picker-cta" onClick={handleOpenRepairComposer}>
                Add New Repair
              </button>
            ) : null}

            <div className="shell-mobile-account">
              <div className="shell-mobile-account-row">
                <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() ?? "?"}</div>
                <div className="shell-mobile-account-details">
                  <span className="user-label">Signed in as</span>
                  <strong className="shell-mobile-account-email">{user?.email}</strong>
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
                        <button type="button" className="button" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={saveProfile}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                          onClick={() => setEditingProfile(false)}
                        >
                          Cancel
                        </button>
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
              <button type="button" className="button button-secondary shell-mobile-sign-out" onClick={logout}>
                Sign out
              </button>
            </div>
          </nav>
        ) : null}
      </div>

      {!shellMobileNarrow ? (
        <aside id="staff-shell-sidebar" className="shell-sidebar" aria-label="Workspace navigation">
          <div className="shell-sidebar-top">
            <div className="shell-sidebar-header">
              <span className="mobile-section-pill">Menu</span>
            </div>

            <div className="brand-block">
              <BrandMark variant="compact" />
              <h1>Car Service</h1>
              <p className="shell-copy">Run the entire workshop from one board.</p>
            </div>

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

            {activeSection === "repairs" && <TodaySummary onAddRepair={handleOpenRepairComposer} counts={repairCounts} />}
          </div>

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
                      <button type="button" className="button" style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }} onClick={saveProfile}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="button button-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                        onClick={() => setEditingProfile(false)}
                      >
                        Cancel
                      </button>
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
      ) : null}

      <main className="shell-main">
        <StaffHomePage
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          openRepairComposerRequest={openRepairComposerRequest}
          onRepairCountsChange={setRepairCounts}
        />
      </main>

      {isMobilePickerOpen ? (
        <button
          type="button"
          className="shell-mobile-picker-backdrop"
          aria-label="Close sections and account"
          onClick={() => closeMobilePicker()}
        />
      ) : null}

      <ScrollToWorkspaceHeaderFab
        active={shellMobileNarrow}
        pickerOpen={isMobilePickerOpen}
        headerRef={mobileStickyStackRef}
        layoutRootRef={shellRef}
      />
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
