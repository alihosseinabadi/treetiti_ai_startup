import React from "react";
import { Sidebar, SidebarSession } from "./Sidebar";
import { Project, Teammate, Team } from "../../api";

export function AppShell({
  context,
  sessions,
  projects,
  teammates,
  teams,
  clients,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  rail,
  children,
}: {
  context: string;
  sessions: SidebarSession[];
  projects: Project[];
  teammates: Teammate[];
  teams: Team[];
  clients: { id: string; name: string }[];
  activeSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => Promise<void>;
  rail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="t-app">
      <Sidebar
        context={context}
        sessions={sessions}
        projects={projects}
        teammates={teammates}
        teams={teams}
        clients={clients}
        activeSessionId={activeSessionId}
        onNewChat={onNewChat}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
      />
      <main className="flex min-w-0 flex-1">{children}</main>
      {rail ? <aside className="t-rail">{rail}</aside> : null}
    </div>
  );
}