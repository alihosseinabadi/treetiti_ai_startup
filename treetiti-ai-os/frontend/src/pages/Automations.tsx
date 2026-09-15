import React, { useEffect, useState } from "react";
import { api, Routine, ScheduledJob } from "../api";

export default function Automations() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);

  useEffect(() => {
    api.routines().then(setRoutines).catch(() => {});
    api.agentSchedule().then(setJobs).catch(() => {});
  }, []);

  const toggleRoutine = async (r: Routine) => {
    try {
      await api.routineUpdate(r.id, { is_active: !r.is_active });
      setRoutines((list) => list.map((x) => (x.id === r.id ? { ...x, is_active: !r.is_active } : x)));
    } catch {}
  };

  const toggleJob = async (j: ScheduledJob) => {
    try {
      await api.agentScheduleUpdate(j.id, { enabled: !j.enabled });
      setJobs((list) => list.map((x) => (x.id === j.id ? { ...x, enabled: !x.enabled } : x)));
    } catch {}
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="mb-6">
          <div className="t-heading">Automations</div>
          <div className="t-sub">
            Routines and scheduled jobs that run on their own — so your agents keep working while you're away.
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-text-muted">Routines</div>
          {routines.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary px-4 py-8 text-center text-[13px] text-text-muted">
              No routines yet. Routines let an agent run on a trigger or schedule.
            </div>
          ) : (
            <div className="space-y-2">
              {routines.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-bg-secondary px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-text-primary">{r.name}</div>
                    <div className="mt-0.5 truncate text-[12px] text-text-muted">
                      {r.description || r.trigger || "Routine"}
                    </div>
                  </div>
                  <button
                    onClick={() => void toggleRoutine(r)}
                    className={`ml-3 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] ${r.is_active ? "border-success/40 bg-success/10 text-success" : "border-border text-text-muted"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? "bg-success" : "bg-hover"}`} />
                    {r.is_active ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-text-muted">Scheduled jobs</div>
          {jobs.length === 0 ? (
            <div className="rounded-xl border border-border bg-bg-secondary px-4 py-8 text-center text-[13px] text-text-muted">
              No scheduled jobs yet.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between rounded-xl border border-border bg-bg-secondary px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-text-primary">{j.name}</div>
                    <div className="mt-0.5 text-[12px] text-text-muted">
                      {j.agent} · {j.job_type} · {j.schedule_time || `${j.interval_minutes}m`}
                    </div>
                  </div>
                  <button
                    onClick={() => void toggleJob(j)}
                    className={`ml-3 flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] ${j.enabled ? "border-success/40 bg-success/10 text-success" : "border-border text-text-muted"}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${j.enabled ? "bg-success" : "bg-hover"}`} />
                    {j.enabled ? "Active" : "Paused"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
