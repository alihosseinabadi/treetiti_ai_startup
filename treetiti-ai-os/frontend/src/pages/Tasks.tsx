import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, TaskRow } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";
import { formatAgentResult } from "../api";

const STATUS_COLORS: Record<string, string> = {
  queued: "#a1a1aa",
  running: "#7aa2f7",
  completed: "#10b981",
  failed: "#ef4444",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

function kindIcon(kind: string) {
  const icons: Record<string, string> = {
    agent: "🤖",
    workflow: "🔄",
    media_image: "🖼",
    media_video: "🎬",
    echo: "📝",
    mission: "📋",
    langgraph: "🕸",
  };
  return icons[kind] || "📋";
}

function TaskCard({
  task,
  onClick,
  onRetry,
  onCancel,
}: {
  task: TaskRow;
  onClick: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const color = STATUS_COLORS[task.status] || "#71717a";
  const label = STATUS_LABELS[task.status] || task.status;

  return (
    <div className="t-card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
          <span className="text-lg">{kindIcon(task.kind)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">{task.label || task.kind}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${color}15`, color }}>
              {label}
            </span>
            <span className="ml-auto text-xs text-text-muted font-mono">{task.id.slice(0, 12)}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <span>{task.kind}</span>
            {task.started_at && <span>Started: {new Date(task.started_at).toLocaleString()}</span>}
            {task.finished_at && <span>Finished: {new Date(task.finished_at).toLocaleString()}</span>}
          </div>
          {task.error && <div className="mt-2 text-xs text-error truncate">Error: {task.error}</div>}
        </div>
        <div className="flex items-center gap-1">
          {task.status === "running" && (
            <Btn variant="danger" onClick={(e) => { e.stopPropagation(); onCancel(task.id); }}>
              Cancel
            </Btn>
          )}
          {["failed", "cancelled"].includes(task.status) && (
            <Btn variant="primary" onClick={(e) => { e.stopPropagation(); onRetry(task.id); }}>
              Retry
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [statusFilter, kindFilter]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(() => {
      loadTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, [polling]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (kindFilter !== "all") params.set("kind", kindFilter);
      const res = await api.tasks({ status: statusFilter !== "all" ? statusFilter : undefined, limit: 100 });
      setTasks(res.tasks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskDetail = async (id: string) => {
    try {
      const detail = await api.taskDetail(id);
      setSelectedTask(detail);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await api.taskRetry(id);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.taskCancel(id);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || "#71717a";
  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

  const kinds = useMemo(() => [...new Set(tasks.map((t) => t.kind))], [tasks]);

  return (
    <div className="t-page">
      <SectionHeader
        title="Tasks & Background Jobs"
        subtitle="Long-running work with full history and live progress"
        action={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={polling}
                onChange={(e) => setPolling(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              Auto-refresh (5s)
            </label>
          </div>
        }
      />

      <div className="px-6 pb-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex gap-2">
            <span className="text-xs text-text-muted self-center">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="t-input text-sm py-1.5"
            >
              <option value="all">All</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-text-muted self-center">Kind:</span>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="t-input text-sm py-1.5"
            >
              <option value="all">All</option>
              {kinds.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <Btn variant="ghost" onClick={loadTasks} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Btn>
        </div>

        {loading ? (
          <div className="h-64 grid place-items-center text-sm text-text-muted">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="t-card p-12 text-center text-text-muted">
            No tasks found. Tasks are created when you run agents, missions, or generate media.
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => {
                  loadTaskDetail(task.id);
                  setSelectedTask(task);
                }}
                onRetry={handleRetry}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
            <div className="w-full max-w-4xl max-h-[90vh] bg-bg-secondary rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-text-primary">{selectedTask.label}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-sm text-text-muted">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `${getStatusColor(selectedTask.status)}15`, color: getStatusColor(selectedTask.status) }}>
                      {getStatusLabel(selectedTask.status)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-bg-elevated text-text-muted">{selectedTask.kind}</span>
                    <span className="text-text-muted">·</span>
                    <span className="font-mono">{selectedTask.id.slice(0, 12)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 rounded hover:bg-bg-elevated text-text-muted">✕</button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
                  <div className="text-xs text-text-muted mb-1">Created</div>
                  <div className="font-mono text-sm">{selectedTask.created_at}</div>
                </div>
                {selectedTask.started_at && (
                  <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
                    <div className="text-xs text-text-muted mb-1">Started</div>
                    <div className="font-mono text-sm">{selectedTask.started_at}</div>
                  </div>
                )}
                {selectedTask.finished_at && (
                  <div className="mb-4 p-3 bg-bg-secondary rounded-lg">
                    <div className="text-xs text-text-muted mb-1">Finished</div>
                    <div className="font-mono text-sm">{selectedTask.finished_at}</div>
                  </div>
                )}
                {selectedTask.error && (
                  <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
                    <div className="text-xs text-error mb-1">Error</div>
                    <div className="font-mono text-sm text-error">{selectedTask.error}</div>
                  </div>
                )}
                <div className="mb-4">
                  <div className="text-xs text-text-muted mb-1">Payload</div>
                  <pre className="p-3 bg-bg-elevated rounded text-xs font-mono overflow-auto max-h-48">{JSON.stringify(selectedTask.payload, null, 2)}</pre>
                </div>
                {Object.keys(selectedTask.result || {}).length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-text-muted mb-1">Result</div>
                    <pre className="p-3 bg-bg-elevated rounded text-xs font-mono overflow-auto max-h-48">{formatAgentResult(selectedTask.result)}</pre>
                  </div>
                )}
                <div>
                  <div className="text-xs text-text-muted mb-1">Events</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedTask.events.length === 0 ? (
                      <div className="text-center text-text-muted py-4">No events recorded</div>
                    ) : (
                      <>
                        {selectedTask.events.map((ev, i) => {
                          const payload = ev.payload as { status?: string; type?: string; agent?: string; source?: string; stage?: string } | undefined;
                          const status = payload?.status || "started";
                          return (
                            <div key={i} className="t-card p-3 border-l-2" style={{ borderLeftColor: getStatusColor(status) }}>
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${getStatusColor(status)}15`, color: getStatusColor(status) }}>
                                  {payload?.status || payload?.type || "event"}
                                </span>
                                <span className="font-medium text-text-primary">{payload?.agent || payload?.source || "unknown"}</span>
                                <span className="text-xs text-text-muted">{payload?.stage || ""}</span>
                              </div>
                              <div className="mt-1 text-xs text-text-muted font-mono truncate">{JSON.stringify(ev.payload)}</div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border">
                  {selectedTask.status === "running" && (
                    <Btn variant="danger" onClick={() => { handleCancel(selectedTask.id); setSelectedTask(null); }}>
                      Cancel
                    </Btn>
                  )}
                  {["failed", "cancelled"].includes(selectedTask.status) && (
                    <Btn variant="primary" onClick={() => { handleRetry(selectedTask.id); setSelectedTask(null); }}>
                      Retry
                    </Btn>
                  )}
                  <Btn variant="ghost" onClick={() => setSelectedTask(null)}>Close</Btn>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}