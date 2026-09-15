import React, { useCallback, useEffect, useState } from "react";
import { api, Mission, TaskRow } from "../api";

export default function Swarm() {
  const [running, setRunning] = useState<TaskRow[]>([]);
  const [recent, setRecent] = useState<TaskRow[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.tasks({ status: "running", limit: 20 }).then(({ tasks }) => setRunning(tasks)).catch(() => {});
    api.tasks({ status: "completed", limit: 12 }).then(({ tasks }) => setRecent(tasks)).catch(() => {});
    api.missions().then(setMissions).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 4000);
    return () => clearInterval(iv);
  }, [load]);

  const runDaily = async () => {
    const active = missions.filter((m) => m.status === "active");
    if (!active.length) return;
    setBusy(true);
    try {
      await api.missionRun(active[0].id, "daily");
      setTimeout(load, 500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">Swarm</div>
        <p className="t-sub">
          Specialist agents working together on one mission — live from the real task queue.
        </p>

        {/* Active missions */}
        <div className="mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Missions</div>
          {missions.filter((m) => m.status === "active").length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              No active missions. Create one in chat with <span className="font-mono text-accent">/mission &lt;goal&gt;</span>
            </div>
          )}
          <div className="space-y-2">
            {missions
              .filter((m) => m.status === "active")
              .map((m) => (
                <div key={m.id} className="t-row">
                  <span className="text-sm text-text-muted">◎</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">{m.name}</div>
                    <div className="mt-0.5 text-xs text-text-muted">
                      cycle {m.current_cycle || 0} · {m.cadence} · {m.client}
                    </div>
                  </div>
                  <span className="t-pill t-pill-blue">● Active</span>
                </div>
              ))}
          </div>
        </div>

        {/* Running now */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Working right now</div>
            {running.length > 0 && <span className="t-pill t-pill-blue">{running.length} running</span>}
          </div>
          {running.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              Nothing running right now. Kick off a mission, or run a daily cycle below.
            </div>
          )}
          <div className="space-y-2">
            {running.map((t) => (
              <div key={t.id} className="t-row">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text-primary">{t.label}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{t.kind}</div>
                </div>
              </div>
            ))}
          </div>

          {missions.some((m) => m.status === "active") && (
            <button className="t-btn t-btn-primary mt-4" disabled={busy} onClick={runDaily}>
              {busy ? "Starting…" : "▶ Run daily cycle now"}
            </button>
          )}
        </div>

        {/* Completed */}
        <div className="mt-8">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Recently completed</div>
          {recent.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-text-muted">
              No completed work yet.
            </div>
          )}
          <div className="space-y-2">
            {recent.map((t) => (
              <div key={t.id} className="t-row">
                <span className="text-success">✓</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text-primary">{t.label}</div>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {t.kind} · finished {t.finished_at ? new Date(t.finished_at).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}