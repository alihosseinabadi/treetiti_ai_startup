import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, streamEvents, StreamEvent } from "../api";

export type AgentPhase = "idle" | "working" | "done" | "failed" | "retrying";

export type AgentLive = {
  key: string;
  phase: AgentPhase;
  stage?: string;
  note?: string;
  taskId?: string;
};

export type MissionStage = {
  stage: string;
  agent: string;
  phase: "pending" | "working" | "done" | "failed";
};

export type Mission = {
  taskId: string;
  title: string;
  status: "running" | "completed" | "failed" | "queued" | "cancelled";
  stages: MissionStage[];
  agents: string[];
  startedAt: string;
  finishedAt: string | null;
  result?: Record<string, unknown>;
  error?: string;
};

export type ActivityRow = {
  id: string;
  at: string;
  kind: string;
  text: string;
  agent?: string;
};

type OfficeState = {
  agents: Record<string, AgentLive>;
  missions: Record<string, Mission>;
  activity: ActivityRow[];
  connected: boolean;
  focused: string | null;
  activeAgent: string | null;
};

type OfficeActions = {
  registerMission: (taskId: string, title: string) => void;
  setFocused: (key: string | null) => void;
  selectAgent: (key: string | null) => void;
  refreshMission: (taskId: string) => Promise<void>;
  runningMissions: () => Mission[];
};

const OfficeCtx = createContext<OfficeState & OfficeActions>({
  agents: {},
  missions: {},
  activity: [],
  connected: false,
  focused: null,
  activeAgent: null,
  registerMission: () => {},
  setFocused: () => {},
  selectAgent: () => {},
  refreshMission: async () => {},
  runningMissions: () => [],
});

export const useOffice = () => useContext(OfficeCtx);

let seq = 0;
const now = () => new Date().toISOString();

const STAGE_LABEL: Record<string, string> = {
  research: "Research",
  analytics: "Analytics",
  campaign: "Campaign strategy",
  strategy: "Strategy",
  editorial: "Editorial plan",
  creative: "Creative direction",
  content: "Content writing",
  image: "Image generation",
  video: "Video production",
  qa: "QA review",
  publish: "Publishing",
  learning: "Learning",
  orchestrator: "Orchestration",
};

function stageText(stage: string): string {
  return STAGE_LABEL[stage] ?? stage;
}

function pushActivity(
  list: ActivityRow[],
  kind: string,
  text: string,
  agent?: string,
): ActivityRow[] {
  const row: ActivityRow = { id: `a${++seq}`, at: now(), kind, text, agent };
  return [row, ...list].slice(0, 120);
}

export function OfficeProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Record<string, AgentLive>>({});
  const [missions, setMissions] = useState<Record<string, Mission>>({});
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [focused, setFocusedState] = useState<string | null>(null);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const setFocused = useCallback((key: string | null) => setFocusedState(key), []);

  const selectAgent = useCallback((key: string | null) => {
    setActiveAgent(key);
    if (key) setFocusedState(key);
  }, []);

  const registerMission = useCallback((taskId: string, title: string) => {
    setMissions((m) => {
      if (m[taskId]) return m;
      const mission: Mission = {
        taskId,
        title,
        status: "queued",
        stages: [],
        agents: [],
        startedAt: now(),
        finishedAt: null,
      };
      return { ...m, [taskId]: mission };
    });
  }, []);

  const refreshMission = useCallback(async (taskId: string) => {
    // Skip network round-trips for missions already in a terminal state.
    const existing = missionsRef.current[taskId];
    if (existing && (existing.status === "completed" || existing.status === "failed" || existing.status === "cancelled")) {
      return;
    }
    try {
      const detail = await api.taskDetail(taskId);
      const prev = missionsRef.current[taskId];
      const stages: MissionStage[] =
        prev?.stages && prev.stages.length > 0
          ? prev.stages
          : (detail.events ?? [])
              .filter((e) => e.payload?.agent && e.payload?.stage)
              .map((e) => ({
                stage: String(e.payload.stage),
                agent: String(e.payload.agent),
                phase: e.type === "agent.completed" ? "done" : e.type === "agent.failed" ? "failed" : "working",
              }));
      const agentsSet = Array.from(new Set([...(prev?.agents ?? []), ...stages.map((s) => s.agent)]));
      const mission: Mission = {
        taskId,
        title: prev?.title ?? detail.label ?? "Mission",
        status: (detail.status as Mission["status"]) ?? "running",
        stages,
        agents: agentsSet,
        startedAt: detail.started_at ?? prev?.startedAt ?? now(),
        finishedAt: detail.finished_at,
        result: detail.result,
        error: detail.error,
      };
      setMissions((m) => ({ ...m, [taskId]: mission }));
    } catch {
      /* task not found yet */
    }
  }, []);

  // Auto-register mission-cycle tasks (scheduler / missions page), not just chat missions.
  const ensureMission = useCallback(
    (taskId: string, hint: string) => {
      if (!taskId || missionsRef.current[taskId]) return;
      registerMission(taskId, hint || "Mission");
      refreshMission(taskId);
    },
    [registerMission, refreshMission],
  );

  const runningMissions = useCallback(
    () =>
      Object.values(missionsRef.current).filter(
        (m) => m.status === "running" || m.status === "queued",
      ),
    [],
  );

  // Handle a single SSE event → update agents / missions / activity.
  const onEvent = useCallback(
    (ev: StreamEvent) => {
      const p = ev.payload ?? {};
      const taskId = p.task_id ? String(p.task_id) : ev.correlation_id ?? "";

      // ---- agent lifecycle (CEO per-stage events + task-queue agent events)
      if (ev.type === "agent.started" || ev.type === "agent.completed" || ev.type === "agent.failed" || ev.type === "agent.retrying") {
        const key = String(p.agent || ev.source || "");
        if (!key) return;
        if (taskId) ensureMission(taskId, String(p.note ?? "Mission"));
        const phase: AgentPhase =
          ev.type === "agent.completed"
            ? "done"
            : ev.type === "agent.failed"
              ? "failed"
              : ev.type === "agent.retrying"
                ? "retrying"
                : "working";
        setAgents((a) => ({
          ...a,
          [key]: {
            key,
            phase,
            stage: p.stage ? String(p.stage) : a[key]?.stage,
            note: p.note ? String(p.note) : a[key]?.note,
            taskId: taskId || a[key]?.taskId,
          },
        }));
        if (taskId) {
          setMissions((m) => {
            const mission = m[taskId];
            if (!mission) return m;
            const stageName = p.stage ? String(p.stage) : "";
            const stagePhase: MissionStage["phase"] =
              ev.type === "agent.completed"
                ? "done"
                : ev.type === "agent.failed"
                  ? "failed"
                  : "working";
            let stages = mission.stages;
            if (stageName && !stages.some((s) => s.stage === stageName && s.agent === key)) {
              stages = [...stages, { stage: stageName, agent: key, phase: "pending" }];
            }
            stages = stages.map((s) =>
              s.stage === stageName && s.agent === key ? { ...s, phase: stagePhase } : s,
            );
            const agentsSet = Array.from(new Set([...mission.agents, key]));
            return {
              ...m,
              [taskId]: {
                ...mission,
                stages,
                agents: agentsSet,
                status: ev.type === "agent.failed" ? "failed" : mission.status,
              },
            };
          });
        }
        setActivity((l) =>
          pushActivity(
            l,
            ev.type,
            `${stageText(p.stage ? String(p.stage) : key)} → ${phase}`,
            key,
          ),
        );
        return;
      }

      // ---- task lifecycle
      if (ev.type === "task.started") {
        if (taskId) {
          ensureMission(taskId, String(p.kind === "mission" ? "Mission" : p.label ?? "Mission"));
          setMissions((m) => {
            const mission = m[taskId];
            if (!mission) return m;
            return { ...m, [taskId]: { ...mission, status: "running" } };
          });
        }
        setActivity((l) => pushActivity(l, ev.type, "Mission started", p.kind ? String(p.kind) : undefined));
        return;
      }
      if (ev.type === "task.completed" || ev.type === "task.failed" || ev.type === "task.cancelled") {
        if (taskId) {
          const status: Mission["status"] =
            ev.type === "task.completed" ? "completed" : ev.type === "task.cancelled" ? "cancelled" : "failed";
          setMissions((m) => {
            const mission = m[taskId];
            if (!mission) return m;
            return {
              ...m,
              [taskId]: {
                ...mission,
                status,
                finishedAt: now(),
                result: p.result ? (p.result as Record<string, unknown>) : mission.result,
                error: p.error ? String(p.error) : mission.error,
              },
            };
          });
          setAgents((a) => {
            const next: Record<string, AgentLive> = { ...a };
            for (const agent of Object.values(a)) {
              if (agent.taskId === taskId && (agent.phase === "working" || agent.phase === "retrying")) {
                next[agent.key] = { ...agent, phase: status === "completed" ? "done" : status === "cancelled" ? "idle" : "failed" };
              }
            }
            return next;
          });
        }
        setActivity((l) =>
          pushActivity(
            l,
            ev.type,
            status === "completed" ? "Mission complete" : status === "cancelled" ? "Mission cancelled" : "Mission failed",
          ),
        );
        return;
      }

      // ---- workflow / content / media / mission events
      const interesting =
        ev.type === "WORKFLOW_ADVANCED" ||
        ev.type === "CONTENT_CREATED" ||
        ev.type === "IMAGE_CREATED" ||
        ev.type === "VIDEO_CREATED" ||
        ev.type === "QA_PASSED" ||
        ev.type === "QA_FAILED" ||
        ev.type === "APPROVAL_REQUIRED" ||
        ev.type === "PUBLISHED" ||
        ev.type === "media.generation.started" ||
        ev.type === "media.generation.completed" ||
        ev.type === "tool.completed" ||
        ev.type.startsWith("mission.") ||
        ev.type.startsWith("handoff.") ||
        ev.type === "artifact.created";
      if (interesting) {
        const agent = p.agent ? String(p.agent) : ev.source || undefined;
        const text =
          ev.type === "artifact.created"
            ? `Artifact produced: ${p.kind ? String(p.kind) : "asset"}`
            : ev.type.startsWith("handoff.")
              ? `Handoff ${ev.type.split(".")[1] ?? ""}`
              : ev.type.startsWith("mission.")
                ? `Mission ${ev.type.split(".")[1] ?? ""}`
                : stageText(String(p.stage ?? ev.type));
        setActivity((l) => pushActivity(l, ev.type, text, agent));
      }
    },
    [],
  );

  // One global SSE subscription for the whole office.
  useEffect(() => {
    const unsub = streamEvents(onEvent, {
      onOpen: () => setConnected(true),
      onError: () => setConnected(false),
    });
    return unsub;
  }, [onEvent]);

  // Poll running missions for result/events fallback (only while running).
  useEffect(() => {
    const running = Object.values(missions).filter(
      (m) => m.status === "running" || m.status === "queued",
    );
    if (running.length === 0) return;
    const timer = setInterval(() => {
      for (const m of running) refreshMission(m.taskId);
    }, 4000);
    return () => clearInterval(timer);
  }, [missions, refreshMission]);

  const value = useMemo<OfficeState & OfficeActions>(
    () => ({
      agents,
      missions,
      activity,
      connected,
      focused,
      activeAgent,
      registerMission,
      setFocused,
      selectAgent,
      refreshMission,
      runningMissions,
    }),
    [agents, missions, activity, connected, focused, activeAgent, registerMission, setFocused, selectAgent, refreshMission, runningMissions],
  );

  return <OfficeCtx.Provider value={value}>{children}</OfficeCtx.Provider>;
}