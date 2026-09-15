import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, Teammate, TeammateActivity } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

export default function TeammateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teammate, setTeammate] = useState<Teammate | null>(null);
  const [activity, setActivity] = useState<TeammateActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "settings">("overview");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.teammateDetail(id), api.teammateActivity(id)])
      .then(([t, a]) => {
        setTeammate(t);
        setActivity(a);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        navigate("/teammates");
      });
  }, [id, navigate]);

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;
  if (!teammate) return null;

  const color = roleColor(teammate.role);

  return (
    <div className="t-page">
      <SectionHeader
        title={teammate.name}
        subtitle={`${teammate.role} · ${teammate.agent_key} · ${teammate.autonomy_level} autonomy`}
        action={
          <>
            <Btn variant="ghost" onClick={() => navigate("/teammates")}>
              ← Back
            </Btn>
            <Btn onClick={() => setActiveTab("settings")}>Settings</Btn>
          </>
        }
      />

      <div className="px-6 pb-8">
        <div className="mb-6 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl"
            style={{ background: `${color}15`, color }}
          >
            {teammate.avatar}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-text-primary">{teammate.name}</h2>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${color}15`, color }}
              >
                {teammate.autonomy_level}
              </span>
              {teammate.is_pinned && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">Pinned</span>
              )}
            </div>
            <div className="mt-1 text-sm text-text-muted">{teammate.role}</div>
            <div className="mt-0.5 text-xs text-text-muted font-mono">{teammate.agent_key}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-border">
          <nav className="flex gap-6" aria-label="Teammate tabs">
            {([
              { id: "overview", label: "Overview" },
              { id: "activity", label: "Activity" },
              { id: "settings", label: "Settings" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && <OverviewTab teammate={teammate} color={color} />}
        {activeTab === "activity" && <ActivityTab activity={activity} />}
        {activeTab === "settings" && <SettingsTab teammate={teammate} onChange={setTeammate} />}
      </div>
    </div>
  );
}

function OverviewTab({ teammate, color }: { teammate: Teammate; color: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Description</h3>
          <p className="text-text-muted whitespace-pre-wrap">{teammate.description || "No description provided."}</p>
        </div>

        {teammate.system_instructions && (
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">System Instructions</h3>
            <p className="text-text-muted whitespace-pre-wrap font-mono text-sm">{teammate.system_instructions}</p>
          </div>
        )}

        {teammate.model && (
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Model Override</h3>
            <p className="text-text-muted font-mono text-sm">{teammate.model}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Tools</h3>
          {teammate.tools.length === 0 ? (
            <p className="text-text-muted text-sm">No tools enabled</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teammate.tools.map((tool) => (
                <span key={tool} className="px-2 py-1 rounded bg-bg-elevated text-text-primary text-xs">{tool}</span>
              ))}
            </div>
          )}
        </div>

        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Skills</h3>
          {teammate.skills.length === 0 ? (
            <p className="text-text-muted text-sm">No skills assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teammate.skills.map((skill) => (
                <span key={skill} className="px-2 py-1 rounded bg-bg-elevated text-text-primary text-xs">{skill}</span>
              ))}
            </div>
          )}
        </div>

        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Memory Scopes</h3>
          <div className="flex flex-wrap gap-2">
            {teammate.memory_scopes.map((scope) => (
              <span key={scope} className="px-2 py-1 rounded bg-accent/10 text-accent text-xs">{scope}</span>
            ))}
          </div>
        </div>

        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Client Access</h3>
          <p className="text-sm text-text-muted">{teammate.client_access.join(", ") || "None"}</p>
        </div>

        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Project Access</h3>
          <p className="text-sm text-text-muted">{teammate.project_access.join(", ") || "None"}</p>
        </div>

        <div className="t-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Routines</h3>
          {teammate.routines.length === 0 ? (
            <p className="text-text-muted text-sm">No routines assigned</p>
          ) : (
            <ul className="space-y-1">
              {teammate.routines.map((r) => (
                <li key={r} className="text-sm text-text-muted">• {r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: TeammateActivity[] }) {
  if (activity.length === 0) {
    return (
      <div className="t-card p-12 text-center text-text-muted">
        No activity recorded yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {activity.map((a) => (
        <div key={a.id} className="t-card p-4">
          <div className="flex items-start gap-3">
            <span className="t-st-dot" style={{ background: a.status === "completed" ? "#10b981" : a.status === "failed" ? "#ef4444" : "#7aa2f7" }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text-primary">{a.action}</span>
                <span className="text-xs text-text-muted">{a.status}</span>
                <span className="text-xs text-text-muted">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              {a.input_summary && <div className="mt-1 text-sm text-text-muted">Input: {a.input_summary}</div>}
              {a.output_summary && <div className="mt-1 text-sm text-text-muted">Output: {a.output_summary}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ teammate, onChange }: { teammate: Teammate; onChange: (t: Teammate) => void }) {
  const [name, setName] = useState(teammate.name);
  const [role, setRole] = useState(teammate.role);
  const [description, setDescription] = useState(teammate.description);
  const [systemInstructions, setSystemInstructions] = useState(teammate.system_instructions);
  const [model, setModel] = useState(teammate.model);
  const [autonomyLevel, setAutonomyLevel] = useState(teammate.autonomy_level);
  const [isActive, setIsActive] = useState(teammate.is_active);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.teammateUpdate(teammate.id, {
        name,
        role,
        description,
        system_instructions: systemInstructions,
        model,
        autonomy_level: autonomyLevel,
        is_active: isActive,
      });
      onChange(updated);
      setSaving(false);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="t-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Basic Info</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="t-input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="t-input w-full"
              placeholder="e.g. Researcher, Copywriter, Creative Director"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Autonomy Level</label>
            <select
              value={autonomyLevel}
              onChange={(e) => setAutonomyLevel(e.target.value)}
              className="t-input w-full"
            >
              <option value="ask">Ask before important actions</option>
              <option value="independent">Work independently</option>
              <option value="full">Full autonomy</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="t-input w-full"
            />
          </div>
        </div>
      </div>

      <div className="t-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">System Instructions</h3>
        <textarea
          value={systemInstructions}
          onChange={(e) => setSystemInstructions(e.target.value)}
          rows={6}
          className="t-input w-full font-mono text-sm"
          placeholder="Custom instructions injected into the agent's system prompt..."
        />
      </div>

      <div className="t-card p-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Model Override (optional)</h3>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="t-input w-full font-mono text-sm"
          placeholder="e.g. google/gemini-2.5-flash, groq/llama-3.3-70b-versatile"
        />
      </div>

      <div className="t-card p-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <span className="text-sm text-text-primary">Active</span>
        </label>
      </div>

      <div className="flex gap-3">
        <Btn variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Btn>
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