import React, { useEffect, useState } from "react";
import { api, ProviderInfo, ProviderHealth } from "../api";
import { Card, ErrorBanner, Spinner } from "../components/ui";

export default function Integrations() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [checkedAt, setCheckedAt] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [p, h] = await Promise.all([
        api.providers(),
        force ? api.providerProbe() : api.providerHealth(),
      ]);
      setProviders(p.providers);
      setHealth(h.results);
      setCheckedAt(h.checked_at);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byStatus = (s: string) => health.filter((h) => h.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Integrations</h1>
          <p className="text-sm text-text-muted mt-0.5">
            LLM providers available through the 9Router gateway, with live health probes.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-text-primary hover:bg-success transition disabled:opacity-50"
        >
          {loading ? "Probing…" : "Probe now"}
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-bg-secondary p-4">
          <div className="text-xs text-text-muted">Providers</div>
          <div className="mt-1 text-2xl font-semibold text-text-primary">{providers.length}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-bg-secondary p-4">
          <div className="text-xs text-text-muted">Healthy models</div>
          <div className="mt-1 text-2xl font-semibold text-success">{byStatus("ok")}</div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-bg-secondary p-4">
          <div className="text-xs text-text-muted">Unhealthy</div>
          <div className="mt-1 text-2xl font-semibold text-error">{byStatus("error")}</div>
        </div>
      </div>

      <Card
        title="Provider catalog"
        action={
          checkedAt ? (
            <span className="text-xs text-text-muted">
              last checked {new Date(checkedAt * 1000).toLocaleString()}
            </span>
          ) : undefined
        }
      >
        {providers.length === 0 ? (
          <p className="text-sm text-text-muted">No providers configured.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {providers.map((p) => (
              <div key={p.prefix} className="rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-text-muted">
                      {p.prefix}
                    </span>
                  </div>
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      p.enabled ? "bg-success" : "bg-hover"
                    }`}
                    title={p.enabled ? "enabled" : "disabled"}
                  />
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {p.capabilities.join(", ")} · {p.cost_tier} ·{" "}
                  {p.key_configured ? "key set" : "no key"}
                </div>
                {p.notes && <div className="text-[11px] text-text-muted mt-0.5">{p.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Health probe results">
        {loading ? (
          <Spinner label="Probing providers…" />
        ) : health.length === 0 ? (
          <p className="text-sm text-text-muted">No health data yet. Run a probe.</p>
        ) : (
          <div className="space-y-2">
            {health.map((h) => (
              <div
                key={h.model}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-bg-secondary px-4 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                      h.status === "ok" ? "bg-success" : "bg-error"
                    }`}
                  />
                  <span className="text-sm text-text-primary font-mono truncate">{h.model}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  {h.status === "ok" ? (
                    <span className="text-success">{h.latency_ms}ms</span>
                  ) : (
                    <span className="text-error/80 truncate max-w-56">{h.error}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}