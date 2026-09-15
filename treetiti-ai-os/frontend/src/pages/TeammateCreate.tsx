import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Teammate } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

const VALID_AGENT_KEYS = [
  "ceo", "brand", "content_hunter", "social_intel", "strategist",
  "content_strategist", "creative_director", "td_creative_director",
  "td_asset_producer", "video_producer", "ugc_producer",
  "social_manager", "growth_optimizer", "market_research",
  "content", "video", "image", "sales", "analytics", "developer",
  "campaign", "editor", "seo",
];

const VALID_TOOLS = [
  "browser", "files", "terminal", "image_generation", "video_generation",
  "web_research", "analytics", "social_publish", "email", "calendar",
  "crm", "cloud_storage", "search", "deep_research", "code_execution",
];

const MEMORY_SCOPES = ["global", "client", "team", "teammate", "project", "conversation", "task"];

const AUTONOMY_LEVELS = ["ask", "independent", "full"];

const DEFAULT_AVATARS = ["🤖", "🧠", "👁", "🎨", "✍️", "📊", "🎬", "📱", "🔍", "📈", "🎯", "⚡", "🌟", "🚀", "💡", "🎪"];

export default function TeammateCreate() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Record<string, { name: string; role: string; description: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    role: "",
    agent_key: "",
    avatar: "🤖",
    description: "",
    system_instructions: "",
    model: "",
    tools: [] as string[],
    skills: [] as string[],
    memory_scopes: ["global", "conversation"] as string[],
    client_access: ["*"] as string[],
    project_access: ["*"] as string[],
    autonomy_level: "ask" as "ask" | "independent" | "full",
    routines: [] as string[],
    is_active: true,
    is_pinned: false,
  });

  useEffect(() => {
    api.teammateRegistryAgents().then(setAgents).catch(console.error);
  }, []);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const toggleTool = (tool: string) => {
    handleChange("tools", form.tools.includes(tool) ? form.tools.filter((t) => t !== tool) : [...form.tools, tool]);
  };

  const toggleScope = (scope: string) => {
    handleChange("memory_scopes", form.memory_scopes.includes(scope)
      ? form.memory_scopes.filter((s) => s !== scope)
      : [...form.memory_scopes, scope]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
    if (!form.name?.trim()) { setError("Name is required"); setLoading(false); return; }
    if (!form.agent_key) { setError("Agent type is required"); setLoading(false); return; }

    try {
      const created = await api.teammateCreate(form);
      navigate(`/teammates/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create teammate");
      setLoading(false);
    }
  };

  return (
    <div className="t-page">
      <SectionHeader
        title="Create Teammate"
        subtitle="Hire a new AI teammate for your team"
        action={
          <Btn variant="ghost" onClick={() => navigate("/teammates")}>
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
          {/* Basic Info */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="t-input w-full"
                  placeholder="e.g. Sarah the Researcher"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleChange("avatar", a)}
                      className={`p-2 rounded-lg text-2xl transition-all ${
                        form.avatar === a ? "ring-2 ring-accent bg-accent/10" : "bg-bg-elevated hover:bg-border"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Agent Type *</label>
                <select
                  value={form.agent_key}
                  onChange={(e) => handleChange("agent_key", e.target.value)}
                  className="t-input w-full"
                  required
                >
                  <option value="">Select an agent type…</option>
                  {Object.entries(agents).map(([key, info]) => (
                    <option key={key} value={key}>{info.name} — {info.role}</option>
                  ))}
                </select>
              </div>
              {form.agent_key && agents[form.agent_key] && (
                <div className="p-3 rounded-lg bg-accent/10 border border-blue-100">
                  <p className="text-sm text-accent"><strong>{agents[form.agent_key].name}</strong>: {agents[form.agent_key].description}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="t-input w-full"
                  placeholder="e.g. Researcher, Copywriter, Creative Director"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Autonomy Level</label>
                <select
                  value={form.autonomy_level}
                  onChange={(e) => handleChange("autonomy_level", e.target.value)}
                  className="t-input w-full"
                >
                  <option value="ask">Ask before important actions</option>
                  <option value="independent">Work independently</option>
                  <option value="full">Full autonomy</option>
                </select>
                <p className="mt-1 text-xs text-text-muted">
                  {form.autonomy_level === "ask" && "Teammate will request approval for consequential actions"}
                  {form.autonomy_level === "independent" && "Teammate works independently, only asks for high-risk actions"}
                  {form.autonomy_level === "full" && "Teammate has full autonomy - use with caution"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                  className="t-input w-full"
                  placeholder="What does this teammate do? What's their specialty?"
                />
              </div>
            </div>
          </div>

          {/* System Instructions */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">System Instructions</h3>
            <textarea
              value={form.system_instructions}
              onChange={(e) => handleChange("system_instructions", e.target.value)}
              rows={6}
              className="t-input w-full font-mono text-sm"
              placeholder="Custom instructions that will be injected into the agent's system prompt. This defines their personality, approach, and constraints."
            />
          </div>

          {/* Tools */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Tools</h3>
            <p className="text-xs text-text-muted mb-3">Select the tools this teammate can use</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {VALID_TOOLS.map((tool) => (
                <label key={tool} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tools.includes(tool)}
                    onChange={() => toggleTool(tool)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-text-primary capitalize">{tool.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Memory Scopes */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Memory Scopes</h3>
            <p className="text-xs text-text-muted mb-3">What memory layers this teammate can access</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MEMORY_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.memory_scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-text-primary capitalize">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Client Access */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Client Access</h3>
            <p className="text-xs text-text-muted mb-3">Which clients this teammate can work for. Use * for all.</p>
            <input
              type="text"
              value={form.client_access.join(", ")}
              onChange={(e) => handleChange("client_access", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className="t-input w-full"
              placeholder="* or client1, client2"
            />
          </div>

          {/* Model Override */}
          <div className="t-card p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Model Override (optional)</h3>
            <input
              type="text"
              value={form.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="t-input w-full font-mono text-sm"
              placeholder="e.g. google/gemini-2.5-flash, groq/llama-3.3-70b-versatile, openrouter/deepseek/deepseek-v4-flash:free"
            />
            <p className="mt-1 text-xs text-text-muted">Leave empty to use the agent's default model.</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Btn variant="primary" type="submit" disabled={loading} className="flex-1">
              {loading ? "Creating…" : "Create Teammate"}
            </Btn>
            <Btn variant="ghost" type="button" onClick={() => navigate("/teammates")}>
              Cancel
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}