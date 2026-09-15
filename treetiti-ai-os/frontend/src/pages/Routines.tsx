import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

interface Routine {
  id: string;
  name: string;
  description: string;
  trigger: string;
  schedule: string;
  teammate_id: string | null;
  team_id: string | null;
  instructions: string;
  tools: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function RoutinesPage() {
  const navigate = useNavigate();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutine, setSelectedRoutine] = useState<Routine | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "create" | "detail">("list");
  const [form, setForm] = useState<Partial<Routine>>({
    name: "",
    description: "",
    trigger: "manual",
    schedule: "",
    teammate_id: null,
    team_id: null,
    instructions: "",
    tools: [],
    inputs: {},
    outputs: {},
    requires_approval: false,
    is_active: true,
  });
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  useEffect(() => {
    loadRoutines();
  }, []);

  const loadRoutines = async () => {
    try {
      const data = await api.routines();
      setRoutines(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("create");
    try {
      const created = await api.routineCreate(form);
      setRoutines([created, ...routines]);
      setForm({
        name: "",
        description: "",
        trigger: "manual",
        schedule: "",
        teammate_id: null,
        team_id: null,
        instructions: "",
        tools: [],
        inputs: {},
        outputs: {},
        requires_approval: false,
        is_active: true,
      });
      setActiveTab("list");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRun = async (routineId: string) => {
    setLoadingAction(routineId);
    try {
      const result = await api.routineRun(routineId, {});
      alert(`Routine started! Task ID: ${result.task_id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggle = async (routine: Routine) => {
    setLoadingAction(routine.id);
    try {
      if (routine.is_active) {
        await api.routinePause(routine.id);
      } else {
        await api.routineResume(routine.id);
      }
      setRoutines(routines.map((r) => (r.id === routine.id ? { ...r, is_active: !r.is_active } : r)));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this routine?")) return;
    setLoadingAction(id);
    try {
      await api.routineDelete(id);
      setRoutines(routines.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;

  return (
    <div className="t-page">
      <SectionHeader
        title="Routines"
        subtitle="Reusable workflows and skills for teammates"
        action={
          <Btn variant="primary" onClick={() => { setForm({ name: "", description: "", trigger: "manual", schedule: "", teammate_id: null, team_id: null, instructions: "", tools: [], inputs: {}, outputs: {}, requires_approval: false, is_active: true }); setActiveTab("create"); }}>
            + Create Routine
          </Btn>
        }
      />

      <div className="px-6 pb-8">
        <div className="mb-6 border-b border-border">
          <nav className="flex gap-6" aria-label="Routine tabs">
            <button
              onClick={() => setActiveTab("list")}
              className={`pb-3 border-b-2 text-sm font-medium ${activeTab === "list" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}
            >
              All Routines ({routines.filter(r => r.is_active).length} active)
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`pb-3 border-b-2 text-sm font-medium ${activeTab === "create" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}
            >
              Create Routine
            </button>
          </nav>
        </div>

        {activeTab === "list" && (
          <div className="space-y-3">
            {routines.length === 0 ? (
              <div className="t-card p-12 text-center text-text-muted">
                No routines yet. Create your first reusable workflow.
              </div>
            ) : (
              <div className="space-y-3">
                {routines.map((routine) => (
                  <div key={routine.id} className="t-card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary truncate">{routine.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${routine.is_active ? "bg-success/10 text-success" : "bg-bg-elevated text-text-muted"}`}>
                            {routine.is_active ? "Active" : "Paused"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-bg-elevated text-text-muted">{routine.trigger}</span>
                          {routine.requires_approval && <span className="px-2 py-0.5 rounded-full text-[10px] bg-warning/10 text-warning">Approval Required</span>}
                        </div>
                        <div className="mt-1 text-sm text-text-muted">{routine.description || "No description"}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {routine.tools.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated text-text-muted">{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn variant="ghost" size="sm" onClick={() => handleRun(routine.id)} disabled={loadingAction === routine.id}>
                          {loadingAction === routine.id ? "Running…" : "Run"}
                        </Btn>
                        {routine.is_active ? (
                          <Btn variant="ghost" size="sm" onClick={() => handleToggle(routine)} disabled={loadingAction === routine.id}>
                            Pause
                          </Btn>
                        ) : (
                          <Btn variant="primary" size="sm" onClick={() => handleToggle(routine)} disabled={loadingAction === routine.id}>
                            Resume
                          </Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => { setSelectedRoutine(routine); }}>View</Btn>
                        <Btn variant="ghost" size="sm" onClick={() => handleDelete(routine.id)} disabled={loadingAction === routine.id}>Delete</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "create" && (
          <form onSubmit={handleCreate} className="max-w-3xl space-y-6">
            <div className="t-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => handleChange("name", e.target.value)} className="t-input w-full" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} className="t-input w-full" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Trigger</label>
                    <select value={form.trigger} onChange={(e) => handleChange("trigger", e.target.value)} className="t-input w-full">
                      <option value="manual">Manual</option>
                      <option value="schedule">Scheduled</option>
                      <option value="event">Event-driven</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1">Schedule (cron or interval)</label>
                    <input type="text" value={form.schedule} onChange={(e) => handleChange("schedule", e.target.value)} className="t-input w-full font-mono text-sm" placeholder="0 9 * * * or 1h" />
                  </div>
                </div>
              </div>
            </div>

            <div className="t-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Instructions</h3>
              <textarea
                value={form.instructions}
                onChange={(e) => handleChange("instructions", e.target.value)}
                rows={6}
                className="t-input w-full font-mono text-sm"
                placeholder="Step-by-step instructions for the routine..."
              />
            </div>

            <div className="t-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Tools</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {["browser", "filesystem", "terminal", "image_generation", "video_generation", "web_research", "analytics", "social_publish", "email", "calendar", "crm", "cloud_storage", "search", "deep_research", "code_execution"].map((tool) => (
                  <label key={tool} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(form.tools || []).includes(tool)} onChange={(e) => handleChange("tools", e.target.checked ? [...(form.tools || []), tool] : (form.tools || []).filter((t) => t !== tool))} className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                    <span className="text-sm text-text-primary capitalize">{tool.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="t-card p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Settings</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.requires_approval} onChange={(e) => handleChange("requires_approval", e.target.checked)} className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                  <span className="text-sm text-text-primary">Requires approval before execution</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange("is_active", e.target.checked)} className="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
                  <span className="text-sm text-text-primary">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Btn variant="primary" type="submit" disabled={loadingAction === "create"}>
                {loadingAction === "create" ? "Creating…" : "Create Routine"}
              </Btn>
              <Btn variant="ghost" type="button" onClick={() => setActiveTab("list")}>Cancel</Btn>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}