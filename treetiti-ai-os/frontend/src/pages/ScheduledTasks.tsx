import React, { useCallback, useEffect, useState } from "react";
import { api, Mission } from "../api";
import { getContext } from "./Home";
import ContextMenu from "../components/ContextMenu";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayName = (d?: string) => (d ? DAYS.find((x) => x === d?.toLowerCase()) ?? d : "Monday");

function cadenceText(m: Mission) {
  if (m.cadence === "weekly") {
    return `${dayName(m.weekly_day)[0].toUpperCase()}${dayName(m.weekly_day).slice(1)} · ${m.daily_time || "10:00"}`;
  }
  return `Every day · ${m.daily_time || "09:00"}`;
}

export default function ScheduledTasks() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [name, setName] = useState("");
  const [time, setTime] = useState("09:00");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .missions()
      .then((l) => setMissions(l.filter((m) => m.status !== "archived")))
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const isCustomer = getContext().startsWith("customer:");

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn();
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    setErr(null);
    try {
      await api.missionCreate({
        name: name.trim().slice(0, 60),
        client: isCustomer ? getContext().slice("customer:".length) : "TREEtiti",
        goal: name.trim(),
        cadence: "daily",
        daily_time: time,
      });
      setName("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">Scheduled Tasks</div>
        <p className="t-sub">
          Recurring work TREEtiti runs for you in the background. Say "monitor my Instagram every
          morning" in chat and it will appear here.
        </p>

        {/* New scheduled task */}
        <div className="t-card mt-6 flex flex-wrap items-center gap-3 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily Instagram analysis"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <button className="t-btn t-btn-primary" onClick={create}>
            + Schedule
          </button>
        </div>

        {err && <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{err}</div>}

        <div className="mt-6 space-y-2">
          {missions.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              No scheduled tasks yet.
            </div>
          )}
          {missions.map((m) => (
            <div key={m.id} className="t-row">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">{m.name}</span>
                  <span
                    className={`t-pill ${m.status === "active" ? "t-pill-green" : "t-pill-gray"}`}
                  >
                    {m.status === "active" ? "● Active" : "Paused"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {cadenceText(m)} · {m.client}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {m.status === "active" ? (
                  <button
                    className="t-btn t-btn-ghost"
                    disabled={busy[m.id]}
                    onClick={() => act(m.id, () => api.missionPause(m.id))}
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    className="t-btn t-btn-ghost"
                    disabled={busy[m.id]}
                    onClick={() => act(m.id, () => api.missionStart(m.id))}
                  >
                    Resume
                  </button>
                )}
                <button
                  className="t-btn t-btn-primary"
                  disabled={busy[m.id]}
                  onClick={() => act(m.id, () => api.missionRun(m.id, m.cadence))}
                >
                  Run now
                </button>
                <ContextMenu
                  items={[
                    {
                      label: "Duplicate",
                      icon: "⧉",
                      confirm: true,
                      onClick: () => act(m.id, () => api.missionDuplicate(m.id)),
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}