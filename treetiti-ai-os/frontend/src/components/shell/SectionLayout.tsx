import React from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { useSidebarData } from "../../hooks/useSidebarData";

export function SectionLayout({
  context,
  children,
}: {
  context: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { sessions, projects, teammates, teams, clients } = useSidebarData(context);
  return (
    <AppShell
      context={context}
      sessions={sessions}
      projects={projects}
      teammates={teammates}
      teams={teams}
      clients={clients}
      activeSessionId={undefined}
      onNewChat={() => navigate("/chat")}
      onSelectSession={(id) => navigate(`/chat?s=${id}`)}
    >
      <main className="flex min-w-0 flex-1 bg-bg-primary">{children}</main>
    </AppShell>
  );
}