import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { api, Project, Teammate } from "../api";

export const getContext = (): string => {
  return localStorage.getItem("treetiti_context") ?? "";
};
export const setContext = (ctx: string) => {
  if (ctx) localStorage.setItem("treetiti_context", ctx);
  else localStorage.removeItem("treetiti_context");
};

const SUGGESTIONS = [
  {
    icon: "▣",
    label: "Create a marketing strategy",
    prompt: "Create a complete marketing strategy for my business",
  },
  {
    icon: "◎",
    label: "Analyze my competitors",
    prompt: "Research my top competitors and analyze their positioning",
  },
  {
    icon: "◈",
    label: "Build a social media campaign",
    prompt: "Build a 30-day social media campaign for my brand",
  },
  {
    icon: "✎",
    label: "Create content",
    prompt: "Create a set of ad copy and captions for my business",
  },
  {
    icon: "▤",
    label: "Analyze my data",
    prompt: "Analyze my business data and give me a clear report",
  },
];

const AGENTS: { key: string; name: string; icon: string }[] = [
  { key: "ceo", name: "CEO", icon: "◎" },
  { key: "campaign", name: "Strategy", icon: "▣" },
  { key: "content", name: "Content", icon: "✎" },
  { key: "market_research", name: "Research", icon: "🔎" },
  { key: "image", name: "Creative", icon: "✦" },
  { key: "analytics", name: "Data", icon: "▤" },
];

export default function Home() {
  const navigate = useNavigate();
  const chat = useChat(getContext(), navigate);
  const [input, setInput] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    api.projects().then(setProjects).catch(() => {});
  }, []);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    setInput("");
    await chat.sendStream(text);
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* ambient glow — deep premium */}
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(122,162,247,0.08) 0%, rgba(139,92,246,0.03) 45%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-70"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-5 pb-16 pt-14">
        {/* brand mark */}
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-violet font-display text-[14px] font-bold text-bg-primary shadow-[0_0_20px_rgba(122,162,247,0.4)]">
            T
          </span>
          <span className="font-display text-[15px] font-semibold tracking-[0.18em] uppercase text-text-muted">
            TREE<span className="text-accent">titi</span>
          </span>
        </div>

        <h1 className="text-center font-display text-3xl font-semibold leading-tight tracking-tight text-text-primary sm:text-[44px]">
          What can TREEtiti
          <br />
          <span className="bg-gradient-to-br from-accent via-cyan to-violet bg-clip-text text-transparent">do for you?</span>
        </h1>
        <p className="mt-4 max-w-md text-center text-[14px] leading-relaxed text-text-muted">
          Tell TREEtiti what you need. Its AI agents will plan, execute, and deliver — using tools, files, memory, and project context.
        </p>

        {/* command composer */}
        <div className="mt-8 w-full">
          <div className="t-composer-wrap p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend(input);
                }
              }}
              rows={3}
              placeholder="What do you want me to do?"
              className="w-full resize-none bg-transparent px-3 py-2 text-[16px] font-medium text-text-primary outline-none placeholder:text-text-muted"
              style={{ lineHeight: 1.5 }}
            />
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {AGENTS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => setInput((prev) => `${prev}@${a.key} `)}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] text-text-muted transition hover:bg-secondary/[0.05] hover:text-text-primary"
                    title={`Route to ${a.name}`}
                  >
                    <span className="text-[12px]">{a.icon}</span>
                    <span>{a.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => void handleSend(input)}
                disabled={!input.trim() || chat.busy}
                className="t-send-btn"
                title="Send"
              >
                ↑
              </button>
            </div>
          </div>
          <div className="mt-2 px-2 text-right text-[10px] text-text-muted">
            Enter to send · Shift+Enter for new line
          </div>
        </div>

        {/* suggestions */}
        <div className="mt-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => void handleSend(s.prompt)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-bg-secondary px-4 py-3 text-left text-[13px] text-text-secondary transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-bg-tertiary hover:text-text-primary hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
            >
              <span className="text-accent transition-transform group-hover:scale-110">{s.icon}</span>
              <span>{s.label}</span>
              <span className="ml-auto text-text-dim opacity-0 transition-opacity group-hover:opacity-100">→</span>
            </button>
          ))}
        </div>

        {/* recent projects */}
        {projects.length > 0 && (
          <div className="mt-10 w-full">
            <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-text-muted">Recent projects</div>
            <div className="flex flex-wrap gap-2">
              {projects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="t-chip"
                >
                  ◇ {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
