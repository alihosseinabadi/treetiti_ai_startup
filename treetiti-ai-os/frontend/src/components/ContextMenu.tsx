import React, { useEffect, useRef, useState } from "react";

export type MenuItem = {
  label: string;
  icon?: string;
  danger?: boolean;
  onClick: () => void;
  /** Two-step confirm: first click arms, second click executes. */
  confirm?: boolean;
};

function MenuRow({ item }: { item: MenuItem }) {
  const [armed, setArmed] = useState(false);
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.confirm && !armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    item.onClick();
  };
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] transition-colors ${
        item.danger ? "text-error" : "text-text-primary hover:bg-secondary/[0.06] hover:text-text-primary"
      } ${armed ? "!bg-error/15 !text-error font-semibold" : ""}`}
    >
      <span className="w-4 text-center text-[11px] opacity-60">{armed ? "⚠" : item.icon}</span>
      <span>{armed ? "Confirm?" : item.label}</span>
    </button>
  );
}

export default function ContextMenu({
  items,
  align = "right",
}: {
  items: MenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[15px] leading-none text-text-muted transition-colors hover:bg-secondary/[0.06] hover:text-text-primary"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-44 overflow-hidden rounded-xl border border-border bg-bg-secondary py-1 shadow-[0_12px_32px_rgba(0,0,0,0.4)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item, i) => (
            <MenuRow key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}