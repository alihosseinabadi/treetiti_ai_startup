const TOKEN_KEY = "treetiti_token";
const BASE = "/api/v1";

export type AgentInfo = {
  key: string;
  name: string;
  role: string;
  department?: string;
  status?: string;
  skills?: string[];
  capabilities?: string[];
};
export type AgentResult = { agent: string; result: any };
export type AgentResultDone = {
  agent: string;
  task_id: string;
  status: string;
  result: Record<string, unknown>;
  error: string;
};

export function formatAgentResult(result?: Record<string, unknown>): string {
  const out = (result?.output ?? result?.result ?? result) as unknown;
  if (out == null) return "Done.";
  if (typeof out === "string") return out.slice(0, 3000);
  try {
    const s = JSON.stringify(out, null, 2);
    return s.length > 3000 ? `${s.slice(0, 3000)}\n…` : s;
  } catch {
    return String(out).slice(0, 3000);
  }
}
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
export type AgentInstructionInfo = {
  agent: string;
  instruction: string;
  updated_at: string | null;
};
export type ScheduledJob = {
  id: string;
  name: string;
  agent: string;
  job_type: string;
  schedule_time: string;
  interval_minutes: number;
  enabled: boolean;
  archived: boolean;
  client: string;
  project_id: string;
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

export type ChatHistoryItem = {
  session_id: string;
  title: string;
  session_updated_at: string;
  excerpt: string;
  score: number;
};

export type Project = {
  id: string;
  name: string;
  client: string;
  description: string;
  status: string;
  pinned: boolean;
  created_at: string | null;
};

export type Teammate = {
  id: string;
  name: string;
  role: string;
  agent_key: string;
  avatar: string;
  description: string;
  system_instructions: string;
  model: string;
  tools: string[];
  skills: string[];
  memory_scopes: string[];
  client_access: string[];
  project_access: string[];
  autonomy_level: string;
  routines: string[];
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  name: string;
  description: string;
  chief_id: string | null;
  member_ids: string[];
  client_access: string[];
  project_access: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TeammateActivity = {
  id: string;
  teammate_id: string;
  task_id: string;
  action: string;
  status: string;
  input_summary: string;
  output_summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MediaAsset = {
  id: string;
  kind: string;
  title: string;
  creator_agent: string;
  model: string;
  prompt: string;
  url: string;
  version: number;
  project_id: string;
  session_id?: string;
  created_at: string | null;
  produced?: Record<string, unknown>;
};

export type Campaign = {
  id: string;
  title: string;
  objective: string;
  target_audience: string;
  strategy: string;
  message_house: Record<string, unknown>[];
  status: string;
  created_at: string | null;
};

export type Approval = {
  id: string;
  kind: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  status: string;
  requested_by: string;
  reviewed_by: string;
  decision_note: string;
  risk_level: "low" | "medium" | "high";
  created_at: string | null;
  reviewed_at: string | null;
};

export type StreamEvent = {
  type: string;
  source: string;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
};

export type TalkSpeaker = { key: string; name: string; role: string };
export type TalkThinkingStage = { stage: string; note: string };

export type TalkMessage = {
  id: string;
  room_id: string;
  role: "user" | "agent" | "system";
  speaker_key: string;
  speaker_name: string;
  content: string;
  thinking_stages: TalkThinkingStage[];
  model: string;
  addressed_to: string;
  round_number: number;
  created_at: string;
};

export type TalkRoom = {
  id: string;
  name: string;
  topic: string;
  mode: "groq" | "opencode";
  thinking: "plain" | "deep" | "super";
  speakers: TalkSpeaker[];
  chief_id: string | null;
  team_id: string | null;
  client: string;
  status: "idle" | "round_running" | "paused";
  created_by: string;
  last_message: string;
  last_at: string;
  created_at: string;
  updated_at: string;
};

export type TalkStreamEvent = {
  type: string;
  payload: {
    room_id: string;
    agent_key?: string;
    agent_name?: string;
    stage?: string;
    note?: string;
    model?: string;
    round_number?: number;
    message?: TalkMessage;
    triggered_by?: string;
    [key: string]: unknown;
  };
  created_at: string;
};

export type ProviderInfo = {
  prefix: string;
  name: string;
  capabilities: string[];
  cost_tier: string;
  enabled: boolean;
  key_configured: boolean;
  base_url: string;
  notes: string;
};

export type ProviderHealth = {
  model: string;
  status: string;
  latency_ms: number;
  error: string;
};

export type ProviderUsage = {
  provider: string;
  requests: number;
  daily_limit: number;
};

export type TaskRow = {
  id: string;
  kind: string;
  label: string;
  status: string;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error: string;
  result: Record<string, unknown>;
  payload: Record<string, unknown>;
  events: { type: string; source: string; payload: Record<string, unknown>; correlation_id: string; created_at: string }[];
};

export type Mission = {
  id: string;
  name: string;
  client: string;
  goal: string;
  status: string; // active | paused | archived
  cadence: string; // daily | weekly
  daily_time: string;
  weekly_day: string;
  config: Record<string, unknown>;
  workspace: Record<string, unknown>;
  current_cycle: string;
  instruction: string;
  last_run_at: string | null;
  next_daily_at: string | null;
  next_weekly_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type MissionRun = {
  id: string;
  mission_id: string;
  cycle_type: string;
  status: string;
  summary: string;
  result: Record<string, unknown>;
  error: string;
  task_id: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number;
};

export type ClientSummary = {
  id: string;
  name: string;
  missions: Mission[];
  mission_count: number;
  active_missions: number;
  paused_missions: number;
  directory: {
    id: string;
    status: string;
    business_line: string;
    main_goal: string;
    profile: Record<string, unknown>;
    dossier: Record<string, unknown>;
    error: string;
    created_at: string | null;
    updated_at: string | null;
  } | null;
  lead: {
    id: string;
    status: string;
    score: number;
    customer_type: string;
    created_at: string | null;
  } | null;
  pending_approvals: number;
  workspace_revealed: string[];
  content_count: number;
  last_cycle: string | null;
  last_cycle_status: string | null;
  last_run_at: string | null;
};

export type TemplateInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  source: string;
  license: string;
  security: "Verified" | "Review" | "Caution";
  deps: string;
  capabilities: string[];
  quality: string;
  version: string;
  brief: string;
  installed: number;
};

export type TemplateInstallResult = {
  template_id: string;
  client: string;
  mission: {
    id: string;
    name: string;
    client: string;
    goal: string;
    status: string;
    cadence: string;
    daily_time: string;
    weekly_day: string;
    config: Record<string, unknown>;
    source_template: string;
    created_at: string | null;
  };
  schedules: { id: string; name: string; agent: string; job_type: string; schedule_time: string; enabled: boolean }[];
  project: { id: string; name: string; client: string } | null;
};

export type ResearchFinding = {
  claim: string;
  source: string;
  confidence: string;
  type: string;
};

export type ResearchReport = {
  id: string;
  client: string;
  topic: string;
  depth: string;
  status: string;
  summary: string;
  findings: ResearchFinding[];
  insights: string[];
  recommendations: string[];
  sources: { title: string; url: string; kind: string }[];
  report_md: string;
  meta: { synthesis: string; page_count: number; took_ms: number };
  created_at: string | null;
};

export type Routine = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  schedule: string;
  teammate_id: string | null;
  team_id: string | null;
  instructions: string;
  tools: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectorInfo = {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  configured: boolean;
  last_status: string;
  last_error: string;
  last_checked_at: string | null;
  config_keys: string[];
};

export type McpServerInfo = {
  id: string;
  name: string;
  transport: string;
  command: string;
  args: string[];
  url: string;
  tools: { name?: string; description?: string }[];
  status: string;
  last_error: string;
  last_checked_at: string | null;
  created_at: string | null;
};

export type McpServer = McpServerInfo;

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
const put = <T,>(path: string, data: unknown) =>
  request<T>(path, { method: "PUT", body: JSON.stringify(data) });
const del = <T,>(path: string) => request<T>(path, { method: "DELETE" });

/**
 * Core SSE loop with automatic reconnect (capped exponential backoff).
 * - Refreshes the auth token on every attempt so a rotated token keeps working.
 * - Calls `onOpen` on each successful (re)connect and `onError` on each failure,
 *   so callers can flip LIVE/OFFLINE badges back and forth.
 * - Stops permanently on abort (unsubscribe) or hard failures (401/403/404).
 */
function connectSse<T>(
  url: string,
  parse: (raw: string) => T,
  onEvent: (ev: T) => void,
  opts: { onOpen?: () => void; onError?: (e: unknown) => void } = {},
): () => void {
  // Pause the connect/retry loop while the tab is hidden (avoids hammering
  // the backend in the background). Resolves when the tab becomes visible.
  const waitWhileHidden = (): Promise<void> => {
    if (typeof document === "undefined" || document.visibilityState !== "hidden") return Promise.resolve();
    return new Promise<void>((resolve) => {
      const onVis = () => {
        document.removeEventListener("visibilitychange", onVis);
        resolve();
      };
      document.addEventListener("visibilitychange", onVis);
    });
  };

  const ctrl = new AbortController();
  let closed = false;
  let retryMs = 1000;
  const MAX_RETRY_MS = 15000;

  (async () => {
    while (!closed) {
      await waitWhileHidden();
      if (closed || ctrl.signal.aborted) break;
      const token = getToken();
      const headers: Record<string, string> = { Accept: "text/event-stream" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const res = await fetch(url, { headers, signal: ctrl.signal });
        if (!res.ok || !res.body) {
          // Auth / not-found failures should not hot-loop — stop after notifying.
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            if (!closed) opts.onError?.(new Error(`sse ${res.status}`));
            break;
          }
          throw new Error(`sse ${res.status}`);
        }
        opts.onOpen?.();
        retryMs = 1000; // reset backoff on a healthy connection
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const dataLine = frame
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const raw = dataLine.slice(6).trim();
            if (!raw) continue;
            try {
              onEvent(parse(raw));
            } catch {
              /* ignore malformed frame */
            }
          }
        }
        if (closed) break;
        throw new Error("sse closed"); // clean server close → reconnect
      } catch (e) {
        if (closed || ctrl.signal.aborted) break; // unsubscribed
        opts.onError?.(e);
      }
      await new Promise((r) => setTimeout(r, retryMs));
      retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    }
  })();

  return () => {
    closed = true;
    ctrl.abort();
  };
}

export function streamEvents(
  onEvent: (ev: StreamEvent) => void,
  opts: { onOpen?: () => void; onError?: (e: unknown) => void } = {},
): () => void {
  return connectSse(
    `${BASE}/stream`,
    (raw) => JSON.parse(raw) as StreamEvent,
    onEvent,
    opts,
  );
}

export function streamRoomEvents(
  roomId: string,
  onEvent: (ev: TalkStreamEvent) => void,
  opts: { onOpen?: () => void; onError?: (e: unknown) => void } = {},
): () => void {
  return connectSse(
    `${BASE}/talk/rooms/${roomId}/stream`,
    (raw) => JSON.parse(raw) as TalkStreamEvent,
    onEvent,
    opts,
  );
}

export const api = {
  login: (email: string, password: string) =>
    post<{ access_token: string; token_type: string; role: string }>("/auth/login", {
      email,
      password,
    }),
  me: () => get<{ email: string; role: string }>("/auth/me"),

  chat: (message: string, session_id?: string, context = "", confirm = false, mentions?: { id: string; type: string; name: string }[]) =>
    post<{
      session_id: string;
      reply: string;
      task_id?: string | null;
      company?: boolean;
      context?: string;
      confirmation_required?: boolean;
      confirm_action?: string;
      confirm_payload?: Record<string, unknown>;
      os_command?: boolean;
      report_id?: string | null;
      mission_id?: string | null;
      project_id?: string | null;
      pending_decision?: { id: string; question: string; options: string[] } | null;
      checkpoints?: string[];
    }>("/chat", { message, session_id, context, confirm, mentions }),

  chatStream: (message: string, session_id?: string, context = "", confirm = false, mentions?: { id: string; type: string; name: string }[]) => {
    // Returns an EventSource-like interface for streaming
    const params = new URLSearchParams();
    if (session_id) params.set("session_id", session_id);
    if (context) params.set("context", context);
    if (confirm) params.set("confirm", "true");
    if (mentions) params.set("mentions", JSON.stringify(mentions));
    
    const url = `/api/v1/chat/stream`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ message, session_id, context, confirm, mentions }),
    });
  },
  sessions: (context = "") =>
    get<{ id: string; title: string; project_id?: string }[]>(
      `/chat/sessions${context ? `?context=${encodeURIComponent(context)}` : ""}`,
    ),
  session: (id: string) =>
    get<{
      id: string;
      title: string;
      context: string;
      project_id?: string;
      messages: {
        role: "user" | "assistant";
        content: string;
        agent?: string;
        task_id?: string;
        company?: boolean;
        os_command?: boolean;
        confirm_action?: string;
        confirm_payload?: Record<string, unknown>;
        media?: { url: string; kind: string } | null;
        pending_decision?: { id: string; question: string; options: string[] } | null;
      }[];
    }>(`/chat/sessions/${id}`),
  sessionRename: (id: string, title: string) =>
    patch<{ id: string; title: string }>(`/chat/sessions/${id}/rename`, { title }),
  sessionMove: (id: string, project_id: string) =>
    post<{ id: string; project_id: string }>(`/chat/sessions/${id}/move`, { project_id }),
  sessionDelete: (id: string) => del<{ deleted: string }>(`/chat/sessions/${id}`),
  chatHealth: () =>
    get<{
      models: Record<string, { consecutive_failures: number; unhealthy: boolean }>;
    }>("/chat/health"),

  agents: () => get<AgentInfo[]>("/agents"),
  runAgent: (agent: string, payload: Record<string, unknown>) =>
    post<{ agent: string; task_id: string; status: string }>("/agents/run", { agent, payload }),
  runAgentWait: async (agent: string, payload: Record<string, unknown>): Promise<AgentResultDone> => {
    const t = await post<{ agent: string; task_id: string; status: string }>("/agents/run", {
      agent,
      payload,
    });
    const taskId = t.task_id;
    const deadline = Date.now() + 240000;
    for (;;) {
      const detail = await get<TaskRow>(`/tasks/${taskId}`);
      if (["completed", "failed", "cancelled"].includes(detail.status) || Date.now() > deadline) {
        return {
          agent,
          task_id: taskId,
          status: detail.status,
          result: detail.result ?? {},
          error: detail.error ?? "",
        };
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
  },
  agentRuns: (limit = 50) => get<AgentRun[]>(`/agents/runs?limit=${limit}`),
  agentSchedule: () => get<ScheduledJob[]>("/agents/schedule"),
  agentScheduleCreate: (data: {
    agent: string;
    name?: string;
    job_type?: string;
    schedule_time?: string;
    interval_minutes?: number;
    payload?: Record<string, unknown>;
    client?: string;
    project_id?: string;
  }) => post<ScheduledJob>("/agents/schedule", data),
  agentScheduleUpdate: (id: string, changes: Partial<Record<"enabled" | "job_type" | "schedule_time" | "interval_minutes" | "payload" | "name", unknown>>) =>
    patch<ScheduledJob>(`/agents/schedule/${id}`, changes),
  agentScheduleDuplicate: (id: string) =>
    post<ScheduledJob>(`/agents/schedule/${id}/duplicate`),
  agentScheduleArchive: (id: string) =>
    del<{ archived: string }>(`/agents/schedule/${id}`),
  agentScheduleRestore: (id: string) =>
    post<ScheduledJob>(`/agents/schedule/${id}/restore`),
  runJobNow: (id: string) => post<AgentRun>(`/agents/run-now/${id}`),
  agentInstructions: () => get<AgentInstructionInfo[]>("/agents/instructions"),
  agentInstructionSet: (agent: string, instruction: string) =>
    put<{ agent: string; instruction: string }>(`/agents/instructions/${agent}`, { instruction }),
  agentInstructionClear: (agent: string) =>
    del<{ agent: string; cleared: boolean }>(`/agents/instructions/${agent}`),

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
  memoryKinds: () => get<string[]>("/memory/kinds"),
  memoryAdd: (category: string, title: string, content: string) =>
    post<{ id: string }>("/memory", { category, title, content }),
  memorySearch: (q: string, category?: string, limit = 20) => {
    const p = new URLSearchParams({ q, limit: String(limit) });
    if (category) p.set("category", category);
    return get<MemoryItem[]>(`/memory?${p}`);
  },
  chatHistorySearch: (q: string, limit = 5) =>
    get<ChatHistoryItem[]>(`/chat/history/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  projects: () => get<Project[]>("/projects"),
  projectCreate: (data: { name: string; client?: string; description?: string; pinned?: boolean }) =>
    post<Project>("/projects", data),
  projectUpdate: (id: string, changes: Partial<Record<"name" | "client" | "description" | "status" | "pinned", string | boolean>>) =>
    patch<Project>(`/projects/${id}`, changes),
  projectPin: (id: string, pinned: boolean) => post<Project>(`/projects/${id}/pin?pinned=${pinned}`),

  assets: (params: { kind?: string; creator_agent?: string; session_id?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.kind) q.set("kind", params.kind);
    if (params.creator_agent) q.set("creator_agent", params.creator_agent);
    if (params.session_id) q.set("session_id", params.session_id);
    return get<MediaAsset[]>(`/assets${q.toString() ? `?${q}` : ""}`);
  },
  assetCreate: (data: { kind: string; title?: string; creator_agent?: string; model?: string; prompt?: string; url?: string; project_id?: string; session_id?: string }) =>
    post<MediaAsset>("/assets", data),
  assetGenerate: (data: { kind: string; prompt: string; title?: string; creator_agent?: string; project_id?: string; session_id?: string }) =>
    post<MediaAsset>("/assets/generate", data),

  campaigns: () => get<Campaign[]>("/campaigns"),
  campaignCreate: (data: { title: string; objective: string; target_audience?: string; strategy?: string }) =>
    post<Campaign>("/campaigns", data),
  campaignUpdate: (id: string, changes: Partial<Record<"title" | "objective" | "target_audience" | "strategy" | "status", string>>) =>
    patch<Campaign>(`/campaigns/${id}`, changes),

  approvals: (status = "") =>
    get<Approval[]>(`/approvals${status ? `?status=${status}` : ""}`),
  approvalRequest: (data: { kind: string; title: string; summary?: string; payload?: Record<string, unknown>; requested_by?: string }) =>
    post<Approval>("/approvals", data),
  approvalDecide: (id: string, decision: "approve" | "reject", note = "") =>
    post<Approval>(`/approvals/${id}/decide`, { decision, note }),

  providers: () => get<{ providers: ProviderInfo[] }>("/providers"),
  providerHealth: (force = false) =>
    get<{ gateway: string; checked_at: number; results: ProviderHealth[] }>(
      `/providers/health${force ? "?force=true" : ""}`,
    ),
  providerProbe: () =>
    post<{ gateway: string; checked_at: number; results: ProviderHealth[] }>(
      "/providers/health/probe",
    ),
  providerUsage: () => get<{ date: string; usage: ProviderUsage[] }>("/providers/usage"),

  tasks: (params: { status?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.limit) q.set("limit", String(params.limit));
    return get<{ tasks: TaskRow[] }>(`/tasks${q.toString() ? `?${q}` : ""}`);
  },
  taskCreate: (data: { kind: string; label?: string; payload?: Record<string, unknown> }) =>
    post<{ task_id: string; kind: string; label: string; status: string }>("/tasks", data),
  taskDetail: (id: string) =>
    get<TaskRow & { events: StreamEvent[] }>(`/tasks/${id}`),
  taskRetry: (id: string) =>
    post<{ task_id: string; kind: string; label: string; status: string; retried_from: string }>(`/tasks/${id}/retry`),
  taskCancel: (id: string) =>
    post<{ task_id: string; status: string }>(`/tasks/${id}/cancel`),
  taskReassign: (id: string, agent: string) =>
    post<{ task_id: string; kind: string; label: string; status: string; reassigned_to: string; retried_from: string }>(`/tasks/${id}/reassign`, { agent }),

  missions: (status = "") =>
    get<Mission[]>(`/missions${status ? `?status=${status}` : ""}`),
  missionCreate: (data: {
    name: string;
    client?: string;
    goal?: string;
    cadence?: string;
    daily_time?: string;
    weekly_day?: string;
    config?: Record<string, unknown>;
  }) => post<Mission>("/missions", data),
  missionDetail: (id: string) => get<Mission>(`/missions/${id}`),
  missionUpdate: (
    id: string,
    changes: Partial<Record<"name" | "goal" | "cadence" | "daily_time" | "weekly_day" | "status", string>> &
      Partial<{ config: Record<string, unknown> }>,
  ) => patch<Mission>(`/missions/${id}`, changes),
  missionStart: (id: string) => post<Mission>(`/missions/${id}/start`),
  missionPause: (id: string) => post<Mission>(`/missions/${id}/pause`),
  missionRun: (id: string, cycle = "daily") =>
    post<{ mission_id: string; cycle: string; task_id: string }>(`/missions/${id}/run`, { cycle }),
  missionTalk: (id: string, instruction: string) =>
    post<Mission>(`/missions/${id}/talk`, { instruction }),
  missionDuplicate: (id: string) =>
    post<Mission>(`/missions/${id}/duplicate`),
  missionRuns: (id: string, limit = 50) =>
    get<MissionRun[]>(`/missions/${id}/runs?limit=${limit}`),
  clients: () => get<ClientSummary[]>("/clients"),
  clientDetail: (name: string) =>
    get<ClientSummary>(`/clients/${encodeURIComponent(name)}`),

  teammates: () => get<Teammate[]>("/teammates"),
  teammateDetail: (id: string) => get<Teammate>(`/teammates/${id}`),
  teammateCreate: (data: Partial<Teammate>) => post<Teammate>("/teammates", data),
  teammateUpdate: (id: string, data: Partial<Teammate>) => patch<Teammate>(`/teammates/${id}`, data),
  teammateDelete: (id: string) => del<{ deleted: string }>(`/teammates/${id}`),
  teammatePin: (id: string) => post<Teammate>(`/teammates/${id}/pin`),
  teammateUnpin: (id: string) => post<Teammate>(`/teammates/${id}/unpin`),
  teammateActivity: (id: string, limit = 50) => get<TeammateActivity[]>(`/teammates/${id}/activity?limit=${limit}`),
  teammatesPinned: () => get<Teammate[]>("/teammates/pinned"),
  teammateRegistryAgents: () => get<Record<string, { name: string; role: string; description: string }>>("/teammates/registry/agents"),
  teammateRegistryTools: () => get<string[]>("/teammates/registry/tools"),
  teammateRegistryMemoryScopes: () => get<string[]>("/teammates/registry/memory-scopes"),
  teammateRegistryAutonomyLevels: () => get<string[]>("/teammates/registry/autonomy-levels"),

  teams: () => get<Team[]>("/teammates/teams"),
  teamDetail: (id: string) => get<Team>(`/teammates/teams/${id}`),
  teamCreate: (data: Partial<Team>) => post<Team>("/teammates/teams", data),
  teamUpdate: (id: string, data: Partial<Team>) => patch<Team>(`/teammates/teams/${id}`, data),
  teamDelete: (id: string) => del<{ deleted: string }>(`/teammates/teams/${id}`),

  templates: (context = "") =>
    get<{ templates: TemplateInfo[]; context: string }>(
      `/templates${context ? `?context=${encodeURIComponent(context)}` : ""}`,
    ),
  templateInstall: (id: string, client: string) =>
    post<TemplateInstallResult>(`/templates/${id}/install`, { client }),
  templateUninstall: (id: string, client: string) =>
    post<{ template_id: string; client: string; missions_archived: number; schedules_archived: number }>(
      `/templates/${id}/uninstall`,
      { client },
    ),

  researchCreate: (topic: string, context = "", depth = "deep") =>
    post<ResearchReport>(`/research`, { topic, context, depth }),
  researchList: (context = "") =>
    get<{ reports: ResearchReport[]; context: string }>(
      `/research${context ? `?context=${encodeURIComponent(context)}` : ""}`,
    ),
  researchDetail: (id: string) => get<ResearchReport>(`/research/${id}`),
  researchDelete: (id: string) => del<{ deleted: string }>(`/research/${id}`),

  routines: () => get<Routine[]>(`/routines`),
  routineCreate: (data: Partial<Routine>) => post<Routine>(`/routines`, data),
  routineDetail: (id: string) => get<Routine>(`/routines/${id}`),
  routineUpdate: (id: string, data: Partial<Routine>) => patch<Routine>(`/routines/${id}`, data),
  routineDelete: (id: string) => del<{ deleted: string }>(`/routines/${id}`),
  routineRun: (id: string, payload: { inputs?: Record<string, unknown> }) => post<{ task_id: string; routine_id: string; status: string }>(`/routines/${id}/run`, payload),
  routinePause: (id: string) => post<Routine>(`/routines/${id}/pause`),
  routineResume: (id: string) => post<Routine>(`/routines/${id}/resume`),

  connectors: () => get<{ connectors: ConnectorInfo[] }>(`/connectors`),
  connectorConfigure: (id: string, config: Record<string, string>) =>
    post<{ connector: ConnectorInfo }>(`/connectors/${id}/configure`, { config }),
  connectorTest: (id: string) => post<{ connector: ConnectorInfo }>(`/connectors/${id}/test`, {}),

  mcpList: () => get<{ servers: McpServerInfo[] }>(`/mcp`),
  mcpRegister: (body: {
    name: string;
    transport: string;
    command: string;
    args: string[];
    url: string;
    tools: Record<string, unknown>[];
  }) => post<{ server: McpServerInfo }>(`/mcp`, body),
  mcpProbe: (id: string) => post<{ server: McpServerInfo }>(`/mcp/${id}/probe`, {}),
  mcpCallTool: (id: string, payload: { name: string; arguments: Record<string, unknown> }) =>
    post<Record<string, unknown>>(`/mcp/${id}/tools/call`, payload),
  mcpDelete: (id: string) => del<{ deleted: string }>(`/mcp/${id}`),

  talkRooms: () => get<TalkRoom[]>("/talk/rooms"),
  talkRoom: (id: string) => get<TalkRoom>(`/talk/rooms/${id}`),
  talkRoomMessages: (id: string) =>
    get<{ room: TalkRoom; messages: TalkMessage[] }>(`/talk/rooms/${id}/messages`),
  talkRoomCreate: (data: {
    name: string;
    topic: string;
    speaker_keys: string[];
    mode: "groq" | "opencode";
    thinking: "plain" | "deep" | "super";
    client?: string;
    chief_key?: string;
    team_id?: string | null;
  }) => post<TalkRoom>("/talk/rooms", data),
  talkRoomDelete: (id: string) => del<{ deleted: string }>(`/talk/rooms/${id}`),
  talkSend: (id: string, content: string, addressed_to = "") =>
    post<{ message: TalkMessage; room: TalkRoom }>(`/talk/rooms/${id}/messages`, {
      content,
      addressed_to,
    }),
  talkKickRound: (id: string) =>
    post<{ ok: boolean; room_id: string }>(`/talk/rooms/${id}/round`, {
      triggered_by: "user",
    }),
};
