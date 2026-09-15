import React from "react";

export type AgentStatus = "pending" | "working" | "done" | "failed";

export type AgentCardProps = {
  teammate: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    description: string;
  };
  currentTask?: {
    stage: string;
    phase: AgentStatus;
    note?: string;
  };
  onClick?: () => void;
};

export function AgentCard({ teammate, currentTask, onClick }: AgentCardProps) {
  const color = "#7aa2f7"; // Grok blue
  const avatarColor = `${color}15`;

  const phaseLabels = {
    pending: { label: "Queued", color: "#a1a1aa" },
    working: { label: "Working", color: "#7aa2f7" },
    done: { label: "Done", color: "#10b981" },
    failed: { label: "Failed", color: "#ef4444" },
  };
  const phaseInfo = phaseLabels[currentTask?.phase || "pending"];

  return (
    <div
      onClick={onClick}
      className="t-agent-card cursor-pointer transition-colors hover:bg-bg-secondary/[0.04] rounded-2xl p-4 border border-border"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ background: avatarColor, color: color }}
        >
          {teammate.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">{teammate.name}</span>
            <span
              className="text-[9px] uppercase tracking-[0.2em] font-medium ms-2"
              style={{ color: phaseInfo.color }}
            >
              {phaseInfo.label}
            </span>
          </div>
          {teammate.description && (
            <div className="mt-1 text-xs text-text-muted">{teammate.description}</div>
          )}
          {currentTask && (
            <div className="mt-2 text-[11px] text-text-secondary">
              {currentTask.stage}: {phaseInfo.label.toLowerCase()}
            </div>
          )}
        </div>
        {currentTask?.phase === "working" && (
          <div className="flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: color }} />
          </div>
        )}
      </div>
    </div>
  );
}