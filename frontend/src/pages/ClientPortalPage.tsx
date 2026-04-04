import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { fetchPortalRepair } from "../api/portal";
import type { PortalRepair } from "../api/portal";

type Step = {
  key: PortalRepair["status"] | "new";
  label: string;
  sublabel: string;
};

const STEPS: Step[] = [
  { key: "new",           label: "Received",        sublabel: "Your vehicle has been checked in" },
  { key: "in_progress",   label: "In Progress",     sublabel: "Our technician is working on it" },
  { key: "waiting_parts", label: "Waiting for Parts", sublabel: "Parts are on the way — almost there" },
  { key: "completed",     label: "Ready for Pickup", sublabel: "Your vehicle is ready" },
];

const STATUS_ORDER: Record<PortalRepair["status"], number> = {
  new: 0,
  in_progress: 1,
  waiting_parts: 2,
  completed: 3,
};

export function ClientPortalPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [repair, setRepair]   = useState<PortalRepair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!accessCode) return;
    fetchPortalRepair(accessCode)
      .then(setRepair)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  }, [accessCode]);

  return (
    <div className="portal-shell">
      <div className="portal-card">
        <BrandMark variant="auth" />

        {loading && (
          <div className="portal-loading">
            <p className="portal-copy">Loading repair status…</p>
          </div>
        )}

        {notFound && (
          <div className="portal-state">
            <p className="eyebrow">Not Found</p>
            <h1>Access code not found</h1>
            <p className="portal-copy">
              Please double-check your access link or code. It may be incorrect or expired.
            </p>
          </div>
        )}

        {error && (
          <div className="portal-state">
            <p className="eyebrow">Error</p>
            <h1>Something went wrong</h1>
            <p className="portal-copy">Please refresh the page and try again.</p>
          </div>
        )}

        {repair && (
          <>
            <div className="portal-header">
              <p className="eyebrow">Client Portal</p>
              <h1>Repair Status</h1>
              <p className="portal-copy">
                {repair.vehicle_info.label}
                {repair.vehicle_info.year ? ` · ${repair.vehicle_info.year}` : ""}
                {" · "}
                <span className="portal-plate">{repair.vehicle_info.license_plate}</span>
              </p>
            </div>

            <div className="portal-stepper">
              {STEPS.map((step, i) => {
                const currentIdx = STATUS_ORDER[repair.status];
                const isDone   = i < currentIdx;
                const isActive = i === currentIdx;
                return (
                  <div
                    key={step.key}
                    className={`portal-step${isDone ? " done" : ""}${isActive ? " active" : ""}`}
                  >
                    <div className="portal-step-indicator">
                      {isDone ? (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span className="portal-step-dot" />
                      )}
                      {i < STEPS.length - 1 && <div className="portal-step-line" />}
                    </div>
                    <div className="portal-step-text">
                      <span className="portal-step-label">{step.label}</span>
                      {isActive && (
                        <span className="portal-step-sublabel">{step.sublabel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="portal-meta">
              <div className="portal-meta-row">
                <span>Service</span>
                <span>{repair.service_name}</span>
              </div>
              {repair.estimated_date && !repair.completed_at && (
                <div className="portal-meta-row">
                  <span>Est. Completion</span>
                  <span>{new Date(repair.estimated_date).toLocaleDateString("en-GB")}</span>
                </div>
              )}
              {repair.completed_at && (
                <div className="portal-meta-row">
                  <span>Completed</span>
                  <span>{new Date(repair.completed_at).toLocaleDateString("en-GB")}</span>
                </div>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  );
}
