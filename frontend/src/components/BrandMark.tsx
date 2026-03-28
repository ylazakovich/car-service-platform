type BrandMarkVariant = "compact" | "auth";

type BrandMarkProps = {
  variant?: BrandMarkVariant;
  className?: string;
};

export function BrandMark({ variant = "compact", className }: BrandMarkProps) {
  const classes = ["brand-mark", `brand-mark--${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <circle cx="24" cy="24" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.8" />
        <circle cx="24" cy="24" r="5.4" fill="currentColor" opacity="0.18" />
        <path d="M24 13.5v4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M18.5 17l2.9 2.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M29.5 17l-2.9 2.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M13.8 24h4.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M29.5 24h4.7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M16.5 31.2l2.9-2.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M31.5 31.2l-2.9-2.9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
        <path d="M24 29.8v4.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.6" />
      </svg>
    </div>
  );
}
