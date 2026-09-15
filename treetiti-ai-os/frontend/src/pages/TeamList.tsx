import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Team, Teammate } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

export default function TeamList() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.teams().then(setTeams).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this team?")) return;
    api.teamDelete(id)
      .then(() => setTeams((t) => t.filter((tm) => tm.id !== id)))
      .catch(console.error);
  };

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;

  return (
    <div className="t-page">
      <SectionHeader
        title="Teams"
        subtitle="Organized groups of teammates with a Chief coordinator"
        action={
          <Btn variant="primary" onClick={() => navigate("/teams/create")}>
            + Create Team
          </Btn>
        }
      />
      <div className="px-6 pb-8">
        {teams.length === 0 ? (
          <div className="t-card p-12 text-center text-text-muted">
            No teams yet. Create a team to organize your teammates.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div key={team.id} className="t-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/teams/${team.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-2xl">
                    👑
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">{team.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-text-muted">{team.description || "No description"}</div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted">
                      <span>{team.member_ids.length} members</span>
                      {team.chief_id && <span className="px-1.5 py-0.5 rounded bg-violet/10 text-violet">Has Chief</span>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}
                    className="p-1.5 rounded bg-bg-elevated text-text-muted hover:bg-error/10 hover:text-error"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}