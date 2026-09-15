import React, { useEffect, useState } from "react";
import { api, ConnectorInfo } from "../api";

function statusClass(s: string): string {
  if (s === "ok") return "t-pill t-pill-green";
  if (s === "error") return "t-pill t-pill-red";
  if (s === "configured") return "t-pill t-pill-blue";
  return "t-pill t-pill-gray";
}

export default function Connectors() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    api
      .connectors()
      .then((d) => setConnectors(d.connectors))
      .catch((e) => setErr((e as Error).message));
  };

  useEffect(load, []);

  const save = async (c: ConnectorInfo) => {
    setBusy(c.id);
    setErr(null);
    try {
      await api.connectorConfigure(c.id, drafts[c.id] ?? {});
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const test = async (c: ConnectorInfo) => {
    setBusy(c.id);
    setErr(null);
    try {
      await api.connectorTest(c.id);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const groups = new Map<string, ConnectorInfo[]>();
  for (const c of connectors) {
    const list = groups.get(c.category) ?? [];
    list.push(c);
    groups.set(c.category, list);
  }

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">APIs & Connectors</div>
        <p className="t-sub">
          External service connectors. Save keys, then probe each one to confirm it is reachable.
          MCP servers — the agent tool layer — live on the MCP page.
        </p>

        {err && (
          <div className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{err}</div>
        )}

        {[...groups.entries()].map(([cat, items]) => (
          <div key={cat} className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">{cat}</div>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((c) => (
                <div key={c.id} className="t-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">{c.name}</span>
                    <span className={statusClass(c.last_status)}>{c.last_status}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{c.description}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {c.capabilities.map((cap) => (
                      <span key={cap} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted">
                        {cap}
                      </span>
                    ))}
                  </div>
                  {c.last_error && <p className="mt-1.5 text-[11px] text-error">{c.last_error}</p>}
                  {!c.configured && (
                    <div className="mt-2 space-y-1.5">
                      {c.config_keys.map((k) => (
                        <input
                          key={k}
                          value={drafts[c.id]?.[k] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [c.id]: { ...(d[c.id] ?? {}), [k]: e.target.value } }))
                          }
                          placeholder={k}
                          className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-2.5 py-1.5 font-mono text-[11px] text-text-primary outline-none focus:border-accent"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {!c.configured && (
                      <button className="t-btn t-btn-primary !py-1.5 !text-xs" disabled={busy === c.id} onClick={() => save(c)}>
                        {busy === c.id ? "Saving…" : "Save"}
                      </button>
                    )}
                    <button className="t-btn t-btn-ghost !py-1.5 !text-xs" disabled={busy === c.id} onClick={() => test(c)}>
                      Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}