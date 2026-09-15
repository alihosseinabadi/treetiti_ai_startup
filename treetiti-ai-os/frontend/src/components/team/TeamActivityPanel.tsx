import React, { useEffect, useRef, useState } from "react";
import { StreamEvent, streamEvents } from "../../api";

type Row = { id: number; ev: StreamEvent };

function eventLabel(ev: StreamEvent): string {
  const p = (ev.payload ?? {}) as Record<string, unknown>;
  if (p.task_id) return `task ${String(p.task_id).slice(0, 8)} · ${ev.type}`;
  if (p.model) return `${ev.source} · ${String(p.model)}`;
  return ev.type;
}

export default function TeamActivityPanel({ limit = 40 }: { limit?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [live, setLive] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    const push = (ev: StreamEvent) => {
      idRef.current += 1;
      setRows((prev) => {
        const next = [...prev, { id: idRef.current, ev }];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    };
    const stop = streamEvents(push, {
      onOpen: () => setLive(true),
      onError: () => setLive(false),
    });
    return () => {
      stop();
      setLive(false);
    };
  }, [limit]);

  return (
    <div className="rounded-xl border border-border/80 bg-secondary/40 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/80">
        <h3 className="text-sm font-semibold text-text-primary">Team activity</h3>
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span
            className={`inline-block h-2 w-2 rounded-full ${live ? "bg-success animate-pulse" : "bg-hover"}`}
          />
          {live ? "live" : "offline"}
        </div>
      </header>
      <div className="h-64 overflow-auto p-3 space-y-1.5">
        {rows.length === 0 && (
          <p className="text-xs text-text-muted text-center pt-10">
            Waiting for agent activity…
          </p>
        )}
        {rows.map(({ id, ev }) => (
          <div key={id} className="text-[11px] leading-snug">
            <span className="text-text-muted">{ev.created_at?.slice(11, 19) ?? "--:--:--"}</span>{" "}
            <span className="text-success/90">{ev.type}</span>
            <span className="text-text-secondary"> {eventLabel(ev)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}