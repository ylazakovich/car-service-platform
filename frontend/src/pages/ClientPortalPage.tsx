import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { fetchPortalRepair } from "../api/portal";
import type { PortalRepair } from "../api/portal";

type Step = {
  label: string;
  sublabel: string;
};

const STEPS: Step[] = [
  { label: "Received",         sublabel: "Your vehicle has been checked in" },
  { label: "In Progress",      sublabel: "Our technician is working on it" },
  { label: "Ready for Pickup", sublabel: "Your vehicle is ready for collection" },
];

function getMilestone(status: PortalRepair["status"]): { idx: number; waiting: boolean; completed: boolean } {
  if (status === "new")           return { idx: 0, waiting: false, completed: false };
  if (status === "in_progress")   return { idx: 1, waiting: false, completed: false };
  if (status === "waiting_parts") return { idx: 1, waiting: true,  completed: false };
  if (status === "completed")     return { idx: 2, waiting: false, completed: false };
  return                                 { idx: 3, waiting: false, completed: true };
}

function formatUpdated(updatedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
  if (diff < 60)    return "Updated just now";
  if (diff < 3600)  return `Updated ${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `Updated ${Math.floor(diff / 3600)}h ago`;
  return `Updated ${Math.floor(diff / 86400)}d ago`;
}

export function ClientPortalPage() {
  const { accessCode } = useParams<{ accessCode: string }>();
  const [repair, setRepair]     = useState<PortalRepair | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError]       = useState(false);

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
        {!repair && <BrandMark variant="auth" />}

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

        {repair && (() => {
          const milestone = getMilestone(repair.status);
          const services =
            repair.service_lines && repair.service_lines.length > 0
              ? repair.service_lines.map((l) => l.name)
              : [repair.service_name];

          return (
            <>
              <div className="portal-shop-id">
                <BrandMark variant="auth" />
                {repair.workshop && (
                  <div>
                    <div className="portal-shop-name">{repair.workshop.name}</div>
                    <div className="portal-shop-sub">
                      <span className="portal-shop-badge">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Authorized service
                      </span>
                      {repair.workshop.address && <span>{repair.workshop.address}</span>}
                    </div>
                  </div>
                )}
              </div>

              <div className="portal-header">
                <p className="eyebrow">Repair Tracking</p>
                <h1>Your repair status</h1>
                <div className="portal-veh">
                  <span>{repair.vehicle_info.label}{repair.vehicle_info.year ? ` · ${repair.vehicle_info.year}` : ""}</span>
                  <span className="portal-plate">{repair.vehicle_info.license_plate}</span>
                </div>
              </div>

              <div className="portal-stepper" role="list" aria-label="Repair progress">
                {STEPS.map((step, i) => {
                  const isDone   = i < milestone.idx;
                  const isActive = i === milestone.idx;
                  const srState  = isDone ? "completed" : isActive ? "current step" : "upcoming";
                  return (
                    <div
                      key={step.label}
                      className={`portal-step${isDone ? " done" : ""}${isActive ? " active" : ""}`}
                      role="listitem"
                      aria-current={isActive ? "step" : undefined}
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
                        <span className="portal-step-label">
                          {step.label}
                          <span className="sr-only"> — {srState}</span>
                        </span>
                        <span className="portal-step-sublabel">{step.sublabel}</span>
                        {i === 1 && milestone.waiting && (
                          <span className="portal-wait-chip">
                            <span className="portal-wait-chip__dot" />
                            Waiting for parts — we'll resume as soon as they arrive
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="portal-meta">
                <div className="portal-meta-block">
                  <div className="portal-meta-k">Services</div>
                  <ul className="portal-svc-list">
                    {services.map((name, idx) => <li key={idx}>{name}</li>)}
                  </ul>
                </div>
                <div className="portal-meta-divider" />
                <div className="portal-meta-grid">
                  <div className="portal-meta-block">
                    <div className="portal-meta-k">{repair.completed_at ? "Completed" : "Est. completion"}</div>
                    <div className="portal-meta-v">
                      {new Date(repair.completed_at ?? repair.estimated_date ?? repair.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <div className="portal-meta-block">
                    <div className="portal-meta-k">Reference</div>
                    <div className="portal-meta-v mono">{repair.tracking_code}</div>
                  </div>
                </div>
              </div>

              <div className="portal-foot">
                {repair.workshop && (repair.workshop.phone || repair.workshop.maps_url) && (
                  <div className="portal-contact">
                    {repair.workshop.phone && (
                      <a className="portal-call" href={`tel:${repair.workshop.phone}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8a16 16 0 006.91 6.91l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16z"/>
                        </svg>
                        Call the workshop
                      </a>
                    )}
                    {repair.workshop.maps_url && (
                      <a className="portal-dir" href={repair.workshop.maps_url} target="_blank" rel="noopener noreferrer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                        </svg>
                        Directions
                      </a>
                    )}
                  </div>
                )}
                <div className="portal-footmeta">
                  <span className="portal-updated">
                    <span className="portal-live" />
                    {formatUpdated(repair.updated_at)}
                  </span>
                  {repair.workshop?.phone && (
                    <span className="portal-ref">{repair.workshop.phone}</span>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
