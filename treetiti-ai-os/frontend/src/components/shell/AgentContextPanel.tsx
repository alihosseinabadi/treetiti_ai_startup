import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Teammate } from "../../api";
import { useOffice } from "../../office/OfficeStore";
import { AGENT_ACCENTS, AGENT_ICONS, AGENT_NAMES, AGENT_ROLES } from "../../office/config";
import { IconGlyph } from "../../office/Mascot";

const PHASE_TEXT: Record<string, { label: string; color: string }> = {
  working: { label: "Working", color: "#34d399" },
  retrying: { label: "Retrying", color: "#fbbf24" },
  done: { label: "Done", color: "#60a5fa" },
  failed: { label: "Failed", color: "#f43f5e" },
  idle: { label: "Idle", color: "#71717a" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">{title}</div>
      {children}
    </div>
  );
}

function Chips({ items, color }: { items: string[]; color: string }) {
  if (!items.length) return <div className="text-[11px] text-text-dim">—</div>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-md px-2 py-0.5 text-[10.5px] font-medium"
          style={{ color, background: `${color}14`, border: `1px solid ${color}22` }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export function AgentContextPanel({ agentKey, onClose }: { agentKey: string; onClose?: () => void }) {
  const navigate = useNavigate();
  const { agents } = useOffice();
  const [profile, setProfile] = useState<Teammate | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const accent = AGENT_ACCENTS[agentKey] ?? "#a1a1aa";
  const icon = AGENT_ICONS[agentKey] ?? "brain";
  const live = agents[agentKey];
  const phase = live?.phase ?? "idle";
  const pinfo = PHASE_TEXT[phase] ?? PHASE_TEXT.idle;

  useEffect(() => {
    setProfile(null);
    let cancelled = false;
    api
      .teammates()
      .then((all) => {
        const match = all.find((t) => t.agent_key === agentKey);
        if (match && !cancelled) setProfile(match);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [agentKey]);

  const toggle = (k: string) => setOpenSections((s) => ({ ...s, [k]: !s[k] }));
  const isOpen = (k: string) => openSections[k] === true;

  const profileSection = (label: string, key: string, render: () => React.ReactNode) => {
    const open = isOpen(key);
    return (
      <div className="rounded-xl border border-border bg-bg-secondary/60">
        <button onClick={() => toggle(key)} className="flex w-full items-center justify-between px-3 py-2 text-left">
          <span className="text-xs font-medium text-text-primary">{label}</span>
          <span className="text-[10px] text-text-muted">{open ? "▾" : "▸"}</span>
        </button>
        {open && <div className="border-t border-border px-3 py-2">{render()}</div>}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* identity */}
      <div className="flex items-center gap-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
          style={{ borderColor: `${accent}66`, background: `linear-gradient(180deg, ${accent}2b, rgba(0,0,0,0.35))`, boxShadow: `0 0 24px ${accent}22` }}
        >
          <IconGlyph icon={icon} accent={accent} size={21} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">{AGENT_NAMES[agentKey] ?? agentKey}</div>
          <div className="truncate text-[11px] text-text-muted">{AGENT_ROLES[agentKey] ?? "Agent"}</div>
        </div>
        <span
          className="ml-auto flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ color: pinfo.color, background: `${pinfo.color}14`, border: `1px solid ${pinfo.color}33` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pinfo.color, boxShadow: `0 0 6px ${pinfo.color}` }} />
          {pinfo.label}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close agent panel"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-text-muted transition hover:border-border-hover hover:text-text-primary"
          >
            ✕
          </button>
        )}
      </div>

      {/* description */}
      {profile?.description && (
        <p className="text-[12px] leading-relaxed text-text-secondary">{profile.description}</p>
      )}

      {live?.note && (
        <div className="rounded-lg border border-border bg-bg-tertiary/60 px-2.5 py-1.5 text-[11px] text-text-secondary">
          {live.note}
        </div>
      )}

      {/* conversation / office shortcuts */}
      <div className="flex gap-1.5">
        <button
          onClick={() => navigate(`/chat?agent=${encodeURIComponent(agentKey)}`)}
          className="flex-1 rounded-lg bg-accent px-2 py-1.5 text-[11px] font-semibold text-bg-primary transition hover:bg-accent-hover"
        >
          Open chat
        </button>
        {profile && (
          <button
            onClick={() => navigate(`/teammates/${profile.id}`)}
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-medium text-text-secondary transition hover:border-border-hover hover:text-text-primary"
          >
            Manage
          </button>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* role / skills / tools */}
      <Section title="Role">
        <div className="text-[12px] text-text-secondary">{AGENT_ROLES[agentKey] ?? profile?.role ?? "—"}</div>
      </Section>

      {profile ? (
        <div className="space-y-2">
          {profileSection("Skills", "skills", () => <Chips items={profile.skills} color={accent} />)}
          {profileSection("Tools", "tools", () => <Chips items={profile.tools} color="#7aa2f7" />)}
          {profileSection("Memory scopes", "memory", () => (
            <div className="space-y-1.5">
              <Chips items={profile.memory_scopes} color="#38bdf8" />
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); navigate(`/teammates/${profile.id}`); }}
                className="block text-[11px] text-accent hover:underline"
              >
                View stored memory →
              </a>
            </div>
          ))}
          {profileSection("Projects", "projects", () => <Chips items={profile.project_access} color="#a78bfa" />)}
          {profileSection("Clients", "clients", () => <Chips items={profile.client_access} color="#f59e0b" />)}
          {profileSection("Routines", "routines", () =>
            profile.routines?.length ? <Chips items={profile.routines} color="#e879f9" /> : <div className="text-[11px] text-text-dim">No routines</div>,
          )}
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Autonomy</div>
            <span className="rounded-md px-2 py-0.5 text-[10.5px] font-medium capitalize" style={{ color: "#a3e635", background: "#a3e63514", border: "1px solid #a3e63522" }}>
              {profile.autonomy_level ?? "—"}
            </span>
          </div>
          {profile.model && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Model</div>
              <div className="truncate font-mono text-[11px] text-text-secondary">{profile.model}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-text-dim">Loading profile…</div>
      )}
    </div>
  );
}