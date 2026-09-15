import React, { useCallback, useEffect, useState } from "react";
import { api, MemoryItem } from "../api";

export default function Docs() {
  const [docs, setDocs] = useState<MemoryItem[]>([]);
  const [sel, setSel] = useState<MemoryItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"view" | "new">("view");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .memorySearch("", undefined, 100)
      .then((items) => setDocs(items.filter((m) => m.category === "document")))
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const create = async () => {
    if (!title.trim()) return;
    setErr(null);
    try {
      await api.memoryAdd("document", title.trim(), content);
      setTitle("");
      setContent("");
      setMode("view");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="flex h-full">
      {/* list */}
      <div className="w-72 shrink-0 overflow-y-auto border-r border-white/[0.06] bg-bg-secondary p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Documents</span>
          <button
            className="text-[11px] font-medium text-accent hover:underline"
            onClick={() => {
              setMode("new");
              setSel(null);
              setTitle("");
              setContent("");
            }}
          >
            + New
          </button>
        </div>
        {docs.length === 0 && (
          <div className="px-2 py-4 text-xs text-text-muted">No documents yet.</div>
        )}
        {docs.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setSel(d);
              setMode("view");
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-[13px] ${
              sel?.id === d.id ? "bg-accent/15 text-accent" : "text-text-muted hover:bg-secondary/[0.06]"
            }`}
          >
            <div className="truncate font-medium">{d.title}</div>
          </button>
        ))}
      </div>

      {/* editor */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-bg-secondary">
        <div className="mx-auto max-w-2xl p-8">
          {mode === "new" && (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full rounded-xl border border-white/[0.1] px-4 py-3 font-display text-lg font-semibold text-text-primary outline-none focus:border-accent"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write in markdown…"
                rows={16}
                className="mt-4 w-full resize-none rounded-xl border border-white/[0.1] bg-bg-secondary px-4 py-3 font-mono text-[13px] leading-relaxed text-text-primary outline-none focus:border-accent"
              />
              {err && <div className="mt-2 text-xs text-error">{err}</div>}
              <div className="mt-4 flex justify-end gap-2">
                <button className="t-btn t-btn-ghost" onClick={() => setMode("view")}>
                  Cancel
                </button>
                <button className="t-btn t-btn-primary" onClick={create}>
                  Save document
                </button>
              </div>
            </>
          )}

          {mode === "view" && !sel && (
            <div className="py-24 text-center text-sm text-text-muted">
              Select a document, or create a new one.
            </div>
          )}

          {mode === "view" && sel && (
            <>
              <h1 className="font-display text-xl font-semibold text-text-primary">{sel.title}</h1>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-primary p-5">
                <div className="t-md whitespace-pre-wrap text-sm text-text-primary">{sel.content}</div>
              </div>
              <button
                className="t-btn t-btn-ghost mt-4"
                onClick={() => {
                  setMode("new");
                  setTitle(`${sel.title} (edit)`);
                  setContent(sel.content);
                }}
              >
                Edit as new version
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}