import React, { useEffect, useState } from "react";
import { api, ChatHistoryItem, MemoryItem } from "../api";
import { Card, ErrorBanner } from "../components/ui";

export default function Memory() {
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("services");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("TREEtiti");
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [chatHits, setChatHits] = useState<ChatHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.memoryCategories().then(setCategories).catch(() => {});
  }, []);

  const search = () => {
    api
      .memorySearch(query)
      .then(setItems)
      .catch((e) => setError((e as Error).message));
    api
      .chatHistorySearch(query, 5)
      .then(setChatHits)
      .catch(() => setChatHits([]));
  };

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.memoryAdd(category, title, content);
      setNotice("Stored in brand memory");
      setTitle("");
      setContent("");
      search();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setNotice(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Brand Memory</h1>
        <p className="text-sm text-text-muted mt-0.5">
          The long-term knowledge base every agent and the chat brain read from.
        </p>
      </div>

      <ErrorBanner message={error} />
      {notice && <p className="text-xs text-success">{notice}</p>}

      <Card title="Add to brand memory">
        <form onSubmit={add} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-text-muted">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs text-text-muted">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. TREEtiti AI Agent packages"
                className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-text-muted">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              placeholder="What the brain should know, in plain words…"
              className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-bg-primary hover:bg-success transition disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save to memory"}
          </button>
        </form>
      </Card>

      <Card
        title="Search memory"
        action={
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent w-56"
            />
            <button
              type="submit"
              className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-text-muted hover:bg-secondary/[0.06] transition"
            >
              Search
            </button>
          </form>
        }
      >
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">No memories match.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id} className="rounded-lg border border-white/[0.06] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{m.title}</span>
                  {m.score != null && (
                    <span className="text-xs font-mono text-text-muted">
                      {(m.score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-muted mt-0.5">{m.content}</div>
                <div className="text-[11px] text-text-muted mt-1">#{m.category}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Past conversations (all chat sessions)"
        action={
          chatHits.length > 0 ? (
            <span className="text-xs text-text-muted">{chatHits.length} recalled</span>
          ) : undefined
        }
      >
        {chatHits.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nothing recalled yet. Ask anything in chat — the brain now remembers every
            conversation across all sessions.
          </p>
        ) : (
          <ul className="space-y-2">
            {chatHits.map((h) => (
              <li key={h.session_id + h.excerpt} className="rounded-lg border border-white/[0.06] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">{h.title}</span>
                  <span className="text-xs font-mono text-text-muted">
                    {(h.score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">{h.excerpt}</div>
                <div className="text-[11px] text-text-muted mt-1">{h.session_updated_at.slice(0, 10)}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
