import React, { useEffect, useState } from "react";
import { api, AgentInfo, AgentRun, ScheduledJob } from "../api";
import { Card, Spinner, ErrorBanner, StatusPill } from "../components/ui";

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "json";
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

type AgentSpec = {
  description: string;
  fields: FieldDef[];
  toPayload: (v: Record<string, string>) => Record<string, unknown>;
};

const AGENT_SPECS: Record<string, AgentSpec> = {
  brand: {
    description: "Generates an on-brand piece of content for a platform.",
    fields: [
      { key: "content", label: "Content brief", type: "textarea", required: true },
      { key: "platform", label: "Platform", type: "select", options: ["linkedin", "instagram", "x", "website", "email"] },
    ],
    toPayload: (v) => ({ content: v.content, platform: v.platform }),
  },
  research: {
    description: "Searches for market opportunities and stores them for the Content Agent.",
    fields: [
      { key: "extra_context", label: "Extra context (optional)", type: "textarea" },
    ],
    toPayload: (v) => ({ extra_context: v.extra_context }),
  },
  content: {
    description: "Creates N pieces of content from a research opportunity and validates them.",
    fields: [
      { key: "platform", label: "Platform", type: "select", options: ["linkedin", "instagram", "x", "website", "email"] },
      { key: "count", label: "Count", type: "select", options: ["1", "2", "3"] },
      { key: "approve", label: "Auto-approve", type: "select", options: ["true", "false"] },
    ],
    toPayload: (v) => ({ platform: v.platform, count: parseInt(v.count || "1", 10), approve: v.approve === "true" }),
  },
  video: {
    description: "Plans a video concept (script, scenes, captions) for a topic.",
    fields: [{ key: "topic", label: "Topic", type: "text", required: true }],
    toPayload: (v) => ({ topic: v.topic }),
  },
  image: {
    description: "Writes an image-generation prompt from an idea.",
    fields: [
      { key: "idea", label: "Idea", type: "textarea", required: true },
      { key: "style", label: "Style", type: "text", placeholder: "cinematic" },
    ],
    toPayload: (v) => ({ idea: v.idea, style: v.style || "cinematic" }),
  },
  sales: {
    description: "Scores a lead, picks a package and writes a follow-up reply.",
    fields: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email", required: true },
      { key: "company", label: "Company" },
      { key: "message", label: "Message", type: "textarea" },
    ],
    toPayload: (v) => ({ lead: { name: v.name, email: v.email, company: v.company, message: v.message } }),
  },
  analytics: {
    description: "Analyzes marketing data and writes a daily report.",
    fields: [
      { key: "report_data", label: "Report data (JSON)", type: "json", placeholder: '{"content": 10, "leads": 4}' },
    ],
    toPayload: (v) => {
      try {
        return { report_data: v.report_data ? JSON.parse(v.report_data) : {} };
      } catch {
        return { report_data: {} };
      }
    },
  },
};

export default function Agents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selected, setSelected] = useState<string>("brand");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<ScheduledJob[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [schedBusy, setSchedBusy] = useState<string | null>(null);
  const [schedError, setSchedError] = useState<string | null>(null);

  const loadSchedule = () => api.agentSchedule().then(setSchedule).catch(() => {});
  const loadRuns = () => api.agentRuns(20).then(setRuns).catch(() => {});

  useEffect(() => {
    api.agents().then(setAgents).catch(() => {});
    loadSchedule();
    loadRuns();
    const t = setInterval(loadRuns, 10000);
    return () => clearInterval(t);
  }, []);

  const spec = AGENT_SPECS[selected];

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await api.runAgent(selected, spec.toPayload(values));
      setResult(JSON.stringify(res.result, null, 2));
      loadRuns();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runJobNow = async (job: ScheduledJob) => {
    setSchedError(null);
    setSchedBusy(job.id);
    try {
      await api.runJobNow(job.id);
      setTimeout(loadRuns, 1500);
      setTimeout(loadSchedule, 1500);
    } catch (err) {
      setSchedError((err as Error).message);
    } finally {
      setSchedBusy(null);
    }
  };

  const toggleJob = async (job: ScheduledJob) => {
    setSchedError(null);
    try {
      await api.agentScheduleUpdate(job.id, { enabled: !job.enabled });
      loadSchedule();
    } catch (err) {
      setSchedError((err as Error).message);
    }
  };

  const jobLabel = (job: ScheduledJob) => {
    const name = job.agent.replace(/_/g, " ");
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const jobWhen = (job: ScheduledJob) =>
    job.job_type === "interval"
      ? `every ${job.interval_minutes} min`
      : `daily at ${job.schedule_time}`;

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "never";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">AI Agents</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Your 7 AI employees work on autopilot — they do their jobs at set times.
          Pick one below for a manual run, or manage the schedule.
        </p>
      </div>

      <ErrorBanner message={error} />

      {/* Autopilot schedule */}
      <Card
        title="Autopilot · scheduled jobs"
        action={
          <button
            onClick={() => { loadSchedule(); loadRuns(); }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            refresh
          </button>
        }
      >
        <ErrorBanner message={schedError} />
        <div className="space-y-2">
          {schedule.length === 0 && (
            <p className="text-sm text-zinc-500">No jobs yet.</p>
          )}
          {schedule.map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${job.enabled ? "text-white" : "text-zinc-500 line-through"}`}>
                    {jobLabel(job)}
                  </span>
                  {job.enabled ? (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {jobWhen(job)} · last run {fmtTime(job.last_run_at)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runJobNow(job)}
                  disabled={schedBusy !== null}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition disabled:opacity-50"
                >
                  {schedBusy === job.id ? "Running…" : "Run now"}
                </button>
                <button
                  onClick={() => toggleJob(job)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    job.enabled
                      ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                  }`}
                >
                  {job.enabled ? "On" : "Off"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="1 · Choose an agent">
          <div className="space-y-1.5">
            {(agents.length ? agents : Object.keys(AGENT_SPECS).map((n) => ({ name: n, role: n }))).map(
              (a) => (
                <button
                  key={a.name}
                  onClick={() => {
                    setSelected(a.name);
                    setValues({});
                    setResult(null);
                  }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    selected === a.name
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span className="capitalize">{a.name}</span>
                  <span className="text-xs text-zinc-600 truncate ml-3">{a.role}</span>
                </button>
              )
            )}
          </div>
        </Card>

        {spec && (
          <Card title={`2 · Run: ${selected}`} action={<span className="text-xs text-zinc-500">{spec.description}</span>}>
            <div className="space-y-3">
              {spec.fields.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="block text-xs text-zinc-400">
                    {f.label}
                    {f.required && <span className="text-red-400"> *</span>}
                  </label>
                  {f.type === "textarea" || f.type === "json" ? (
                    <textarea
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      rows={f.type === "json" ? 4 : 3}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  ) : f.type === "select" ? (
                    <select
                      value={values[f.key] ?? f.options?.[0] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    >
                      {f.options?.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              ))}

              <button
                onClick={run}
                disabled={busy}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-50"
              >
                {busy ? "Running…" : "Run agent"}
              </button>
              {busy && <Spinner label="Agent is working…" />}
            </div>
          </Card>
        )}
      </div>

      {result && (
        <Card title="Result">
          <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-emerald-200 whitespace-pre-wrap">
            {result}
          </pre>
        </Card>
      )}

      <Card title="Run history" action={<span className="text-xs text-zinc-500">auto-refreshes</span>}>
        {runs.length === 0 ? (
          <p className="text-sm text-zinc-500">No runs yet. Trigger one manually or wait for the autopilot.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize text-zinc-200">
                      {r.agent.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-zinc-600">{r.job_type}</span>
                    <span className="text-xs text-zinc-600">
                      {fmtTime(r.started_at)} · {(r.duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {r.status === "failed" ? r.error : r.summary || "—"}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
