// TREEtiti OFFICE — scene config: rooms, desks, per-agent identity.
// Coordinates are in a logical 1600x1000 scene space (2.5D floor).

export type AgentDesk = {
  key: string;
  name: string;
  role: string;
  dept: string;
  x: number;
  y: number;
  accent: string;
  icon: string;
};

export type Room = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  agents: string[];
};

export const SCENE_W = 1600;
export const SCENE_H = 1000;

// Per-agent accent + accessory icon (SVG path id, see Mascot.tsx).
export const AGENT_ACCENTS: Record<string, string> = {
  ceo: "#fbbf24",
  strategist: "#a78bfa",
  market_research: "#38bdf8",
  content_hunter: "#22d3ee",
  social_intel: "#2dd4bf",
  content_strategist: "#818cf8",
  creative_director: "#e879f9",
  content: "#34d399",
  social_manager: "#4ade80",
  td_creative_director: "#fb923c",
  td_asset_producer: "#fdba74",
  image: "#f472b6",
  video: "#fb7185",
  video_producer: "#f43f5e",
  ugc_producer: "#c084fc",
  editor: "#a3e635",
  analytics: "#60a5fa",
  growth_optimizer: "#facc15",
  brand: "#e4e4e7",
};

export const AGENT_ICONS: Record<string, string> = {
  ceo: "crown",
  strategist: "compass",
  market_research: "lens",
  content_hunter: "radar",
  social_intel: "pulse",
  content_strategist: "grid",
  creative_director: "spark",
  content: "pen",
  social_manager: "megaphone",
  td_creative_director: "cube",
  td_asset_producer: "gem",
  image: "frame",
  video: "clapper",
  video_producer: "play",
  ugc_producer: "wand",
  editor: "shield",
  analytics: "chart",
  growth_optimizer: "trend",
  brand: "brain",
};

export const AGENT_NAMES: Record<string, string> = {
  ceo: "CEO",
  strategist: "Strategist",
  market_research: "Researcher",
  content_hunter: "Trend Scout",
  social_intel: "Intel",
  content_strategist: "Content Strat",
  creative_director: "Creative Dir",
  content: "Copywriter",
  social_manager: "Social Mgr",
  td_creative_director: "3D Creative",
  td_asset_producer: "3D Producer",
  image: "Image Producer",
  video: "Video Director",
  video_producer: "Video Producer",
  ugc_producer: "UGC Producer",
  editor: "QA Guardian",
  analytics: "Analytics",
  growth_optimizer: "Growth Opt",
  brand: "Brand Brain",
};

export const AGENT_ROLES: Record<string, string> = {
  ceo: "Dynamic supervisor; activates the right team per task",
  strategist: "Market strategy, positioning, campaign concepts",
  market_research: "Evidence-sourced market research (web + social)",
  content_hunter: "Finds trends, angles and content gaps",
  social_intel: "Monitors competitor & social signals",
  content_strategist: "Editorial calendar, content pillars, briefing",
  creative_director: "Visual identity, art direction, brand look",
  content: "Hooks, copy, CTAs in the brand voice",
  social_manager: "Publish + engage across platform adapters",
  td_creative_director: "3D look direction, concepts, asset briefs",
  td_asset_producer: "Builds 3D assets via Tripo/Meshy/Blender",
  image: "Image generation via multi-provider abstraction",
  video: "Video direction, scripts, shot lists, assembly",
  video_producer: "Renders/assembles video via media providers",
  ugc_producer: "UGC-style content (image+video+voice combo)",
  editor: "VETO-quality gate over every important output",
  analytics: "WHY behind the numbers, insight reports",
  growth_optimizer: "Learning loop: analyze → optimize → re-run",
  brand: "Persistent business memory; every agent reads/writes",
};

// Room layout on the floor. Desk positions are per-agent character anchors.
export const ROOMS: Room[] = [
  {
    id: "exec",
    label: "EXECUTIVE",
    x: 620, y: 60, w: 360, h: 200,
    accent: "#fbbf24",
    agents: ["ceo"],
  },
  {
    id: "research",
    label: "RESEARCH",
    x: 60, y: 300, w: 340, h: 340,
    accent: "#38bdf8",
    agents: ["market_research", "content_hunter", "social_intel"],
  },
  {
    id: "strategy",
    label: "STRATEGY",
    x: 430, y: 300, w: 340, h: 340,
    accent: "#a78bfa",
    agents: ["strategist", "content_strategist", "creative_director"],
  },
  {
    id: "content",
    label: "CONTENT",
    x: 800, y: 300, w: 340, h: 340,
    accent: "#34d399",
    agents: ["content", "social_manager", "brand"],
  },
  {
    id: "production",
    label: "PRODUCTION",
    x: 1170, y: 300, w: 370, h: 340,
    accent: "#fb7185",
    agents: ["td_creative_director", "td_asset_producer", "image", "video", "video_producer", "ugc_producer"],
  },
  {
    id: "quality",
    label: "QUALITY",
    x: 60, y: 680, w: 340, h: 250,
    accent: "#a3e635",
    agents: ["editor"],
  },
  {
    id: "growth",
    label: "GROWTH",
    x: 430, y: 680, w: 340, h: 250,
    accent: "#facc15",
    agents: ["analytics", "growth_optimizer"],
  },
  {
    id: "output",
    label: "OUTPUT WALL",
    x: 1170, y: 680, w: 370, h: 250,
    accent: "#e4e4e7",
    agents: [],
  },
];

export const DESKS: AgentDesk[] = [
  { key: "ceo", name: "CEO", role: AGENT_ROLES.ceo, dept: "exec", x: 800, y: 228, accent: AGENT_ACCENTS.ceo, icon: AGENT_ICONS.ceo },

  { key: "market_research", name: "Researcher", role: AGENT_ROLES.market_research, dept: "research", x: 130, y: 606, accent: AGENT_ACCENTS.market_research, icon: AGENT_ICONS.market_research },
  { key: "content_hunter", name: "Trend Scout", role: AGENT_ROLES.content_hunter, dept: "research", x: 230, y: 606, accent: AGENT_ACCENTS.content_hunter, icon: AGENT_ICONS.content_hunter },
  { key: "social_intel", name: "Intel", role: AGENT_ROLES.social_intel, dept: "research", x: 330, y: 606, accent: AGENT_ACCENTS.social_intel, icon: AGENT_ICONS.social_intel },

  { key: "strategist", name: "Strategist", role: AGENT_ROLES.strategist, dept: "strategy", x: 470, y: 606, accent: AGENT_ACCENTS.strategist, icon: AGENT_ICONS.strategist },
  { key: "content_strategist", name: "Content Strat", role: AGENT_ROLES.content_strategist, dept: "strategy", x: 570, y: 606, accent: AGENT_ACCENTS.content_strategist, icon: AGENT_ICONS.content_strategist },
  { key: "creative_director", name: "Creative Dir", role: AGENT_ROLES.creative_director, dept: "strategy", x: 670, y: 606, accent: AGENT_ACCENTS.creative_director, icon: AGENT_ICONS.creative_director },

  { key: "content", name: "Copywriter", role: AGENT_ROLES.content, dept: "content", x: 850, y: 606, accent: AGENT_ACCENTS.content, icon: AGENT_ICONS.content },
  { key: "social_manager", name: "Social Mgr", role: AGENT_ROLES.social_manager, dept: "content", x: 950, y: 606, accent: AGENT_ACCENTS.social_manager, icon: AGENT_ICONS.social_manager },
  { key: "brand", name: "Brand Brain", role: AGENT_ROLES.brand, dept: "content", x: 1050, y: 606, accent: AGENT_ACCENTS.brand, icon: AGENT_ICONS.brand },

  { key: "td_creative_director", name: "3D Creative", role: AGENT_ROLES.td_creative_director, dept: "production", x: 1240, y: 470, accent: AGENT_ACCENTS.td_creative_director, icon: AGENT_ICONS.td_creative_director },
  { key: "td_asset_producer", name: "3D Producer", role: AGENT_ROLES.td_asset_producer, dept: "production", x: 1330, y: 470, accent: AGENT_ACCENTS.td_asset_producer, icon: AGENT_ICONS.td_asset_producer },
  { key: "image", name: "Image Producer", role: AGENT_ROLES.image, dept: "production", x: 1420, y: 470, accent: AGENT_ACCENTS.image, icon: AGENT_ICONS.image },
  { key: "video", name: "Video Director", role: AGENT_ROLES.video, dept: "production", x: 1240, y: 590, accent: AGENT_ACCENTS.video, icon: AGENT_ICONS.video },
  { key: "video_producer", name: "Video Producer", role: AGENT_ROLES.video_producer, dept: "production", x: 1330, y: 590, accent: AGENT_ACCENTS.video_producer, icon: AGENT_ICONS.video_producer },
  { key: "ugc_producer", name: "UGC Producer", role: AGENT_ROLES.ugc_producer, dept: "production", x: 1420, y: 590, accent: AGENT_ACCENTS.ugc_producer, icon: AGENT_ICONS.ugc_producer },

  { key: "editor", name: "QA Guardian", role: AGENT_ROLES.editor, dept: "quality", x: 200, y: 900, accent: AGENT_ACCENTS.editor, icon: AGENT_ICONS.editor },

  { key: "analytics", name: "Analytics", role: AGENT_ROLES.analytics, dept: "growth", x: 530, y: 900, accent: AGENT_ACCENTS.analytics, icon: AGENT_ICONS.analytics },
  { key: "growth_optimizer", name: "Growth Opt", role: AGENT_ROLES.growth_optimizer, dept: "growth", x: 650, y: 900, accent: AGENT_ACCENTS.growth_optimizer, icon: AGENT_ICONS.growth_optimizer },
];

export function deskFor(key: string): AgentDesk | undefined {
  return DESKS.find((d) => d.key === key);
}

export function roomFor(key: string): Room | undefined {
  return ROOMS.find((r) => r.agents.includes(key));
}