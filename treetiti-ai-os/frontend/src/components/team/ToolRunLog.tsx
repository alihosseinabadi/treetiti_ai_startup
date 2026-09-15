import React from "react";
import { AgentRun } from "../../api";
import { StatusPill } from "../ui";

export default function ToolRunLog({ runs }: { runs: AgentRun[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No runs yet. Trigger one manually or wait for the autopilot.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {runs.map((r) => (
        <div
          key={r.id}
          className="flex items-start justify-between gap-4 rounded-lg border border-border/80 bg-primary/40 px-4 py-2.5"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize text-text-primary">
                {r.agent.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-text-muted">{r.job_type}</span>
              <span className="text-xs text-text-muted">
                {r.started_at ? new Date(r.started_at).toLocaleString() : "never"} ·{" "}
                {(r.duration_ms / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
              {r.status === "failed" ? r.error : r.summary || "—"}
            </p>
          </div>
          <StatusPill status={r.status} />
        </div>
      ))}
    </div>
  );
}