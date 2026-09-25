const TOKEN_KEY = "treetiti_token";
const BASE =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, "") || "/api/v1";

export type AgentInfo = { name: string; role: string };
export type AgentResult = { agent: string; result: any };
export type AgentRun = {
  id: string;
  agent: string;
  job_type: string;
  status: string;
  summary: string;
  error: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number;
};
export type ScheduledJob = {
  id: string;
  agent: string;
  job_type: string;
  schedule_time: string;
  interval_minutes: number;
  enabled: boolean;
  last_run_at: string | null;
  payload: Record<string, unknown>;
};
export type ContentItem = {
  id: string;
  platform: string;
  content_type: string;
  title: string;
  hook: string;
  body: string;
  cta: string;
  target_audience: string;
  visual_recommendation: string;
  status: string;
  scheduled_for: string | null;
  engagement_score: number | null;
};
export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  phone: string;
  score: number;
  customer_type: string;
  status: string;
  recommended_package: string;
  suggested_reply: string;
  created_at: string;
};
export type MemoryItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  score?: number;
};

export type ArenaModelRow = {
  model: string;
  provider: string;
  elo: number;
  wins: number;
  losses: number;
  battles: number;
  enabled: boolean;
  last_battle_at: string | null;
};

export type ArenaBattleRow = {
  id: string;
  model_a: string;
  model_b: string;
  winner: string;
  question: string;
  judge: string;
  automatic: boolean;
  created_at: string;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    throw new Error("Unauthorized");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      typeof body?.detail === "string" ? body.detail : JSON.stringify(body?.detail ?? body);
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return body as T;
}

const get = <T,>(path: string) => request<T>(path);
const post = <T,>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) });
const patch = <T,>(path: string, data: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(data) });

export const api = {
  login: (email: string, password: string) =>
    post<{ access_token: string; token_type: string; role: string }>("/auth/login", {
      email,
      password,
    }),
  me: () => get<{ email: string; role: string }>("/auth/me"),

  chat: (message: string, session_id?: string) =>
    post<{
      session_id: string;
      reply: string;
      battle?: boolean;
      turn_index?: number;
      winner_model?: string | null;
      judge?: string | null;
      answers?: { model: string; answer: string }[];
      failover?: boolean;
      skipped_model?: string | null;
    }>("/chat", { message, session_id }),
  sessions: () => get<{ id: string; title: string }[]>("/chat/sessions"),
  vote: (session_id: string, turn_index: number, winner: "A" | "B") =>
    post<{ voted: string }>("/chat/vote", { session_id, turn_index, winner }),
  leaderboard: () =>
    get<{ model: string; wins: number; losses: number; battles: number; win_rate: number }[]>(
      "/chat/leaderboard",
    ),
  chatHealth: () =>
    get<{
      models: Record<string, { consecutive_failures: number; unhealthy: boolean }>;
    }>("/chat/health"),

  agents: () => get<AgentInfo[]>("/agents"),
  runAgent: (agent: string, payload: Record<string, unknown>) =>
    post<AgentResult>("/agents/run", { agent, payload }),
  agentRuns: (limit = 50) => get<AgentRun[]>(`/agents/runs?limit=${limit}`),
  agentSchedule: () => get<ScheduledJob[]>("/agents/schedule"),
  agentScheduleUpdate: (id: string, changes: Partial<Record<"enabled" | "job_type" | "schedule_time" | "interval_minutes" | "payload", unknown>>) =>
    patch<ScheduledJob>(`/agents/schedule/${id}`, changes),
  runJobNow: (id: string) => post<AgentRun>(`/agents/run-now/${id}`),

  content: (params: { status?: string; platform?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.platform) q.set("platform", params.platform);
    if (params.limit) q.set("limit", String(params.limit));
    return get<ContentItem[]>(`/content${q.toString() ? `?${q}` : ""}`);
  },
  contentStatus: (id: string, status: string) =>
    patch<ContentItem>(`/content/${id}/status`, { status }),
  publish: (id: string, channel = "telegram") =>
    post<{ channel: string; published: boolean }>(`/webhooks/publish/${id}`, { channel }),

  leads: () => get<Lead[]>("/leads"),
  leadStatus: (id: string, status: string) =>
    patch<Lead>(`/leads/${id}/status?status=${encodeURIComponent(status)}`, {}),

  memoryCategories: () => get<string[]>("/memory/categories"),
  memoryAdd: (category: string, title: string, content: string) =>
    post<{ id: string }>("/memory", { category, title, content }),
  memorySearch: (q: string, category?: string, limit = 20) => {
    const p = new URLSearchParams({ q, limit: String(limit) });
    if (category) p.set("category", category);
    return get<MemoryItem[]>(`/memory?${p}`);
  },

  arenaStatus: () =>
    get<{
      champion: ArenaModelRow | null;
      leaderboard: ArenaModelRow[];
      provider: string;
      active_model: string;
    }>("/arena"),
  arenaSync: () =>
    post<{ discovered: number; added: number; total: number; models: string[] }>("/arena/sync"),
  arenaLeaderboard: () => get<ArenaModelRow[]>("/arena/leaderboard"),
  arenaBattles: (limit = 20) => get<ArenaBattleRow[]>(`/arena/battles?limit=${limit}`),
  arenaBattle: (model_a: string, model_b: string, question?: string) =>
    post<{
      model_a: string;
      model_b: string;
      winner: string;
      winner_model: string;
      question: string;
      judge: string;
    }>("/arena/battle", { model_a, model_b, question }),
  arenaSelfBattle: () =>
    post<{
      skipped?: boolean;
      reason?: string;
      model_a?: string;
      model_b?: string;
      winner?: string;
      winner_model?: string;
      question?: string;
      judge?: string;
    }>("/arena/self-battle"),

  orchPlan: (goal: string, project_id?: string) =>
    post<any>("/orchestrator/plan", { goal, project_id: project_id ?? null }),
  orchAnswer: (run_id: string, answers: Record<string, string>) =>
    post<any>("/orchestrator/answer", { run_id, answers }),
  orchExecute: (run_id: string) => post<any>("/orchestrator/execute", { run_id }),
  orchPlugins: () => get<any[]>("/orchestrator/plugins"),
  orchPluginToggle: (key: string, enabled: boolean) =>
    patch<any>(`/orchestrator/plugins/${key}`, { enabled }),
  orchPluginAdd: (key: string, label: string, url: string) =>
    post<any>("/orchestrator/plugins", { key, label, url }),
  schedules: () => get<any[]>("/agents/schedule"),
  scheduleCreate: (body: Record<string, unknown>) => post<any>("/agents/schedule", body),
  scheduleDelete: async (id: string) => {
    const res = await fetch(`${BASE}/agents/schedule/${id}`, {
      method: "DELETE",
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    return res.json();
  },
  projects: () => get<any[]>("/projects"),
  projectCreate: (name: string, description = "") => post<any>("/projects", { name, description }),
};
