import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, AgentInfo, Teammate } from "../api";

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);

  useEffect(() => {
    api.agents().then(setAgents).catch(() => {});
    api.teammates().then(setTeammates).catch(() => {});
  }, []);

  // Merge: prefer teammates (instantiated agents) for display; fall back to registry agents.
  const cards = teammates.length
    ? teammates.map((t) => ({
        key: t.agent_key || t.name.toLowerCase().replace(/\s+/g, "_"),
        name: t.name,
        role: t.role || t.agent_key || "Agent",
        description: t.description || "",
        avatar: t.avatar || "◉",
        skills: t.skills || [],
        tools: t.tools || [],
        model: t.model || "",
        status: t.is_active ? "Ready" : "Paused",
        id: t.id,
      }))
    : agents.map((a) => ({
        key: a.key,
        name: a.name,
        role: a.role || a.key,
        description: a.capabilities?.join(" · ") || "",
        avatar: "◉",
        skills: a.skills || a.capabilities || [],
        tools: [],
        model: "",
        status: a.status || "Ready",
        id: "",
      }));

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="mb-6">
          <div className="t-heading">Agents</div>
          <div className="t-sub">
            Your AI team. Each agent has its own capabilities, tools, model, and memory — give one a job and it executes.
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg-secondary py-16 text-center">
            <div className="text-2xl text-text-muted">◉</div>
            <div className="text-sm font-medium text-text-secondary">Add an AI agent</div>
            <div className="text-[13px] text-text-muted">Agents you create will appear here as first-class workers.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cards.map((c) => (
              <button
                key={c.key + c.name}
                onClick={() => (c.id ? navigate(`/teammate/${c.id}`) : navigate(`/chat?agent=${c.key}`))}
                className="group rounded-xl border border-border bg-bg-secondary p-5 text-left transition hover:border-border-hover hover:bg-bg-tertiary"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-bg-tertiary text-xl text-accent">
                      {c.avatar}
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-text-primary">{c.name}</div>
                      <div className="text-[12px] text-text-muted">{c.role}</div>
                    </div>
                  </div>
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] ${c.status === "Ready" ? "bg-success/10 text-success" : "bg-white/5 text-text-muted"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="mt-3 min-h-[36px] text-[12.5px] leading-relaxed text-text-muted">
                  {c.description}
                </p>
                {c.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.skills.slice(0, 4).map((s, i) => (
                      <span key={i} className="rounded-md border border-border bg-bg-primary px-2 py-0.5 text-[10.5px] text-text-muted">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                {(c.model || c.tools.length > 0) && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10.5px] text-text-muted">
                    <span>{c.model || "Default model"}</span>
                    <span>{c.tools.length} tools</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
