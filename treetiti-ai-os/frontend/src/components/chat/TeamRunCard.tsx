import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, streamEvents, StreamEvent } from "../../api";

type StageState = {
  agent: string;
  stage: string;
  phase: "started" | "completed" | "failed";
  note?: string;
};

type Props = {
  taskId: string;
};

const statusColor: Record<string, string> = {
  queued: "text-text-secondary",
  running: "text-success",
  completed: "text-success",
  failed: "text-error",
  cancelled: "text-error",
};

export function TeamRunCard({ taskId }: Props) {
  const [status, setStatus] = useState("queued");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const stagesRef = useRef<StageState[]>([]);
  const [stages, setStages] = useState<StageState[]>([]);
  const [live, setLive] = useState(false);
  const [done, setDone] = useState(false);

  const finalize = (d: { status: string; error?: string; result?: Record<string, unknown> }) => {
    setStatus(d.status);
    setError(d.error || "");
    if (d.result) setSummary(d.result);
    setDone(true);
  };

  useEffect(() => {
    const seen = new Set<string>();
    const onEvent = (ev: StreamEvent) => {
      if (String(ev.payload?.task_id) !== taskId) return;
      if (ev.type === "agent.started" || ev.type === "agent.completed" || ev.type === "agent.failed") {
        const phase = ev.type.replace("agent.", "") as StageState["phase"];
        const key = `${ev.payload?.stage}:${ev.payload?.agent}:${phase}`;
        if (seen.has(key)) return;
        seen.add(key);
        const entry: StageState = {
          stage: String(ev.payload?.stage || ev.source),
          agent: String(ev.payload?.agent || ev.source),
          phase,
          note: String(ev.payload?.note || ""),
        };
        stagesRef.current = [...stagesRef.current, entry];
        setStages(stagesRef.current);
      }
      if (ev.type === "task.completed" || ev.type === "task.failed" || ev.type === "task.cancelled") {
        const status = ev.type.replace("task.", "");
        setStatus(status);
        if (ev.payload?.error) setError(String(ev.payload.error));
        setDone(true);
      }
    };
    const stop = streamEvents(onEvent, { onOpen: () => setLive(true) });
    const poll = window.setInterval(async () => {
      try {
        const detail = await api.taskDetail(taskId);
        if (detail.status !== status) setStatus(detail.status);
        if (detail.error) setError(detail.error);
        if (["completed", "failed", "cancelled"].includes(detail.status)) {
          window.clearInterval(poll);
          finalize(detail);
          stop?.();
        }
      } catch {
        /* task not found yet — keep polling */
      }
    }, 3000);
    return () => {
      window.clearInterval(poll);
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const stageRows = useMemo(() => {
    const order = ["research", "analytics", "campaign", "strategy", "editorial", "creative", "content", "image", "video", "qa", "publish", "learning"];
    const rank = (s: string) => order.indexOf(s) + 1 || 99;
    return [...stages].sort((a, b) => rank(a.stage) - rank(b.stage));
  }, [stages]);

  const report = summary as { team?: string[]; stages?: { name: string; status: string }[] } | null;

  return (
    <div className="mt-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-success">
          🏢 Whole team at work
        </span>
        <div className="flex items-center gap-2">
          {!done && live && (
            <span className="flex items-center gap-1.5 text-[11px] text-success">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              live
            </span>
          )}
          <span className={`text-[11px] font-semibold ${statusColor[status] || "text-text-secondary"}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {stageRows.length === 0 && !done && (
          <div className="text-xs text-text-muted">Activating research, strategy, creative…</div>
        )}
        {stageRows.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className={`shrink-0 ${
                s.phase === "completed" ? "text-success" : s.phase === "failed" ? "text-error" : "text-warning"
              }`}
            >
              {s.phase === "completed" ? "✓" : s.phase === "failed" ? "✕" : "●"}
            </span>
            <span className="text-text-secondary">{s.agent}</span>
            <span className="text-text-muted">· {s.stage}</span>
            {s.phase === "started" && (
              <span className="ml-auto inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            )}
          </div>
        ))}
      </div>

      {report?.team && report.team.length > 0 && (
        <div className="mt-2 border-t border-success/20 pt-2">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Team assigned</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {report.team.map((t) => (
              <span key={t} className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-text-secondary">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {done && report?.stages && (
        <div className="mt-2 border-t border-success/20 pt-2">
          <div className="text-[11px] uppercase tracking-wide text-text-muted">Stage results</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {report.stages.map((s) => (
              <span
                key={s.name}
                className={`rounded-full px-2 py-0.5 text-[11px] border ${
                  s.status === "completed"
                    ? "border-success bg-success/10 text-success"
                    : s.status === "skipped"
                      ? "border-border bg-secondary text-text-muted"
                      : s.status === "failed"
                        ? "border-error bg-error/10 text-error"
                        : "border-warning bg-warning/10 text-warning"
                }`}
              >
                {s.name}: {s.status}
              </span>
            ))}
          </div>
        </div>
      )}

      {done && error && <div className="mt-2 text-xs text-error">{error}</div>}
    </div>
  );
}