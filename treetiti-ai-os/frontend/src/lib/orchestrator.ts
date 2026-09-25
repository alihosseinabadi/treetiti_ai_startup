import { api } from "../api";

export type PlanStep = {
  key: string;
  label: string;
  color: string;
  initials: string;
  blurb: string;
  result?: string | null;
};
export type PendingQ = { step: string; agent: string; slot: string; question: string };
export type Plan = {
  run_id: string;
  goal: string;
  status: "awaiting_answers" | "ready" | "done";
  steps: PlanStep[];
  pending_questions: PendingQ[];
};

async function req<T>(path: string, body?: unknown): Promise<T> {
  const { getToken } = await import("../api");
  const res = await fetch(`/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const orchestrator = {
  plan: (goal: string, project_id?: string | null) =>
    req<Plan>("/orchestrator/plan", { goal, project_id: project_id ?? null }),
  answer: (run_id: string, answers: Record<string, string>) =>
    req<Plan>("/orchestrator/answer", { run_id, answers }),
  execute: (run_id: string) => req<Plan>("/orchestrator/execute", { run_id }),
};

// Re-export chat for fallback single-shot replies.
export { api };
