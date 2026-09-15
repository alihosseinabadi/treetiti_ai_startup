import React, { useEffect, useState } from "react";
import { api, Project } from "../api";
import { Card, ErrorBanner, StatusPill } from "../components/ui";
import ContextMenu from "../components/ContextMenu";

export default function Projects() {
  const [items, setItems] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");

  const load = () =>
    api
      .projects()
      .then(setItems)
      .catch((e) => setError((e as Error).message));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await api.projectCreate({ name: name.trim(), client, description });
      setNotice(`Created "${name.trim()}"`);
      setName("");
      setClient("");
      setDescription("");
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const archive = async (id: string) => {
    setError(null);
    try {
      await api.projectUpdate(id, { status: "archived" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const togglePin = async (p: Project) => {
    setError(null);
    try {
      await api.projectPin(p.id, !p.pinned);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Projects</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Client initiatives bundling campaigns, content and media assets.
        </p>
      </div>

      <ErrorBanner message={error} />

      <Card title="New project">
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client"
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            onClick={create}
            className="t-btn t-btn-primary"
          >
            Create
          </button>
          {notice && <span className="ml-3 text-xs text-success">{notice}</span>}
        </div>
      </Card>

      <div className="space-y-3">
        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-white/[0.06] bg-bg-secondary p-5 flex items-start justify-between"
          >
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => togglePin(p)}
                  title={p.pinned ? "Unpin" : "Pin to top"}
                  aria-label={p.pinned ? "Unpin project" : "Pin project"}
                  className={`text-sm ${p.pinned ? "text-accent" : "text-text-secondary hover:text-text-muted"}`}
                >
                  📌
                </button>
                <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                <StatusPill status={p.status} />
              </div>
              {p.client && <div className="text-xs text-text-muted mt-0.5">Client: {p.client}</div>}
              {p.description && (
                <div className="text-sm text-text-muted mt-2">{p.description}</div>
              )}
            </div>
            {p.status !== "archived" && (
              <ContextMenu
                items={[
                  {
                    label: "Archive",
                    icon: "🗄",
                    danger: true,
                    confirm: true,
                    onClick: () => archive(p.id),
                  },
                ]}
              />
            )}
          </div>
        ))}
        {items.length === 0 && !error && (
          <div className="text-sm text-text-muted text-center py-8">No projects yet.</div>
        )}
      </div>
    </div>
  );
}