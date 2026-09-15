import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useChat } from "../hooks/useChat";
import { AppShell } from "../components/shell/AppShell";
import { Conversation } from "../components/chat/Conversation";
import { api, Team, Teammate, TaskRow } from "../api";
import { Btn } from "../components/ui";

interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  agent_key: string;
  isChief: boolean;
}

export default function TeamChat({
  rail,
}: {
  rail?: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const context = "tree"; // Team chats use the TREEtiti workspace context
  const chat = useChat(context, navigate);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [showHandoff, setShowHandoff] = useState<{ from: string; to: string; note?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api.teamDetail(id).then(setTeam).catch(console.error);
  }, [id]);

  useEffect(() => {
    if (!team) return;
    api.teammates().then((all) => {
      const teamMembers = all
        .filter((t) => team.member_ids.includes(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          avatar: t.avatar,
          role: t.role,
          agent_key: t.agent_key,
          isChief: t.id === team.chief_id,
        }));
      setMembers(teamMembers);
    });
  }, [team]);

  useEffect(() => {
    const s = params.get("s");
    if (s) chat.loadSession(s);
  }, []);

  // Listen for handoff events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail.type === "agent.handoff") {
        setShowHandoff({ from: e.detail.from, to: e.detail.to, note: e.detail.note });
        setTimeout(() => setShowHandoff(null), 5000);
      }
    };
    window.addEventListener("treetiti:agent-handoff", handler as EventListener);
    return () => window.removeEventListener("treetiti:agent-handoff", handler as EventListener);
  }, []);

  const chief = members.find((m) => m.isChief);
  const specialists = members.filter((m) => !m.isChief);

  const persona = team ? `${team.name} Team` : "Team Chat";
  const emptyTitle = team ? `Chat with ${team.name}` : "Select a team";
  const emptyHint = team
    ? `Message the ${chief?.name || "Chief"} to delegate work to ${specialists.length} specialists.`
    : "Create a team first to start collaborating.";
  const placeholder = team ? `Message ${chief?.name || "the Chief"}…` : "Create a team to begin";

  return (
    <AppShell
      context={context}
      sessions={chat.sessions}
      projects={chat.projects}
      teammates={chat.teammates}
      teams={chat.teams}
      clients={chat.clients}
      activeSessionId={chat.sessionId}
      onNewChat={chat.newChat}
      onSelectSession={chat.loadSession}
      onDeleteSession={chat.deleteSession}
      rail={
        <>
          {rail}
          <div className="t-rail">
            <TeamInfoPanel team={team} members={members} activeTask={activeTask} onClose={() => setShowTeamInfo(false)} />
          </div>
        </>
      }
    >
      <div className="relative">
        {showHandoff && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-slide-down">
            <HandoffBanner from={showHandoff.from} to={showHandoff.to} note={showHandoff.note} onClose={() => setShowHandoff(null)} />
          </div>
        )}

        <Conversation
          chat={chat}
          persona={persona}
          emptyTitle={emptyTitle}
          emptyHint={emptyHint}
          placeholder={placeholder}
          onShortcut={navigate}
        />
      </div>
    </AppShell>
  );
}

function TeamInfoPanel({
  team,
  members,
  activeTask,
  onClose,
}: {
  team: Team | null;
  members: TeamMember[];
  activeTask: TaskRow | null;
  onClose: () => void;
}) {
  if (!team) return null;

  const chief = members.find((m) => m.isChief);
  const specialists = members.filter((m) => !m.isChief);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">{team.name}</h3>
        <button onClick={onClose} className="text-text-muted hover:text-text-muted">✕</button>
      </div>

      <div className="space-y-3">
        {chief && (
          <div className="t-card p-3 border-l-4 border-blue-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{chief.avatar}</span>
              <div>
                <div className="font-medium text-text-primary">{chief.name}</div>
                <div className="text-xs text-accent flex items-center gap-1">
                  <span>👑</span> Chief
                </div>
              </div>
            </div>
          </div>
        )}

        {specialists.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Specialists</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {specialists.map((s) => (
                <div key={s.id} className="t-card p-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{s.name}</div>
                      <div className="text-xs text-text-muted">{s.role} · {s.agent_key}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTask && (
          <div className="t-card p-3 border-l-4 border-yellow-500">
            <div className="text-xs font-medium text-yellow-700 mb-1">Active Task</div>
            <div className="font-medium text-text-primary truncate">{activeTask.label}</div>
            <div className="text-xs text-text-muted">{activeTask.kind} · {activeTask.status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function HandoffBanner({
  from,
  to,
  note,
  onClose,
}: {
  from: string;
  to: string;
  note?: string;
  onClose: () => void;
}) {
  return (
    <div className="t-card px-4 py-3 border-l-4 border-accent shadow-lg w-[400px] max-w-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-accent">⤷</span>
        <span className="font-medium text-text-primary">Handoff</span>
        <span className="ml-auto text-accent" onClick={onClose}>✕</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{from}</span>
        <span className="text-accent">→</span>
        <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">{to}</span>
      </div>
      {note && <div className="mt-1 text-xs text-text-muted">{note}</div>}
    </div>
  );
}

function TeamMember() {
  // Type definition only
}