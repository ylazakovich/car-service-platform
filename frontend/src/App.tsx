import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { ClientPortalPage } from "./pages/ClientPortalPage";
import { LoginPage } from "./pages/LoginPage";
import { StaffHomePage } from "./pages/StaffHomePage";

function StaffShell() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div>
          <p className="eyebrow">Service Desk</p>
          <h1>Car Service Platform</h1>
          <p className="shell-copy">
            Internal workspace for service coordinators, mechanics and managers.
          </p>
        </div>

        <div className="shell-user">
          <span>{user?.email}</span>
          <button type="button" className="button button-secondary" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <StaffHomePage />
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
