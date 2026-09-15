import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Teammate } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

export default function TeammateList() {
  const navigate = useNavigate();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinned, setPinned] = useState<Teammate[]>([]);

  useEffect(() => {
    Promise.all([api.teammates(), api.teammatesPinned()])
      .then(([all, pinnedList]) => {
        setTeammates(all);
        setPinned(pinnedList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handlePin = (id: string, currentlyPinned: boolean) => {
    const fn = currentlyPinned ? api.teammateUnpin : api.teammatePin;
    fn(id)
      .then((updated) => {
        setTeammates((t) => t.map((tm) => (tm.id === id ? updated : tm)));
        setPinned((p) => (currentlyPinned ? p.filter((x) => x.id !== id) : [...p, updated]));
      })
      .catch(console.error);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this teammate?")) return;
    api.teammateDelete(id)
      .then(() => {
        setTeammates((t) => t.filter((tm) => tm.id !== id));
        setPinned((p) => p.filter((tm) => tm.id !== id));
      })
      .catch(console.error);
  };

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;

  return (
    <div className="t-page">
      <SectionHeader
        title="Teammates"
        subtitle="Your AI teammates — persistent, specialized, and ready to work"
        action={
          <Btn variant="primary" onClick={() => navigate("/teammates/create")}>
            + Create Teammate
          </Btn>
        }
      />
      <div className="px-6 pb-8">
        {pinned.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Pinned</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pinned.map((t) => (
                <TeammateCard key={t.id} teammate={t} onPin={handlePin} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">All Teammates</h3>
        {teammates.length === 0 ? (
          <div className="t-card p-12 text-center text-text-muted">
            No teammates yet. Create your first AI teammate to start building your team.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teammates.map((t) => (
              <TeammateCard key={t.id} teammate={t} onPin={handlePin} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeammateCard({
  teammate,
  onPin,
  onDelete,
}: {
  teammate: Teammate;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const navigate = useNavigate();
  const color = roleColor(teammate.role);

  return (
    <div className="t-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/teammates/${teammate.id}`)}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: `${color}15`, color }}
        >
          {teammate.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">{teammate.name}</span>
            {teammate.is_pinned && <span className="text-yellow-500" title="Pinned">★</span>}
          </div>
          <div className="mt-0.5 text-xs text-text-muted">{teammate.role}</div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
            <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">{teammate.agent_key}</span>
            {teammate.tools.length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">{teammate.tools.length} tools</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPin(teammate.id, teammate.is_pinned); }}
              className={`p-1.5 rounded ${teammate.is_pinned ? "bg-warning/10 text-warning" : "bg-bg-elevated text-text-muted hover:bg-border"}`}
              title={teammate.is_pinned ? "Unpin" : "Pin"}
            >
              ★
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(teammate.id); }}
              className="ml-auto p-1.5 rounded bg-bg-elevated text-text-muted hover:bg-error/10 hover:text-error"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ROLE_COLORS: Record<string, string> = {
  chief: "#7aa2f7",
  researcher: "#10b981",
  strategist: "#8b5cf6",
  copywriter: "#ec4899",
  creative: "#f59e0b",
  video: "#06b6d4",
  social: "#f43f5e",
  analytics: "#84cc16",
  editor: "#6366f1",
  brand: "#14b8a6",
  seo: "#a855f7",
  campaign: "#eab308",
  developer: "#64748b",
  sales: "#f97316",
  growth: "#22c55e",
  default: "#71717a",
};

function roleColor(role: string) {
  const r = role.toLowerCase();
  for (const [key, color] of Object.entries(ROLE_COLORS)) {
    if (r.includes(key)) return color;
  }
  return ROLE_COLORS.default;
}