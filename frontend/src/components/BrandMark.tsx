import type { ReactNode } from "react";

type BrandMarkVariant = "compact" | "auth";

type BrandMarkProps = {
  variant?: BrandMarkVariant;
  className?: string;
  label?: string;
  children?: ReactNode;
};

export function BrandMark({ variant = "compact", className, label = "CS", children }: BrandMarkProps) {
  const classes = ["brand-mark", `brand-mark--${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} aria-hidden="true">
      {children ?? <span className="brand-mark__text">{label}</span>}
    </div>
  );
}
