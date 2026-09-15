import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, Project } from "../api";

export function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    api.projects().then((all) => {
      const p = all.find((x) => x.id === id);
      setProject(p ?? null);
    });
    api.sessions().then((list) => {
      setSessions(list.filter((s) => s.project_id === id));
    });
  }, [id]);

  if (!project) {
    return (
      <div className="t-page">
        <div className="t-page-inner">
          <div className="text-sm text-text-muted">Loading project…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="t-page">
      <div className="t-page-inner max-w-2xl">
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent">Project</div>
          <h1 className="mt-1 font-display text-3xl text-text-primary">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-sm text-text-muted">{project.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/chat")}
              className="t-btn t-btn-primary"
            >
              Start a chat
            </button>
            <button
              onClick={() => navigate("/media")}
              className="t-btn"
            >
              Create media
            </button>
          </div>
        </div>

        {sessions.length > 0 && (
          <div>
            <div className="t-sidebar-label">Chats in this project</div>
            <div className="mt-2 space-y-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigate(`/chat?s=${s.id}`)}
                  className="t-sidebar-item w-full"
                >
                  <span className="t-ico">◈</span>
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}