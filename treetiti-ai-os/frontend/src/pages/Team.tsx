import React, { useCallback, useEffect, useState } from "react";
import { api, AgentInfo, Project } from "../api";
import { GrokBotAvatar } from "../components/team/GrokBot";
import { AgentProfileModal } from "../components/team/AgentProfileModal";
import { AgentChatPanel } from "../components/team/AgentChatPanel";
import { ProjectRoutinePanel } from "../components/team/ProjectRoutinePanel";

/**
 * TEAM — the Grok-style bot dashboard.
 * Left: bot grid + canvas of crowned/mustached agent stickers.
 * Right: inter-agent chat rail.
 * Bottom: project routine runner (all agents do their pass on a project).
 */
export default function Team() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [runningTasks, setRunningTasks] = useState<Record<string, string>>({});
  const [projectId, setProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api
      .agents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoading(false));
    api.projects().then(setProjects).catch(() => {});
    // live running tasks → animate matching bots
    api
      .tasks({ status: "running", limit: 30 })
      .then(({ tasks }) => {
        const map: Record<string, string> = {};
        for (const t of tasks) {
          try {
            const payload = t.result as Record<string, unknown>;
            const agentKey = String(payload?.agent ?? "");
            if (agentKey) map[agentKey] = t.id;
          } catch {}
        }
        setRunningTasks(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const openProfile = (a: AgentInfo) => {
    setSelectedAgent(a);
    setProfileOpen(true);
  };

  const departments = Array.from(new Set(agents.map((a) => a.department || "General")));

  return (
    <div className="flex h-full min-w-0">
      <div className="t-page flex-1 min-w-0 xl:pr-0">
        <div className="t-page-inner">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="t-heading">Team</div>
              <p className="t-sub">
                Your AI workforce — every specialist with skills, memory and files. Click a bot to open its profile.
              </p>
            </div>
            {/* project picker for routines */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted uppercase tracking-wider">Routine for</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {projects.length === 0 && <option value="">No projects yet</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 text-center text-sm text-text-muted">Loading team…</div>
          ) : (
            <>
              {/* ── Bot wall by department ── */}
              <div className="mt-6 space-y-6">
                {departments.map((dept) => (
                  <section key={dept}>
                    <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-text-muted">
                      {dept} · {agents.filter((a) => (a.department || "General") === dept).length}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-4">
                      {agents
                        .filter((a) => (a.department || "General") === dept)
                        .map((a) => (
                          <button
                            key={a.key}
                            onClick={() => openProfile(a)}
                            className="group flex flex-col items-center gap-2 rounded-2xl p-3 transition hover:bg-secondary/[0.06]"
                          >
                            <GrokBotAvatar agent={a} size="lg" running={!!runningTasks[a.key]} />
                            <span className="text-[11px] font-medium text-text-primary truncate w-full text-center">
                              {a.name}
                            </span>
                            <span className="text-[9px] text-text-muted truncate w-full text-center">
                              {runningTasks[a.key] ? "working…" : a.role.split("/")[0]}
                            </span>
                          </button>
                        ))}
                    </div>
                  </section>
                ))}
              </div>

              {/* ── Project routine ── */}
              {projectId && (
                <div className="mt-8">
                  <ProjectRoutinePanel
                    project={projects.find((p) => p.id === projectId)!}
                    agents={agents}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inter-agent chat rail (inline, not overlay) */}
      <aside className="hidden xl:flex w-[360px] shrink-0 h-full border-l border-border bg-bg-primary">
        <AgentChatPanel agents={agents} projectId={projectId} />
      </aside>

      {/* Profile modal */}
      <AgentProfileModal
        agent={selectedAgent ?? agents[0] ?? { key: "", name: "", role: "" }}
        isOpen={profileOpen && !!selectedAgent}
        onClose={() => setProfileOpen(false)}
        onEditInstruction={async (key, instruction) => {
          await api.agentInstructionSet(key, instruction);
        }}
      />
    </div>
  );
}
