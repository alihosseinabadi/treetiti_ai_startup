import React, { useEffect, useRef, useState } from "react";
import { AgentInfo } from "../../api";
import AgentCard, { AgentPos } from "./AgentCard";
import { keyForAgent } from "./agentMeta";

const STORAGE_KEY = "treetiti_agent_canvas";
const SLOT = { x: 28, y: 30, w: 180, h: 116, gapX: 16, gapY: 16, cols: 5 };

function defaultPositions(agents: AgentInfo[]): Record<string, AgentPos> {
  const out: Record<string, AgentPos> = {};
  agents.forEach((a, i) => {
    const col = i % SLOT.cols;
    const row = Math.floor(i / SLOT.cols);
    out[keyForAgent(a)] = {
      x: SLOT.x + col * (SLOT.w + SLOT.gapX),
      y: SLOT.y + row * (SLOT.h + SLOT.gapY),
    };
  });
  return out;
}

function loadPositions(): Record<string, AgentPos> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, AgentPos>;
  } catch {
    /* ignore */
  }
  return {};
}

type Props = {
  agents: AgentInfo[];
  selected: string;
  runningKeys: Set<string>;
  onSelect: (key: string) => void;
  onReset: () => void;
  children?: React.ReactNode;
};

export default function TeamCanvas({
  agents,
  selected,
  runningKeys,
  onSelect,
  onReset,
  children,
}: Props) {
  const [pos, setPos] = useState<Record<string, AgentPos>>(() =>
    loadPositions(),
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // ensure every agent has a slot
  useEffect(() => {
    setPos((prev) => {
      const merged = { ...prev };
      agents.forEach((a) => {
        const k = keyForAgent(a);
        if (!merged[k]) merged[k] = defaultPositions(agents)[k];
      });
      return merged;
    });
  }, [agents]);

  const save = (next: Record<string, AgentPos>) => {
    setPos(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const onMove = (key: string, x: number, y: number) => {
    setPos((prev) => {
      const next = { ...prev, [key]: { x, y } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = canvasRef.current;
    if (!el) return;
    panning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    el.setPointerCapture(e.pointerId);
  };

  const onBgPointerMove = (e: React.PointerEvent) => {
    if (!panning.current) return;
    setPan({
      x: panStart.current.px + (e.clientX - panStart.current.x),
      y: panStart.current.py + (e.clientY - panStart.current.y),
    });
  };

  const onBgPointerUp = () => {
    panning.current = false;
  };

  const resetLayout = () => {
    const d = defaultPositions(agents);
    save(d);
    setPan({ x: 0, y: 0 });
    onReset();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">
          Drag agents with the mouse · pan the canvas by dragging empty space · positions auto-save
        </div>
        <button
          onClick={resetLayout}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-secondary transition"
        >
          Reset layout
        </button>
      </div>

      <div
        ref={canvasRef}
        onPointerDown={onBgPointerDown}
        onPointerMove={onBgPointerMove}
        onPointerUp={onBgPointerUp}
        className="relative h-[560px] overflow-hidden rounded-xl border border-border/80 bg-primary/60 cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div
          className="absolute"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, width: 0, height: 0 }}
        >
          {agents.map((a) => {
            const key = keyForAgent(a);
            const p = pos[key] ?? { x: 0, y: 0 };
            return (
              <AgentCard
                key={key}
                agent={a}
                pos={p}
                selected={selected === key}
                running={runningKeys.has(key)}
                onSelect={() => onSelect(key)}
                onMove={onMove}
                onDragStart={() => {}}
                onDragEnd={() => {}}
              />
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}