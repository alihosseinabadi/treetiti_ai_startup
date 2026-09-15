import React, { useEffect, useState } from "react";
import { api, ContentItem } from "../api";

export function SocialPage() {
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    api.content().then(setItems).catch(() => {});
  }, []);

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-text-primary">Social</h1>
          <p className="mt-1 text-sm text-text-muted">
            Connected accounts, top content, and what to publish next.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["telegram", "vk", "linkedin", "instagram"].map((ch) => (
            <div key={ch} className="t-card p-4">
              <div className="text-xs font-medium capitalize text-text-primary">{ch}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Connected
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="t-sidebar-label">Latest content</div>
          <div className="mt-2 space-y-2">
            {items.slice(0, 20).map((c) => (
              <div key={c.id} className="t-card flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-text-primary">{c.title}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    {c.platform} · {c.status}
                  </div>
                </div>
                {c.status === "approved" && (
                  <button
                    onClick={() => api.publish(c.id).then(load)}
                    className="t-btn t-btn-primary !py-1.5 text-xs"
                  >
                    Publish
                  </button>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-12 text-center text-sm text-text-muted">
                No content yet. Ask the CEO to draft some.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  function load() {
    api.content().then(setItems).catch(() => {});
  }
}