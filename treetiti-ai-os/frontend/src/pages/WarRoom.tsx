import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, streamRoomEvents, TalkMessage, TalkRoom, TalkThinkingStage } from "../api";
import { Btn } from "../components/ui";

const STAGE_EMOJI: Record<string, string> = {
  starting: "🎙️",
  planning: "🧠",
  drafting: "✍️",
  critiquing: "🔪",
  refining: "🔧",
  verifying: "🔍",
  finalizing: "🏁",
};

const THINKING_LABEL: Record<string, string> = {
  starting: "taking the floor",
  planning: "planning the highest-value angles",
  drafting: "drafting a first take",
  critiquing: "ruthlessly critiquing the draft",
  refining: "refining against the critique",
  verifying: "checking against the original ask",
  finalizing: "closing remaining gaps",
};

const AGENT_AVATARS: Record<string, string> = {
  ceo: "👑",
  strategist: "💡",
  content: "✍️",
  analytics: "📊",
  brand: "🎨",
  campaign: "🚀",
  seo: "🔍",
  sales: "📈",
  editor: "📝",
  creative_director: "🎬",
  market_research: "🗺️",
  social_manager: "📱",
  growth_optimizer: "⚡",
  video: "🎥",
  image: "🖼️",
};

const avatarFor = (key: string) =>
  AGENT_AVATARS[key] ?? key.slice(0, 2).toUpperCase();

type LiveThinking = {
  agentKey: string;
  agentName: string;
  stage: string;
  note: string;
  model: string;
  round: number;
};

export default function WarRoom() {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const roomId = id ?? "";

  const [rooms, setRooms] = useState<TalkRoom[]>([]);
  const [room, setRoom] = useState<TalkRoom | null>(null);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [thinking, setThinking] = useState<LiveThinking | null>(null);
  const [liveTrail, setLiveTrail] = useState<Record<string, TalkThinkingStage[]>>({});
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [addressedTo, setAddressedTo] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(() => {
    api.talkRooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Load room + transcript whenever the route changes.
  useEffect(() => {
    if (!roomId) return;
    api
      .talkRoomMessages(roomId)
      .then(({ room: r, messages: ms }) => {
        setRoom(r);
        setMessages(ms);
      })
      .catch((e) => setError(String((e as Error)?.message ?? e)));
  }, [roomId]);

  // Live SSE stream for this room: thinking stages + replies arrive here.
  useEffect(() => {
    if (!roomId) return;
    const unsub = streamRoomEvents(
      roomId,
      (ev) => {
        const p = ev.payload;
        switch (ev.type) {
          case "talk.round.started":
            setRoom((prev) => (prev ? { ...prev, status: "round_running" } : prev));
            break;
          case "talk.round.finished":
            setRoom((prev) => (prev ? { ...prev, status: "idle" } : prev));
            setThinking(null);
            break;
          case "talk.thinking": {
            const live: LiveThinking = {
              agentKey: p.agent_key ?? "",
              agentName: p.agent_name ?? p.agent_key ?? "Agent",
              stage: p.stage ?? "",
              note: p.note ?? "",
              model: p.model ?? "",
              round: p.round_number ?? 0,
            };
            setThinking(live);
            setLiveTrail((prev) => {
              if (live.stage === "starting") return { ...prev, [live.agentKey]: [] };
              const trail = prev[live.agentKey] ?? [];
              return {
                ...prev,
                [live.agentKey]: [...trail, { stage: live.stage, note: live.note }],
              };
            });
            break;
          }
          case "talk.reply": {
            const msg = p.message as TalkMessage | undefined;
            if (msg) {
              setMessages((prev) =>
                prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
              );
              setThinking((prev) =>
                prev && prev.agentKey === msg.speaker_key ? null : prev,
              );
            }
            break;
          }
          case "talk.error":
            setError(p.note ?? "A speaker hit a snag.");
            break;
        }
      },
      { onOpen: () => setConnected(true), onError: () => setConnected(false) },
    );
    return () => {
      unsub();
      setConnected(false);
      setThinking(null);
      setLiveTrail({});
    };
  }, [roomId]);

  // Autoscroll the transcript.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking?.stage]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || !roomId) return;
    setInput("");
    setError(null);
    try {
      const { message } = await api.talkSend(roomId, content, addressedTo);
      setMessages((prev) =>
        prev.some((m) => m.id === message.id) ? prev : [...prev, message],
      );
      setAddressedTo("");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  };

  const kickRound = async () => {
    if (!roomId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.talkKickRound(roomId);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setTimeout(() => setBusy(false), 1200);
    }
  };

  const deleteRoom = async () => {
    if (!roomId || !window.confirm(`Delete "${room?.name}"? The transcript goes too.`)) return;
    try {
      await api.talkRoomDelete(roomId);
      navigate("/warroom");
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    }
  };

  return (
    <WarRoomInner
      rooms={rooms}
      room={room}
      messages={messages}
      thinking={thinking}
      liveTrail={liveTrail}
      connected={connected}
      busy={busy}
      error={error}
      input={input}
      onInput={setInput}
      addressedTo={addressedTo}
      onAddressedTo={setAddressedTo}
      showCreate={showCreate}
      onShowCreate={setShowCreate}
      onSend={sendMessage}
      onKick={kickRound}
      onDelete={deleteRoom}
      onSelectRoom={(rid) => navigate(`/warroom/${rid}`)}
      reloadRooms={loadRooms}
    />
  );
}

function WarRoomInner(props: {
  rooms: TalkRoom[];
  room: TalkRoom | null;
  messages: TalkMessage[];
  thinking: LiveThinking | null;
  liveTrail: Record<string, TalkThinkingStage[]>;
  connected: boolean;
  busy: boolean;
  error: string | null;
  input: string;
  onInput: (v: string) => void;
  addressedTo: string;
  onAddressedTo: (v: string) => void;
  showCreate: boolean;
  onShowCreate: (v: boolean) => void;
  onSend: () => void;
  onKick: () => void;
  onDelete: () => void;
  onSelectRoom: (id: string) => void;
  reloadRooms: () => void;
}) {
  const {
    rooms, room, messages, thinking, liveTrail, connected, busy, error,
    input, onInput, addressedTo, onAddressedTo, showCreate, onShowCreate,
    onSend, onKick, onDelete, onSelectRoom, reloadRooms,
  } = props;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-primary">
      {/* ── Rail: your war rooms ─────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-white/[0.06] bg-bg-secondary">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">
            War Room
          </div>
          <button
            className="t-btn t-btn-primary px-2 py-1 text-xs"
            onClick={() => onShowCreate(true)}
            title="New War Room"
          >
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {rooms.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-text-muted">
              No war rooms yet.
              <br />
              Create one and let the team argue.
            </div>
          )}
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRoom(r.id)}
              className={[
                "mb-1 w-full rounded-xl border px-3 py-2 text-left transition",
                room?.id === r.id
                  ? "border-accent/40 bg-accent/5"
                  : "border-transparent hover:bg-secondary/[0.06]",
              ].join(" ")}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={[
                    "inline-block h-2 w-2 rounded-full",
                    r.status === "round_running"
                      ? "bg-success"
                      : r.thinking === "super"
                        ? "bg-violet-400"
                        : "bg-gray-300",
                  ].join(" ")}
                />
                <span className="truncate text-sm font-medium text-text-primary">
                  {r.name}
                </span>
              </div>
              <div className="mt-0.5 truncate pl-3.5 text-xs text-text-muted">
                {r.speakers?.map((s) => s.name).join(" · ")}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main stage ───────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!room ? (
          <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
            Select a war room, or start a new one with <b className="mx-1">+ New</b>.
          </div>
        ) : (
          <>
            <RoomHeader
              room={room}
              connected={connected}
              busy={busy}
              onKick={onKick}
              onDelete={onDelete}
            />

            <Transcript
              messages={messages}
              thinking={thinking}
              liveTrail={liveTrail}
            />

            {error && (
              <div className="border-t border-error/30 bg-error/10 px-5 py-2 text-xs text-error">
                {error}
              </div>
            )}

            <Composer
              room={room}
              input={input}
              onInput={onInput}
              addressedTo={addressedTo}
              onAddressedTo={onAddressedTo}
              onSend={onSend}
            />
          </>
        )}
      </main>

      {showCreate && <CreateRoomModal onClose={() => onShowCreate(false)} onCreated={reloadRooms} />}
    </div>
  );
}

function RoomHeader({
  room, connected, busy, onKick, onDelete,
}: {
  room: TalkRoom;
  connected: boolean;
  busy: boolean;
  onKick: () => void;
  onDelete: () => void;
}) {
  const running = room.status === "round_running";
  return (
    <div className="border-b border-white/[0.06] bg-bg-secondary px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-semibold text-text-primary">
              {room.name}
            </h1>
            <span className={running ? "t-pill t-pill-blue" : "t-pill"}>
              {running ? "● round running" : "idle"}
            </span>
            <span
              className={connected ? "text-xs text-success" : "text-xs text-text-secondary"}
              title={connected ? "Live" : "Offline"}
            >
              {connected ? "● live" : "○ link"}
            </span>
          </div>
          {room.topic && (
            <p className="mt-0.5 truncate text-xs text-text-muted">{room.topic}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {room.speakers.map((s) => (
              <span
                key={s.key}
                className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[11px] text-text-muted"
              >
                {avatarFor(s.key)} {s.name}
              </span>
            ))}
            <span className="ml-1 text-[11px] text-text-muted">
              mode: {room.mode} · thinking: {room.thinking}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Btn variant="primary" disabled={busy || running} onClick={onKick}>
            {busy || running ? "⌛ Opening floor…" : "⚡ Kick a new round"}
          </Btn>
          <Btn variant="danger" disabled={running} onClick={onDelete}>
            🗑
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Transcript(props: {
  messages: TalkMessage[];
  thinking: LiveThinking | null;
  liveTrail: Record<string, TalkThinkingStage[]>;
}) {
  const { messages, thinking, liveTrail } = props;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, thinking?.stage]);

  if (messages.length === 0 && !thinking) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="text-3xl">🎯</div>
        <div className="mt-2 text-sm font-medium text-text-primary">The floor is open</div>
        <div className="mt-1 max-w-sm text-xs text-text-muted">
          Jump in with a question or goal — the team will react with their thinking
          laid bare. Or hit <b>Kick a new round</b> to let them talk first.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((m) =>
          m.role === "agent" ? (
            <AgentBubble key={m.id} msg={m} />
          ) : (
            <UserBubble key={m.id} msg={m} />
          ),
        )}
        {thinking && (
          <ThinkingBanner
            thinking={thinking}
            trail={liveTrail[thinking.agentKey] ?? []}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
function UserBubble({ msg }: { msg: TalkMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl bg-accent px-4 py-2.5 text-sm text-text-primary">
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className="mt-1 text-right text-[10px] text-text-secondary/70">
          you ·{" "}
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {msg.addressed_to ? ` → ${msg.addressed_to}` : ""}
        </div>
      </div>
    </div>
  );
}

function AgentBubble({ msg }: { msg: TalkMessage }) {
  const [open, setOpen] = useState(false);
  const stages = msg.thinking_stages ?? [];
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-sm text-text-primary">
        {avatarFor(msg.speaker_key)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {msg.speaker_name || msg.speaker_key}
          </span>
          <span className="text-[10px] text-text-muted">
            r{msg.round_number || 0} · {msg.model}
          </span>
        </div>

        {stages.length > 0 && (
          <div className="mt-1">
            <button
              onClick={() => setOpen(!open)}
              className="rounded-lg border border-violet/30 bg-violet/10 px-2 py-1 text-[11px] text-violet hover:bg-violet/20"
            >
              {open ? "▾ hide" : "▸ show"} the thinking ({stages.length} stages)
            </button>
            {open && (
              <div className="mt-2 space-y-1.5 rounded-xl border border-violet-100 bg-violet/10/50 p-3">
                {stages.map((s, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium text-violet">
                      {STAGE_EMOJI[s.stage] ?? "💭"} {s.stage}
                    </span>
                    <p className="mt-0.5 whitespace-pre-wrap text-text-muted">
                      {s.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-1.5 rounded-2xl rounded-tl-sm border border-white/[0.06] bg-bg-secondary px-4 py-2.5 text-sm text-text-primary shadow-sm">
          <div className="whitespace-pre-wrap">{msg.content}</div>
        </div>
      </div>
    </div>
  );
}

function ThinkingBanner({
  thinking,
  trail,
}: {
  thinking: LiveThinking;
  trail: TalkThinkingStage[];
}) {
  const live = STAGE_EMOJI[thinking.stage] ?? "💭";
  return (
    <div className="rounded-2xl border border-emerald-200 bg-success/10/60 p-3">
      <div className="flex items-center gap-2 text-sm text-success">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-success border-t-transparent" />
        <span className="font-medium">{thinking.agentName}</span>
        <span className="text-success">
          {live} now {THINKING_LABEL[thinking.stage] ?? "thinking"}
        </span>
        {thinking.model && (
          <span className="ml-auto text-[10px] text-success">
            {thinking.model}
          </span>
        )}
      </div>
      {trail.length > 0 && (
        <div className="mt-2 space-y-1">
          {trail.map((t, i) => (
            <div key={i} className="text-xs text-success/90">
              <span className="font-medium">
                {STAGE_EMOJI[t.stage] ?? "💭"} {t.stage}
              </span>
              <span className="text-success/80"> — {t.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function Composer(props: {
  room: TalkRoom;
  input: string;
  onInput: (v: string) => void;
  addressedTo: string;
  onAddressedTo: (v: string) => void;
  onSend: () => void;
}) {
  const { room, input, onInput, addressedTo, onAddressedTo, onSend } = props;
  return (
    <div className="border-t border-white/[0.06] bg-bg-secondary px-5 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <textarea
              value={input}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              rows={2}
              placeholder={`Talk to ${room.speakers.length} agents… (Enter to send)`}
              className="w-full resize-none rounded-xl border border-white/[0.1] bg-primary px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <select
              value={addressedTo}
              onChange={(e) => onAddressedTo(e.target.value)}
              className="rounded-lg border border-white/[0.1] bg-bg-secondary px-2 py-1 text-xs text-text-muted outline-none"
            >
              <option value="">To: everyone</option>
              {room.speakers.map((s) => (
                <option key={s.key} value={s.name}>
                  To: {s.name}
                </option>
              ))}
            </select>
            <Btn variant="primary" onClick={onSend} disabled={!input.trim()}>
              Send
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
function CreateRoomModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("War Room");
  const [topic, setTopic] = useState("");
  const [thinking, setThinking] = useState<"plain" | "deep" | "super">("super");
  const [picked, setPicked] = useState<string[]>([
    "ceo",
    "strategist",
    "content",
    "analytics",
  ]);
  const [registry, setRegistry] = useState<
    Record<string, { name: string; role: string }>
  >({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.teammateRegistryAgents().then(setRegistry).catch(() => setRegistry({}));
  }, []);

  const toggle = (key: string) =>
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.talkRoomCreate({
        name,
        topic,
        speaker_keys: picked,
        mode: "groq",
        thinking,
      });
      onCreated();
      onClose();
    } catch (e) {
      setErr(String((e as Error)?.message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const allKeys = Object.keys(registry).length > 0 ? Object.keys(registry) : picked;
  const agentName = (key: string) => registry[key]?.name ?? key;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-bg-secondary p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-semibold text-text-primary">New War Room</div>
        <p className="mt-0.5 text-xs text-text-muted">
          The agents you pick will talk to each other, in order, with their
          thinking live on screen.
        </p>

        <label className="mt-4 block text-xs font-medium text-text-muted">
          Room name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/[0.1] px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="mt-3 block text-xs font-medium text-text-muted">
          Topic / directive
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="e.g. Plan a Q3 launch campaign for Luma Skincare — budget $40k, focus on TikTok-first audiences."
          className="mt-1 w-full resize-none rounded-xl border border-white/[0.1] px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <label className="mt-3 block text-xs font-medium text-text-muted">
          Thinking depth
        </label>
        <div className="mt-1 flex gap-2">
          {(["plain", "deep", "super"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setThinking(t)}
              className={[
                "flex-1 rounded-xl border px-2 py-1.5 text-xs",
                thinking === t
                  ? "border-violet/50 bg-violet/10 text-violet"
                  : "border-white/[0.1] text-text-muted hover:bg-secondary/[0.06]",
              ].join(" ")}
            >
              {t === "super" ? "🧠 super" : t === "deep" ? "🔍 deep" : "⚡ plain"}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-medium text-text-muted">
          Speakers ({picked.length})
        </label>
        <div className="mt-1 grid max-h-40 grid-cols-2 gap-1 overflow-y-auto">
          {allKeys.map((key) => (
            <label
              key={key}
              className={[
                "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs",
                picked.includes(key)
                  ? "border-accent/50 bg-accent/5 text-text-primary"
                  : "border-white/[0.06] text-text-muted hover:bg-secondary/[0.06]",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={picked.includes(key)}
                onChange={() => toggle(key)}
                className="accent-accent"
              />
              <span className="truncate">{avatarFor(key)} {agentName(key)}</span>
            </label>
          ))}
        </div>

        {err && <div className="mt-3 text-xs text-error">{err}</div>}

        <div className="mt-4 flex justify-end gap-2">
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            disabled={busy || !name.trim() || picked.length === 0}
            onClick={create}
          >
            {busy ? "Creating…" : "Open the War Room"}
          </Btn>
        </div>
      </div>
    </div>
  );
}