import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { AppShell } from "../components/shell/AppShell";
import { Conversation } from "../components/chat/Conversation";
import { CommandPalette } from "../components/ui";
import { KeyboardShortcutsHelp } from "../components/ui";
import { AGENT_ACCENTS, AGENT_ICONS, AGENT_NAMES, AGENT_ROLES } from "../office/config";
import { AgentContextPanel } from "../components/shell/AgentContextPanel";

export function ChatWorkspace({
  context,
  rail,
}: {
  context: string;
  rail?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const chat = useChat(context, navigate);
  const [params] = useSearchParams();
  const isCustomer = context.startsWith("customer:");
  const customerName = isCustomer ? context.slice("customer:".length) : "";
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [agentRailOpen, setAgentRailOpen] = useState(true);

  // Honor ?s=<sessionId> (e.g. from a project page) once on mount, and
  // re-delegate when the ?agent= param changes (roster clicks while staying
  // on the same route).
  const agentParam = params.get("agent");
  const sessionParam = params.get("s");
  const usedAgentParam = useRef(agentParam);
  useEffect(() => {
    const s = sessionParam;
    if (s) chat.loadSession(s);
    const agent = params.get("agent");
    if (agent && !s && usedAgentParam.current !== agent) {
      setAgentRailOpen(true);
      const q = params.get("q") ?? "";
      setTimeout(() => void chat.send(`/agent ${agent}${q ? ` ${q}` : ""}`), 350);
    }
    usedAgentParam.current = agent;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentParam, sessionParam, chat.newChat]);

  // Global ⌘K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const persona = isCustomer ? `Customer CEO · ${customerName}` : "TREEtiti AI Team";
  const agentParam2 = params.get("agent");
  const agentIdentity = agentParam2
    ? {
        key: agentParam2,
        name: AGENT_NAMES[agentParam2] ?? agentParam2,
        role: AGENT_ROLES[agentParam2] ?? "Agent",
        accent: AGENT_ACCENTS[agentParam2] ?? "#a1a1aa",
        icon: AGENT_ICONS[agentParam2] ?? "brain",
      }
    : null;
  const agentRail = agentParam2 && agentRailOpen ? (
    <AgentContextPanel agentKey={agentParam2} onClose={() => setAgentRailOpen(false)} />
  ) : null;
  const emptyTitle = isCustomer ? `Talk to ${customerName}'s CEO` : "What do you want TREEtiti to do?";
  const emptyHint = isCustomer
    ? "Ask about their missions, campaigns, or tell the CEO what to work on next."
    : "Give your AI team a job. It routes your request to the right agents, executes the work, and delivers structured results.";
  const placeholder = isCustomer
    ? `Message ${customerName}'s CEO…`
    : "What do you want me to do? (type / for commands)";

  return (
    <>
      <AppShell
        context={context}
        sessions={chat.sessions}
        projects={chat.projects}
        teammates={chat.teammates}
        teams={chat.teams as any}
        clients={chat.clients}
        activeSessionId={chat.sessionId}
        onNewChat={chat.newChat}
        onSelectSession={chat.loadSession}
        onDeleteSession={chat.deleteSession}
        rail={
          <>
            {agentRail}
            {rail}
          </>
        }
      >
        <Conversation
          chat={chat}
          persona={persona}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          placeholder={placeholder}
          onShortcut={navigate}
          agentIdentity={agentIdentity}
        />
      </AppShell>
      {cmdPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20" onClick={() => setCmdPaletteOpen(false)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <CommandPalette
              chat={chat}
              navigate={navigate}
              onClose={() => setCmdPaletteOpen(false)}
            />
          </div>
        </div>
      )}
      {shortcutsOpen && (
        <KeyboardShortcutsHelp onClose={() => setShortcutsOpen(false)} />
      )}
    </>
  );
}