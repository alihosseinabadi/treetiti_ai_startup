import React from "react";
import { ChatMsg, Stage } from "../../hooks/useChat";
import { Markdown } from "./Markdown";

export function ExecutionBlock({ stages, collapsed }: { stages: Stage[]; collapsed?: boolean }) {
  if (!stages.length) return null;
  const visible = collapsed ? stages.filter((s) => s.phase !== "pending") : stages;
  return (
    <div className="oc-steps">
      {visible.map((s, i) => (
        <div key={i} className="oc-step">
          <div className={`oc-step-dot ${s.phase}`} />
          {i < visible.length - 1 && <div className={`oc-step-line ${s.phase}`} />}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-text-secondary truncate">{s.agent}</span>
            <span className={`text-[10px] font-mono shrink-0 ${
              s.phase === "done" ? "text-success" : s.phase === "failed" ? "text-error" : s.phase === "working" ? "text-accent" : "text-text-muted"
            }`}>
              {s.phase === "done" ? "✓" : s.phase === "failed" ? "✕" : s.phase === "working" ? "●" : "○"}
            </span>
          </div>
        </div>
      ))}
    </div>
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
    <div className={`oc-msg ${isUser ? "oc-msg-user" : "oc-msg-assistant"}`}>
      {!isUser && msg.agent && (
        <div className="oc-msg-agent">{msg.agent}</div>
      )}
      <div className="oc-msg-body">
        <Markdown text={msg.content} />
      </div>
      {msg.media && (
        msg.media.kind === "video" ? (
          <video src={msg.media.url} controls playsInline className="mt-2 max-h-64 rounded-lg border border-border" />
        ) : (
          <img src={msg.media.url} alt="attachment" className="mt-2 max-h-64 rounded-lg border border-border object-cover" />
        )
      )}
      {pd && pd.options.length > 0 && !isUser && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pd.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onDecide?.(msg, opt)}
              className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-[12px] font-medium text-text-secondary transition hover:border-accent hover:text-accent"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {msg.os_command && msg.confirm_action && (
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => onConfirm?.(msg)} className="oc-btn oc-btn-primary">Confirm</button>
          <button onClick={() => onCancel?.(msg)} className="oc-btn">Cancel</button>
        </div>
      )}
    </div>
  );
}
