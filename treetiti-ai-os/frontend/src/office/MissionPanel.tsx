import React from "react";
import { useOffice, Mission } from "./OfficeStore";
import { deskFor } from "./config";
import { Mascot } from "./Mascot";

const STAGE_LABEL: Record<string, string> = {
  research: "Research",
  analytics: "Analytics",
  campaign: "Campaign",
  strategy: "Strategy",
  editorial: "Editorial",
  creative: "Creative",
  content: "Content",
  image: "Image",
  video: "Video",
  qa: "QA",
  publish: "Publish",
  learning: "Learning",
  orchestrator: "Orchestration",
};

function stageName(s: string): string {
  return STAGE_LABEL[s] ?? s;
}

function MissionCard({ mission }: { mission: Mission }) {
  const { setFocused, refreshMission } = useOffice();
  const done = mission.stages.filter((s) => s.phase === "done").length;
  const total = Math.max(mission.stages.length, 1);
  const pct = mission.status === "completed" ? 100 : Math.round((done / total) * 100);

  return (
    <div className="rounded-2xl border border-border/90 bg-primary/85 backdrop-blur-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-text-muted">Active mission</div>
          <div className="text-sm font-semibold text-text-primary truncate mt-0.5">{mission.title}</div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-1 border ${
            mission.status === "completed"
              ? "text-text-primary border-accent/40 bg-accent/10"
              : mission.status === "failed"
                ? "text-error border-error/40 bg-error/10"
                : mission.status === "cancelled"
                  ? "text-text-secondary border-border-hover/40 bg-secondary/40"
                  : "text-warning border-warning/40 bg-warning/10 animate-pulse"
          }`}
        >
          {mission.status}
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background:
                  mission.status === "failed"
                    ? "linear-gradient(90deg,#f87171,#ef4444)"
                    : mission.status === "cancelled"
                      ? "linear-gradient(90deg,#52525b,#3f3f46)"
                      : "linear-gradient(90deg,#34d399,#10b981)",
              }}
            />
          </div>
          <span className="text-xs text-text-secondary">{pct}%</span>
        </div>

        {mission.stages.length === 0 && (
          <div className="mt-3 text-xs text-text-muted">Waiting for the CEO to assign stages…</div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {mission.stages.map((s, i) => {
            const d = deskFor(s.agent);
            return (
              <button
                key={`${s.stage}-${s.agent}-${i}`}
                onClick={() => setFocused(s.agent)}
                className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] transition hover:scale-105"
                style={{
                  borderColor:
                    s.phase === "done"
                      ? "rgba(52,211,153,0.5)"
                      : s.phase === "failed"
                        ? "rgba(248,113,113,0.5)"
                        : s.phase === "working"
                          ? "rgba(251,191,36,0.5)"
                          : "rgba(255,255,255,0.12)",
                  color: s.phase === "pending" ? "#71717a" : undefined,
                  background:
                    s.phase === "working" ? "rgba(251,191,36,0.12)" : s.phase === "done" ? "rgba(52,211,153,0.1)" : s.phase === "failed" ? "rgba(248,113,113,0.1)" : "transparent",
                }}
                title={`${s.agent} · ${stageName(s.stage)}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: d?.accent ?? "#71717a",
                    animation: s.phase === "working" ? "office-pulse-ring 1.2s ease-out infinite" : "none",
                  }}
                />
                {stageName(s.stage)}
              </button>
            );
          })}
        </div>

        {mission.agents.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mission.agents.map((k) => {
              const d = deskFor(k);
              if (!d) return null;
              return (
                <button
                  key={k}
                  onClick={() => setFocused(k)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-1 text-[10px] text-text-secondary hover:border-border-hover transition"
                >
                  <Mascot accent={d.accent} icon={d.icon} size={16} />
                  {d.name}
                </button>
              );
            })}
          </div>
        )}

        {mission.status === "failed" && mission.error && (
          <div className="mt-3 text-xs text-error break-words">{mission.error}</div>
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => refreshMission(mission.taskId)}
            className="text-[11px] text-text-muted hover:text-text-secondary transition"
          >
            refresh
          </button>
        </div>
      </div>
    </div>
  );
}

export function MissionPanel() {
  const { missions } = useOffice();
  const list = Object.values(missions).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  if (list.length === 0) return null;
  return (
    <div className="absolute top-16 right-4 z-20 w-[320px] space-y-3">
      {list.slice(0, 3).map((m) => (
        <MissionCard key={m.taskId} mission={m} />
      ))}
    </div>
  );
}