import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../App";

const NAV = [
  { to: "/os", label: "OS Chat" },
  { to: "/", label: "Dashboard", end: true },
  { to: "/chat", label: "AI Chat" },
  { to: "/agents", label: "Agents" },
  { to: "/models", label: "Model Arena" },
  { to: "/content", label: "Content" },
  { to: "/leads", label: "Leads" },
  { to: "/memory", label: "Brand Memory" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full">
      <aside className="w-60 shrink-0 border-r border-zinc-800/80 bg-zinc-950 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800/80">
          <div className="text-sm font-semibold tracking-widest text-white uppercase">
            TREE<span className="text-emerald-400">titi</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">AI Marketing OS</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="mt-2 text-xs text-zinc-500 hover:text-red-400 transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
