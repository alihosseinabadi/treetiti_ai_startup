import React, { useEffect, useState } from "react";
import { api, ContentItem } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

const FILTERS = ["", "pending_approval", "approved", "published", "rejected", "draft"] as const;

export default function Content() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    api
      .content({ status: filter || undefined })
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, [filter]);

  const setStatus = async (id: string, status: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.contentStatus(id, status);
      setNotice(`Marked ${status}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setNotice(null), 2000);
    }
  };

  const publish = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.publish(id, "telegram");
      setNotice(`Published to Telegram`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Content</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Review, approve and publish the content your agents produce.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs border transition ${
                filter === f
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {f || "all"}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />
      {notice && <p className="text-xs text-emerald-400">{notice}</p>}
      {busy && <p className="text-xs text-zinc-500">Working…</p>}

      {items.length === 0 ? (
        <Card title="No content">
          <p className="text-sm text-zinc-500">
            Generate content with the Content Creation Agent on the Agents page.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40">
              <button
                className="w-full flex items-center justify-between gap-4 px-5 py-3 text-left"
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              >
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{c.title}</div>
                  <div className="text-xs text-zinc-500">
                    {c.platform} · {c.content_type}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.engagement_score != null && (
                    <span className="text-xs font-mono text-zinc-400">{c.engagement_score}</span>
                  )}
                  <StatusPill status={c.status} />
                </div>
              </button>

              {expanded === c.id && (
                <div className="px-5 pb-4 space-y-3">
                  {c.hook && (
                    <p className="text-sm text-zinc-300">
                      <span className="text-zinc-500">Hook: </span>
                      {c.hook}
                    </p>
                  )}
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{c.body}</p>
                  {c.cta && (
                    <p className="text-sm text-emerald-300">
                      <span className="text-zinc-500">CTA: </span>
                      {c.cta}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => setStatus(c.id, "approved")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500/15 border border-emerald-700 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(c.id, "rejected")}
                      disabled={busy}
                      className="rounded-lg bg-red-500/15 border border-red-800 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => publish(c.id)}
                      disabled={busy || c.status !== "approved"}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Publish → Telegram
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
