import React, { useState, useEffect, useCallback } from "react";
import { AgentInfo, Project, TaskRow } from "../../api";
import { api } from "../../api";
import { GrokBotAvatar } from "./GrokBot";
import {
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Rocket,
} from "../ui-icons";

/**
 * Routine each agent performs when a project is opened.
 * Ordered like the agency DAG: research → strategy → creative → production → QA → growth.
 */
export const PROJECT_ROUTINE: Record<string, (p: Project) => string> = {
  market_research: (p) =>
    `Research the market for project "${p.name}" (${p.client}): competitors, trends, audience pain points.`,
  content_hunter: (p) =>
    `Find fresh content opportunities and hooks for "${p.name}".`,
  strategist: (p) => `Draft positioning and strategy angles for "${p.name}".`,
  content_strategist: (p) => `Build the content pillar plan for "${p.name}".`,
  creative_director: (p) => `Define creative direction and visual language for "${p.name}".`,
  content: (p) => `Write first-draft posts for "${p.name}" across its channels.`,
  image: (p) => `Generate image prompt concepts matching "${p.name}" brand.`,
  video: (p) => `Storyboard one short-form video concept for "${p.name}".`,
  editor: (p) => `QA-review everything produced so far for "${p.name}".`,
  analytics: (p) => `Summarize performance data available for "${p.name}".`,
  growth_optimizer: (p) => `Recommend next experiments for "${p.name}" based on learnings.`,
};

type AgentRunState = "queued" | "running" | "done" | "failed" | "skipped";

interface RunRow {
  agentKey: string;
  state: AgentRunState;
  taskId?: string;
  brief?: string;
  output?: string;
  error?: string;
}

const STATE_ICON: Record<AgentRunState, React.ReactNode> = {
  queued: <span className="h-2 w-2 rounded-full bg-hover inline-block" />,
  running: <Loader2 className="h-3.5 w-3.5 text-success animate-spin" />,
  done: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  failed: <XCircle className="h-3.5 w-3.5 text-error" />,
  skipped: <Pause className="h-3.5 w-3.5 text-text-muted" />,
};

export function ProjectRoutinePanel({
  project,
  agents,
}: {
  project: Project;
  agents: AgentInfo[];
}) {
  const routineKeys = Object.keys(PROJECT_ROUTINE).filter((k) =>
    agents.some((a) => (a.key || "") === k),
  );
  const [rows, setRows] = useState<Record<string, RunRow>>(() =>
    Object.fromEntries(routineKeys.map((k) => [k, { agentKey: k, state: "queued", brief: PROJECT_ROUTINE[k]?.(project) }])),
  );
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const setRow = (key: string, patch: Partial<RunRow>) =>
    setRows((r) => ({ ...r, [key]: { ...r[key], ...patch } }));

  /** Run agents SEQUENTIALLY (pipeline order) — real backend tasks, no mocks. */
  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    // reset
    setRows(
      Object.fromEntries(
        routineKeys.map((k) => [k, { agentKey: k, state: "queued" as AgentRunState, brief: PROJECT_ROUTINE[k]?.(project) }]),
      ),
    );

    for (const key of routineKeys) {
      const agent = agents.find((a) => (a.key || "") === key);
      if (!agent) {
        setRow(key, { state: "skipped" });
        continue;
      }
      const brief = PROJECT_ROUTINE[key]?.(project) ?? "";
      setRow(key, { state: "running", brief });

      try {
        const res = await api.runAgent(key, { brief, extra_context: `project: ${project.name} · client: ${project.client}` });
        const taskId = res.task_id;
        setRow(key, { taskId });

        // Poll until done (bounded)
        const deadline = Date.now() + 180_000;
        let final: TaskRow | null = null;
        while (Date.now() < deadline) {
          const t = await api.taskDetail(taskId);
          if (["completed", "failed", "cancelled"].includes(t.status)) {
            final = t;
            break;
          }
          await new Promise((r) => setTimeout(r, 3000));
        }

        if (!final) throw new Error("timeout");
        if (final.status === "completed") {
          const out = (final.result as Record<string, unknown>)?.deliverable ??
            (final.result as Record<string, unknown>)?.output ?? "";
          const text = typeof out === "string" ? out : JSON.stringify(out).slice(0, 400);
          setRow(key, { state: "done", output: String(text).slice(0, 2000) });
        } else {
          setRow(key, { state: "failed", error: final.error || final.status });
        }
      } catch (e) {
        setRow(key, { state: "failed", error: (e as Error).message });
      }
    }
    setRunning(false);
  }, [routineKeys, running, agents, project]);

  useEffect(() => {
    // reset rows whenever project changes
    setRows(
      Object.fromEntries(routineKeys.map((k) => [k, { agentKey: k, state: "queued" as AgentRunState, brief: PROJECT_ROUTINE[k]?.(project) }])),
    );
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const doneCount = routineKeys.filter((k) => rows[k]?.state === "done").length;
  const pct = Math.round((doneCount / Math.max(routineKeys.length, 1)) * 100);

  return (
    <div className="rounded-2xl border border-border bg-primary/80 overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex -space-x-2">
          {routineKeys.slice(0, 6).map((k) => {
            const a = agents.find((x) => x.key === k);
            return a ? (
              <GrokBotAvatar key={k} agent={a} size="sm" running={rows[k]?.state === "running"} />
            ) : null;
          })}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Rocket className="h-4 w-4 text-warning" />
            Team routine — {project.name}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            Every specialist runs their standard pass on this project
          </div>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            running
              ? "bg-secondary text-text-muted cursor-not-allowed"
              : "bg-success text-text-primary hover:bg-success shadow-lg shadow-emerald-500/20"
          }`}
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? `Running ${doneCount}/${routineKeys.length}` : "Run full team"}
        </button>
      </div>

      {/* progress bar */}
      <div className="h-1 bg-secondary">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* rows */}
      <div className="divide-y divide-border">
        {routineKeys.map((key) => {
          const agent = agents.find((a) => a.key === key);
          if (!agent) return null;
          const row = rows[key] ?? { agentKey: key, state: "queued" as AgentRunState };
          const isOpen = expanded === key;
          return (
            <div key={key}>
              <button
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition text-left"
              >
                <GrokBotAvatar agent={agent} size="sm" running={row.state === "running"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium">{agent.name}</div>
                  <div className="text-[11px] text-text-muted truncate">{row.brief}</div>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-text-muted">{agent.department ?? ""}</span>
                {STATE_ICON[row.state]}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pl-[68px]">
                  {row.state === "done" && row.output && (
                    <pre className="whitespace-pre-wrap text-xs text-text-secondary bg-secondary rounded-xl p-3 max-h-56 overflow-y-auto border border-border">
                      {row.output}
                    </pre>
                  )}
                  {row.state === "failed" && (
                    <div className="text-xs text-error bg-error/10 border border-error/30 rounded-xl p-3">
                      {row.error || "Failed"}
                      <button
                        className="ml-2 underline hover:text-error"
                        onClick={() => {
                          setRow(key, { state: "queued" });
                        }}
                      >
                        retry
                      </button>
                    </div>
                  )}
                  {(row.state === "queued" || row.state === "skipped") && (
                    <div className="text-xs text-text-muted">Waiting in pipeline…</div>
                  )}
                  {row.state === "running" && (
                    <div className="text-xs text-success flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> working on it…
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!routineKeys.length && (
        <div className="p-6 text-center text-sm text-text-muted">
          No implemented routine agents found.
        </div>
      )}
    </div>
  );
}
