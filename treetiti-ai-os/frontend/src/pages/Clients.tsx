import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ClientSummary } from "../api";

const STATUS_PILL: Record<string, string> = {
  active: "t-pill t-pill-green",
  paused: "t-pill t-pill-amber",
  archived: "t-pill t-pill-gray",
};

const CYCLE_COLOR: Record<string, string> = {
  completed: "text-success",
  failed: "text-error",
  running: "text-warning",
};

function ClientCard({ client }: { client: ClientSummary }) {
  const [expanded, setExpanded] = useState(false);
  const d = client.directory;
  const missionStatus = (m: { status: string }) => STATUS_PILL[m.status] || "t-pill t-pill-gray";
  const cycleStatus = (s: string) => CYCLE_COLOR[s] || "text-text-muted";

  return (
    <div className="t-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg text-text-primary truncate">{client.name}</h3>
            <span className="text-[10px] text-text-muted uppercase">
              {client.mission_count} mission{client.mission_count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {d?.business_line || "No directory profile"} · {client.content_count} content item
            {client.content_count === 1 ? "" : "s"} in workspace
          </div>
          {d?.main_goal && (
            <p className="text-[12px] text-text-muted mt-2 leading-relaxed max-w-2xl">
              {d.main_goal}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {client.active_missions > 0 && (
            <span className="t-pill t-pill-green">
              {client.active_missions} active
            </span>
          )}
          {client.pending_approvals > 0 && (
            <span className="t-pill t-pill-amber">
              {client.pending_approvals} approvals
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="t-btn t-btn-ghost !py-1.5 !px-3 !text-[11px]"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {client.last_run_at && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-text-muted">
          <span>
            Last cycle: <span className={`font-medium ${cycleStatus(client.last_cycle_status || "")}`}>{client.last_cycle || "—"}</span>
          </span>
          <span className={`font-medium ${cycleStatus(client.last_cycle_status || "")}`}>
            {client.last_cycle_status || "never"}
          </span>
          <span>{new Date(client.last_run_at).toLocaleString()}</span>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {client.missions.map((m) => (
              <div key={m.id} className="rounded-xl border border-white/[0.06] bg-primary p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to="/missions"
                    className="text-[13px] text-accent hover:underline truncate transition"
                  >
                    {m.name}
                  </Link>
                  <span className={missionStatus(m)}>{m.status}</span>
                </div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  {m.cadence} · daily {m.daily_time} · weekly {m.weekly_day}
                </div>
                {m.goal && (
                  <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed line-clamp-2">
                    {m.goal}
                  </p>
                )}
              </div>
            ))}
          </div>

          {client.workspace_revealed.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] tracking-widest uppercase text-text-muted">
                Workspace:
              </span>
              {client.workspace_revealed.map((key) => (
                <span key={key} className="t-pill t-pill-blue">{key}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              to="/results"
              className="text-[11px] text-accent hover:underline transition"
            >
              → view results
            </Link>
            {client.lead && (
              <span className="text-[11px] text-text-muted">
                lead · {client.lead.status} · score {client.lead.score}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api
      .clients()
      .then(setClients)
      .catch((e) => alert((e as Error).message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="t-page">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-text-primary">Clients</h1>
            <p className="text-[13px] text-text-muted mt-1">
              Every client the OS is working for — missions, autonomy and delivery
              in one view.
            </p>
          </div>
          <button onClick={load} className="t-btn t-btn-ghost !px-3 !py-1.5 !text-[11px]">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-[13px] text-text-muted">Loading clients…</div>
        ) : clients.length === 0 ? (
          <div className="t-card rounded-2xl p-6 text-center">
            <div className="font-display text-lg text-text-primary">No clients yet</div>
            <p className="text-[12px] text-text-muted mt-1">
              Create a mission on the Missions page to start an autonomous
              workspace for a client.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {clients.map((c) => (
              <ClientCard key={c.name} client={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}