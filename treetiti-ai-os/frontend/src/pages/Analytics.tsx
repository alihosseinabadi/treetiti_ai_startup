import React, { useEffect, useState } from "react";
import { api, AgentRun, ContentItem, Lead, ProviderUsage } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-bg-secondary p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary">{value}</div>
      {hint && <div className="text-[11px] text-text-muted mt-1">{hint}</div>}
    </div>
  );
}

export default function Analytics() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usage, setUsage] = useState<ProviderUsage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.agentRuns(200).then(setRuns).catch(() => {});
    api.content({ limit: 200 }).then(setContent).catch(() => {});
    api.leads().then(setLeads).catch(() => {});
    api.providerUsage().then((r) => setUsage(r.usage)).catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const completed = runs.filter((r) => r.status === "success");
  const failed = runs.filter((r) => r.status === "failed");
  const avgDuration = completed.length
    ? completed.reduce((s, r) => s + r.duration_ms, 0) / completed.length / 1000
    : 0;
  const successRate = runs.length ? Math.round((completed.length / runs.length) * 100) : 0;
  const approvedContent = content.filter((c) => c.status === "approved").length;
  const pendingContent = content.filter((c) => c.status === "pending").length;

  const runsByAgent = new Map<string, number>();
  for (const r of runs) runsByAgent.set(r.agent, (runsByAgent.get(r.agent) ?? 0) + 1);
  const topAgents = [...runsByAgent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const totalRequests = usage.reduce((s, u) => s + u.requests, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Agent activity, content, leads and model usage across your operation.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Agent runs" value={runs.length} hint={`${completed.length} succeeded`} />
        <StatCard label="Success rate" value={`${successRate}%`} hint={`${failed.length} failed`} />
        <StatCard label="Avg run time" value={`${avgDuration.toFixed(1)}s`} />
        <StatCard label="LLM requests today" value={totalRequests} />
        <StatCard label="Content pieces" value={content.length} hint={`${approvedContent} approved`} />
        <StatCard label="Pending approval" value={pendingContent} />
        <StatCard label="Leads" value={leads.length} />
        <StatCard label="Failed runs" value={failed.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Runs by agent">
          {topAgents.length === 0 ? (
            <p className="text-sm text-text-muted">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {topAgents.map(([agent, count]) => {
                const max = topAgents[0][1];
                return (
                  <div key={agent} className="flex items-center gap-3">
                    <span className="w-32 truncate text-xs capitalize text-text-muted">
                      {agent.replace(/_/g, " ")}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success/70"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-text-muted">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Provider usage today">
          {usage.length === 0 ? (
            <p className="text-sm text-text-muted">No usage recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {usage.map((u) => (
                <div key={u.provider} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-2">
                  <span className="text-sm text-text-primary">{u.provider}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-40 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent/70"
                        style={{ width: `${Math.min(100, (u.requests / Math.max(u.daily_limit, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted">
                      {u.requests}/{u.daily_limit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Recent runs">
          {runs.length === 0 ? (
            <p className="text-sm text-text-muted">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary capitalize truncate">{r.agent.replace(/_/g, " ")}</div>
                    <div className="text-xs text-text-muted">{r.job_type} · {(r.duration_ms / 1000).toFixed(1)}s</div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Failed runs">
          {failed.length === 0 ? (
            <p className="text-sm text-text-muted">No failed runs — everything is healthy.</p>
          ) : (
            <div className="space-y-2">
              {failed.slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-2">
                  <div className="text-sm text-text-primary capitalize truncate">{r.agent.replace(/_/g, " ")}</div>
                  <div className="text-xs text-text-muted truncate">{r.error || r.summary}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}