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

    // Extract mentions from text
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
        const f = found as {
          id: string;
          name: string;
          avatar?: string;
          agent_key?: string;
          member_ids?: string[];
          client?: string;
        };
        mentions.push({
          id: f.id,
          type: type as "teammate" | "team" | "client" | "project",
          name: f.name,
          avatar: f.avatar,
          subtitle: f.agent_key ?? (f.member_ids ? `${f.member_ids.length} members` : f.client),
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
      const slashResultsTyped = slashResults as SlashCmd[];
      const mentionResultsTyped = mentionResults as Mentionable[];
      const results = isSlash ? slashResultsTyped : mentionResultsTyped;
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

    // Detect @ or # for mentions
    const cursorPos = e.target.selectionStart;
    const beforeCursor = value.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf("@");
    const lastHash = beforeCursor.lastIndexOf("#");
    const lastMention = Math.max(lastAt, lastHash);

    if (lastMention >= 0 && !beforeCursor.slice(lastMention).includes(" ")) {
      lastAtIndex.current = lastMention + 1;
      const mentionQuery = beforeCursor.slice(lastMention + 1);
      setQuery(mentionQuery);
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

  return (
    <div className="relative">
      {(slashOpen || mentionOpen) && (activeType === "slash" ? slashResults : mentionResults).length > 0 && (
        <div className="t-palette absolute bottom-full z-20 mb-2 w-full" ref={paletteRef} role="listbox">
          <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-text-muted">
            {activeType === "slash" ? "Commands" : "Mentions"}
          </div>
          {(activeType === "slash" ? slashResults : mentionResults).map((c, i) => {
            const isMention = activeType === "mention";
            return (
              <button
                key={isMention ? (c as Mentionable).id : (c as SlashCmd).cmd}
                role="option"
                aria-selected={i === sel}
                className={`t-palette-item ${i === sel ? "selected" : ""}`}
                onMouseEnter={() => setSel(i)}
                onClick={() => isMention ? applyMention(c as Mentionable) : applySlash((c as SlashCmd).cmd)}
              >
                <span className="t-ico">{isMention ? (c as Mentionable).avatar || "🤖" : (c as SlashCmd).icon}</span>
                <span className="t-pk">{isMention ? `@${(c as Mentionable).name}` : (c as SlashCmd).cmd}</span>
                <span className="t-phint">
                  {isMention ? (c as Mentionable).subtitle || (c as Mentionable).type : (c as SlashCmd).hint}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="t-composer t-composer-wrap">
        <div className="flex items-end gap-1 p-2.5">
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.onchange = (e) => {
                const filesList = Array.from(
                  (e.target as HTMLInputElement).files || []
                );
                const fileNames = filesList.map((f) => f.name).join(", ");
                setText((t) => `${t}[Files: ${fileNames}] `);
              };
              input.click();
            }}
            className="t-attach-btn"
            title="Attach files"
            aria-label="Attach files"
          >
            📎
          </button>
          <button
            onClick={() => setSlashOpen((v) => !v)}
            className="t-attach-btn"
            title="Commands"
            aria-label="Commands"
          >
            +
          </button>
          <textarea
            ref={taRef}
            value={text}
            onChange={onChange}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={
              placeholder ??
              "Ask TREEtiti anything… (type / for commands, @ for teammates)"
            }
            aria-label="Message"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-text-primary outline-none placeholder:text-text-muted"
            style={{ lineHeight: 1.5 }}
          />
          {speechSupported && (
            <button
              onClick={() => {
                const SR =
                  (window as any).SpeechRecognition ||
                  (window as any).webkitSpeechRecognition;
                if (!SR) return;
                if (listening) {
                  setListening(false);
                  return;
                }
                const rec = new SR();
                rec.lang = "en-US";
                rec.interimResults = true;
                rec.continuous = true;
                rec.onresult = (e: any) => {
                  let interim = "";
                  for (let i = e.resultIndex; i < e.results.length; i++) {
                    const r: any = e.results[i];
                    if (r && r.isFinal)
                      setText((t) => (t ? `${t} ${r.transcript}` : r.transcript));
                    else if (r && !r.isFinal) interim = r.transcript;
                  }
                  if (interim) setText((t) => t);
                };
                rec.onend = () => setListening(false);
                rec.onerror = () => setListening(false);
                setListening(true);
                (rec as any)._stop = () => rec.stop();
                (window as any).__treetiti_rec = rec;
                rec.start();
              }}
              className={`t-attach-btn ${listening ? "!bg-error/10 !text-error" : ""}`}
              title={listening ? "Stop listening" : "Voice input"}
              aria-label={listening ? "Stop listening" : "Voice input"}
            >
              🎙
            </button>
          )}
          <button
            onClick={() => submit()}
            disabled={busy || !text.trim()}
            className="t-send-btn"
            title="Send"
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
        <div className="t-composer-hint">
          <kbd className="t-kbd">/</kbd> commands ·
          <kbd className="t-kbd">@</kbd> teammates ·
          <kbd className="t-kbd">#</kbd> teams ·
          <kbd className="t-kbd">Enter</kbd> send · <kbd className="t-kbd">Shift↵</kbd> new line
        </div>
      </div>
    </div>
  );
}