import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, Teammate, Team, Project, MediaAsset, TaskRow } from "../../api";
import { Btn } from "../ui";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon: string;
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  chat: ReturnType<typeof import("../../hooks/useChat").useChat>;
  navigate: (to: string) => void;
  onClose: () => void;
}

export function CommandPalette({ chat, navigate, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build command items
  const buildItems = useMemo(() => {
    const allItems: CommandItem[] = [
      // Navigation
      { id: "nav-chat", title: "New Chat", subtitle: "Start a fresh conversation", category: "Navigation", icon: "＋", keywords: ["new", "chat", "conversation"], action: () => { chat.newChat(); navigate("/chat"); onClose(); }, shortcut: "⌘N" },
      { id: "nav-teammates", title: "Teammates", subtitle: "Manage AI teammates", category: "Navigation", icon: "🤖", keywords: ["teammate", "team", "agent", "bot"], action: () => { navigate("/teammates"); onClose(); } },
      { id: "nav-teams", title: "Teams", subtitle: "Manage teams with Chief coordinators", category: "Navigation", icon: "👑", keywords: ["team", "chief", "group"], action: () => { navigate("/teams"); onClose(); } },
      { id: "nav-projects", title: "Projects", subtitle: "View and manage projects", category: "Navigation", icon: "▦", keywords: ["project", "workspace"], action: () => { navigate("/projects"); onClose(); } },
      { id: "nav-clients", title: "Clients", subtitle: "Client workspaces", category: "Navigation", icon: "◆", keywords: ["client", "customer"], action: () => { navigate("/clients"); onClose(); } },
      { id: "nav-media", title: "Media Library", subtitle: "Images, videos, and generated assets", category: "Navigation", icon: "🖼", keywords: ["media", "image", "video", "asset"], action: () => { navigate("/media"); onClose(); } },
      { id: "nav-research", title: "Deep Research", subtitle: "Run deep research on any topic", category: "Navigation", icon: "◎", keywords: ["research", "analyze", "investigate"], action: () => { navigate("/research"); onClose(); } },
      { id: "nav-swarm", title: "Swarm", subtitle: "Multi-agent orchestration view", category: "Navigation", icon: "◉", keywords: ["swarm", "orchestration", "parallel"], action: () => { navigate("/swarm"); onClose(); } },
      { id: "nav-warroom", title: "War Room", subtitle: "Agents talk to each other, thinking live", category: "Navigation", icon: "⚔", keywords: ["war room", "agents", "talk", "debate", "meeting"], action: () => { navigate("/warroom"); onClose(); } },
      { id: "nav-scheduled", title: "Scheduled Tasks", subtitle: "Recurring autonomous tasks", category: "Navigation", icon: "◷", keywords: ["schedule", "recurring", "cron"], action: () => { navigate("/scheduled"); onClose(); } },
      { id: "nav-office", title: "Office", subtitle: "Quiet minimal workspace", category: "Navigation", icon: "⌂", keywords: ["office", "focus", "minimal"], action: () => { navigate("/office"); onClose(); } },
      { id: "nav-settings", title: "Settings", subtitle: "Application settings", category: "Navigation", icon: "⚙", keywords: ["settings", "preferences", "config"], action: () => { navigate("/settings"); onClose(); } },

      // Quick Actions
      { id: "action-image", title: "Generate Image", subtitle: "Create an image with AI", category: "Actions", icon: "🖼", keywords: ["image", "generate", "picture", "art"], action: () => { onClose(); setTimeout(() => chat.send("/image "), 100); }, shortcut: "⌘I" },
      { id: "action-video", title: "Generate Video", subtitle: "Produce a video with AI", category: "Actions", icon: "🎬", keywords: ["video", "generate", "movie", "clip"], action: () => { onClose(); setTimeout(() => chat.send("/video "), 100); }, shortcut: "⌘V" },
      { id: "action-research", title: "Deep Research", subtitle: "Research a topic deeply", category: "Actions", icon: "◎", keywords: ["research", "deep", "analyze"], action: () => { onClose(); setTimeout(() => chat.send("/research "), 100); } },
      { id: "action-mission", title: "Create Mission", subtitle: "Launch an autonomous mission", category: "Actions", icon: "◎", keywords: ["mission", "autonomous", "recurring"], action: () => { onClose(); setTimeout(() => chat.send("/mission "), 100); } },
      { id: "action-project", title: "Create Project", subtitle: "Start a new project", category: "Actions", icon: "▦", keywords: ["project", "create", "workspace"], action: () => { onClose(); setTimeout(() => chat.send("/project "), 100); } },
      { id: "action-design", title: "Design Brief", subtitle: "Open creative direction", category: "Actions", icon: "◐", keywords: ["design", "creative", "brief"], action: () => { onClose(); setTimeout(() => chat.send("/design "), 100); } },
      { id: "action-status", title: "System Status", subtitle: "Check model health and system status", category: "Actions", icon: "●", keywords: ["status", "health", "models"], action: () => { onClose(); setTimeout(() => chat.send("/status"), 100); } },
      { id: "action-help", title: "Show Help", subtitle: "List all available commands", category: "Actions", icon: "?", keywords: ["help", "commands", "shortcuts"], action: () => { onClose(); setTimeout(() => chat.send("/help"), 100); } },

      // Teammates (dynamic)
      ...chat.teammates.map((t: Teammate) => ({
        id: `teammate-${t.id}`,
        title: `Message ${t.name}`,
        subtitle: `${t.role} · ${t.agent_key}`,
        category: "Teammates",
        icon: t.avatar,
        keywords: ["message", "chat", "teammate", t.name.toLowerCase(), t.role.toLowerCase()],
        action: () => { navigate(`/teammates/${t.id}`); onClose(); },
      })),

      // Teams (dynamic)
      ...chat.teams.map((t: Team) => ({
        id: `team-${t.id}`,
        title: `Open Team: ${t.name}`,
        subtitle: `${t.member_ids.length} members${t.chief_id ? " · Has Chief" : ""}`,
        category: "Teams",
        icon: "👑",
        keywords: ["team", t.name.toLowerCase(), "chief", "members"],
        action: () => { navigate(`/teams/${t.id}`); onClose(); },
      })),

      // Projects (dynamic)
      ...chat.projects.map((p: Project) => ({
        id: `project-${p.id}`,
        title: `Open Project: ${p.name}`,
        subtitle: `Client: ${p.client || "TREEtiti"}`,
        category: "Projects",
        icon: p.name.slice(0, 1).toUpperCase(),
        keywords: ["project", p.name.toLowerCase(), p.client?.toLowerCase() || ""],
        action: () => { navigate(`/projects/${p.id}`); onClose(); },
      })),
    ];

    // Filter by query
    const q = query.toLowerCase().trim();
    if (!q) return allItems;
    
    return allItems.filter((item) => 
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [query, chat.teammates, chat.teams, chat.projects]);

  useEffect(() => {
    setItems(buildItems);
  }, [buildItems]);

  useEffect(() => {
    inputRef.current?.focus();
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        items[selectedIndex]?.action();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIndex, onClose]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const filteredItems = useMemo(() => items.slice(0, 20), [items]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredItems]);

  if (filteredItems.length === 0) {
    return (
      <div className="t-palette w-[600px] max-w-full">
        <div className="p-6 text-center text-text-muted">
          No commands found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div className="t-palette w-[600px] max-w-full">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command, search teammates, teams, projects…"
          className="w-full pl-10 pr-4 py-3 text-[15px] bg-transparent outline-none placeholder:text-text-muted"
          autoFocus
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] text-text-muted bg-bg-elevated rounded">
          ⌘K
        </kbd>
      </div>
      
      <div className="max-h-[60vh] overflow-y-auto">
        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-text-muted bg-bg-secondary border-b border-border">
              {category}
            </div>
            {catItems.map((item, i) => (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(filteredItems.indexOf(item))}
                className={`t-palette-item w-full ${filteredItems[selectedIndex]?.id === item.id ? "selected" : ""}`}
              >
                <span className="t-ico">{item.icon}</span>
                <div className="flex-1 text-left">
                  <span className="t-pk">{item.title}</span>
                  {item.subtitle && <span className="t-phint">{item.subtitle}</span>}
                </div>
                {item.shortcut && <span className="px-2 py-0.5 text-[10px] text-text-muted bg-bg-elevated rounded">{item.shortcut}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

