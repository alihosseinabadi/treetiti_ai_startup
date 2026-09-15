import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, MediaAsset } from "../api";
import { Composer } from "../components/chat/Composer";

export function MediaPage() {
  const [params] = useSearchParams();
  const [kind, setKind] = useState<"image" | "video">(
    params.get("create") === "video" ? "video" : "image",
  );
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.assets().then(setAssets).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async (prompt: string) => {
    setBusy(true);
    try {
      await api.assetGenerate({ kind, prompt, title: prompt.slice(0, 60) });
      setTimeout(load, 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-text-primary">Media library</h1>
          <p className="mt-1 text-sm text-text-muted">
            Generate and browse every image and video TREEtiti has produced.
          </p>
        </div>

        <div className="mb-6 flex gap-2">
          {(["image", "video"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`t-btn ${kind === k ? "t-btn-primary" : ""}`}
            >
              {k === "image" ? "🖼" : "🎬"} {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        <div className="mb-8 max-w-xl">
          <Composer onSend={generate} busy={busy} placeholder={`Describe a ${kind} to create…`} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {assets
            .filter((a) => !kind || a.kind === kind)
            .map((a) => (
              <div key={a.id} className="t-card overflow-hidden">
                {a.url ? (
                  a.kind === "video" ? (
                    <video src={a.url} className="aspect-video w-full object-cover" muted playsInline />
                  ) : (
                    <img src={a.url} alt={a.title} className="aspect-square w-full object-cover" />
                  )
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-bg-elevated text-[10px] uppercase tracking-widest text-text-muted">
                    queued
                  </div>
                )}
                <div className="px-3 py-2">
                  <div className="truncate text-xs text-text-primary">{a.title}</div>
                  <div className="mt-0.5 text-[10px] text-text-muted">
                    {a.creator_agent || a.kind}
                  </div>
                </div>
              </div>
            ))}
        </div>

        {assets.length === 0 && (
          <div className="py-16 text-center text-sm text-text-muted">
            No {kind}s yet. Describe one above to generate.
          </div>
        )}
      </div>
    </div>
  );
}