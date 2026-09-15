import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Approval, Mission, TaskRow } from "../api";

export default function TreeWork() {
  const [params] = useSearchParams();
  const highlight = params.get("mission");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [running, setRunning] = useState<TaskRow[]>([]);
  const [done, setDone] = useState<TaskRow[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const load = useCallback(() => {
    api.missions().then(setMissions).catch(() => {});
    api.tasks({ status: "running", limit: 10 }).then(({ tasks }) => setRunning(tasks)).catch(() => {});
    api.tasks({ status: "completed", limit: 10 }).then(({ tasks }) => setDone(tasks)).catch(() => {});
    api.approvals("pending").then(setApprovals).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const decide = async (a: Approval, d: "approve" | "reject") => {
    try {
      await api.approvalDecide(a.id, d, "");
      load();
    } catch {
      /* ignore */
    }
  };

  const active = missions.filter((m) => m.status === "active");

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">TREEtiti Work</div>
        <p className="t-sub">What your AI company is doing right now — missions, swarm, approvals and results.</p>

        {/* Approvals */}
        {approvals.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">
              Needs your decision · {approvals.length}
            </div>
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="t-card p-4">
                  <div className="text-sm font-medium text-text-primary">{a.title}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{a.summary}</div>
                  <div className="mt-2 flex gap-2">
                    <button className="t-btn t-btn-primary" onClick={() => decide(a, "approve")}>
                      Approve
                    </button>
                    <button className="t-btn t-btn-ghost" onClick={() => decide(a, "reject")}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missions */}
        <div className="mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Missions</div>
          {active.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-text-muted">
              No active missions.
            </div>
          )}
          <div className="space-y-2">
            {active.map((m) => (
              <div
                key={m.id}
                className={`t-row ${highlight === m.id ? "!border-accent/50 !bg-accent/10" : ""}`}
              >
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

        {/* Swarm running */}
        <div className="mt-8">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Swarm · running now</div>
          {running.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-5 text-center text-sm text-text-muted">
              Idle.
            </div>
          )}
          <div className="space-y-2">
            {running.map((t) => (
              <div key={t.id} className="t-row">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span className="truncate text-sm text-text-primary">{t.label}</span>
                <span className="ml-auto text-[11px] text-text-muted">{t.kind}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div className="mt-8">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Completed work</div>
          {done.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-5 text-center text-sm text-text-muted">
              Nothing completed yet.
            </div>
          )}
          <div className="space-y-2">
            {done.map((t) => (
              <div key={t.id} className="t-row">
                <span className="text-success">✓</span>
                <span className="truncate text-sm text-text-primary">{t.label}</span>
                <span className="ml-auto text-[11px] text-text-muted">
                  {t.finished_at ? new Date(t.finished_at).toLocaleString() : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}