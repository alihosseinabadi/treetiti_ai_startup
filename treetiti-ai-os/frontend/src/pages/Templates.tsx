import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, TemplateInfo, TemplateInstallResult } from "../api";
import { getContext } from "./Home";

const CATEGORIES = ["All", "Marketing", "Website", "Social", "Research", "Automation", "Agents", "Content", "Video", "Analytics", "Sales", "Design"];

export function fuzzy(q: string, target: string): boolean {
  if (!q) return true;
  const query = q.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(query)) return true;
  let qi = 0;
  for (const c of t) {
    if (c === query[qi]) qi++;
    if (qi === query.length) return true;
  }
  return false;
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<TemplateInstallResult | null>(null);

  const isCustomer = getContext().startsWith("customer:");
  const client = isCustomer ? getContext().slice("customer:".length) : "TREEtiti";

  const load = () => {
    api
      .templates(getContext())
      .then((d) => setTemplates(d.templates))
      .catch((e) => setErr((e as Error).message));
  };

  useEffect(load, []);

  const list = useMemo(
    () =>
      templates.filter(
        (t) =>
          (cat === "All" || t.category === cat) &&
          fuzzy(q, `${t.name} ${t.category} ${t.description} ${t.capabilities.join(" ")}`),
      ),
    [q, cat, templates],
  );

  const install = async (t: TemplateInfo) => {
    setErr(null);
    setBusy(t.id);
    try {
      const res = await api.templateInstall(t.id, client);
      setLast(res);
      navigate(`/work?mission=${res.mission.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const uninstall = async (t: TemplateInfo) => {
    if (!window.confirm(`Uninstall “${t.name}”? Its missions and schedules for ${client} will be archived.`)) return;
    setErr(null);
    setBusy(t.id);
    try {
      await api.templateUninstall(t.id, client);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">AI System Templates</div>
        <p className="t-sub">
          Curated blueprints that really install — each one creates a configured mission, recurring
          agent schedules and a project. See them live on the Missions page.
        </p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates… e.g. instagram leads"
          className="mt-6 w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-4 py-3 text-sm text-text-primary shadow-sm outline-none focus:border-accent"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`t-chip ${cat === c ? "!border-accent/50 !bg-accent/10 !text-accent" : ""}`}
            >
              {c}
            </button>
          ))}
        </div>

        {err && <div className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{err}</div>}

        {last && (
          <div className="mt-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs text-success">
            Installed <span className="font-semibold">{last.mission.name}</span>
            {last.schedules.length > 0 && <> · {last.schedules.length} schedules</>}
            {last.project && <> · project “{last.project.name}”</>} — now running for {client || "internal"}.
          </div>
        )}

        <div className="mt-6 space-y-3">
          {list.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              No templates match. Try another search.
            </div>
          )}
          {list.map((t) => (
            <div key={t.id} className="t-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{t.name}</span>
                <span className="t-pill t-pill-gray">{t.category}</span>
                <span
                  className={`t-pill ${
                    t.security === "Verified" ? "t-pill-green" : t.security === "Review" ? "t-pill-amber" : "t-pill-red"
                  }`}
                >
                  {t.security}
                </span>
                {t.installed > 0 && (
                  <span className="t-pill t-pill-blue">● {t.installed} installed</span>
                )}
                <span className="ml-auto text-[11px] text-text-muted">v{t.version}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">{t.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.capabilities.map((c) => (
                  <span key={c} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                <span>Source: {t.source}</span>
                <span>·</span>
                <span>License: {t.license}</span>
                <span>·</span>
                <span>Deps: {t.deps}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button className="t-btn t-btn-primary" disabled={busy === t.id} onClick={() => install(t)}>
                  {busy === t.id ? "Installing…" : "Use"}
                </button>
                {t.installed > 0 && (
                  <button className="t-btn t-btn-ghost" disabled={busy === t.id} onClick={() => uninstall(t)}>
                    Uninstall
                  </button>
                )}
                <button className="t-btn t-btn-ghost" onClick={() => setCat(t.category)}>
                  Compare
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}