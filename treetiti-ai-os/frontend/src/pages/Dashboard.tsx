import React, { useEffect, useState } from "react";
import { api, ContentItem, Lead } from "../api";
import { Card, Spinner, ErrorBanner } from "../components/ui";

function useData() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = () =>
    Promise.all([api.content({ limit: 200 }), api.leads()])
      .then(([c, l]) => {
        setContent(c);
        setLeads(l);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);
  return { content, leads, error, loading, reload };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-5 py-4">
      <div className="text-3xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { content, leads, error, loading, reload } = useData();

  const statusCount = (arr: { status: string }[], status: string) =>
    arr.filter((x) => x.status === status).length;

  if (loading) {
    return (
      <div className="pt-20">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your AI marketing operation at a glance.</p>
        </div>
        <button
          onClick={reload}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition"
        >
          Refresh
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Content pieces" value={content.length} />
        <Stat label="Awaiting approval" value={statusCount(content, "pending_approval")} />
        <Stat label="Published" value={statusCount(content, "published")} />
        <Stat label="Leads captured" value={leads.length} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Recent leads" action={<span className="text-xs text-zinc-500">by score</span>}>
          {leads.length === 0 ? (
            <p className="text-sm text-zinc-500">No leads yet. Wire a form to POST /leads.</p>
          ) : (
            <ul className="space-y-2">
              {[...leads]
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm text-white">{l.name || l.email}</div>
                      <div className="text-xs text-zinc-500">{l.company || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-400">{l.score}</span>
                      <span className="text-xs text-zinc-600">{l.status}</span>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card
          title="Latest content"
          action={<span className="text-xs text-zinc-500">{content.length} total</span>}
        >
          {content.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nothing generated yet. Try the Content Creation Agent.
            </p>
          ) : (
            <ul className="space-y-2">
              {content.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{c.title}</div>
                    <div className="text-xs text-zinc-500">{c.platform}</div>
                  </div>
                  <span className="text-xs text-zinc-600">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
