import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useOffice } from "./OfficeStore";
import { Spinner } from "../components/ui";
import { usePermissions } from "../auth";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  company?: boolean;
  taskId?: string;
  error?: boolean;
  confirm?: boolean;
};

export function ChatDock() {
  const { registerMission } = useOffice();
  const { can } = usePermissions();
  const canRun = can("agents.run");
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, busy]);

  const send = async (text: string, confirm = false) => {
    if (!text.trim() || busy) return;
    setConfirmCmd(null);
    setBusy(true);
    setMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const res = await api.chat(text, sessionId, "", confirm);
      setSessionId(res.session_id);
      const company = !!res.company && !!res.task_id;
      if (company && res.task_id) registerMission(res.task_id, text);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply,
          company,
          taskId: res.task_id ?? undefined,
          confirm: res.confirmation_required,
        },
      ]);
      if (res.confirmation_required) setConfirmCmd(text);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: (err as Error).message, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    setInput("");
    void send(text);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none"
      style={{ paddingBottom: 14 }}
    >
      <div className="pointer-events-auto w-[min(720px,92vw)] rounded-2xl border border-border/90 bg-primary/85 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/70">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm font-semibold text-text-primary flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-accent" />
            Central Console
            <span className="text-text-muted font-normal text-xs hidden sm:inline">
              — one message runs the whole company
            </span>
          </button>
          <button
            onClick={() => setMessages([])}
            className="text-[11px] text-text-muted hover:text-text-secondary transition"
          >
            clear
          </button>
        </div>

        {open && (
          <>
            <div ref={bodyRef} className="max-h-[240px] overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-xs text-text-muted">
                  Ask for a campaign, research, a strategy, creative assets — the office will
                  come alive with the real agents working.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-accent text-bg-primary"
                        : m.error
                          ? "bg-error/10 border border-error/40 text-error"
                          : "bg-secondary/90 text-text-primary"
                    }`}
                  >
                    {m.role === "assistant" && m.company && !m.error && (
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-accent">
                        Mission started — team assembling
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 bg-secondary/90">
                    <Spinner label="CEO is planning…" />
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={submit} className="border-t border-border/70 p-3 flex flex-col gap-2">
              {!canRun ? (
                <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-[11px] text-text-muted">
                  You're in read-only mode — viewer accounts can watch the office
                  but not command the company. Ask an admin to upgrade your role.
                </div>
              ) : (
              <>
              {confirmCmd && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                  <span className="flex-1 text-xs text-warning">This action is destructive. Confirm?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmCmd(null);
                      void send(confirmCmd, true);
                    }}
                    className="rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-bg-primary"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCmd(null)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message your company… (e.g. “Build a full Instagram launch campaign for our new luxury listing”)"
                  className="flex-1 rounded-xl border border-border bg-secondary/70 px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg-primary hover:bg-accent-hover transition disabled:opacity-40"
                >
                  Send
                </button>
              </div>
              </>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}