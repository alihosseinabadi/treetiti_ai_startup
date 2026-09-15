import React, { useEffect, useState } from "react";
import { api, Mission, MissionRun } from "../api";
import ContextMenu from "../components/ContextMenu";

function WorkspaceView({ workspace }: { workspace: Record<string, unknown> }) {
  const revealed = (workspace.revealed as string[]) || [];
  const sections: { key: string; label: string; icon: string }[] = [
    { key: "intel", label: "Intel", icon: "◎" },
    { key: "analytics", label: "Analytics", icon: "▤" },
    { key: "plan", label: "Strategy Plan", icon: "◇" },
    { key: "calendar", label: "Calendar", icon: "☷" },
    { key: "content", label: "Content", icon: "✎" },
    { key: "assets", label: "Assets", icon: "▦" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {sections.map((s) => {
        const data = workspace[s.key];
        const known = data !== undefined && data !== null;
        return (
          <div key={s.key} className="rounded-xl border border-white/[0.06] bg-primary p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium tracking-widest text-text-muted uppercase flex items-center gap-2">
                <span className="text-accent">{s.icon}</span>
                {s.label}
              </span>
              {known ? (
                <span className="t-pill t-pill-green">ready</span>
              ) : (
                <span className="t-pill t-pill-gray">pending</span>
              )}
            </div>
            {known ? (
              <pre className="text-[11px] text-text-muted whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto">
                {typeof data === "string"
                  ? data
                  : JSON.stringify(data, null, 1).slice(0, 900)}
              </pre>
            ) : (
              <div className="text-[11px] text-text-muted italic">
                Reveals when the mission produces it.
              </div>
            )}
            {known && !revealed.includes(s.key) && (
              <div className="mt-2 t-pill t-pill-blue">▲ new</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MissionCard({
  mission,
  onRefresh,
}: {
  mission: Mission;
  onRefresh: () => void;
}) {
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [instruction, setInstruction] = useState("");
  const [showTalk, setShowTalk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.missionRuns(mission.id, 5).then(setRuns).catch(() => setRuns([]));
  }, [mission.id, mission.last_run_at]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const run = (cycle: "daily" | "weekly") =>
    act(() => api.missionRun(mission.id, cycle));

  const ws = mission.workspace || {};
  const intel = (ws.intel as { summary?: string }) || {};
  const statusPill =
    mission.status === "active"
      ? "t-pill t-pill-green"
      : mission.status === "paused"
        ? "t-pill t-pill-amber"
        : "t-pill t-pill-gray";

  return (
    <div className="t-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-text-primary truncate">{mission.name}</h3>
            <span className={statusPill}>{mission.status}</span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {mission.client || "internal"} · {mission.cadence} cadence · daily {mission.daily_time} · weekly {mission.weekly_day}
          </div>
          {mission.goal && (
            <p className="text-[12px] text-text-muted mt-2 leading-relaxed max-w-2xl">
              {mission.goal}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {mission.status === "active" ? (
            <button
              disabled={busy}
              onClick={() => act(() => api.missionPause(mission.id))}
              className="t-btn t-btn-ghost !py-1.5 !px-3 !text-[11px]"
            >
              Pause
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => act(() => api.missionStart(mission.id))}
              className="t-btn t-btn-primary !py-1.5 !px-3 !text-[11px]"
            >
              Resume
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => run("daily")}
            className="t-btn t-btn-ghost !py-1.5 !px-3 !text-[11px]"
            title="Run observe/analyze now"
          >
            Run daily
          </button>
          <button
            disabled={busy}
            onClick={() => run("weekly")}
            className="t-btn t-btn-ghost !py-1.5 !px-3 !text-[11px]"
            title="Run full agency pipeline now"
          >
            Run weekly
          </button>
          <ContextMenu
            items={[
              { label: "Talk to mission", icon: "💬", onClick: () => setShowTalk((v) => !v) },
              {
                label: "Duplicate mission",
                icon: "⧉",
                confirm: true,
                onClick: () => act(() => api.missionDuplicate(mission.id)),
              },
            ]}
          />
        </div>
      </div>

      {showTalk && (
        <div className="mt-3 flex gap-2">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Steer the mission — e.g. focus on UGC this week"
            className="t-input flex-1"
          />
          <button
            disabled={busy || !instruction.trim()}
            onClick={() =>
              act(async () => {
                await api.missionTalk(mission.id, instruction.trim());
                setInstruction("");
                setShowTalk(false);
              })
            }
            className="t-btn t-btn-primary !py-2 !px-4 !text-[11px]"
          >
            Send
          </button>
        </div>
      )}

      {intel.summary && (
        <div className="mt-3 rounded-lg bg-accent/10 border border-accent/15 px-3 py-2 text-[11px] text-accent">
          <span className="font-medium">Latest intel:</span> {intel.summary}
        </div>
      )}

      {mission.instruction && (
        <div className="mt-2 text-[11px] text-warning">
          <span className="font-medium">Steer:</span> {mission.instruction}
        </div>
      )}

      <div className="mt-4">
        <div className="text-[10px] tracking-widest uppercase text-text-muted mb-2">
          Workspace · progressive reveal
        </div>
        <WorkspaceView workspace={ws} />
      </div>

      {runs.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] tracking-widest uppercase text-text-muted mb-2">
            Recent cycles
          </div>
          <div className="space-y-1">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-[11px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    r.status === "completed" ? "bg-success" : "bg-error"
                  }`}
                />
                <span className="text-text-muted">{r.cycle_type}</span>
                <span className="text-text-muted flex-1 truncate">{r.summary}</span>
                <span className="text-text-muted shrink-0">
                  {(r.duration_ms / 1000).toFixed(0)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    client: "",
    goal: "",
    cadence: "daily",
    daily_time: "08:30",
    weekly_day: "monday",
    competitors: "",
    audience: "",
    platforms: "instagram, linkedin",
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setMissions(await api.missions());
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.name.trim()) return alert("Name the mission");
    setCreating(true);
    try {
      await api.missionCreate({
        name: form.name.trim(),
        client: form.client.trim(),
        goal: form.goal.trim(),
        cadence: form.cadence,
        daily_time: form.daily_time,
        weekly_day: form.weekly_day,
        config: {
          competitors: form.competitors.split(",").map((s) => s.trim()).filter(Boolean),
          audience: form.audience,
          platforms: form.platforms.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      setShowCreate(false);
      setForm({ name: "", client: "", goal: "", cadence: "daily", daily_time: "08:30", weekly_day: "monday", competitors: "", audience: "", platforms: "instagram, linkedin" });
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="t-page">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-text-primary">Missions</h1>
            <p className="text-[12px] text-text-muted mt-1">
              Persistent per-client workspaces the team keeps alive — observe, plan, produce, publish, learn.
            </p>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="t-btn t-btn-primary !px-4 !py-2.5 !text-[12px]"
          >
            {showCreate ? "Cancel" : "+ New mission"}
          </button>
        </div>

        {showCreate && (
          <div className="t-card rounded-2xl p-5 mb-6 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Mission name *"
                className="t-input"
              />
              <input
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                placeholder="Client / workspace"
                className="t-input"
              />
            </div>
            <textarea
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="Goal — what must this client's marketing achieve?"
              rows={2}
              className="t-input w-full"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={form.cadence}
                onChange={(e) => setForm({ ...form, cadence: e.target.value })}
                className="t-input"
              >
                <option value="daily">Daily observe</option>
                <option value="weekly">Weekly full plan</option>
              </select>
              <input
                value={form.daily_time}
                onChange={(e) => setForm({ ...form, daily_time: e.target.value })}
                placeholder="Daily time HH:MM"
                className="t-input"
              />
              <input
                value={form.weekly_day}
                onChange={(e) => setForm({ ...form, weekly_day: e.target.value })}
                placeholder="Weekly day"
                className="t-input"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.competitors}
                onChange={(e) => setForm({ ...form, competitors: e.target.value })}
                placeholder="Competitors (comma separated)"
                className="t-input"
              />
              <input
                value={form.platforms}
                onChange={(e) => setForm({ ...form, platforms: e.target.value })}
                placeholder="Platforms (comma separated)"
                className="t-input"
              />
            </div>
            <input
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
              placeholder="Target audience"
              className="t-input w-full"
            />
            <button
              onClick={create}
              disabled={creating}
              className="t-btn t-btn-primary !px-5 !py-2.5 !text-[12px]"
            >
              {creating ? "Creating…" : "Create mission"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-[12px] text-text-muted">Loading missions…</div>
        ) : missions.length === 0 ? (
          <div className="t-card rounded-2xl p-10 text-center">
            <div className="text-3xl mb-2">◈</div>
            <div className="text-sm text-text-muted">No missions yet</div>
            <p className="text-[12px] text-text-muted mt-1">
              Create a mission and the team will keep it alive on a cadence — no prompting required.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {missions.map((m) => (
              <MissionCard key={m.id} mission={m} onRefresh={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}