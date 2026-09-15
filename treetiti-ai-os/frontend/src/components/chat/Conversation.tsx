import { useEffect, useRef, useState } from "react";
import { ChatApi, ChatMsg } from "../../hooks/useChat";
import { Approval } from "../../api";
import { Message } from "./Message";
import { Composer } from "./Composer";
import { OnboardingConversation } from "./OnboardingConversation";

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
        i += 4;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [content]);

  return (
    <div className="oc-msg oc-msg-assistant">
      <div className="oc-msg-body">
        {displayedContent}
        {!isComplete && <span className="inline-block w-[2px] h-4 animate-pulse bg-accent ml-0.5 align-bottom" />}
      </div>
    </div>
  );
}

function ToolTimeline({ events }: { events: { tool: string; status: string; timestamp: string; agent?: string }[] }) {
  if (!events.length) return null;
  return (
    <div className="oc-steps">
      {events.map((e, i) => (
        <div key={`${e.tool}-${i}`} className="oc-step">
          <div className={`oc-step-dot ${e.status === "completed" ? "done" : e.status === "failed" ? "failed" : "working"}`} />
          {i < events.length - 1 && <div className={`oc-step-line ${e.status === "completed" ? "done" : ""}`} />}
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <span className="text-[11px] text-text-secondary truncate">
              {e.tool.replace(/_/g, " ")}
              {e.agent && <span className="text-text-muted"> · {e.agent}</span>}
            </span>
            <span className={`text-[10px] font-mono ${
              e.status === "completed" ? "text-success" : e.status === "failed" ? "text-error" : "text-accent"
            }`}>
              {e.status === "completed" ? "✓" : e.status === "failed" ? "✕" : "●"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineApproval({
  a,
  onDecide,
}: {
  a: Approval;
  onDecide: (a: Approval, d: "approve" | "reject") => void;
}) {
  return (
    <div className="oc-approval">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-warning font-medium">approval required</div>
          <div className="mt-0.5 text-[13px] font-medium text-text-primary">{a.title}</div>
          {a.summary && <div className="mt-0.5 text-[11px] text-text-muted">{a.summary}</div>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={() => onDecide(a, "approve")} className="oc-btn oc-btn-primary text-[11px]">approve</button>
          <button onClick={() => onDecide(a, "reject")} className="oc-btn text-[11px]">reject</button>
        </div>
      </div>
    </div>
  );
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<{ content: string; agent?: string } | null>(null);
  const [handoff, setHandoff] = useState<{ from: string; to: string } | null>(null);
  const [toolEvents, setToolEvents] = useState<{ tool: string; agent?: string; status: "started" | "completed" | "failed"; timestamp: string }[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages, chat.stages, chat.busy, chat.runningTask, streamingMsg, handoff, toolEvents]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setToolEvents((prev) => [...prev.slice(-29), e.detail]);
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

  const activeStages = chat.runningTask ? (chat.stages[chat.runningTask] ?? []) : [];
  const doneCount = activeStages.filter((s) => s.phase === "done").length;

  return (
    <div className="oc-chat">
      {/* ─── top bar ──────────────────────────────────── */}
      <header className="oc-header">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          {agentIdentity ? (
            <>
              <span
                className="h-5 w-5 shrink-0 rounded flex items-center justify-center text-[10px]"
                style={{ background: `${agentIdentity.accent}18`, color: agentIdentity.accent }}
              >
                {agentIdentity.name.charAt(0)}
              </span>
              <span className="truncate text-[12px] font-semibold text-text-primary">{agentIdentity.name}</span>
            </>
          ) : (
            <span className="truncate text-[12px] font-semibold text-text-primary">Session</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeStages.length > 0 && chat.runningTask && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-bg-tertiary px-2 py-0.5 text-[10px] text-text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {doneCount}/{activeStages.length} steps
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {chat.runningTask ? "running" : "ready"}
          </span>
          {chat.sessionId && (
            <button
              onClick={onDelete}
              className="rounded p-1 text-text-muted transition-colors hover:text-error"
              title={confirmDel ? "Confirm delete" : "Delete session"}
            >
              {confirmDel ? (
                <span className="text-[10px] font-medium text-error">confirm?</span>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              )}
            </button>
          )}
        </div>
      </header>

      {/* ─── messages ────────────────────────────────── */}
      <div className="oc-scroll">
        <div className="oc-msg-list">
          {isEmpty && (
            <div className="oc-home">
              <div className="oc-home-logo">TREE<span className="text-accent">titi</span></div>
              <div className="oc-home-sub">{emptyHint}</div>
              <div className="oc-home-hints">
                {["Generate a campaign brief", "Research competitors", "Create an image", "Summarize project"].map((s) => (
                  <button key={s} onClick={() => chat.sendStream(s, false)} className="oc-hint-chip">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isEmpty && (
            <>
              {chat.runningTask && activeStages.length > 0 && (
                <div className="oc-section">
                  <div className="oc-section-label">team working</div>
                  <div className="oc-steps">
                    {activeStages.map((s, i) => (
                      <div key={`${s.stage}-${s.agent}-${i}`} className="oc-step">
                        <div className={`oc-step-dot ${s.phase}`} />
                        {i < activeStages.length - 1 && <div className={`oc-step-line ${s.phase === "done" ? "done" : s.phase === "working" ? "working" : ""}`} />}
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-text-secondary truncate">{s.agent}</span>
                          <span className={`text-[10px] font-mono ${
                            s.phase === "done" ? "text-success" : s.phase === "failed" ? "text-error" : s.phase === "working" ? "text-accent" : "text-text-muted"
                          }`}>
                            {s.phase === "done" ? "✓" : s.phase === "failed" ? "✕" : s.phase === "working" ? "●" : "○"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {handoff && (
                <div className="oc-section">
                  <span className="text-[11px] text-text-muted">
                    ⤷ <span className="text-text-secondary">{handoff.from}</span>
                    <span className="mx-1 text-accent">→</span>
                    <span className="text-text-secondary">{handoff.to}</span>
                  </span>
                </div>
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
                <ToolTimeline events={toolEvents} />
              )}

              {streamingMsg && <StreamingMessage content={streamingMsg.content} agent={streamingMsg.agent} />}

              {chat.approvals.map((a) => (
                <InlineApproval key={a.id} a={a} onDecide={chat.decide} />
              ))}

              {chat.busy && !chat.runningTask && !streamingMsg && (
                <div className="oc-msg oc-msg-assistant">
                  <div className="flex items-center gap-2 text-[12px] text-text-muted">
                    <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    thinking
                  </div>
                </div>
              )}

              {chat.error && (
                <div className="oc-error">{chat.error}</div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ─── composer ────────────────────────────────── */}
      <div className="oc-composer-wrap">
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
          model={chat.runningTask ? "router/auto/best-reasoning" : "router/auto/best-coding"}
          teammates={chat.teammates}
          teams={chat.teams}
          clients={chat.clients}
          projects={chat.projects}
        />
      </div>
    </div>
  );
}
