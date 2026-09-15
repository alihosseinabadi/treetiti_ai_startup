import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Team, Teammate } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

export default function TeamCreate() {
  const navigate = useNavigate();
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    chief_id: null as string | null,
    member_ids: [] as string[],
    client_access: ["*"] as string[],
    project_access: ["*"] as string[],
    is_active: true,
  });

  useEffect(() => {
    api.teammates().then(setTeammates).catch(console.error);
  }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleMember = (id: string) => {
    handleChange("member_ids", form.member_ids.includes(id)
      ? form.member_ids.filter((m) => m !== id)
      : [...form.member_ids, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.name?.trim()) { setError("Team name is required"); setLoading(false); return; }
    if (!form.chief_id) { setError("A Chief is required"); setLoading(false); return; }

    try {
      const created = await api.teamCreate(form);
      navigate(`/teams/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create team");
      setLoading(false);
    }
  };

  return (
    <div className="t-page">
      <SectionHeader
        title="Create Team"
        subtitle="Build a team of teammates with a Chief coordinator"
        action={
          <Btn variant="ghost" onClick={() => navigate("/teams")}>
            ← Cancel
          </Btn>
        }
      />

      <div className="px-6 pb-8 max-w-3xl">
        {error && (
          <div className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Team Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="t-input w-full"
                  placeholder="e.g. Marketing Team, Content Squad"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  className="t-input w-full"
                  placeholder="What does this team do?"
                />
              </div>
            </div>
          </div>

          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Chief *</h3>
            <p className="text-xs text-text-muted mb-3">The Chief coordinates the team and delegates work to members</p>
            <select
              value={form.chief_id || ""}
              onChange={(e) => handleChange("chief_id", e.target.value || null)}
              className="t-input w-full"
              required
            >
              <option value="">Select a Chief…</option>
              {teammates
                .filter((t) => t.is_active && ["ceo", "strategist", "campaign", "brand"].includes(t.agent_key))
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.role} ({t.agent_key})</option>
                ))}
            </select>
          </div>

          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Team Members</h3>
            <p className="text-xs text-text-muted mb-3">Select teammates to include in this team</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {teammates
                .filter((t) => t.is_active && t.id !== form.chief_id)
                .map((t) => (
                  <label key={t.id} className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${form.member_ids.includes(t.id) ? "border-accent bg-accent/10" : "border-border hover:border-border"}`}>
                    <input
                      type="checkbox"
                      checked={form.member_ids.includes(t.id)}
                      onChange={() => toggleMember(t.id)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span className="text-2xl">{t.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">{t.name}</div>
                      <div className="text-xs text-text-muted">{t.role} · {t.agent_key}</div>
                    </div>
                  </label>
                ))}
            </div>
          </div>

          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Access</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Client Access</label>
                <input
                  type="text"
                  value={form.client_access.join(", ")}
                  onChange={(e) => handleChange("client_access", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  className="t-input w-full"
                  placeholder="* or client1, client2"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Project Access</label>
                <input
                  type="text"
                  value={form.project_access.join(", ")}
                  onChange={(e) => handleChange("project_access", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                  className="t-input w-full"
                  placeholder="* or project1, project2"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Btn variant="primary" type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating…" : "Create Team"}
            </Btn>
            <Btn variant="ghost" type="button" onClick={() => navigate("/teams")}>
              Cancel
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}