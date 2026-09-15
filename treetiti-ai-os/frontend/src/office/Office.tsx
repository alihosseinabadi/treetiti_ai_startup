import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, usePermissions } from "../auth";
import { useOffice } from "./OfficeStore";
import { OfficeScene } from "./OfficeScene";
import { AgentSheet } from "./AgentSheet";
import { MissionPanel } from "./MissionPanel";
import { ActivityFeed } from "./ActivityFeed";
import { ChatDock } from "./ChatDock";
import { api } from "../api";

function OfficeHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected, agents } = useOffice();
  const activeCount = Object.values(agents).filter((a) => a.phase !== "idle").length;

  return (
    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-5 py-3 pointer-events-none">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="font-display text-[13px] font-semibold tracking-widest text-text-primary">
            TREE<span className="text-accent">titi</span>
            <span className="ml-2 text-text-muted normal-case">Office</span>
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: connected ? "rgba(52,211,153,0.4)" : "rgba(113,113,122,0.5)",
              color: connected ? "#34d399" : "#71717a",
              background: connected ? "rgba(52,211,153,0.08)" : "rgba(113,113,122,0.08)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: connected ? "#34d399" : "#71717a" }}
            />
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
        <button onClick={() => navigate("/chat")} className="pointer-events-auto">
          <span className="t-btn t-btn-ghost !py-1 !px-3">Back to chat</span>
        </button>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-text-muted pointer-events-auto">
        <span className="rounded-full border border-border bg-primary/60 px-2 py-0.5 text-[10px] text-accent">
          {activeCount > 0 ? `${activeCount} working` : "All agents idle"}
        </span>
        <span>{user?.email}</span>
        <button onClick={logout} className="text-text-muted hover:text-text-secondary transition">
          Sign out
        </button>
      </div>
    </div>
  );
}

function OfficeContent() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { agents, activeAgent } = useOffice();

  // Touch the real backend once so the roster warms up behind the scenes.
  useEffect(() => {
    api.agents().catch(() => {});
  }, []);

  const talkToFocused = useCallback(() => {
    if (!activeAgent) return;
    navigate(`/chat?agent=${encodeURIComponent(activeAgent)}`);
  }, [activeAgent, navigate]);

  return (
    <div className="h-full w-full overflow-hidden bg-primary relative">
      <OfficeScene />
      <OfficeHeader />

      {/* Mission & activity overlays (right side) */}
      <div className="absolute top-16 right-4 z-20 w-[320px] space-y-3">
        <MissionPanel />
      </div>

      <ActivityFeed />
      <AgentSheet />

      {/* Focused agent → open full conversation */}
      {activeAgent && agents[activeAgent] && (
        <div className="absolute top-16 right-[352px] z-20 hidden xl:block">
          <div className="rounded-2xl border border-border/80 bg-primary/85 backdrop-blur-xl px-4 py-3 shadow-xl w-[260px]">
            <div className="text-[10px] uppercase tracking-widest text-text-muted">Focused agent</div>
            <div className="text-sm font-semibold text-text-primary mt-0.5">{agents[activeAgent].key}</div>
            {can("agents.run") && (
              <button
                onClick={talkToFocused}
                className="mt-2 w-full rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary hover:bg-accent-hover transition"
              >
                Open chat with this agent →
              </button>
            )}
          </div>
        </div>
      )}

      <ChatDock />
    </div>
  );
}

export default function Office() {
  return <OfficeContent />;
}
