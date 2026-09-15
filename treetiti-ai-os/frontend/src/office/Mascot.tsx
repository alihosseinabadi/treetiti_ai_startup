import React from "react";

// A single consistent mascot design family: a round "treet" bot with a
// per-agent accent glow + role icon. Pure SVG, animated via CSS classes
// applied by the caller (office.css keyframes).

const ICON_PATHS: Record<string, React.ReactNode> = {
  crown: <path d="M4 11l4-5 4 5 4-5 4 5v7H4z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8z" />
    </>
  ),
  lens: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5L20 20" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 12l5-3" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  pulse: <path d="M3 12h4l2-5 3 10 2-5h5" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  spark: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  pen: (
    <>
      <path d="M12 19l7-7-3-3-7 7v3h3zM14 15l-3-3" />
    </>
  ),
  megaphone: <path d="M4 11v2l3 .6V17h2v-2.4l7 1.4V8l-7 1.4V7H7v4z" />,
  cube: (
    <>
      <path d="M12 3l7 4v10l-7 4-7-4V7z" />
      <path d="M12 3v10" />
    </>
  ),
  gem: (
    <>
      <path d="M6 4h12l4 5-10 11L2 9z" />
      <path d="M2 9h20" />
    </>
  ),
  frame: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="1.8" />
      <path d="M3 15l5-4 4 3 3-2 6 5" />
    </>
  ),
  clapper: (
    <>
      <path d="M4 6l16-2-4 4H4zM4 8h16v12H4z" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l5 3.5-5 3.5z" />
    </>
  ),
  wand: (
    <>
      <path d="M5 19L19 5" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="19" r="2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12" y="8" width="3" height="10" />
      <rect x="17" y="5" width="3" height="13" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </>
  ),
  brain: (
    <>
      <path d="M12 4a3 3 0 00-2.8 4A3 3 0 007 9a3 3 0 000 6h10a3 3 0 000-6 3 3 0 00-2.2-1A3 3 0 0012 4z" />
      <path d="M12 4v16" />
    </>
  ),
};

export type MascotProps = {
  accent: string;
  icon: string;
  size?: number;
  className?: string;
};

export function Mascot({ accent, icon, size = 64, className }: MascotProps) {
  const body = accent;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`mascot-body-${accent.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={body} stopOpacity="0.55" />
          <stop offset="100%" stopColor={body} stopOpacity="0.16" />
        </linearGradient>
        <radialGradient id={`mascot-glow-${accent.replace("#", "")}`} cx="0.5" cy="0.42" r="0.55">
          <stop offset="0%" stopColor={body} stopOpacity="0.35" />
          <stop offset="100%" stopColor={body} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* soft aura */}
      <ellipse cx="32" cy="34" rx="26" ry="26" fill={`url(#mascot-glow-${accent.replace("#", "")})`} />

      {/* body */}
      <ellipse cx="32" cy="36" rx="20" ry="21" fill={`url(#mascot-body-${accent.replace("#", "")})`} stroke={body} strokeWidth="2" />

      {/* antenna */}
      <line x1="32" y1="15" x2="32" y2="9" stroke={body} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="8" r="2.6" fill={body} />

      {/* eyes */}
      <g>
        <circle cx="24" cy="32" r="4" fill="#0b0b12" />
        <circle cx="40" cy="32" r="4" fill="#0b0b12" />
        <circle cx="25.4" cy="30.6" r="1.4" fill="#fff" />
        <circle cx="41.4" cy="30.6" r="1.4" fill="#fff" />
      </g>

      {/* mouth */}
      <path d="M27 41q5 3.4 10 0" stroke="#0b0b12" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* feet */}
      <ellipse cx="24" cy="58" rx="5" ry="3" fill={body} opacity="0.55" />
      <ellipse cx="40" cy="58" rx="5" ry="3" fill={body} opacity="0.55" />

      {/* role icon badge on chest */}
      <g transform="translate(32, 47)">
        <circle r="9" fill="#0b0b12" opacity="0.8" />
        <g transform="translate(-6.75, -6.75)">
          <svg width="13.5" height="13.5" viewBox="0 0 24 24">
            <g stroke={body} strokeWidth="2.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {ICON_PATHS[icon] ?? ICON_PATHS.brain}
            </g>
          </svg>
        </g>
      </g>
    </svg>
  );
}

// A filled variant of the icon path used on the chest badge (small, bright).
export function IconGlyph({ icon, accent, size = 18 }: { icon: string; accent: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <g stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {ICON_PATHS[icon] ?? ICON_PATHS.brain}
      </g>
    </svg>
  );
}