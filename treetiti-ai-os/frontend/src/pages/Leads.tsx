import React, { useEffect, useState } from "react";
import { api, Lead } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"];

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () =>
    api
      .leads()
      .then(setLeads)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.leadStatus(id, status);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Leads</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Every lead, auto-scored by the Sales Agent. Set its status as you work it.
        </p>
      </div>

      <ErrorBanner message={error} />

      {leads.length === 0 ? (
        <Card title="No leads yet">
          <p className="text-sm text-zinc-500">
            POST to <code className="text-zinc-400">/api/v1/leads</code> (public webhook) or wire
            it to n8n. The Sales Agent will score each one automatically.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {[...leads]
            .sort((a, b) => b.score - a.score)
            .map((l) => (
              <div key={l.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {l.name || l.email}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {l.company} · {l.email}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-semibold ${
                        l.score >= 70 ? "text-emerald-400" : l.score >= 40 ? "text-amber-400" : "text-zinc-500"
                      }`}
                    >
                      {l.score}
                    </div>
                    <div className="text-[11px] text-zinc-600">score</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <StatusPill status={l.status} />
                  {l.customer_type && (
                    <span className="text-xs text-zinc-500">{l.customer_type}</span>
                  )}
                </div>

                {l.recommended_package && (
                  <div className="mt-2 text-xs text-zinc-400">
                    Package: <span className="text-emerald-300">{l.recommended_package}</span>
                  </div>
                )}

                {l.message && (
                  <p className="mt-3 text-sm text-zinc-300 line-clamp-2">{l.message}</p>
                )}

                <button
                  onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                  className="mt-3 text-xs text-zinc-500 hover:text-white transition"
                >
                  {expanded === l.id ? "Hide suggested reply" : "Show suggested reply"}
                </button>

                {expanded === l.id && l.suggested_reply && (
                  <div className="mt-2 rounded-lg bg-zinc-950 p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                    {l.suggested_reply}
                  </div>
                )}

                <div className="flex gap-2 mt-4 flex-wrap">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(l.id, s)}
                      disabled={busy || l.status === s}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition disabled:opacity-40 ${
                        l.status === s
                          ? "border-emerald-600 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
