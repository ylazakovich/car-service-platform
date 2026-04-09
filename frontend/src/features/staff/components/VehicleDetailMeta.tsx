import type { ReactNode } from "react";

const svgBase = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconPhone() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

export function IconEmail() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export function IconUser() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function IconOdometer() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M12 6v6l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" />
      <path d="M12 12l2.5-2.5" opacity={0.85} />
    </svg>
  );
}

export function IconCalendar() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

/** Calendar with check — last workshop visit date */
export function IconCalendarService() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path d="M9 17l2 2 4-4" strokeWidth={2} />
    </svg>
  );
}

/** Calendar with plus — vehicle added to the system */
export function IconCalendarAdded() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path d="M12 15v4M10 17h4" strokeWidth={2} />
    </svg>
  );
}

export function IconCar() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M5 17h14v-2l-1.2-4.5a1 1 0 00-.97-.73H7.17a1 1 0 00-.97.73L5 15v2zm2-7h10M7 17v2m10-2v2" />
      <circle cx={7.5} cy={17} r={1.25} />
      <circle cx={16.5} cy={17} r={1.25} />
    </svg>
  );
}

export function IconLicensePlate() {
  return (
    <svg {...svgBase} aria-hidden>
      <rect x={3} y={6} width={18} height={12} rx={2} />
      <path d="M7 10h10M7 14h6" />
    </svg>
  );
}

/**
 * Chassis / ID card metaphor — reads as “vehicle identifier”, not generic barcode.
 */
export function IconVin() {
  return (
    <svg {...svgBase} aria-hidden>
      <rect x={3.5} y={4} width={17} height={16} rx={2} fill="none" />
      <path d="M7 8.5h10M7 11.5h10M7 14.5h7" strokeWidth={1.25} />
      <rect x={15} y={13} width={4.5} height={3.5} rx={0.5} fill="currentColor" stroke="none" opacity={0.35} />
    </svg>
  );
}

export function IconColor() {
  return (
    <svg {...svgBase} aria-hidden>
      <rect x="11" y="5" width="9" height="11" rx="1.8" />
      <path d="M7 9H3.8a1.8 1.8 0 100 3.6H11" />
      <path d="M5.7 10.8h3.1" />
      <path d="M13.5 5v11" />
      <path d="M17 8.1v1.2M17 11.4v1.2" />
      <path d="M20 16v3.2M17.6 16v2.2" />
    </svg>
  );
}

export function IconNote() {
  return (
    <svg {...svgBase} aria-hidden>
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export function VehicleHeroTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="vehicle-detail-hero-title">
      <span className="vehicle-detail-hero-title-icon" aria-hidden>
        {icon}
      </span>
      <span className="vehicle-detail-hero-title-text">{children}</span>
    </p>
  );
}

export function VehicleMetaRow({ icon, text, title }: { icon: ReactNode; text: string; title?: string }) {
  return (
    <div className="vehicle-detail-meta-row">
      <span className="vehicle-detail-meta-icon" aria-hidden>
        {icon}
      </span>
      <span className="vehicle-detail-meta-text" title={title ?? text}>
        {text}
      </span>
    </div>
  );
}

export function VehicleVinRow({ vin }: { vin: string }) {
  return (
    <div className="vehicle-detail-meta-row vehicle-detail-meta-row--vin">
      <span className="vehicle-detail-meta-icon vehicle-detail-meta-icon--vin" aria-hidden title="VIN — vehicle identification number">
        <IconVin />
      </span>
      <div className="vehicle-vin-inline">
        <span className="vehicle-detail-meta-text vehicle-detail-meta-text--vin-wrap" title={`VIN: ${vin}`}>
          <span className="vehicle-vin-label">VIN</span>
          <span className="vehicle-vin-digits">{vin}</span>
        </span>
        <button
          type="button"
          className="vin-copy-button"
          aria-label="Copy VIN to clipboard"
          onClick={() => void navigator.clipboard.writeText(vin)}
        >
          <span aria-hidden>⧉</span>
          <span className="vin-copy-button__text">Copy</span>
        </button>
      </div>
    </div>
  );
}
