import React, { useEffect, useState } from "react";
import { api, Approval } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";

const FILTERS = ["", "pending", "approved", "rejected"] as const;

export default function Approvals() {
  const [items, setItems] = useState<Approval[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api
      .approvals(filter)
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, [filter]);

  const decide = async (id: string, decision: "approve" | "reject", note: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.approvalDecide(id, decision, note);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const ActionNote = ({ id, onDecide }: { id: string; onDecide: (note: string) => void }) => {
    const [note, setNote] = useState("");
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Decision note (optional)"
          className="rounded-lg border border-white/[0.1] bg-bg-secondary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted flex-1"
        />
        <button
          onClick={() => onDecide(note)}
          disabled={busy === id}
          className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-success transition"
        >
          Approve
        </button>
        <button
          onClick={() => {
            const n = note;
            setNote("");
            decide(id, "reject", n);
          }}
          disabled={busy === id}
          className="rounded-lg bg-error/60 px-3 py-1.5 text-xs font-medium text-error hover:bg-error/60 transition"
        >
          Reject
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Approvals</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Human-in-the-loop gates before publish, spend, delete or edit.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs border transition ${
              filter === f ? "bg-white/[0.06] text-text-primary" : "border-white/[0.1] text-text-muted"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} />

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">{a.title}</span>
                  <StatusPill status={a.status} />
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {a.kind} · requested by {a.requested_by}
                  {a.reviewed_by && ` · reviewed by ${a.reviewed_by}`}
                </div>
                {a.summary && <div className="text-sm text-text-muted mt-2">{a.summary}</div>}
                {Object.keys(a.payload).length > 0 && (
                  <pre className="text-[11px] text-text-muted bg-bg-secondary rounded-lg p-2 mt-2 overflow-x-auto">
                    {JSON.stringify(a.payload, null, 2)}
                  </pre>
                )}
                {a.decision_note && (
                  <div className="text-xs text-text-muted mt-2">Note: {a.decision_note}</div>
                )}
              </div>
            </div>
            {a.status === "pending" && <ActionNote id={a.id} onDecide={(n) => decide(a.id, "approve", n)} />}
          </Card>
        ))}
        {items.length === 0 && !error && (
          <div className="text-sm text-text-muted text-center py-10">
            No approvals match this filter.
          </div>
        )}
      </div>
    </div>
  );
}