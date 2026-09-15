import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChatApi, ChatMsg, stageText } from "../../hooks/useChat";
import { Approval, MediaAsset, Teammate, TaskRow } from "../../api";
import { AgentCard } from "../../components/agent/AgentCard";
import { IconGlyph } from "../../office/Mascot";
import { Message } from "./Message";
import { Composer } from "./Composer";
import { OnboardingConversation } from "./OnboardingConversation";
import { Btn } from "../ui";

const HOME_SHORTCUTS: { label: string; icon: string; to: string }[] = [
  { label: "Swarm", icon: "◉", to: "/swarm" },
  { label: "Deep Research", icon: "◎", to: "/research" },
  { label: "Websites", icon: "◇", to: "/websites" },
  { label: "Docs", icon: "▤", to: "/docs" },
  { label: "Sheets", icon: "▦", to: "/sheets" },
  { label: "Design", icon: "◐", to: "/design" },
  { label: "Image", icon: "🖼", to: "/media?create=image" },
  { label: "Video", icon: "🎬", to: "/media?create=video" },
];

function ApprovalCard({
  a,
  onDecide,
}: {
  a: Approval;
  onDecide: (a: Approval, d: "approve" | "reject") => void;
}) {
  const riskColors = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
  };
  const riskColor = riskColors[a.risk_level as keyof typeof riskColors] || riskColors.medium;

  return (
    <div className="t-card p-4 border-l-4" style={{ borderLeftColor: riskColor }}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary text-sm" style={{ background: riskColor }}>
          {a.risk_level === "high" ? "⚠" : a.risk_level === "medium" ? "⏳" : "✓"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: riskColor }}>
              {a.risk_level.toUpperCase()} RISK — APPROVAL REQUIRED
            </span>
            {a.kind && <span className="px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated text-text-muted">{a.kind}</span>}
          </div>
          <div className="mt-1.5 text-sm font-medium text-text-primary">{a.title}</div>
          <div className="mt-0.5 text-xs text-text-muted">{a.summary}</div>
          {a.payload && typeof a.payload.url === "string" && (
            <a href={a.payload.url} target="_blank" rel="noreferrer" className="mt-2 text-xs text-accent underline">
              Review →
            </a>
          )}
          <div className="mt-3 flex gap-2">
            <Btn variant="primary" onClick={() => onDecide(a, "approve")}>
              Approve
            </Btn>
            <Btn variant="danger" onClick={() => onDecide(a, "reject")}>Reject</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaGallery({ items }: { items: MediaAsset[] }) {
  if (!items.length) return null;
  return (
    <div className="t-card p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-accent">
        Media in this chat · {items.length}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((a) =>
          a.kind === "video" ? (
            <video
              key={a.id}
              src={a.url}
              controls
              playsInline
              className="h-36 w-full rounded-xl border border-white/10 bg-bg-primary object-cover"
            />
          ) : (
            <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.prompt}>
              <img
                src={a.url}
                alt={a.title || a.prompt}
                className="h-36 w-full rounded-xl border border-white/10 object-cover"
              />
            </a>
          ),
        )}
      </div>
    </div>
  );
}

function AgentActivityCard({
  activity,
  teammates,
  isLast = false,
}: {
  activity: { agent: string; stage: string; phase: "pending" | "working" | "done" | "failed"; note?: string };
  teammates: Teammate[];
  isLast?: boolean;
}) {
  const teammate = teammates.find((t) => t.agent_key === activity.agent);
  const color = teammate ? roleColor(teammate.role) : "#71717a";
  const avatar = teammate?.avatar || "🤖";
  const name = teammate?.name || activity.agent;

  const phaseLabels: Record<string, { label: string; icon: string }> = {
    pending: { label: "Queued", icon: "◦" },
    working: { label: "Working", icon: "●" },
    done: { label: "Done", icon: "✓" },
    failed: { label: "Failed", icon: "✕" },
  };
  const phaseInfo = phaseLabels[activity.phase];

  return (
    <div className={`t-timeline-item ${activity.phase === "working" ? "working" : ""}`}>
      <div className="t-timeline-dot-col">
        <div className={`t-timeline-dot ${activity.phase}`} />
        {!isLast && (
          <div className={`t-timeline-connector ${activity.phase === "done" ? "done" : activity.phase === "working" ? "working" : ""}`} />
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px]"
          style={{ background: `${color}15`, color }}
        >
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-sm truncate ${activity.phase === "done" ? "text-text-muted" : "text-text-primary"}`}>
              {name}
            </span>
            <span className="text-[11px] text-text-muted">
              {stageText(activity.stage)}
            </span>
            <span
              className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${activity.phase === "working" ? "animate-pulse " : ""}${
                activity.phase === "done" ? "bg-success/10 text-success" : activity.phase === "failed" ? "bg-error/10 text-error" : "bg-accent/10 text-accent"
              }`}
            >
              {phaseInfo.label}
            </span>
          </div>
          {activity.note && (
            <div className="mt-0.5 text-[11px] text-text-muted truncate">{activity.note}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveActivityPanel({
  chat,
  teammates,
}: {
  chat: ChatApi;
  teammates: Teammate[];
}) {
  const [open, setOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const activeStages = useMemo(() => {
    if (!chat.runningTask) return [];
    return chat.stages[chat.runningTask] ?? [];
  }, [chat.runningTask, chat.stages]);

  const doneCount = activeStages.filter((s) => s.phase === "done").length;
  const workingCount = activeStages.filter((s) => s.phase === "working").length;
  const totalCount = activeStages.length;

  if (!chat.runningTask || !activeStages.length) return null;

  return (
    <div className="t-card overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-bg-elevated transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-text-primary">Team Working</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/15 text-accent">
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted">{workingCount} active</span>
          <span className="text-[10px] text-text-muted">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-3 space-y-2 max-h-96 overflow-y-auto">
          {activeStages.map((s, i) => (
            <AgentActivityCard key={`${s.stage}-${s.agent}-${i}`} activity={s} teammates={teammates} />
          ))}
          {!showAll && activeStages.length > 8 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-2 text-sm text-accent hover:underline"
            >
              Show all {activeStages.length} stages
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ToolEventCard({
  event,
}: {
  event: { type: string; tool: string; agent?: string; input?: string; output?: string; status: "started" | "completed" | "failed"; timestamp: string };
}) {
  const toolIcons: Record<string, string> = {
    browser: "🌐",
    search: "🔍",
    files: "📁",
    terminal: "💻",
    image_generation: "🖼",
    video_generation: "🎬",
    web_research: "🔬",
    analytics: "📊",
    social_publish: "📱",
    email: "📧",
    calendar: "📅",
    crm: "👥",
    cloud_storage: "☁️",
    deep_research: "📚",
    code_execution: "⚙️",
  };
  const icon = toolIcons[event.tool] || "🔧";
  const statusColors = {
    started: "#7aa2f7",
    completed: "#10b981",
    failed: "#ef4444",
  };
  const color = statusColors[event.status];

  return (
    <div className="t-card p-3 border-l-2" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">{event.tool.replace(/_/g, " ")}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${event.status === "started" ? "animate-pulse" : ""}`}
              style={{ background: `${color}15`, color }}
            >
              {event.status}
            </span>
            {event.agent && <span className="text-xs text-text-muted">via {event.agent}</span>}
          </div>
          {event.input && (
            <div className="mt-1 text-xs text-text-muted font-mono truncate">Input: {event.input}</div>
          )}
          {event.output && event.status !== "started" && (
            <div className="mt-1 text-xs text-text-muted font-mono truncate">Output: {event.output}</div>
          )}
        </div>
        <span className="text-[10px] text-text-muted">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function ToolEventsPanel({
  events,
}: {
  events: { type: string; tool: string; agent?: string; input?: string; output?: string; status: "started" | "completed" | "failed"; timestamp: string }[];
}) {
  if (!events.length) return null;
  
  const [open, setOpen] = useState(true);
  
  return (
    <div className="t-card overflow-hidden">
      <button
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-bg-secondary/[0.04] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔧</span>
          <span className="text-sm font-medium text-text-primary">Tool Activity</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/15 text-accent">
            {events.length}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-text-muted">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-3 space-y-2 max-h-96 overflow-y-auto">
          {events.slice(-20).map((e, i) => (
            <ToolEventCard key={`${e.tool}-${e.timestamp}-${i}`} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamingMessage({ content, agent }: { content: string; agent?: string }) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedContent("");
    setIsComplete(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < content.length) {
        setDisplayedContent(content.slice(0, i + 1));
        i += 3; // stream ~3 chars at a time for smooth effect
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [content]);

  return (
    <div className="t-msg t-msg-assistant">
      <div className="t-msg-avatar" aria-hidden>
        {agent ? "🤖" : "▲"}
      </div>
      <div className="t-bubble max-w-full">
        <div className="t-md">{displayedContent}</div>
        {!isComplete && <span className="inline-block w-1.5 h-4 animate-pulse bg-text-muted ml-0.5 align-bottom" />}
      </div>
    </div>
  );
}

function HandoffIndicator({ fromAgent, toAgent, teammates }: { fromAgent: string; toAgent: string; teammates: Teammate[] }) {
  const from = teammates.find((t) => t.agent_key === fromAgent);
  const to = teammates.find((t) => t.agent_key === toAgent);

  return (
    <div className="t-card p-3 border-l-2 border-l-accent bg-accent/[0.03]">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-accent text-xs">⤷</span>
        <span className="text-text-muted">Handoff:</span>
        {from && (
          <span className="px-2 py-0.5 rounded bg-bg-secondary/10 text-text-primary text-xs font-medium flex items-center gap-1">
            <span style={{ color: roleColor(from.role) }}>{from.avatar}</span>
            {from.name}
          </span>
        )}
        <span className="text-accent">→</span>
        {to && (
          <span className="px-2 py-0.5 rounded bg-bg-secondary/10 text-text-primary text-xs font-medium flex items-center gap-1">
            <span style={{ color: roleColor(to.role) }}>{to.avatar}</span>
            {to.name}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskProgressCard({
  task,
  chat,
  teammates,
}: {
  task: TaskRow;
  chat: ChatApi;
  teammates: Teammate[];
}) {
  const activeStages = chat.stages[task.id] ?? [];
  const doneCount = activeStages.filter((s) => s.phase === "done").length;
  const failedCount = activeStages.filter((s) => s.phase === "failed").length;
  const totalCount = activeStages.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;
  const isComplete = task.status === "completed" || task.status === "failed";
  const isFailed = task.status === "failed";

  return (
    <div className="t-card p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
          <span className="text-xl">📋</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary truncate">{task.label}</div>
          <div className="text-xs text-text-muted">{task.kind} · {task.status}</div>
        </div>
        {task.status === "running" && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-accent/15 text-accent">
              {doneCount}/{totalCount}
            </span>
            <span className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        {isFailed && (
          <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-error/15 text-error">
            Failed
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-3">
          <div className="t-progress-bar">
            <div
              className={`t-progress-fill ${isComplete ? "complete" : ""}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {failedCount > 0 && (
            <div className="text-[10px] text-error mt-1">{failedCount} failed</div>
          )}
        </div>
      )}

      {/* Timeline */}
      {activeStages.length > 0 && (
        <div className="t-timeline">
          {activeStages.map((s, i) => (
            <AgentActivityCard
              key={`${s.stage}-${s.agent}-${i}`}
              activity={s}
              teammates={teammates}
              isLast={i === activeStages.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ArtifactCard({
  artifact,
  onOpen,
  onDownload,
  onRegenerate,
}: {
  artifact: { id: string; title: string; kind: string; url?: string; preview?: string };
  onOpen?: () => void;
  onDownload?: () => void;
  onRegenerate?: () => void;
}) {
  const kindIcons = { image: "🖼", video: "🎬", document: "📄", code: "💻", data: "📊" };

  return (
    <div className="t-card p-3 hover:bg-bg-secondary/[0.03] transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg-secondary/10 text-2xl">
          {kindIcons[artifact.kind as keyof typeof kindIcons] || "📎"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary truncate">{artifact.title}</div>
          <div className="text-xs text-text-muted capitalize">{artifact.kind}</div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {artifact.url && (
            <button onClick={onOpen} className="p-1.5 rounded hover:bg-bg-secondary/10 text-text-secondary" title="Open">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          )}
          <button onClick={onDownload} className="p-1.5 rounded hover:bg-bg-secondary/10 text-text-secondary" title="Download">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          {onRegenerate && (
            <button onClick={onRegenerate} className="p-1.5 rounded hover:bg-bg-secondary/10 text-text-secondary" title="Regenerate">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  chief: "#7aa2f7", researcher: "#10b981", strategist: "#8b5cf6",
  copywriter: "#ec4899", creative: "#f59e0b", video: "#06b6d4",
  social: "#f43f5e", analytics: "#84cc16", editor: "#6366f1",
  brand: "#14b8a6", seo: "#a855f7", campaign: "#eab308",
  developer: "#64748b", sales: "#f97316", growth: "#22c55e",
  default: "#71717a",
};
function roleColor(role: string) {
  const r = role.toLowerCase();
  for (const [key, color] of Object.entries(ROLE_COLORS)) if (r.includes(key)) return color;
  return ROLE_COLORS.default;
}

export function Conversation({
  chat,
  persona,
  emptyTitle,
  emptyHint,
  placeholder,
  onShortcut,
  agentIdentity,
}: {
  chat: ChatApi;
  persona: string;
  emptyTitle: string;
  emptyHint: string;
  placeholder: string;
  onShortcut?: (to: string) => void;
  agentIdentity?: { key: string; name: string; role: string; accent: string; icon: string } | null;
}) {
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<{ content: string; agent?: string } | null>(null);
  const [handoff, setHandoff] = useState<{ from: string; to: string } | null>(null);
  const [toolEvents, setToolEvents] = useState<{ type: string; tool: string; agent?: string; input?: string; output?: string; status: "started" | "completed" | "failed"; timestamp: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.stages, chat.busy, chat.runningTask, streamingMsg, handoff, toolEvents]);

  // Subscribe to tool events from SSE
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setToolEvents((prev) => [...prev.slice(-49), e.detail]);
    };
    window.addEventListener("treetiti:tool-event", handler as EventListener);
    return () => window.removeEventListener("treetiti:tool-event", handler as EventListener);
  }, []);

  const isEmpty = chat.messages.length === 0 && !streamingMsg;

  const onDelete = () => {
    if (!chat.sessionId) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    setConfirmDel(false);
    void chat.deleteSession(chat.sessionId);
  };

  if (chat.showOnboarding) return <OnboardingConversation chat={chat} />;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-center gap-3 border-b border-border bg-bg-primary/80 px-4 py-2.5 backdrop-blur-sm">
        {/* agent identity */}
        {agentIdentity ? (
          <div className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border"
              style={{ borderColor: `${agentIdentity.accent}66`, background: `${agentIdentity.accent}1a` }}
            >
              <IconGlyph icon={agentIdentity.icon} accent={agentIdentity.accent} size={15} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-wide text-text-primary">{agentIdentity.name}</span>
              <span className="text-[10px] text-text-muted">{agentIdentity.role}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent/10 text-[13px] text-accent">
              ◈
            </div>
            <span className="text-xs font-medium tracking-wide text-text-secondary">{persona}</span>
          </>
        )}
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2 py-0.5 text-[10px] text-text-muted sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Ready
        </span>
        {chat.sessionId && (
          <button onClick={onDelete} title={confirmDel ? "Confirm delete chat" : "Delete this chat"}
            className={`ml-auto rounded-lg px-2 py-1 text-xs ${confirmDel ? "bg-error text-text-primary font-semibold" : "text-text-muted hover:text-error hover:bg-error/10"}`}>
            {confirmDel ? "Confirm?" : "✕"}
          </button>
        )}
      </header>

      <div className="t-main-glow flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {isEmpty && (
            <div className="t-home">
              <div className="relative">
                <div
                  className="pointer-events-none absolute -inset-10 opacity-70"
                  style={{ background: "radial-gradient(circle, rgba(122,162,247,0.12) 0%, transparent 70%)" }}
                />
                <div className="t-home-logo">TREE<span className="accent">titi</span></div>
              </div>
              <div className="mt-3 max-w-md text-center text-[14px] leading-relaxed text-text-muted" style={{ letterSpacing: "0.01em" }}>
                {emptyHint}
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                {["Generate a campaign brief", "Research my competitors", "Create an image", "Summarize this project"].map((s) => (
                  <button key={s} onClick={() => chat.sendStream(s, false)}
                    className="rounded-full border border-border bg-bg-tertiary px-4 py-2 text-[12.5px] font-medium text-text-secondary transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-bg-elevated hover:text-text-primary hover:shadow-[0_4px_16px_rgba(122,162,247,0.12)]">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isEmpty && (
            <div className="space-y-5">
              <MediaGallery items={chat.sessionMedia} />

              {chat.teammates.length > 0 && (
                <div className="space-y-3">
                  {/* Team Assembled header */}
                  {chat.runningTask && (
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                        Team assembled
                      </span>
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] text-text-muted">
                        {chat.teammates.length} agent{chat.teammates.length > 1 ? "s" : ""} routed
                      </span>
                    </div>
                  )}
                  {chat.teammates.map((t: Teammate, i: number) => (
                    <AgentCard
                      key={t.id}
                      teammate={{
                        id: t.id,
                        name: t.name,
                        role: t.role,
                        avatar: t.avatar,
                        description: t.description,
                      }}
                      currentTask={chat.runningTask ? chat.stages[chat.runningTask][i] : undefined}
                      onClick={() => navigate(`/teammate/${t.id}`)}
                    />
                  ))}
                </div>
              )}

              {chat.approvals.map((a) => (
                <ApprovalCard key={a.id} a={a} onDecide={chat.decide} />
              ))}

              {handoff && (
                <HandoffIndicator fromAgent={handoff.from} toAgent={handoff.to} teammates={chat.teammates} />
              )}

              {chat.messages.map((m) => (
                <Message
                  key={m.id}
                  msg={m}
                  onConfirm={chat.confirmOs}
                  onCancel={chat.cancelOs}
                  onDecide={chat.answerDecision}
                />
              ))}

              {toolEvents.length > 0 && (
                <ToolEventsPanel events={toolEvents} />
              )}

              {streamingMsg && <StreamingMessage content={streamingMsg.content} agent={streamingMsg.agent} />}

              {chat.runningTask && (
                <TaskProgressCard
                  task={{
                    id: chat.runningTask,
                    kind: "agent",
                    label: "Team Task",
                    status: "running",
                    created_at: new Date().toISOString(),
                    started_at: new Date().toISOString(),
                    finished_at: null,
                    error: "",
                    result: {},
                    payload: {},
                    events: [],
                  }}
                  chat={chat}
                  teammates={chat.teammates}
                />
              )}

              {chat.busy && !chat.runningTask && !streamingMsg && (
                <div className="t-msg t-msg-assistant">
                  <div className="t-msg-avatar" aria-hidden>▲</div>
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}

              {chat.error && (
                <div className="rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
                  {chat.error}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-bg-primary/80 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-3xl">
          {isEmpty && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
              {HOME_SHORTCUTS.map((s) => (
                <button key={s.to} className="group flex items-center gap-2 rounded-full border border-border bg-bg-tertiary px-3.5 py-1.5 text-[12px] font-medium text-text-secondary transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent"
                  onClick={() => onShortcut?.(s.to)}>
                  <span className="text-[12px] group-hover:scale-110 transition-transform">{s.icon}</span> {s.label}
                </button>
              ))}
            </div>
          )}
          <Composer
            onSend={(t, confirm, mentions) => {
              if (t.trim().startsWith("/")) {
                chat.send(t, confirm, mentions);
              } else {
                chat.sendStream(t, confirm, mentions);
              }
            }}
            busy={chat.busy || !!streamingMsg}
            placeholder={placeholder}
            autoFocus={isEmpty}
            teammates={chat.teammates}
            teams={chat.teams}
            clients={chat.clients}
            projects={chat.projects}
          />
        </div>
      </div>
    </div>
  );
}