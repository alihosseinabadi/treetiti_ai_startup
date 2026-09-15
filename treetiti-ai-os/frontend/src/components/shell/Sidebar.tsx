import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Project, Teammate, Team } from "../../api";
import { useAuth } from "../../auth";
import { setContext } from "../../pages/Home";
import { useOffice } from "../../office/OfficeStore";
import { AGENT_ACCENTS, AGENT_ICONS, AGENT_NAMES, AGENT_ROLES } from "../../office/config";
import { IconGlyph } from "../../office/Mascot";

export type SidebarSession = { id: string; title: string; project_id?: string; context?: string };

const ROSTER_ORDER = [
  "ceo",
  "market_research",
  "content_hunter",
  "social_intel",
  "strategist",
  "content_strategist",
  "creative_director",
  "content",
  "social_manager",
  "brand",
  "image",
  "video",
  "video_producer",
  "ugc_producer",
  "editor",
  "analytics",
  "growth_optimizer",
];

const PHASE_DOT: Record<string, { color: string; label: string }> = {
  working: { color: "#34d399", label: "Working" },
  retrying: { color: "#fbbf24", label: "Retrying" },
  done: { color: "#60a5fa", label: "Done" },
  failed: { color: "#f43f5e", label: "Failed" },
};

function AgentRow({ keyStr, active, onOpen }: { keyStr: string; active: boolean; onOpen: (k: string) => void }) {
  const { agents } = useOffice();
  const live = agents[keyStr];
  const phase = live?.phase ?? "idle";
  const accent = AGENT_ACCENTS[keyStr] ?? "#a1a1aa";
  const icon = AGENT_ICONS[keyStr] ?? "brain";
  const dot = PHASE_DOT[phase];

  return (
    <button
      onClick={() => onOpen(keyStr)}
      className={`t-sidebar-item ${active ? "active" : ""}`}
      title={AGENT_ROLES[keyStr] ?? keyStr}
    >
      <span
        className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg border"
        style={{
          borderColor: `${accent}55`,
          background: `linear-gradient(180deg, ${accent}26, ${
            accent.startsWith("#") ? `${accent}0d` : "#0000"
          })`,
        }}
      >
        <IconGlyph icon={icon} accent={accent} size={13} />
        {phase !== "idle" && dot && (
          <span
            className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full"
            style={{ background: dot.color, boxShadow: `0 0 8px ${dot.color}` }}
          />
        )}
      </span>
      <span className="truncate">{AGENT_NAMES[keyStr] ?? keyStr}</span>
      {phase !== "idle" && dot && (
        <span className="ml-auto text-[9px] font-medium" style={{ color: dot.color }}>
          {dot.label}
        </span>
      )}
    </button>
  );
}

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
  const { agents } = useOffice();
  const [showTools, setShowTools] = useState(false);
  const [rosterExpanded, setRosterExpanded] = useState(false);

  const activeCount = Object.values(agents).filter((a) => a.phase === "working" || a.phase === "retrying").length;

  const openOffice = () => navigate("/office");
  const openAgent = (k: string) => navigate(`/chat?agent=${encodeURIComponent(k)}`);

  const TOOLS = [
    { to: "/projects", label: "Projects", icon: "◇" },
    { to: "/files", label: "Files", icon: "▤" },
    { to: "/automations", label: "Automations", icon: "⟳" },
    { to: "/team", label: "Team", icon: "◉" },
  ];

  const visibleRoster = rosterExpanded ? ROSTER_ORDER : ROSTER_ORDER.slice(0, 8);

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

      {/* my AI team — the roster */}
      <div className="t-sidebar-section">
        <div className="t-sidebar-label">
          My AI team
          {activeCount > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {activeCount} working
            </span>
          )}
        </div>
        <div className="space-y-0.5">
          {visibleRoster.map((k) => (
            <AgentRow
              key={k}
              keyStr={k}
              active={location.pathname.startsWith("/chat") && new URLSearchParams(location.search).get("agent") === k}
              onOpen={openAgent}
            />
          ))}
        </div>
        {ROSTER_ORDER.length > 8 && (
          <button
            onClick={() => setRosterExpanded((v) => !v)}
            className="mt-1 w-full px-2 py-1 text-left text-[11px] text-text-muted transition hover:text-text-primary"
          >
            {rosterExpanded ? "− Show less" : `＋ Show all ${ROSTER_ORDER.length - 8} more`}
          </button>
        )}
      </div>

      {/* add agent */}
      <div className="px-3 pb-1 pt-1">
        <button
          onClick={() => navigate("/teammates/create")}
          className="t-newchat w-full"
          title="Create AI employee"
        >
          <span className="t-ico">＋</span>
          <span>Add Agent</span>
        </button>
      </div>

      {/* conversations */}
      {sessions.length > 0 && (
        <div className="t-sidebar-section mt-3">
          <div className="t-sidebar-label">Chats · {sessions.length}</div>
          <div className="space-y-0.5">
            {sessions.slice(0, 10).map((s) => (
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

      {/* tools — contextual, collapsed */}
      <div className="t-sidebar-section mt-3">
        <button
          onClick={() => setShowTools((v) => !v)}
          className="t-sidebar-label w-full text-left"
        >
          {showTools ? "▾" : "▸"} Workspace tools
        </button>
        {showTools && (
          <div className="space-y-0.5">
            {TOOLS.map((t) => (
              <button
                key={t.to}
                onClick={() => navigate(t.to)}
                className={`t-sidebar-item ${location.pathname.startsWith(t.to) ? "active" : ""}`}
              >
                <span className="t-ico">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
            <button
              onClick={openOffice}
              className={`t-sidebar-item ${location.pathname === "/office" ? "active" : ""}`}
            >
              <span className="t-ico">⌖</span>
              <span>Office view</span>
            </button>
          </div>
        )}
      </div>

      {/* new task */}
      <div className="mt-auto px-3 pb-2 pt-3">
        <button onClick={onNewChat} className="t-newchat w-full">
          <span className="t-ico">＋</span>
          <span>New task</span>
        </button>
      </div>

      {/* footer */}
      <div className="border-t border-border px-2 py-2">
        <button onClick={() => navigate("/settings")} className="t-sidebar-item" title="Settings">
          <span className="t-ico">⚙</span>
          <span className="truncate">Settings</span>
        </button>
        <button onClick={logout} className="t-sidebar-item" title="Sign out">
          <span className="t-ico">⎋</span>
          <span className="truncate">Sign out</span>
        </button>
      </div>
    </aside>
  );
}