import React, { useState, useRef, useEffect, useCallback } from "react";
import { AgentInfo } from "../../api";
import { AgentAvatar, AgentAvatarStack, AgentStatusBadge } from "./AgentAvatar";
import { AgentProfileModal } from "./AgentProfileModal";
import { api } from "../../api";
import { Search, Grid, Layers, RefreshCw, MessageSquare, Bot } from "../ui-icons";

interface AgentCanvasProps {
  agents: AgentInfo[];
  selectedAgent?: AgentInfo;
  onSelectAgent: (agent: AgentInfo) => void;
  runningTasks?: Record<string, string>;
  projectId?: string;
}

const STORAGE_KEY = "treetiti_agent_canvas_v2";
const CANVAS_SIZE = { width: 1200, height: 800 };
const GRID_SIZE = 24;

interface AgentPosition {
  x: number;
  y: number;
}

interface AgentConnection {
  from: string;
  to: string;
  type: "delegates" | "collaborates" | "reviews";
}

interface CanvasState {
  positions: Record<string, AgentPosition>;
  connections: AgentConnection[];
  pan: { x: number; y: number };
  zoom: number;
  showGrid: boolean;
}

function defaultPositions(agents: AgentInfo[]): Record<string, AgentPosition> {
  const out: Record<string, AgentPosition> = {};
  const centerX = CANVAS_SIZE.width / 2;
  const centerY = CANVAS_SIZE.height / 2;
  const radius = 200;
  
  agents.forEach((a, i) => {
    const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
    const key = a.key || a.name.toLowerCase().replace(/\s+/g, "_");
    out[key] = {
      x: centerX + Math.cos(angle) * radius - 60,
      y: centerY + Math.sin(angle) * radius - 60,
    };
  });
  return out;
}

function loadCanvasState(): CanvasState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    positions: {},
    connections: [],
    pan: { x: 0, y: 0 },
    zoom: 1,
    showGrid: true,
  };
}

function saveCanvasState(state: Partial<CanvasState>) {
  try {
    const current = loadCanvasState();
    const next = { ...current, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function AgentCanvas({
  agents,
  selectedAgent,
  onSelectAgent,
  runningTasks = {},
  projectId,
}: AgentCanvasProps) {
  const [state, setState] = useState<CanvasState>(() => {
    const saved = loadCanvasState();
    return {
      ...saved,
      positions: { ...defaultPositions(agents), ...saved.positions },
    };
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"canvas" | "grid" | "list">("canvas");
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize positions for new agents
  useEffect(() => {
    setState(prev => {
      const defaults = defaultPositions(agents);
      const merged = { ...defaults, ...prev.positions };
      let changed = false;
      agents.forEach(a => {
        const key = a.key || a.name.toLowerCase().replace(/\s+/g, "_");
        if (!prev.positions[key]) {
          merged[key] = defaults[key];
          changed = true;
        }
      });
      if (changed) {
        saveCanvasState({ positions: merged });
        return { ...prev, positions: merged };
      }
      return prev;
    });
  }, [agents]);

  const handlePointerDown = (e: React.PointerEvent, agent: AgentInfo) => {
    if (e.button !== 0) return;
    const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
    const el = (e.target as HTMLElement).closest(".agent-node");
    if (!el) return;
    
    const rect = el.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    setDraggingKey(key);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setSelectedKey(key);
    onSelectAgent(agent);
    e.preventDefault();
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingKey || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - containerRect.left - dragOffset.x) / state.zoom;
    const y = (e.clientY - containerRect.top - dragOffset.y) / state.zoom;
    
    // Snap to grid if enabled
    const snappedX = state.showGrid ? Math.round(x / GRID_SIZE) * GRID_SIZE : x;
    const snappedY = state.showGrid ? Math.round(y / GRID_SIZE) * GRID_SIZE : y;
    
    setState(prev => {
      const next = { ...prev, positions: { ...prev.positions, [draggingKey]: { x: snappedX, y: snappedY } } };
      saveCanvasState({ positions: next.positions });
      return next;
    });
  }, [draggingKey, dragOffset, state.zoom, state.showGrid]);

  const handlePointerUp = () => {
    setDraggingKey(null);
  };

  const handleBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".agent-node")) return;
    setPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY, px: state.pan.x, py: state.pan.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleBgPointerMove = (e: React.PointerEvent) => {
    if (!panning) return;
    setState(prev => ({
      ...prev,
      pan: {
        x: panStart.px + (e.clientX - panStart.x) / state.zoom,
        y: panStart.py + (e.clientY - panStart.y) / state.zoom,
      },
    }));
  };

  const handleBgPointerUp = () => {
    if (panning) {
      setState(prev => {
        saveCanvasState({ pan: prev.pan });
        return prev;
      });
    }
    setPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setState(prev => {
      const nextZoom = Math.max(0.3, Math.min(2, prev.zoom * delta));
      saveCanvasState({ zoom: nextZoom });
      return { ...prev, zoom: nextZoom };
    });
  };

  const resetLayout = () => {
    const defaults = defaultPositions(agents);
    setState(prev => {
      const next = { ...prev, positions: defaults, pan: { x: 0, y: 0 }, zoom: 1 };
      saveCanvasState({ positions: defaults, pan: { x: 0, y: 0 }, zoom: 1 });
      return next;
    });
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const runningKeys = new Set(Object.keys(runningTasks));

  return (
    <div className="h-full flex flex-col bg-primary">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/50 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-text-primary">Agent Canvas</h2>
          <span className="px-2 py-0.5 bg-secondary text-xs text-text-secondary rounded">
            {agents.length} agents
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-8 py-1.5 pl-8 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent w-48"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            {[
              { mode: "canvas" as const, icon: <Layers className="h-4 w-4" />, label: "Canvas" },
              { mode: "grid" as const, icon: <Grid className="h-4 w-4" />, label: "Grid" },
              { mode: "list" as const, icon: <MessageSquare className="h-4 w-4" />, label: "List" },
            ].map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`p-2 rounded transition ${viewMode === mode ? "bg-success/20 text-success" : "text-text-muted hover:text-text-secondary"}`}
                title={label}
              >
                {icon}
              </button>
            ))}
          </div>
          
          <button
            onClick={resetLayout}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-secondary transition"
            title="Reset layout"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setState(prev => {
              const next = { ...prev, showGrid: !prev.showGrid };
              saveCanvasState({ showGrid: next.showGrid });
              return next;
            })}
            className={`p-2 rounded-lg transition ${state.showGrid ? "text-success bg-success/10" : "text-text-muted hover:text-text-secondary hover:bg-secondary"}`}
            title="Toggle grid"
          >
            <Grid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas / Grid / List View */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "canvas" && (
          <div
            ref={containerRef}
            onPointerDown={handleBgPointerDown}
            onPointerMove={handleBgPointerMove}
            onPointerUp={handleBgPointerUp}
            onWheel={handleWheel}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage: state.showGrid 
                ? `url("data:image/svg+xml,%3Csvg width='${GRID_SIZE}' height='${GRID_SIZE}' viewBox='0 0 ${GRID_SIZE} ${GRID_SIZE}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}' fill='none' stroke='%233f3f46' stroke-width='0.5'/%3E%3C/svg%3E")`
                : "none",
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {/* Connections */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: CANVAS_SIZE.width, height: CANVAS_SIZE.height }}>
              {state.connections.map((conn, i) => {
                const from = state.positions[conn.from];
                const to = state.positions[conn.to];
                if (!from || !to) return null;
                const fromCenter = { x: from.x + 60, y: from.y + 60 };
                const toCenter = { x: to.x + 60, y: to.y + 60 };
                const color = conn.type === "delegates" ? "#7aa2f7" : conn.type === "reviews" ? "#ef4444" : "#10b981";
                return (
                  <line
                    key={i}
                    x1={fromCenter.x}
                    y1={fromCenter.y}
                    x2={toCenter.x}
                    y2={toCenter.y}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={conn.type === "collaborates" ? "5,5" : "none"}
                    opacity={0.4}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#7aa2f7" opacity="0.4" />
                </marker>
              </defs>
            </svg>

            {/* Agent Nodes */}
            {filteredAgents.map(agent => {
              const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
              const pos = state.positions[key] || { x: 0, y: 0 };
              const running = runningKeys.has(key);
              const selected = selectedKey === key;
              
              return (
                <div
                  key={key}
                  className="agent-node absolute"
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    zIndex: selected ? 100 : running ? 50 : 10,
                  }}
                  onPointerDown={e => handlePointerDown(e, agent)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <div className="group">
                    <AgentAvatar
                      agent={agent}
                      size="lg"
                      running={running}
                      selected={selected}
                      onClick={() => {
                        setSelectedKey(key);
                        onSelectAgent(agent);
                        setShowProfile(true);
                      }}
                    />
                    
                    {/* Agent Label */}
                    <div className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 w-max px-2 py-1 bg-secondary/90 backdrop-blur rounded border border-border text-[11px] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {agent.name}
                    </div>
                    
                    {/* Status Badge */}
                    {running && (
                      <div className="absolute -top-2 -right-2">
                        <AgentStatusBadge status="running" size="sm" />
                      </div>
                    )}
                    
                    {/* Connection handles */}
                    {!running && !selected && (
                      <>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-4" />
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-4" />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {viewMode === "grid" && (
          <div className="p-4 overflow-y-auto" style={{ height: "100%" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAgents.map(agent => {
                const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
                const running = runningKeys.has(key);
                const selected = selectedKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedKey(key);
                      onSelectAgent(agent);
                      setShowProfile(true);
                    }}
                    className={`group p-4 rounded-xl border bg-secondary/50 backdrop-blur transition-all ${
                      selected ? "border-success/50 bg-success/5 shadow-emerald-500/10" : "border-border hover:border-border"
                    } ${running ? "ring-2 ring-emerald-500/30" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <AgentAvatar agent={agent} size="md" running={running} />
                      {running && <AgentStatusBadge status="running" size="sm" />}
                    </div>
                    <h3 className="font-medium text-text-primary mb-1">{agent.name}</h3>
                    <p className="text-sm text-text-secondary mb-2 line-clamp-1">{agent.role}</p>
                    <div className="flex flex-wrap gap-1">
                      {(agent.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-secondary text-[10px] text-text-secondary rounded">{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {viewMode === "list" && (
          <div className="overflow-y-auto" style={{ height: "100%" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-4">Agent</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4">Skills</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map(agent => {
                  const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
                  const running = runningKeys.has(key);
                  const selected = selectedKey === key;
                  return (
                    <tr
                      key={key}
                      onClick={() => {
                        setSelectedKey(key);
                        onSelectAgent(agent);
                        setShowProfile(true);
                      }}
                      className={`cursor-pointer transition ${selected ? "bg-success/5" : "hover:bg-secondary/50"}`}
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <AgentAvatar agent={agent} size="sm" running={running} />
                          <span className="font-medium text-text-primary">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-secondary">{agent.role}</td>
                      <td className="py-3 pr-4 text-sm text-text-muted">{agent.department || "—"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(agent.skills || []).slice(0, 4).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-secondary text-[10px] text-text-secondary rounded">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {running ? (
                          <AgentStatusBadge status="running" size="sm" />
                        ) : (
                          <AgentStatusBadge status="idle" size="sm" />
                        )}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setShowProfile(true);
                          }}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-secondary rounded transition"
                        >
                          <Bot className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agent Profile Modal */}
      <AgentProfileModal
        agent={agents.find(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) === selectedKey) || agents[0]}
        isOpen={showProfile && !!selectedKey}
        onClose={() => setShowProfile(false)}
        onEditInstruction={async (agentKey, instruction) => {
          await api.agentInstructionSet(agentKey, instruction);
        }}
      />
    </div>
  );
}