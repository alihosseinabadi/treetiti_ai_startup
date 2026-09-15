import React, { useCallback, useEffect, useState } from "react";
import { api, MediaAsset, formatAgentResult } from "../api";

export default function Design() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  const load = useCallback(() => {
    api.assets().then((l) => setAssets(l.slice(0, 12))).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const direction = async () => {
    const brief = q.trim();
    if (!brief || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.runAgentWait("creative_director", { brief });
      setResult(res.status === "completed" ? formatAgentResult(res.result) : `Creative Director ${res.status}.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const visual = async () => {
    const brief = q.trim();
    if (!brief || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const a = await api.assetGenerate({ kind: "image", prompt: brief, title: brief.slice(0, 60) });
      setResult(`Generated image — ${a.url}`);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">Design</div>
        <p className="t-sub">
          Creative direction, brand visuals and image concepts. Say what you need — TREEtiti creates.
        </p>

        <div className="mt-6 flex gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && direction()}
            placeholder="e.g. A premium summer campaign visual for Marina Tower"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-bg-secondary px-4 py-3 text-sm text-text-primary shadow-sm outline-none focus:border-accent"
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="t-btn t-btn-primary" onClick={direction} disabled={busy || !q.trim()}>
            Creative direction
          </button>
          <button className="t-btn t-btn-ghost" onClick={visual} disabled={busy || !q.trim()}>
            Create visual
          </button>
        </div>

        {err && <div className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{err}</div>}

        {result && (
          <div className="t-card mt-4 p-5">
            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Result</div>
            <div className="t-md whitespace-pre-wrap text-sm text-text-primary">{result}</div>
          </div>
        )}

        <div className="mt-8">
          <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-text-muted">Recent visuals</div>
          {assets.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-6 text-center text-sm text-text-muted">
              No visuals yet. Generate one above.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {assets.map((a) => (
              <div key={a.id} className="t-card overflow-hidden">
                {a.url ? (
                  <img src={a.url} alt={a.title} className="h-32 w-full object-cover" />
                ) : (
                  <div className="grid h-32 place-items-center bg-bg-secondary text-2xl text-text-secondary">◐</div>
                )}
                <div className="px-3 py-2">
                  <div className="truncate text-xs font-medium text-text-primary">{a.title}</div>
                  <div className="text-[10px] text-text-muted">{a.kind} · {a.creator_agent || "agent"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}