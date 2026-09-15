import React, { useEffect, useMemo, useRef, useState } from "react";

export type SlashCmd = { cmd: string; hint: string; icon?: string };

export const SLASH_COMMANDS: SlashCmd[] = [
  { cmd: "/new", hint: "New conversation", icon: "＋" },
  { cmd: "/agent", hint: "Talk to agent", icon: "◇" },
  { cmd: "/research", hint: "Deep research", icon: "◎" },
  { cmd: "/image", hint: "Generate image", icon: "🖼" },
  { cmd: "/video", hint: "Produce video", icon: "🎬" },
  { cmd: "/design", hint: "Creative brief", icon: "◐" },
  { cmd: "/schedule", hint: "Schedule task", icon: "◷" },
  { cmd: "/swarm", hint: "Open swarm", icon: "◉" },
  { cmd: "/status", hint: "System status", icon: "●" },
  { cmd: "/help", hint: "Show commands", icon: "?" },
];

export type Mentionable = {
  id: string;
  type: "teammate" | "team" | "client" | "project" | "file";
  name: string;
  avatar?: string;
  subtitle?: string;
};

interface ComposerProps {
  onSend: (text: string, confirm?: boolean, mentions?: Mentionable[]) => void;
  busy: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  model?: string;
  teammates?: { id: string; name: string; avatar: string; agent_key: string }[];
  teams?: { id: string; name: string; member_ids: string[] }[];
  clients?: { id: string; name: string }[];
  projects?: { id: string; name: string; client: string }[];
  files?: { id: string; name: string; kind: string; url: string }[];
}

export function Composer({
  onSend,
  busy,
  placeholder,
  autoFocus,
  model = "router/auto/best-coding",
  teammates = [],
  teams = [],
  clients = [],
  projects = [],
  files = [],
}: ComposerProps) {
  const [text, setText] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const [listening, setListening] = useState(false);
  const [activeType, setActiveType] = useState<"slash" | "mention">("slash");
  const paletteRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastAtIndex = useRef<number>(-1);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }, []);

  const slashResults = useMemo(() => {
    const q = query.replace(/^\//, "").toLowerCase();
    return SLASH_COMMANDS.filter((c) => {
      const cmd = c.cmd.replace("/", "").toLowerCase();
      return cmd.includes(q) || q.includes(cmd);
    });
  }, [query]);

  const mentionResults = useMemo(() => {
    const q = query.toLowerCase();
    const all: Mentionable[] = [
      ...teammates.map((t) => ({
        id: t.id,
        type: "teammate" as const,
        name: t.name,
        avatar: t.avatar,
        subtitle: t.agent_key,
      })),
      ...teams.map((t) => ({
        id: t.id,
        type: "team" as const,
        name: t.name,
        avatar: "👑",
        subtitle: `${t.member_ids.length} members`,
      })),
      ...clients.map((c) => ({
        id: c.id,
        type: "client" as const,
        name: c.name,
        avatar: "◆",
      })),
      ...projects.map((p) => ({
        id: p.id,
        type: "project" as const,
        name: p.name,
        avatar: p.name.slice(0, 1).toUpperCase(),
        subtitle: p.client,
      })),
      ...files.map((f) => ({
        id: f.id,
        type: "file" as const,
        name: f.name,
        avatar: f.kind === "video" ? "🎬" : "🖼",
        subtitle: f.kind,
      })),
    ];
    return all.filter((m) => m.name.toLowerCase().includes(q));
  }, [query, teammates, teams, clients, projects, files]);

  useEffect(() => {
    setSel(0);
  }, [query, activeType]);

  useEffect(() => {
    if ((slashOpen || mentionOpen) && paletteRef.current) {
      paletteRef.current.querySelector<HTMLElement>(".selected")?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [sel, slashOpen, mentionOpen]);

  useEffect(() => {
    if (autoFocus) taRef.current?.focus();
  }, [autoFocus]);

  const applySlash = (cmd: string) => {
    setText((t) => `${t.slice(0, -1)}${cmd} `);
    setSlashOpen(false);
    setQuery("");
    taRef.current?.focus();
  };

  const applyMention = (mention: Mentionable) => {
    const prefix = mention.type === "teammate" ? "@" : mention.type === "team" ? "#" : "@";
    setText((t) => `${t.slice(0, -1)}${prefix}${mention.name} `);
    setMentionOpen(false);
    setQuery("");
    taRef.current?.focus();
  };

  const submit = (confirm = false) => {
    const t = text.trim();
    if (!t || busy) return;
    const mentions: Mentionable[] = [];
    const mentionRegex = /[@#]([^\s@#]+)/g;
    let match;
    while ((match = mentionRegex.exec(t)) !== null) {
      const fullMatch = match[0];
      const name = match[1];
      const type = fullMatch.startsWith("#") ? "team" : "teammate";
      const allMentionables = [
        ...teammates,
        ...teams,
        ...clients,
        ...projects,
      ];
      const found = allMentionables.find(
        (m) => m.name.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        const f = found as any;
        mentions.push({
          id: f.id,
          type: type as any,
          name: f.name,
          avatar: f.avatar,
          subtitle: f.agent_key ?? f.client,
        });
      }
    }
    setText("");
    setSlashOpen(false);
    setMentionOpen(false);
    setQuery("");
    onSend(t, confirm, mentions.map((m) => ({ id: m.id, type: m.type, name: m.name })));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMenuOpen = slashOpen || mentionOpen;
    if (isMenuOpen) {
      const isSlash = activeType === "slash";
      const results = isSlash ? slashResults : mentionResults;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => (s + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => (s - 1 + results.length) % results.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const active = results[sel];
        if (active) {
          if (isSlash) applySlash((active as SlashCmd).cmd);
          else applyMention(active as Mentionable);
        }
        return;
      }
      if (e.key === "Escape") {
        setSlashOpen(false);
        setMentionOpen(false);
        setQuery("");
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const cursorPos = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf("@");
    const lastHash = beforeCursor.lastIndexOf("#");
    const lastMention = Math.max(lastAt, lastHash);
    if (lastMention >= 0 && !beforeCursor.slice(lastMention).includes(" ")) {
      lastAtIndex.current = lastMention + 1;
      setQuery(beforeCursor.slice(lastMention + 1));
      setMentionOpen(true);
      setSlashOpen(false);
      setActiveType("mention");
    } else if (value.startsWith("/") && cursorPos === value.length && !value.includes(" ")) {
      lastAtIndex.current = 0;
      setQuery(value);
      setSlashOpen(true);
      setMentionOpen(false);
      setActiveType("slash");
    } else {
      setSlashOpen(false);
      setMentionOpen(false);
      setQuery("");
    }
  };

  const resultsList = (slashOpen || mentionOpen) ? (activeType === "slash" ? slashResults : mentionResults) : [];

  return (
    <div className="relative">
      {resultsList.length > 0 && (
        <div className="t-palette absolute bottom-full z-20 mb-2 w-full" ref={paletteRef} role="listbox">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-text-muted">
            {activeType === "slash" ? "Commands" : "Mentions"}
          </div>
          {resultsList.map((c: any, i: number) => {
            const isMention = activeType === "mention";
            return (
              <button
                key={isMention ? c.id : c.cmd}
                role="option"
                aria-selected={i === sel}
                className={`t-palette-item ${i === sel ? "selected" : ""}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => isMention ? applyMention(c) : applySlash(c.cmd)}
              >
                <span className="t-ico">{isMention ? (c.avatar || "🤖") : c.icon}</span>
                <span className="t-pk">{isMention ? `@${c.name}` : c.cmd}</span>
                <span className="t-phint">
                  {isMention ? (c.subtitle || c.type) : c.hint}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="oc-composer">
        <textarea
          ref={taRef}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={placeholder ?? "Message"}
          aria-label="Message"
          className="oc-composer-input"
        />
        <div className="oc-composer-footer">
          <div className="flex items-center gap-2 text-[11px] text-text-muted">
            {speechSupported && (
              <button
                onClick={() => {
                  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SR) return;
                  if (listening) { setListening(false); return; }
                  const rec = new SR();
                  rec.lang = "en-US";
                  rec.interimResults = true;
                  rec.continuous = true;
                  rec.onresult = (e: any) => {
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                      const r = e.results[i];
                      if (r?.isFinal) setText((t) => t ? `${t} ${r.transcript}` : r.transcript);
                    }
                  };
                  rec.onend = () => setListening(false);
                  rec.onerror = () => setListening(false);
                  setListening(true);
                  rec.start();
                }}
                className={`rounded p-1 transition-colors ${listening ? "text-error" : "text-text-muted hover:text-text-primary"}`}
                title={listening ? "Stop listening" : "Voice input"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              </button>
            )}
            <span className="flex items-center gap-1">
              <kbd className="oc-kbd">/</kbd> commands
            </span>
            <span className="flex items-center gap-1">
              <kbd className="oc-kbd">@</kbd> agents
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-md border border-border bg-bg-tertiary px-2 py-1 text-[10.5px] font-medium text-text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {model.split("/").pop()}
            </span>
            <button
              onClick={() => submit()}
              disabled={busy || !text.trim()}
              className="oc-send"
              title="Send"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
