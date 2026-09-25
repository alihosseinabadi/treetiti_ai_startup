import React, { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Spinner } from "../components/ui";

type Msg = {
  role: "user" | "assistant";
  content: string;
  battle?: boolean;
  turn_index?: number;
  winner_model?: string | null;
  judge?: string | null;
  answers?: { model: string; answer: string }[];
  failover?: boolean;
  skipped_model?: string | null;
};

type BoardRow = { model: string; wins: number; losses: number; battles: number; win_rate: number };
type Health = Record<string, { consecutive_failures: number; unhealthy: boolean }>;

const shortModel = (m: string) => m.replace("opencode/", "").replace("zai/", "").replace("ollama/", "");

export default function Chat() {
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [health, setHealth] = useState<Health>({});
  const [votes, setVotes] = useState<Record<string, "A" | "B">>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = () =>
    api.sessions().then(setSessions).catch(() => {});

  const loadBoard = () =>
    api.leaderboard().then(setBoard).catch(() => {});

  const loadHealth = () =>
    api.chatHealth().then((h) => setHealth(h.models)).catch(() => {});

  useEffect(() => {
    loadSessions();
    loadBoard();
    loadHealth();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await api.chat(text, sessionId);
      setSessionId(res.session_id);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply,
          battle: res.battle,
          turn_index: res.turn_index,
          winner_model: res.winner_model,
          judge: res.judge,
          answers: res.answers,
          failover: res.failover,
          skipped_model: res.skipped_model,
        },
      ]);
      loadSessions();
      loadHealth();
    } catch (err) {
      setError((err as Error).message);
      setMessages((m) => m.filter((x) => x !== userMsg));
    } finally {
      setBusy(false);
    }
  };

  const vote = async (turn: number, winner: "A" | "B") => {
    if (!sessionId || votes[`${sessionId}:${turn}`]) return;
    setVotes((v) => ({ ...v, [`${sessionId}:${turn}`]: winner }));
    try {
      await api.vote(sessionId, turn, winner);
      loadBoard();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const newChat = () => {
    setSessionId(undefined);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">AI Chat</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Arena battle mode — two free models answer, you pick the winner.
          </p>
        </div>
        <button
          onClick={newChat}
          className="rounded-lg border border-emerald-700 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 transition"
        >
          New chat
        </button>
      </div>

      <div className="flex gap-6 h-[62vh]">
        <aside className="w-56 shrink-0 overflow-auto border border-zinc-800/60 rounded-xl p-2">
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-500">
            Sessions
          </div>
          {sessions.length === 0 && (
            <div className="px-2 py-1 text-xs text-zinc-600">No sessions yet.</div>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSessionId(s.id);
                setMessages([]);
                setError(null);
              }}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition ${
                sessionId === s.id ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {s.title}
            </button>
          ))}

          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-500 flex items-center justify-between">
              <span>🩺 Arena health</span>
              <button onClick={loadHealth} className="text-[10px] text-emerald-400 hover:underline">
                refresh
              </button>
            </div>
            {Object.keys(health).length === 0 && (
              <div className="px-2 py-1 text-xs text-zinc-600">Checking…</div>
            )}
            {Object.entries(health).map(([model, h]) => (
              <div
                key={model}
                className="flex items-center justify-between rounded-lg px-2 py-1 text-xs"
              >
                <span className="text-zinc-400">{shortModel(model)}</span>
                <span
                  className={`shrink-0 ${
                    h.unhealthy ? "text-red-400" : h.consecutive_failures > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {h.unhealthy ? "● off" : h.consecutive_failures > 0 ? `● ${h.consecutive_failures} fail` : "● ok"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-zinc-800/60 pt-3">
            <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-500 flex items-center justify-between">
              <span>🏆 Leaderboard</span>
              {board.length > 0 && (
                <button onClick={loadBoard} className="text-[10px] text-emerald-400 hover:underline">
                  refresh
                </button>
              )}
            </div>
            {board.length === 0 && (
              <div className="px-2 py-1 text-xs text-zinc-600">
                No votes yet — battle a question and pick a winner.
              </div>
            )}
            {board.map((r) => (
              <div
                key={r.model}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-zinc-500">{shortModel(r.model)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={r.win_rate >= 0.5 ? "text-emerald-400" : "text-zinc-500"}>
                    {Math.round(r.win_rate * 100)}%
                  </span>
                  <span className="text-zinc-600">
                    {r.wins}W/{r.losses}L
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col rounded-xl border border-zinc-800/60 overflow-hidden">
          <div className="flex-1 overflow-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="h-full grid place-items-center text-sm text-zinc-600">
                Ask anything about Treetiti — services, brand voice, positioning…
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-emerald-500 text-zinc-950"
                      : "bg-zinc-800/80 text-zinc-200"
                  }`}
                >
                  {m.role === "assistant" && m.battle && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                        ⚔️ ARENA BATTLE
                      </span>
                      {m.failover ? (
                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-300 border border-red-500/30">
                          Auto-switched: {shortModel(m.skipped_model || "")} was unhealthy
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">
                          Two models answered — pick the winner.
                        </span>
                      )}
                    </div>
                  )}
                  {m.battle && m.answers && m.answers.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-3 min-w-[420px]">
                      {m.answers.map((a, j) => {
                        const label = j === 0 ? "A" : "B";
                        const voted = m.turn_index !== undefined && votes[`${sessionId}:${m.turn_index}`];
                        const isWinner = m.winner_model === a.model;
                        const revealed = !!voted;
                        return (
                          <div
                            key={j}
                            className={`rounded-xl border p-3 ${
                              revealed && isWinner
                                ? "border-emerald-500/60 bg-emerald-500/5"
                                : "border-zinc-700/60 bg-zinc-900/40"
                            }`}
                          >
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                                {revealed ? shortModel(a.model) : `Model ${label}`}
                              </span>
                              <div className="flex items-center gap-1">
                                {revealed && isWinner && (
                                  <span className="text-[11px] text-emerald-400">✓ winner</span>
                                )}
                                <span className="text-[10px] text-zinc-600">#{label}</span>
                              </div>
                            </div>
                            <div className="whitespace-pre-wrap text-xs text-zinc-300 line-clamp-[8]">
                              {a.answer}
                            </div>
                            <div className="mt-2">
                              {!voted ? (
                                <button
                                  onClick={() => m.turn_index !== undefined && vote(m.turn_index, label as "A" | "B")}
                                  className="w-full rounded-lg border border-emerald-700 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition"
                                >
                                  Pick {label}
                                </button>
                              ) : (
                                <div className="text-[10px] text-zinc-500">
                                  {voted === label
                                    ? "You voted for this one"
                                    : "Not your pick"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {m.battle && m.judge && votes[`${sessionId}:${m.turn_index}`] && (
                    <div className="mb-2 text-[11px] italic text-zinc-500">
                      Judge: {m.judge}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-zinc-800/80">
                  <Spinner label="Brain is thinking…" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="border-t border-zinc-800/60 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your AI employee…"
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
