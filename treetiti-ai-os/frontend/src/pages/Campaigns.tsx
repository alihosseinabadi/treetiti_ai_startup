import React, { useEffect, useState } from "react";
import { api, Campaign } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

const STATUSES = ["draft", "planning", "active", "archived"] as const;

export default function Campaigns() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [strategy, setStrategy] = useState("");

  const load = () =>
    api
      .campaigns()
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim() || !objective.trim()) return;
    setError(null);
    try {
      await api.campaignCreate({
        title: title.trim(),
        objective: objective.trim(),
        target_audience: audience,
        strategy,
      });
      setNotice(`Created "${title.trim()}"`);
      setTitle("");
      setObjective("");
      setAudience("");
      setStrategy("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const setStatus = async (id: string, status: string) => {
    setError(null);
    try {
      await api.campaignUpdate(id, { status });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Campaigns</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Goal-driven initiatives: objective → strategy → multi-platform content.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card title="New campaign">
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campaign title"
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Objective (what it must achieve)"
            rows={2}
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Target audience"
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <textarea
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            placeholder="Strategy / thesis"
            rows={2}
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            onClick={create}
            disabled={!title.trim() || !objective.trim()}
            className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-text-primary hover:bg-success transition disabled:opacity-50"
          >
            Create
          </button>
          {notice && <span className="ml-3 text-xs text-success">{notice}</span>}
        </div>
      </Card>

      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/[0.06] bg-bg-secondary p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">{c.title}</span>
                  <StatusPill status={c.status} />
                </div>
                <div className="text-sm text-text-muted mt-2">{c.objective}</div>
                {c.target_audience && (
                  <div className="text-xs text-text-muted mt-1">Audience: {c.target_audience}</div>
                )}
                {c.strategy && <div className="text-xs text-text-muted mt-1">{c.strategy}</div>}
              </div>
              <select
                value={c.status}
                onChange={(e) => setStatus(c.id, e.target.value)}
                className="rounded-lg border border-white/[0.1] bg-bg-secondary px-2 py-1.5 text-xs text-text-muted"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {items.length === 0 && !error && (
          <div className="text-sm text-text-muted text-center py-8">No campaigns yet.</div>
        )}
      </div>
    </div>
  );
}