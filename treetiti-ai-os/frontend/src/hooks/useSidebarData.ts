import { useEffect, useState } from "react";
import { api, Project, Teammate, Team } from "../api";

export type SidebarSessionData = { id: string; title: string; project_id?: string; context?: string };

export function useSidebarData(context: string) {
  const [sessions, setSessions] = useState<SidebarSessionData[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.sessions(context).then(setSessions).catch(() => {});
    api.projects().then(setProjects).catch(() => {});
    api.teammates().then(setTeammates).catch(() => {});
    api.teams().then(setTeams).catch(() => {});
    api.clients().then((list) => setClients(list.map((c) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [context]);

  return { sessions, projects, teammates, teams, clients };
}