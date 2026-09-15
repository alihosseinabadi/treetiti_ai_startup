import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Project, Teammate, Team } from "../../api";
import { useAuth, usePermissions } from "../../auth";
import { setContext } from "../../pages/Home";

export type SidebarSession = { id: string; title: string; project_id?: string; context?: string };

export function Sidebar({
  context,
  sessions,
  projects,
  teammates,
  teams,
  clients,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: {
  context: string;
  sessions: SidebarSession[];
  projects: Project[];
  teammates: Teammate[];
  teams: Team[];
  clients: { id: string; name: string }[];
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const NAV = [
    { to: "/chat", label: "Workspace", icon: "◈" },
    { to: "/projects", label: "Projects", icon: "◇" },
    { to: "/agents", label: "Agents", icon: "◉" },
    { to: "/files", label: "Files", icon: "▤" },
    { to: "/automations", label: "Automations", icon: "⟳" },
  ];

  return (
    <aside className="t-sidebar">
      {/* brand */}
      <div className="px-4 pb-2 pt-4">
        <button onClick={() => { setContext(""); navigate("/"); }} className="flex items-center gap-2" title="Home">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-accent to-violet font-display text-[12px] font-bold text-bg-primary shadow-[0_0_12px_rgba(122,162,247,0.3)]">
            T
          </span>
          <span className="font-display text-[14px] font-semibold tracking-wide text-text-primary">
            TREE<span className="text-accent">titi</span>
          </span>
        </button>
      </div>

      {/* primary navigation */}
      <div className="t-sidebar-section">
        <div className="t-sidebar-label">
          Command
          <span className="ml-auto rounded-md border border-border px-1.5 py-0.5 font-mono text-[9px] normal-case text-text-dim">⌘K</span>
        </div>
        {NAV.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className={`t-sidebar-item ${location.pathname.startsWith(item.to) ? "active" : ""}`}
          >
            <span className="t-ico">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* sessions */}
      {sessions.length > 0 && (
        <div className="t-sidebar-section mt-3">
          <div className="t-sidebar-label">Chats · {sessions.length}</div>
          <div className="space-y-0.5">
            {sessions.slice(0, 12).map((s) => (
              <div key={s.id} className="t-sidebar-row">
                <button
                  onClick={() => onSelectSession(s.id)}
                  className={`t-sidebar-item ${activeSessionId === s.id ? "active" : ""}`}
                >
                  <span className="truncate">{s.title}</span>
                </button>
                {onDeleteSession && (
                  <button
                    className="t-del"
                    title="Delete chat"
                    onClick={(e) => { e.stopPropagation(); void onDeleteSession(s.id); }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* projects quick list */}
      {projects.length > 0 && (
        <div className="t-sidebar-section mt-3">
          <div className="t-sidebar-label">Projects</div>
          <div className="space-y-0.5">
            {projects.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className={`t-sidebar-item ${location.pathname === `/projects/${p.id}` ? "active" : ""}`}
              >
                <span className="t-ico">◇</span>
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* new task */}
      <div className="mt-auto px-3 pb-2 pt-3">
        <button onClick={onNewChat} className="t-newchat w-full">
          <span className="t-ico">＋</span>
          <span>New task</span>
        </button>
      </div>

      {/* footer */}
      <div className="border-t border-border px-2 py-2">
        <button onClick={logout} className="t-sidebar-item" title="Sign out">
          <span className="t-ico">⎋</span>
          <span className="truncate">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
