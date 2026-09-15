import React, { useRef } from "react";
import { AgentInfo } from "../../api";
import { colorFor, iconFor, keyForAgent } from "./agentMeta";

export type AgentPos = { x: number; y: number };

type Props = {
  agent: AgentInfo;
  pos: AgentPos;
  selected: boolean;
  running: boolean;
  onSelect: () => void;
  onMove: (key: string, x: number, y: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export default function AgentCard({
  agent,
  pos,
  selected,
  running,
  onSelect,
  onMove,
  onDragStart,
  onDragEnd,
}: Props) {
  const key = keyForAgent(agent);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    el.setPointerCapture(e.pointerId);
    onDragStart();
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const el = cardRef.current;
    if (!el) return;
    const canvas = el.parentElement as HTMLElement;
    const cRect = canvas.getBoundingClientRect();
    const x = e.clientX - cRect.left - drag.current.dx;
    const y = e.clientY - cRect.top - drag.current.dy;
    const clampedX = Math.max(0, Math.min(x, cRect.width - el.offsetWidth));
    const clampedY = Math.max(0, Math.min(y, cRect.height - el.offsetHeight));
    onMove(key, clampedX, clampedY);
  };

  const onPointerUp = () => {
    drag.current = null;
    onDragEnd();
  };

  return (
    <div
      ref={cardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      className={`absolute left-0 top-0 w-44 cursor-grab select-none rounded-xl border bg-secondary/90 backdrop-blur p-3 shadow-lg transition-shadow active:cursor-grabbing ${
        colorFor(key)
      } ${selected ? "ring-2 ring-emerald-400/50 shadow-emerald-500/10" : ""} ${
        running ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{iconFor(key)}</span>
        <span className="text-sm font-semibold text-text-primary truncate">{agent.name}</span>
      </div>
      <div className="text-[11px] text-text-muted mt-1 line-clamp-2">{agent.role}</div>
      {running && (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-success">
          <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
          running…
        </div>
      )}
    </div>
  );
}