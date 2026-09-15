import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, Team, Teammate } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [allTeammates, setAllTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.teamDetail(id), api.teammates()])
      .then(([t, all]) => {
        setTeam(t);
        setAllTeammates(all);
        const members = all.filter((tm) => t.member_ids.includes(tm.id));
        setTeammates(members);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        navigate("/teams");
      });
  }, [id, navigate]);

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;
  if (!team) return null;

  return (
    <div className="t-page">
      <SectionHeader
        title={team.name}
        subtitle={`${team.member_ids.length} teammates · ${team.chief_id ? "Has Chief" : "No Chief assigned"}`}
        action={
          <>
            <Btn onClick={() => navigate(`/teams/${id}/chat`)}>
              💬 Chat with Team
            </Btn>
            <Btn variant="ghost" onClick={() => navigate("/teams")}>
              ← Back
            </Btn>
          </>
        }
      />

      <div className="px-6 pb-8">
        {team.description && (
          <div className="mb-6 t-card p-4">
            <p className="text-text-muted">{team.description}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Chief</h3>
          {team.chief_id ? (
            <div className="t-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-xl">👑</div>
                <div>
                  {(() => {
                    const chief = teammates.find((t) => t.id === team.chief_id);
                    return chief ? (
                      <>
                        <div className="font-medium text-text-primary">{chief.name}</div>
                        <div className="text-xs text-text-muted">{chief.role} · {chief.agent_key}</div>
                      </>
                    ) : (
                      <div className="text-text-muted">Chief not found</div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="t-card p-4 text-center text-text-muted">
              No Chief assigned. Add one in Settings.
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Members</h3>
          {teammates.length === 0 ? (
            <div className="t-card p-8 text-center text-text-muted">
              No members yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teammates.map((t) => (
                <div key={t.id} className="t-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{t.name}</div>
                      <div className="text-xs text-text-muted">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="t-card p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Access</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-text-muted mb-1">Client Access</div>
              <p className="text-sm text-text-muted">{team.client_access.join(", ") || "None"}</p>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Project Access</div>
              <p className="text-sm text-text-muted">{team.project_access.join(", ") || "None"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}