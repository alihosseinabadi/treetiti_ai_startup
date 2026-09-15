import React, { useEffect, useState } from "react";
import { api, Approval, ContentItem, MediaAsset, Mission } from "../api";
import ContextMenu from "../components/ContextMenu";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="t-card rounded-xl px-4 py-3">
      <div className="font-display text-xl text-text-primary">{value}</div>
      <div className="text-[10px] tracking-widest uppercase text-text-muted">{label}</div>
    </div>
  );
}

export default function Results() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, a, as, ms] = await Promise.all([
          api.content({ limit: 200 }),
          api.approvals(),
          api.assets(),
          api.missions(),
        ]);
        setContent(c);
        setApprovals(a);
        setAssets(as);
        setMissions(ms);
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = content.filter((c) => c.status === "published");
  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const approvedContent = content.filter((c) => c.status === "approved");
  const activeMissions = missions.filter((m) => m.status === "active");

  const decide = async (id: string, decision: "approve" | "reject") => {
    try {
      await api.approvalDecide(id, decision);
      setApprovals(await api.approvals());
      setContent(await api.content({ limit: 200 }));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) {
    return <div className="t-page grid place-items-center text-[12px] text-text-muted">Loading results…</div>;
  }

  return (
    <div className="t-page">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="font-display text-2xl text-text-primary mb-6">Results</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat label="Published" value={published.length} />
          <Stat label="Approved" value={approvedContent.length} />
          <Stat label="Pending approval" value={pendingApprovals.length} />
          <Stat label="Media assets" value={assets.length} />
          <Stat label="Active missions" value={activeMissions.length} />
        </div>

        {pendingApprovals.length > 0 && (
          <section className="mb-8">
            <h2 className="text-[11px] tracking-widest uppercase text-text-muted mb-3">
              Needs your decision
            </h2>
            <div className="space-y-3">
              {pendingApprovals.map((a) => (
                <div key={a.id} className="t-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="t-pill t-pill-blue">{a.kind}</span>
                        <h3 className="font-display text-sm text-text-primary truncate">{a.title}</h3>
                      </div>
                      {a.summary && (
                        <p className="text-[12px] text-text-muted mt-2 leading-relaxed">{a.summary}</p>
                      )}
                      <p className="text-[11px] text-text-muted mt-1">
                        Requested by {a.requested_by} · {new Date(a.created_at!).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0 items-center">
                      <button
                        onClick={() => decide(a.id, "approve")}
                        className="t-btn t-btn-primary !px-4 !py-2 !text-[11px]"
                      >
                        Approve
                      </button>
                      <ContextMenu
                        items={[
                          {
                            label: "Reject",
                            icon: "✕",
                            danger: true,
                            confirm: true,
                            onClick: () => decide(a.id, "reject"),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <h2 className="text-[11px] tracking-widest uppercase text-text-muted mb-3">
              Published content
            </h2>
            {published.length === 0 ? (
              <div className="t-card rounded-2xl p-6 text-[12px] text-text-muted">
                Nothing published yet — approve content and it will be published automatically.
              </div>
            ) : (
              <div className="space-y-2">
                {published.map((c) => (
                  <div key={c.id} className="t-card rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] text-text-primary truncate">{c.title}</span>
                      <span className="text-[10px] uppercase text-text-muted shrink-0">
                        {c.platform} · {c.content_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[11px] tracking-widest uppercase text-text-muted mb-3">
              Media assets
            </h2>
            {assets.length === 0 ? (
              <div className="t-card rounded-2xl p-6 text-[12px] text-text-muted">
                No assets produced yet.
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map((a) => (
                  <div key={a.id} className="t-card rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] text-text-primary truncate">{a.title || a.kind}</div>
                        <div className="text-[10px] text-text-muted">
                          {a.kind} · by {a.creator_agent || "—"}
                        </div>
                      </div>
                      {a.url ? (
                        <img
                          src={a.url}
                          alt={a.title}
                          className="h-10 w-10 rounded-lg object-cover border border-border shrink-0"
                        />
                      ) : (
                        <span className="text-[10px] text-text-muted shrink-0">
                          {String(a.produced?.status ?? "spec")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}