import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

const NAV = [
  { to: "/system", label: "Dashboard", icon: "◫", end: true },
  { to: "/system/agents", label: "Agents", icon: "◉" },
  { to: "/system/calendar", label: "Calendar", icon: "☷" },
  { to: "/system/content", label: "Content", icon: "✎" },
  { to: "/system/projects", label: "Projects", icon: "◇" },
  { to: "/system/campaigns", label: "Campaigns", icon: "▧" },
  { to: "/system/assets", label: "Assets", icon: "▦" },
  { to: "/system/approvals", label: "Approvals", icon: "✓" },
  { to: "/system/analytics", label: "Analytics", icon: "▤" },
  { to: "/system/integrations", label: "Integrations", icon: "⇄" },
  { to: "/system/leads", label: "Leads", icon: "◆" },
  { to: "/system/memory", label: "Brand Memory", icon: "◈" },
  { to: "/system/settings", label: "Settings", icon: "⚙" },
];

const TOP = [
  { to: "/office", label: "Office", icon: "⌂", end: true },
  { to: "/missions", label: "Missions", icon: "◉" },
  { to: "/clients", label: "Clients", icon: "◆" },
  { to: "/results", label: "Results", icon: "✓" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full">
      <aside className="t-sidebar" style={{ width: 220 }}>
        <div className="px-4 pb-2 pt-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-left">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-accent font-display text-[12px] font-bold text-bg-primary">
              T
            </span>
            <span className="font-display text-[14px] font-semibold tracking-wide text-text-primary">
              TREE<span className="text-accent">titi</span>
            </span>
          </button>
          <div className="mt-1 pl-8 text-[10px] text-text-muted">System Mode</div>
        </div>

        <div className="t-sidebar-section">
          <div className="t-sidebar-label">Company</div>
          {TOP.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `t-sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="t-ico">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        <nav className="t-sidebar-section mt-3 flex-1 overflow-auto">
          <div className="t-sidebar-label">System</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `t-sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="t-ico">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-2 py-2">
          <div className="truncate px-3 py-1 text-[11px] text-text-muted">{user?.email}</div>
          <button onClick={logout} className="t-sidebar-item" title="Sign out">
            <span className="t-ico">⎋</span>
            <span className="truncate">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-bg-primary">
        <div className="mx-auto max-w-5xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}