import React from "react";
import { ChatMsg, Stage } from "../../hooks/useChat";
import { Markdown } from "./Markdown";
import { Btn } from "../ui";

export function ExecutionBlock({ stages, collapsed }: { stages: Stage[]; collapsed?: boolean }) {
  if (!stages.length) return null;
  const visible = collapsed ? stages.filter((s) => s.phase !== "pending") : stages;
  return (
    <div className="t-exec mt-2">
      <div className="t-timeline">
        {visible.map((s, i) => (
          <div key={i} className={`t-timeline-item ${s.phase === "working" ? "working" : ""}`}>
            <div className="t-timeline-dot-col">
              <div className={`t-timeline-dot ${s.phase}`} />
              {i < visible.length - 1 && (
                <div className={`t-timeline-connector ${s.phase === "done" ? "done" : s.phase === "working" ? "working" : ""}`} />
              )}
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 text-[12.5px]">
              <span className="text-text-muted truncate">{s.agent}</span>
              <span className={`text-[11px] font-medium shrink-0 ${
                s.phase === "done" ? "text-success" : s.phase === "failed" ? "text-error" : s.phase === "working" ? "text-accent animate-pulse" : "text-text-muted"
              }`}>
                {s.phase === "done" ? "✓ done" : s.phase === "failed" ? "✕ failed" : s.phase === "working" ? "● working" : "○ pending"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaCard({ url, kind }: { url: string; kind: string }) {
  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        className="mt-3 w-full max-h-80 rounded-xl border border-border bg-bg-primary"
      />
    );
  }
  return (
    <img
      src={url}
      alt="generated"
      className="mt-3 w-full max-h-80 rounded-xl border border-border object-cover"
    />
  );
}

export function Message({
  msg,
  onConfirm,
  onCancel,
  onDecide,
}: {
  msg: ChatMsg;
  onConfirm?: (msg: ChatMsg) => void;
  onCancel?: (msg: ChatMsg) => void;
  onDecide?: (msg: ChatMsg, option: string) => void;
}) {
  const isUser = msg.role === "user";
  const pd = msg.pending_decision;
  return (
    <div className={`t-msg ${isUser ? "t-msg-user" : "t-msg-assistant"}`}>
      <div className="t-msg-avatar" aria-hidden>
        {isUser ? "◆" : "▲"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="t-bubble">
          {msg.agent && !isUser && (
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent">
              {msg.agent}
            </div>
          )}
          <Markdown text={msg.content} />
          {msg.media && <MediaCard url={msg.media.url} kind={msg.media.kind} />}
        </div>
        {pd && pd.options.length > 0 && !isUser && (
          <div className="mt-2 flex flex-wrap gap-2 pl-1">
            {pd.options.map((opt) => (
              <button
                key={opt}
                onClick={() => onDecide?.(msg, opt)}
                className="t-btn rounded-xl border border-border bg-bg-secondary px-3 py-1.5 text-[13px] font-medium text-text-primary transition hover:border-accent hover:text-accent"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        {msg.os_command && msg.confirm_action && (
          <div className="mt-2 flex items-center gap-2 pl-1">
            <Btn variant="danger" onClick={() => onConfirm?.(msg)}>
              Confirm
            </Btn>
            <Btn onClick={() => onCancel?.(msg)}>Cancel</Btn>
          </div>
        )}
      </div>
    </div>
  );
}