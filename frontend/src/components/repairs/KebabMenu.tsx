import { useEffect, useRef } from "react";
import { RepairIcon } from "./repairIcons";

export type KebabMenuItem =
  | {
      type?: "item";
      id: string;
      label: string;
      icon: "plus" | "edit" | "info" | "trash";
      danger?: boolean;
      shortcut?: string;
      disabled?: boolean;
      onClick: () => void;
    }
  | { type: "divider"; id: string };

type KebabMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: KebabMenuItem[];
};

export function KebabMenu({ open, onOpenChange, items }: KebabMenuProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        onOpenChange(false);
      }
    }
    function onPointer(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onOpenChange]);

  return (
    <div className="kebab-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
      >
        <RepairIcon name="kebab" />
      </button>
      {open ? (
        <div className="kebab-menu" role="menu">
          {items.map((item) => {
            if (item.type === "divider") {
              return <div key={item.id} className="kebab-menu__divider" role="separator" />;
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={`kebab-menu__item${item.danger ? " kebab-menu__item--danger" : ""}`}
                disabled={item.disabled}
                onClick={() => {
                  onOpenChange(false);
                  item.onClick();
                }}
              >
                <span className="kebab-menu__icon">
                  <RepairIcon name={item.icon} size={14} />
                </span>
                {item.label}
                {item.shortcut ? <span className="kebab-menu__shortcut">{item.shortcut}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
