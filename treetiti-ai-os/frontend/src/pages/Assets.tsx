import React, { useEffect, useState } from "react";
import { api, MediaAsset } from "../api";
import { Card, ErrorBanner, Spinner, StatusPill } from "../components/ui";

const KINDS = ["image", "video", "3d", "audio"] as const;

export default function Assets() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [kind, setKind] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [genKind, setGenKind] = useState<string>("image");
  const [title, setTitle] = useState("");

  const load = () =>
    api
      .assets({ kind: kind || undefined })
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, [kind]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.assetGenerate({
        kind: genKind,
        prompt: prompt.trim(),
        title: title.trim(),
        creator_agent: "media",
      });
      setNotice(
        res.produced && res.produced.status === "failed"
          ? `Generation failed: ${String(res.produced.error ?? "")}`
          : `Generated ${genKind} asset`,
      );
      setPrompt("");
      setTitle("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const preview = (a: MediaAsset) => {
    if (a.kind === "image" && a.url) {
      return <img src={a.url} alt={a.title} className="h-28 w-full object-cover rounded-lg" />;
    }
    if (a.kind === "video" && a.url) {
      return (
        <video src={a.url} className="h-28 w-full object-cover rounded-lg" muted preload="metadata" />
      );
    }
    if (a.kind === "audio" && a.url) {
      return <audio src={a.url} controls className="w-full" />;
    }
    return (
      <div className="h-28 w-full rounded-lg bg-bg-secondary grid place-items-center text-xs text-text-muted">
        {a.kind} asset
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Assets</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Every image, video, 3D and voice asset your agents produce.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card title="Generate asset">
        <div className="space-y-3">
          <div className="flex gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setGenKind(k)}
                className={`rounded-lg px-3 py-1.5 text-xs border transition ${
                  genKind === k
                    ? "bg-success border-success text-text-primary"
                    : "border-white/[0.1] text-text-muted hover:text-text-primary"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the asset to generate…"
            rows={3}
            className="w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-text-primary hover:bg-success transition disabled:opacity-50"
            >
              Generate
            </button>
            {generating && <Spinner label="Generating…" />}
            {notice && <span className="text-xs text-success">{notice}</span>}
          </div>
        </div>
      </Card>

      <div className="flex gap-2">
        <button
          onClick={() => setKind("")}
          className={`rounded-lg px-3 py-1.5 text-xs border transition ${!kind ? "bg-white/[0.06] text-text-primary" : "border-white/[0.1] text-text-muted"}`}
        >
          All
        </button>
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-1.5 text-xs border transition ${kind === k ? "bg-white/[0.06] text-text-primary" : "border-white/[0.1] text-text-muted"}`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/[0.06] bg-bg-secondary p-3">
            {preview(a)}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{a.title || "Untitled"}</div>
                <div className="text-[11px] text-text-muted truncate">
                  {a.creator_agent} · v{a.version}
                </div>
              </div>
              <StatusPill status={a.kind} />
            </div>
          </div>
        ))}
        {items.length === 0 && !error && (
          <div className="col-span-3 text-sm text-text-muted text-center py-10">
            No assets yet — generate one above.
          </div>
        )}
      </div>
    </div>
  );
}