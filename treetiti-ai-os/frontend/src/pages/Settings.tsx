import React, { useState } from "react";
import { useAuth } from "../auth";
import { api } from "../api";

export default function Settings() {
  const { user, logout } = useAuth();
  const [cat, setCat] = useState("memory");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    try {
      await api.memoryAdd(cat, title.trim(), content);
      setTitle("");
      setContent("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">Settings</div>
        <p className="t-sub">Account and TREEtiti's memory.</p>

        <div className="t-card mt-6 p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Account</div>
          <div className="mt-2 text-sm font-medium text-text-primary">{user?.email}</div>
          <div className="text-xs text-text-muted">Role: {user?.role}</div>
          <button className="t-btn t-btn-ghost mt-3" onClick={logout}>
            Sign out
          </button>
        </div>

        <div className="t-card mt-4 p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Appearance</div>
          <div className="mt-2 text-sm text-text-primary">
            Light theme — clean, white and professional. (Dark mode coming later.)
          </div>
        </div>

        <div className="t-card mt-4 p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Add to TREEtiti's memory</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. Our tone of voice"
            className="mt-3 w-full rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What should TREEtiti remember?"
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-white/[0.1] bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <button className="t-btn t-btn-primary" onClick={save}>
              Save to memory
            </button>
            {saved && <span className="text-xs text-success">Saved ✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}