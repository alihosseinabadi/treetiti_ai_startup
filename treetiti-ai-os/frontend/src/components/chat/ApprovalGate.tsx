import React from "react";
import { Approval } from "../../api";
import { StatusPill } from "../ui";

export default function ApprovalGate({
  approval,
  onDecide,
  busy,
}: {
  approval: Approval;
  onDecide: (decision: "approve" | "reject", note: string) => void;
  busy?: boolean;
}) {
  const [note, setNote] = React.useState("");
  const pending = approval.status === "pending";

  return (
    <div className="rounded-xl border border-border/80 bg-secondary/40 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{approval.title}</span>
            <StatusPill status={approval.status} />
          </div>
          <div className="text-xs text-text-muted mt-1">
            {approval.kind} · requested by {approval.requested_by}
            {approval.reviewed_by && ` · ${approval.reviewed_by}`}
          </div>
        </div>
      </div>

      {approval.summary && (
        <div className="text-sm text-text-secondary mt-3">{approval.summary}</div>
      )}
      {Object.keys(approval.payload).length > 0 && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-primary p-2 text-[11px] text-text-muted">
          {JSON.stringify(approval.payload, null, 2)}
        </pre>
      )}
      {approval.decision_note && (
        <div className="text-xs text-text-muted mt-3">Note: {approval.decision_note}</div>
      )}

      {pending && (
        <div className="flex items-center gap-2 mt-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Decision note (optional)"
            className="flex-1 rounded-lg border border-border bg-primary px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
          />
          <button
            onClick={() => onDecide("approve", note)}
            disabled={busy}
            className="rounded-lg bg-success px-4 py-2 text-xs font-medium text-text-primary hover:bg-success transition disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide("reject", note)}
            disabled={busy}
            className="rounded-lg bg-error/60 px-4 py-2 text-xs font-medium text-error hover:bg-error/60 transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}