import { useParams } from "react-router-dom";

export function ClientPortalPage() {
  const { accessCode } = useParams();

  return (
    <div className="portal-shell">
      <div className="portal-card">
        <p className="eyebrow">Client Portal</p>
        <h1>Track Your Repair</h1>
        <p className="portal-copy">
          This public surface will show the repair status, vehicle info, photos and completion act for a
          specific client access code.
        </p>
        <div className="portal-code">Access code: {accessCode ?? "missing"}</div>
      </div>
    </div>
  );
}
