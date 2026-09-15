import React from "react";

export const AGENT_COLORS: Record<string, string> = {
  ceo: "border-amber-400/60 text-warning",
  strategist: "border-violet-400/60 text-violet-300",
  market_research: "border-sky-400/60 text-sky-300",
  research: "border-sky-400/60 text-sky-300",
  content_hunter: "border-cyan-400/60 text-cyan-300",
  social_intel: "border-teal-400/60 text-teal-300",
  content_strategist: "border-indigo-400/60 text-indigo-300",
  creative_director: "border-fuchsia-400/60 text-fuchsia-300",
  content: "border-success/60 text-success",
  copywriter: "border-success/60 text-success",
  social_manager: "border-green-400/60 text-green-300",
  td_creative_director: "border-orange-400/60 text-orange-300",
  td_asset_producer: "border-orange-300/60 text-orange-200",
  image: "border-pink-400/60 text-pink-300",
  video: "border-rose-400/60 text-rose-300",
  video_producer: "border-red-400/60 text-error",
  ugc_producer: "border-purple-400/60 text-purple-300",
  editor: "border-lime-400/60 text-lime-300",
  analytics: "border-blue-400/60 text-blue-300",
  growth_optimizer: "border-yellow-400/60 text-yellow-300",
  brand: "border-white/40 text-text-primary",
  developer: "border-slate-400/60 text-slate-300",
  sales: "border-success/60 text-success",
  seo: "border-cyan-400/60 text-cyan-300",
  image_agent: "border-pink-400/60 text-pink-300",
  video_agent: "border-rose-400/60 text-rose-300",
};

export function colorFor(key: string): string {
  return AGENT_COLORS[key] ?? "border-border-hover/60 text-text-secondary";
}

const AGENT_ICONS: Record<string, string> = {
  ceo: "◎",
  strategist: "◎",
  market_research: "◉",
  research: "◉",
  content_hunter: "⌁",
  social_intel: "◈",
  content_strategist: "≡",
  creative_director: "✦",
  content: "✎",
  copywriter: "✎",
  social_manager: "⇄",
  td_creative_director: "◧",
  td_asset_producer: "⬢",
  image: "▨",
  video: "▶",
  video_producer: "◼",
  ugc_producer: "✦",
  editor: "✓",
  analytics: "≋",
  growth_optimizer: "↗",
  brand: "◆",
  developer: "⌘",
  sales: "➤",
  seo: "⌕",
};

export function iconFor(key: string): string {
  return AGENT_ICONS[key] ?? "◉";
}

export function keyForName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

export function keyForAgent(a: { key?: string; name: string }): string {
  return a.key || keyForName(a.name);
}