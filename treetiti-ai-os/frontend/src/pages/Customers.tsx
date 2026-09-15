import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ClientSummary } from "../api";

export default function Customers() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .clients()
      .then(setClients)
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="t-page">
      <div className="t-page-inner max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-text-muted">Customers</div>
            <h1 className="mt-1 font-display text-3xl text-text-primary">Your clients</h1>
            <p className="mt-1 text-sm text-text-muted">
              Open a customer to talk to their CEO — it already knows their missions, profile and goals.
            </p>
          </div>
          <button onClick={() => navigate("/chat")} className="t-btn shrink-0">
            ← TREEtiti
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {clients === null && !error && (
          <div className="py-16 text-center text-sm text-text-muted">Loading clients…</div>
        )}

        {clients && clients.length === 0 && (
          <div className="py-16 text-center">
            <div className="text-3xl opacity-40">◆</div>
            <p className="mt-3 text-sm text-text-muted">No customers yet.</p>
            <p className="mt-1 text-xs text-text-muted">
              Create a client through a mission, the client directory, or a lead — they'll appear here.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {clients?.map((c) => (
            <button
              key={c.name}
              onClick={() => navigate(`/customers/${encodeURIComponent(c.name)}`)}
              className="t-card flex w-full items-center gap-4 px-4 py-4 text-left transition hover:border-accent/30"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-accent"
                style={{ background: "#e8f1ff" }}
                aria-hidden
              >
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary">{c.name}</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {c.directory?.business_line || c.lead?.customer_type || "—"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {c.active_missions > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-1 text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {c.active_missions} active
                  </span>
                )}
                {c.active_missions === 0 && c.mission_count > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-text-muted" /> paused
                  </span>
                )}
                {c.pending_approvals > 0 && (
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-warning">
                    {c.pending_approvals} decision{c.pending_approvals > 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}