import React, { useEffect, useRef, useState } from "react";
import { useOffice } from "./OfficeStore";
import { deskFor } from "./config";

const KIND_COLOR: Record<string, string> = {
  "agent.started": "#fbbf24",
  "agent.completed": "#34d399",
  "agent.failed": "#f87171",
  "agent.retrying": "#fb923c",
  "task.started": "#38bdf8",
  "task.completed": "#34d399",
  "task.failed": "#f87171",
  "WORKFLOW_ADVANCED": "#a78bfa",
  "CONTENT_CREATED": "#34d399",
  "IMAGE_CREATED": "#f472b6",
  "VIDEO_CREATED": "#fb7185",
  "QA_PASSED": "#a3e635",
  "QA_FAILED": "#f87171",
  "APPROVAL_REQUIRED": "#fbbf24",
  "PUBLISHED": "#4ade80",
  "media.generation.started": "#f472b6",
  "media.generation.completed": "#f472b6",
  "tool.completed": "#818cf8",
  "mission.created": "#6ea8ff",
  "mission.started": "#6ea8ff",
  "mission.stage_started": "#6ea8ff",
  "mission.stage_completed": "#6ea8ff",
  "mission.completed": "#34d399",
  "mission.failed": "#f87171",
  "mission.paused": "#fbbf24",
  "mission.resumed": "#6ea8ff",
  "mission.instructed": "#fbbf24",
  "handoff.created": "#a78bfa",
  "handoff.received": "#a78bfa",
  "artifact.created": "#f472b6",
};

const KIND_SHORT: Record<string, string> = {
  "agent.started": "started",
  "agent.completed": "completed",
  "agent.failed": "failed",
  "agent.retrying": "retrying",
  "task.started": "task started",
  "task.completed": "task done",
  "task.failed": "task failed",
  WORKFLOW_ADVANCED: "workflow",
  CONTENT_CREATED: "content",
  IMAGE_CREATED: "image",
  VIDEO_CREATED: "video",
  QA_PASSED: "qa passed",
  QA_FAILED: "qa failed",
  APPROVAL_REQUIRED: "approval",
  PUBLISHED: "published",
  "media.generation.started": "media gen",
  "media.generation.completed": "media done",
  "tool.completed": "tool",
  "mission.created": "mission created",
  "mission.started": "mission started",
  "mission.stage_started": "stage started",
  "mission.stage_completed": "stage done",
  "mission.completed": "mission done",
  "mission.failed": "mission failed",
  "mission.paused": "paused",
  "mission.resumed": "resumed",
  "mission.instructed": "steered",
  "handoff.created": "handoff",
  "handoff.received": "handoff received",
  "artifact.created": "artifact",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export function ActivityFeed() {
  const { activity } = useOffice();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: 0 });
  }, [activity, open]);

  return (
    <div className="absolute bottom-4 left-4 z-20 w-[280px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-xl border border-border/90 bg-primary/85 backdrop-blur-xl px-4 py-2.5 text-left flex items-center justify-between hover:border-border-hover transition shadow-xl"
      >
        <span className="text-xs font-semibold text-text-primary tracking-wide">LIVE ACTIVITY</span>
        <span className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: activity.length > 0 ? "#34d399" : "#52525b" }}
          />
          <span className="text-[10px] text-text-muted">{activity.length}</span>
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          className="mt-2 rounded-xl border border-border/90 bg-primary/90 backdrop-blur-xl shadow-2xl overflow-y-auto"
          style={{ maxHeight: 280 }}
        >
          {activity.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-text-muted">
              Nothing yet — send the company a mission.
            </div>
          )}
          {activity.map((a) => {
            const d = a.agent ? deskFor(a.agent) : undefined;
            return (
              <div key={a.id} className="flex items-start gap-2 px-4 py-2 border-b border-border/50 last:border-0">
                <span
                  className="mt-1 w-1.5 h-1.5 shrink-0 rounded-full"
                  style={{ background: KIND_COLOR[a.kind] ?? d?.accent ?? "#71717a" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-secondary truncate">{a.text}</div>
                  <div className="text-[10px] text-text-muted">
                    {KIND_SHORT[a.kind] ?? a.kind}
                    {d ? ` · ${d.name}` : a.agent ? ` · ${a.agent}` : ""}
                  </div>
                </div>
                <span className="text-[10px] text-text-muted shrink-0">{timeAgo(a.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}