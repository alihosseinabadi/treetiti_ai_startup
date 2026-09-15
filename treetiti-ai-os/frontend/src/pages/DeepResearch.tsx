import React, { useEffect, useState } from "react";
import { api, ResearchReport } from "../api";
import { getContext } from "./Home";

const STAGES = ["Discovery", "Extraction", "Synthesis", "Report"];

function confClass(c: string): string {
  if (c === "high") return "bg-success/20 text-success";
  if (c === "medium") return "bg-warning/10 text-warning";
  return "bg-error/10 text-error";
}

function typeClass(t: string): string {
  if (t === "fact") return "bg-accent/10 text-accent";
  if (t === "opinion") return "bg-violet/10 text-violet";
  return "bg-white/[0.06] text-text-muted";
}

function ReportCard({ r }: { r: ResearchReport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="t-card p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-primary">{r.topic}</span>
        <span className="t-pill t-pill-gray">{r.depth}</span>
        {r.client && <span className="t-pill t-pill-blue">{r.client}</span>}
        <span
          className={`t-pill ${
            (r.meta?.synthesis ?? "template") === "llm" ? "t-pill-green" : "t-pill-amber"
          }`}
        >
          {(r.meta?.synthesis ?? "template") === "llm" ? "LLM synthesis" : "auto synthesis"}
        </span>
        <span className="ml-auto text-[11px] text-text-muted">
          {r.sources.length} sources · {(r.meta?.took_ms ?? 0) / 1000}s · {r.created_at?.slice(0, 16).replace("T", " ")}
        </span>
      </div>
      <p className="mt-1 text-xs text-text-muted">{r.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {r.findings.slice(0, 3).map((f, i) => (
          <span key={i} className={`rounded-md px-2 py-0.5 text-[10px] ${confClass(f.confidence)}`}>
            {f.confidence}
          </span>
        ))}
        <button
          className="ml-auto text-[11px] font-medium text-accent hover:underline"
          onClick={() => setOpen(!open)}
        >
          {open ? "Collapse" : "View report"}
        </button>
      </div>
      {open && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <div className="space-y-2">
            {r.findings.map((f, i) => (
              <div key={i} className="text-xs text-text-primary">
                <span className="flex flex-wrap items-center gap-1">
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${confClass(f.confidence)}`}>{f.confidence}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${typeClass(f.type)}`}>{f.type}</span>
                  {f.source && (
                    <a href={f.source} target="_blank" rel="noreferrer" className="text-[10px] text-accent underline">
                      source
                    </a>
                  )}
                </span>
                <p className="mt-0.5">{f.claim}</p>
              </div>
            ))}
          </div>
          {r.insights.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Insights</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-text-muted">
                {r.insights.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {r.recommendations.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Recommendations</div>
              <ul className="mt-1 list-disc pl-4 text-xs text-text-muted">
                {r.recommendations.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          {r.sources.length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Sources</div>
              <ul className="mt-1 space-y-0.5">
                {r.sources.map((s, k) => (
                  <li key={k} className="text-[11px]">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {s.title || s.url} <span className="text-text-muted">· {s.kind}</span>
                      </a>
                    ) : (
                      <span className="text-text-muted">{s.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeepResearch() {
  const [q, setQ] = useState("");
  const [depth, setDepth] = useState("deep");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const [history, setHistory] = useState<ResearchReport[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const ctx = getContext();

  const load = () => {
    api
      .researchList(ctx)
      .then((d) => setHistory(d.reports))
      .catch((e) => setErr((e as Error).message));
  };

  useEffect(load, []);

  const run = async () => {
    const topic = q.trim();
    if (!topic || busy) return;
    setErr(null);
    setBusy(true);
    setStage(0);
    const timer = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length));
    }, 12000);
    try {
      await api.researchCreate(topic, ctx, depth);
      setQ("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      clearInterval(timer);
      setStage(STAGES.length);
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this research report?")) return;
    try {
      await api.researchDelete(id);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">Deep Research</div>
        <p className="t-sub">
          Real multi-source research: it searches the web, news, Reddit and YouTube in parallel, reads the
          top pages, and synthesizes a source-grounded report. Every claim carries a source, confidence and
          claim type.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="e.g. Luxury real estate marketing trends 2026"
            className="min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-bg-secondary px-4 py-3 text-sm text-text-primary shadow-sm outline-none focus:border-accent"
          />
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
            className="rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-3 text-sm text-text-primary shadow-sm outline-none"
          >
            <option value="quick">Quick (1 query)</option>
            <option value="deep">Deep (multi-angle)</option>
          </select>
          <button className="t-btn t-btn-primary !px-5" onClick={run} disabled={busy || !q.trim()}>
            {busy ? "Researching…" : "Research"}
          </button>
        </div>

        {busy && (
          <div className="t-exec mt-4">
            {STAGES.map((s, i) => (
              <div key={s} className={`t-exec-step ${i < stage ? "done" : i === stage ? "working" : "pending"}`}>
                <span className="t-st-dot" />
                <span>{s}</span>
                {i < stage && <span className="ml-auto text-xs text-success">✓</span>}
              </div>
            ))}
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{err}</div>
        )}

        <div className="mt-6 space-y-3">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            History {ctx && <span>· {ctx}</span>}
          </div>
          {history.length === 0 && !busy && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              No research reports yet. Run your first deep research above.
            </div>
          )}
          {history.map((r) => (
            <div key={r.id} className="relative">
              <button
                className="absolute -right-2 -top-2 z-10 rounded-full bg-bg-secondary border border-error/30 px-2 py-0.5 text-[10px] text-error hover:bg-error/10"
                onClick={() => remove(r.id)}
              >
                ✕
              </button>
              <ReportCard r={r} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}