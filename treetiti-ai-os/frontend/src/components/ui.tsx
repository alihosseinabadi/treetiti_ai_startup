import React from "react";
import { usePermissions, Permission } from "../auth";

/**
 * Conditionally renders children based on the current user's permission.
 *
 * ```tsx
 * <PermissionGate requires="agents.create">
 *   <button>+ New Agent</button>
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  requires,
  children,
  fallback = null,
}: {
  requires: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = usePermissions();
  return can(requires) ? <>{children}</> : <>{fallback}</>;
}

export function Spinner({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-text-muted">
      <span className="inline-block h-4 w-4 rounded-full border-2 border-border border-t-accent animate-spin" />
      {label}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4">
      <div>
        <h1 className="t-heading">{title}</h1>
        {subtitle && <p className="t-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ThinkingDots({ label = "Thinking" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-text-muted">
      <span className="flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-hover" style={{ animation: "typing-dot 1.2s ease infinite" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-hover" style={{ animation: "typing-dot 1.2s ease 0.15s infinite" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-hover" style={{ animation: "typing-dot 1.2s ease 0.3s infinite" }} />
      </span>
      {label}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
      {message}
    </div>
  );
}

export function Card({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      {(title || action) && (
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          {title && <h3 className="text-sm font-semibold text-text-primary">{title}</h3>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-accent/10 text-accent border-accent/20",
    contacted: "bg-warning/10 text-warning border-warning/20",
    qualified: "bg-success/10 text-success border-success/20",
    won: "bg-success/10 text-success border-success/20",
    lost: "bg-bg-secondary/5 text-text-secondary border-white/10",
    draft: "bg-bg-secondary/5 text-text-secondary border-white/10",
    pending_approval: "bg-warning/10 text-warning border-warning/20",
    approved: "bg-success/10 text-success border-success/20",
    published: "bg-accent/10 text-accent border-accent/20",
    rejected: "bg-error/10 text-error border-error/20",
    success: "bg-success/10 text-success border-success/20",
    failed: "bg-error/10 text-error border-error/20",
    running: "bg-warning/10 text-warning border-warning/20",
    active: "bg-success/10 text-success border-success/20",
    paused: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-success/10 text-success border-success/20",
    queued: "bg-bg-secondary/5 text-text-secondary border-white/10",
    cancelled: "bg-error/10 text-error border-error/20",
  };
  const cls = map[status] ?? "bg-bg-secondary/5 text-text-secondary border-white/10";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${cls}`}>
      {status}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled,
  title,
  type = "button",
  className = "",
  size = "normal",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
  title?: string;
  type?: "button" | "submit";
  className?: string;
  size?: "sm" | "normal";
}) {
  const baseCls =
    variant === "primary" ? "t-btn t-btn-primary" : variant === "danger" ? "t-btn t-btn-danger" : "t-btn t-btn-ghost";
  const sizeCls = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <button type={type} title={title} onClick={onClick} disabled={disabled} className={`${baseCls} ${sizeCls} ${className}`}>
      {children}
    </button>
  );
}

export { CommandPalette } from "./ui/CommandPalette";
export { ThemeToggle, KeyboardShortcutsHelp } from "./ui/ThemeToggle";