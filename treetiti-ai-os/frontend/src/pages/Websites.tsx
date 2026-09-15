import React, { useEffect, useMemo, useState } from "react";
import { api, formatAgentResult } from "../api";

type Preset = "clean" | "minimal" | "bold";
type Section = "hero" | "features" | "pricing" | "faq" | "cta";

const PIPELINE = ["Brief", "Sitemap", "Copy", "Design", "Coding", "Preview"];

const PRESETS: Record<Preset, { name: string; bg: string; fg: string; accent: string; radius: string; pad: string }> = {
  clean: { name: "Clean", bg: "#ffffff", fg: "#18181b", accent: "#7aa2f7", radius: "12px", pad: "48px" },
  minimal: { name: "Minimal", bg: "#fafafa", fg: "#1c1f24", accent: "#18181b", radius: "4px", pad: "72px" },
  bold: { name: "Bold", bg: "#16181d", fg: "#ffffff", accent: "#6ea8ff", radius: "20px", pad: "40px" },
};

function titleFrom(brief: string): string {
  const t = brief.replace(/^(a|an|the)\s+/i, "").replace(/[.!?]+$/, "").trim();
  return t.split(/\s+/).slice(0, 5).join(" ") || "Your website";
}

function heroLine(brief: string): string {
  const words = brief.split(/\s+/).filter((w) => w.length > 3);
  return words.slice(0, 7).join(" ") || "The future of your business starts here";
}

export default function Websites() {
  const [brief, setBrief] = useState("");
  const [preset, setPreset] = useState<Preset>("clean");
  const [sections, setSections] = useState<Section[]>(["hero", "features", "cta"]);
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState(-1);
  const [built, setBuilt] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  // A /website <brief> slash command pre-fills this page.
  useEffect(() => {
    const b = sessionStorage.getItem("treetiti_websites_brief");
    if (b) {
      setBrief(b);
      sessionStorage.removeItem("treetiti_websites_brief");
    }
  }, []);

  const spec = useMemo(() => {
    const t = titleFrom(brief || "TREEtiti");
    const hl = heroLine(brief || "A beautiful website, built by TREEtiti");
    return { title: t, hero: hl, tagline: `${t} — a professional website created from a simple brief.` };
  }, [brief]);

  const runPipeline = () => {
    if (!brief.trim() || building) return;
    setBuilding(true);
    setBuilt(false);
    setStage(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setStage(i);
      if (i >= PIPELINE.length) {
        clearInterval(timer);
        setBuilding(false);
        setBuilt(true);
      }
    }, 380);
  };

  const toggleSection = (s: Section) =>
    setSections((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));

  const naturalEdit = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("clean") || t.includes("whitespace") || t.includes("minimal")) setPreset("minimal");
    else if (t.includes("bold") || t.includes("colour") || t.includes("color")) setPreset("bold");
    else if (t.includes("pricing")) setSections((l) => (l.includes("pricing") ? l : [...l, "pricing"]));
    else if (t.includes("faq")) setSections((l) => (l.includes("faq") ? l : [...l, "faq"]));
    else if (t.includes("remove")) setSections(["hero", "cta"]);
    setNote(`Applied: "${text}" → ${preset} preset, ${sections.length} sections.`);
    setBuilt(true);
  };

  const generateCopy = async () => {
    setNote("Asking the Content Agent for copy…");
    try {
      const res = await api.runAgentWait("content", { brief: `Write homepage copy for: ${brief}` });
      setNote(res.status === "completed" ? formatAgentResult(res.result) : `Content Agent ${res.status}.`);
    } catch (e) {
      setNote(`Could not reach Content Agent: ${(e as Error).message}`);
    }
  };

  const p = PRESETS[preset];

  return (
    <div className="flex h-full">
      {/* builder controls */}
      <div className="w-[340px] shrink-0 overflow-y-auto border-r border-white/[0.06] bg-bg-secondary p-4">
        <div className="text-sm font-semibold text-text-primary">Website Creator</div>
        <p className="mt-1 text-xs text-text-muted">
          Describe a site in plain language. TREEtiti builds a first version you can keep refining.
        </p>

        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder='e.g. Make a landing page for TREEtiti AI OS'
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-accent"
        />
        <div className="mt-2 flex gap-2">
          <button className="t-btn t-btn-primary flex-1" onClick={runPipeline} disabled={building || !brief.trim()}>
            {building ? "Building…" : "Build website"}
          </button>
        </div>

        {building && (
          <div className="t-exec mt-3">
            {PIPELINE.map((s, i) => (
              <div key={s} className={`t-exec-step ${i < stage ? "done" : i === stage ? "working" : "pending"}`}>
                <span className="t-st-dot" />
                <span>{s}</span>
                {i < stage && <span className="ml-auto text-xs text-success">✓</span>}
              </div>
            ))}
          </div>
        )}

        {built && (
          <>
            <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-text-muted">Style</div>
            <div className="mt-2 flex gap-2">
              {(Object.keys(PRESETS) as Preset[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setPreset(k)}
                  className={`t-chip ${preset === k ? "!border-accent/50 !bg-accent/10 !text-accent" : ""}`}
                >
                  {PRESETS[k].name}
                </button>
              ))}
            </div>

            <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-text-muted">Sections</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["hero", "features", "pricing", "faq", "cta"] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSection(s)}
                  className={`t-chip ${sections.includes(s) ? "!border-accent/50 !bg-accent/10 !text-accent" : "!opacity-70"}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-text-muted">Iterate</div>
            <input
              placeholder='e.g. "make it cleaner" or "add pricing"'
              className="mt-2 w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none focus:border-accent"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  naturalEdit((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
            <button className="t-btn t-btn-ghost mt-2 w-full" onClick={generateCopy}>
              Generate copy with AI
            </button>
          </>
        )}

        {note && <div className="mt-3 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs text-text-muted">{note}</div>}
      </div>

      {/* live preview */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-bg-elevated p-6">
        {!built ? (
          <div className="grid h-full place-items-center text-sm text-text-muted">
            Enter a brief and build — a live preview appears here.
          </div>
        ) : (
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl shadow-lg" style={{ background: p.bg, color: p.fg }}>
            {sections.includes("hero") && (
              <div style={{ padding: p.pad }} className="text-center">
                <div className="font-display text-3xl font-semibold" style={{ color: p.fg }}>
                  {spec.title}
                </div>
                <div className="mx-auto mt-3 max-w-md text-sm opacity-70">{spec.hero}.</div>
                <div className="mx-auto mt-2 max-w-md text-xs opacity-50">{spec.tagline}</div>
                <button
                  className="mt-6 rounded-full px-6 py-2.5 text-sm font-medium text-text-primary"
                  style={{ background: p.accent, borderRadius: p.radius }}
                >
                  Get started
                </button>
              </div>
            )}

            {sections.includes("features") && (
              <div style={{ padding: p.pad, borderColor: "rgba(0,0,0,0.06)" }} className="border-t">
                <div className="font-display text-lg font-semibold">What you get</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {["Simple to use", "Built for your brand", "Runs on TREEtiti"].map((f) => (
                    <div key={f} className="rounded-xl border border-border p-4 text-sm">
                      <div className="text-lg" style={{ color: p.accent }}>✦</div>
                      <div className="mt-1 font-medium">{f}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sections.includes("pricing") && (
              <div style={{ padding: p.pad }} className="border-t border-border">
                <div className="font-display text-lg font-semibold">Pricing</div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {[
                    { n: "Starter", p: "$49" },
                    { n: "Growth", p: "$99" },
                    { n: "Scale", p: "$249" },
                  ].map((t) => (
                    <div key={t.n} className="rounded-xl border border-border p-4 text-center">
                      <div className="text-xs opacity-60">{t.n}</div>
                      <div className="mt-1 text-xl font-semibold">{t.p}<span className="text-xs opacity-50">/mo</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sections.includes("faq") && (
              <div style={{ padding: p.pad }} className="border-t border-border">
                <div className="font-display text-lg font-semibold">Questions</div>
                <div className="mt-3 space-y-3 text-sm">
                  {["How fast can I launch?", "Can I edit it myself?", "What's included?"].map((q) => (
                    <details key={q} className="rounded-xl border border-border px-4 py-3">
                      <summary className="cursor-pointer font-medium">{q}</summary>
                      <p className="mt-2 text-xs opacity-60">Ask TREEtiti in chat — it knows your project.</p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {sections.includes("cta") && (
              <div style={{ padding: p.pad }} className="text-center border-t border-border">
                <div className="font-display text-lg font-semibold">Ready when you are</div>
                <button
                  className="mt-4 rounded-full px-6 py-2.5 text-sm font-medium text-text-primary"
                  style={{ background: p.accent, borderRadius: p.radius }}
                >
                  Build mine
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}