import React from "react";
import { AgentInfo } from "../../api";

/**
 * GrokStyleBot — SVG sticker that looks like the Grok bot:
 * rounded robot head, antenna, eyes visor, mustache, and a crown on top.
 * Each agent gets its own color + tiny role glyph on the forehead badge.
 */
export function GrokStyleBot({
  agent,
  size = 64,
  running = false,
}: {
  agent: AgentInfo;
  size?: number;
  running?: boolean;
}) {
  const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");

  // Per-agent hue so every bot is distinct but consistent
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;

  const gid = `g-${key}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="select-none drop-shadow-md">
      <defs>
        <linearGradient id={`${gid}-head`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue}, 70%, 62%)`} />
          <stop offset="100%" stopColor={`hsl(${hue + 30}, 65%, 42%)`} />
        </linearGradient>
        <linearGradient id={`${gid}-crown`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="60%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#C98A00" />
        </linearGradient>
        {running && (
          <animateTransform
            xlinkHref={`#${gid}-bot`}
            attributeName="transform"
            type="rotate"
            values="-2 50 55; 2 50 55; -2 50 55"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </defs>

      {/* glow ring when running */}
      {running && (
        <circle cx="50" cy="52" r="46" fill="none" stroke={`hsl(${hue},80%,55%)`} strokeWidth="2.5" opacity="0.5">
          <animate attributeName="r" values="44;48;44" dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}

      <g id={`${gid}-bot`}>
        {/* ── Crown ── */}
        <g transform="translate(28,2)">
          <path
            d="M2 20 L2 8 L10 14 L16 4 L22 14 L30 8 L30 20 Z"
            fill={`url(#${gid}-crown)`}
            stroke="#B8860B"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <rect x="1" y="19" width="30" height="5" rx="1.5" fill="#E09B00" stroke="#B8860B" strokeWidth="1" />
          {/* crown gems */}
          <circle cx="16" cy="7" r="2" fill="#EF4444" />
          <circle cx="6" cy="12" r="1.5" fill="#3B82F6" />
          <circle cx="26" cy="12" r="1.5" fill="#10B981" />
        </g>

        {/* ── Antenna ── */}
        <line x1="50" y1="24" x2="50" y2="32" stroke={`hsl(${hue},60%,45%)`} strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="22" r="4" fill={running ? "#34D399" : `hsl(${hue},75%,58%)`}>
          {running && (
            <>
              <animate attributeName="fill" values="#34D399;#10B981;#34D399" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="r" values="4;5;4" dur="0.8s" repeatCount="indefinite" />
            </>
          )}
        </circle>

        {/* ── Head ── */}
        <rect
          x="18"
          y="30"
          width="64"
          height="46"
          rx="16"
          fill={`url(#${gid}-head)`}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
        />

        {/* ear pods */}
        <rect x="12" y="44" width="7" height="16" rx="3.5" fill={`hsl(${hue},55%,38%)`} />
        <rect x="81" y="44" width="7" height="16" rx="3.5" fill={`hsl(${hue},55%,38%)`} />

        {/* ── Visor / face plate ── */}
        <rect x="25" y="38" width="50" height="20" rx="10" fill="#0B1020" opacity="0.92" />

        {/* eyes */}
        <circle cx="40" cy="48" r="4.5" fill="#67E8F9">
          {running ? (
            <animate attributeName="cy" values="48;47;48" dur="0.9s" repeatCount="indefinite" />
          ) : null}
        </circle>
        <circle cx="60" cy="48" r="4.5" fill="#67E8F9">
          {running ? (
            <animate attributeName="cy" values="48;47;48" dur="0.9s" repeatCount="indefinite" />
          ) : null}
        </circle>
        {/* eye glints */}
        <circle cx="41.5" cy="46.5" r="1.3" fill="#fff" opacity="0.9" />
        <circle cx="61.5" cy="46.5" r="1.3" fill="#fff" opacity="0.9" />

        {/* ── Mustache ── */}
        <path
          d="M36 63 Q43 58 50 63 Q57 58 64 63 Q57 68 50 65 Q43 68 36 63 Z"
          fill="#3F2A1D"
          stroke="#2A1B10"
          strokeWidth="0.8"
        />

        {/* chin bolt */}
        <circle cx="50" cy="72" r="2.2" fill={`hsl(${hue},50%,32%)`} />

        {/* ── Body hint ── */}
        <path d="M34 76 L66 76 L72 92 Q50 98 28 92 Z" fill={`hsl(${hue},60%,45%)`} opacity="0.95" />
        {/* collar */}
        <rect x="40" y="74" width="20" height="5" rx="2.5" fill={`hsl(${hue},70%,60%)`} />

        {/* department badge on body */}
        {(agent.department || "AI").slice(0, 2).toUpperCase() && (
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill="rgba(255,255,255,0.85)"
            fontFamily="system-ui"
          >
            {(agent.department || "AI").slice(0, 2).toUpperCase()}
          </text>
        )}
      </g>
    </svg>
  );
}

/** Circular wrapper used everywhere avatars appear */
export function GrokBotAvatar({
  agent,
  size = "md",
  running = false,
  selected = false,
  onClick,
  className = "",
}: {
  agent: AgentInfo;
  size?: "sm" | "md" | "lg" | "xl";
  running?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const px = { sm: 34, md: 52, lg: 72, xl: 104 }[size];
  const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;

  return (
    <button
      onClick={onClick}
      title={`${agent.name} — ${agent.role}`}
      aria-label={agent.name}
      className={`
        relative inline-flex items-center justify-center rounded-full transition-transform duration-200
        ${onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "cursor-default"}
        ${selected ? "ring-4 ring-emerald-400/70" : ""}
        ${className}
      `}
      style={{
        width: px,
        height: px,
        background: `radial-gradient(circle at 35% 30%, hsla(${hue},70%,60%,0.25), hsla(${hue},70%,30%,0.08) 70%)`,
        boxShadow: running
          ? `0 0 ${px / 3}px hsla(${hue},80%,55%,0.65), inset 0 0 0 2px hsla(${hue},80%,60%,0.5)`
          : "inset 0 0 0 2px rgba(255,255,255,0.12)",
      }}
    >
      <GrokStyleBot agent={agent} size={px * 0.94} running={running} />
      {running && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-success border-2 border-border animate-pulse"
          style={{ width: px / 5, height: px / 5 }}
        />
      )}
    </button>
  );
}
