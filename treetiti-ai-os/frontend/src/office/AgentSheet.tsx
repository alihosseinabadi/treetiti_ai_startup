import React, { useEffect, useState } from "react";
import { api } from "../api";
import { useOffice } from "./OfficeStore";
import { deskFor } from "./config";
import { Mascot } from "./Mascot";
import { Spinner } from "../components/ui";
import { usePermissions } from "../auth";

const PHASE_META: Record<string, { label: string; color: string }> = {
  idle: { label: "IDLE", color: "#71717a" },
  working: { label: "WORKING", color: "#fbbf24" },
  done: { label: "DONE", color: "#34d399" },
  failed: { label: "FAILED", color: "#f87171" },
  retrying: { label: "RETRYING", color: "#fb923c" },
};

export function AgentSheet() {
  const { agents, missions, focused, setFocused } = useOffice();
  const { can } = usePermissions();
  const canRun = can("agents.run");
  const [talk, setTalk] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTalk("");
    setResult(null);
    setError(null);
  }, [focused]);

  if (!focused) return null;
  const desk = deskFor(focused);
  if (!desk) return null;

  const live = agents[focused];
  const phase = live?.phase ?? "idle";
  const meta = PHASE_META[phase];
  const activeMission = live?.taskId ? missions[live.taskId] : undefined;

  const talkToAgent = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = talk.trim();
    if (!text || busy) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.runAgentWait(focused, { brief: text });
      const summary =
        res.status === "completed"
          ? res.result && Object.keys(res.result).length
            ? typeof res.result.output === "string"
              ? res.result.output
              : JSON.stringify(res.result).slice(0, 600)
            : "Agent finished."
          : `Agent ${res.status}${res.error ? `: ${res.error}` : ""}.`;
      setResult(summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute left-4 top-16 z-20 w-[320px]">
      <div
        className="rounded-2xl border bg-primary/90 backdrop-blur-xl shadow-2xl overflow-hidden"
        style={{ borderColor: `${desk.accent}55`, boxShadow: `0 20px 60px ${desk.accent}18` }}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className="shrink-0 rounded-2xl border p-2"
            style={{ borderColor: `${desk.accent}44`, background: `${desk.accent}12` }}
          >
            <Mascot accent={desk.accent} icon={desk.icon} size={52} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-text-primary">{desk.name}</div>
            <div className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{desk.role}</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wider"
                style={{
                  color: meta.color,
                  borderColor: `${meta.color}66`,
                  background: `${meta.color}14`,
                }}
              >
                {meta.label}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {desk.dept}
              </span>
            </div>
          </div>
          <button
            onClick={() => setFocused(null)}
            className="shrink-0 text-text-muted hover:text-text-secondary text-lg leading-none"
            aria-label="close"
          >
            ×
          </button>
        </div>

        {activeMission && (
          <div className="px-4 pb-3">
            <div className="rounded-xl border border-border bg-secondary/60 px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-text-muted">
                {activeMission.status === "completed" ? "Mission complete" : "Current mission"}
              </div>
              <div className="text-xs text-text-secondary mt-0.5 truncate">{activeMission.title}</div>
              {live?.stage && (
                <div className="text-[10px] text-text-muted mt-1">
                  stage: <span style={{ color: desk.accent }}>{live.stage}</span>
                  {live.note ? ` · ${live.note.slice(0, 60)}` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border/70 p-4">
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
            Talk to this agent
          </div>
          {!canRun ? (
            <p className="text-[11px] text-text-muted leading-relaxed">
              Viewers are read-only — ask an admin for permission to run agents.
            </p>
          ) : (
          <>
          <form onSubmit={talkToAgent} className="flex gap-2">
            <input
              value={talk}
              onChange={(e) => setTalk(e.target.value)}
              placeholder={`Message ${desk.name}…`}
              className="flex-1 rounded-lg border border-border bg-secondary/70 px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={busy || !talk.trim()}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-bg-primary hover:opacity-90 transition disabled:opacity-40"
              style={{ background: desk.accent }}
            >
              Send
            </button>
          </form>
          {busy && (
            <div className="mt-2">
              <Spinner label={`${desk.name} is working…`} />
            </div>
          )}
          {result && (
            <div className="mt-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-[11px] text-text-primary break-words max-h-36 overflow-y-auto">
              {result}
            </div>
          )}
          {error && (
            <div className="mt-2 rounded-lg border border-error/40 bg-error/5 px-3 py-2 text-[11px] text-error break-words">
              {error}
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}