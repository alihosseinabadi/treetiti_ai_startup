import React from "react";
import { AgentInfo } from "../../api";
import { colorFor, iconFor } from "./agentMeta";

export interface AgentAvatarProps {
  agent: AgentInfo;
  size?: "sm" | "md" | "lg" | "xl";
  running?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  showStatusRing?: boolean;
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-12 w-12 text-[14px]",
  lg: "h-16 w-16 text-[18px]",
  xl: "h-24 w-24 text-[24px]",
};

const STATUS_RING = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

export function AgentAvatar({
  agent,
  size = "md",
  running = false,
  selected = false,
  onClick,
  className = "",
  showStatusRing = true,
}: AgentAvatarProps) {
  const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
  const colorClass = colorFor(key).split(" ")[0].replace("border-", "bg-").replace("/60", "");
  const textColor = colorFor(key).split(" ")[1] || "text-text-primary";
  const icon = iconFor(key);
  const sizeClass = SIZE_CLASSES[size];
  const ringClass = STATUS_RING[size];

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-center rounded-full border-2 transition-all duration-200
        ${sizeClass} ${colorClass} border-white/20
        ${selected ? "ring-4 ring-emerald-400/50 shadow-[0_0_0_2px_rgba(16,185,129,0.4)]" : ""}
        ${running ? "animate-pulse shadow-[0_0_16px_rgba(16,185,129,0.6)]" : ""}
        ${onClick ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
        ${className}
      `}
      style={{
        background: `radial-gradient(circle at 30% 30%, ${colorClass.replace("bg-", "")}CC, ${colorClass.replace("bg-", "")}40)`,
      }}
      aria-label={agent.name}
      title={`${agent.name} — ${agent.role}`}
    >
      <span className={`${textColor} select-none`}>{icon}</span>
      
      {showStatusRing && running && (
        <span className={`absolute -bottom-0.5 -right-0.5 ${ringClass} rounded-full bg-success border-2 border-border animate-pulse`} />
      )}
      
      {selected && !running && (
        <span className={`absolute -bottom-0.5 -right-0.5 ${ringClass} rounded-full bg-success border-2 border-border`} />
      )}
    </button>
  );
}

export function AgentAvatarStack({
  agents,
  maxVisible = 5,
  size = "md",
  onClick,
}: {
  agents: AgentInfo[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
  onClick?: (agent: AgentInfo) => void;
}) {
  const visible = agents.slice(0, maxVisible);
  const remaining = agents.length - maxVisible;

  return (
    <div className="flex -space-x-2" role="group" aria-label={`${agents.length} agents`}>
      {visible.map((agent, i) => (
        <AgentAvatar
          key={agent.key || agent.name}
          agent={agent}
          size={size}
          onClick={() => onClick?.(agent)}
          className="z-[{maxVisible - i}]"
        />
      ))}
      {remaining > 0 && (
        <button
          onClick={() => onClick?.(agents[maxVisible])}
          className={`
            flex items-center justify-center rounded-full border-2 border-border bg-secondary/80 text-text-secondary
            ${SIZE_CLASSES[size]} font-medium select-none
            cursor-pointer hover:border-border-hover hover:bg-hover transition
          `}
        >
          +{remaining}
        </button>
      )}
    </div>
  );
}

export function AgentStatusBadge({
  status,
  size = "md",
}: {
  status: "idle" | "running" | "completed" | "failed" | "waiting";
  size?: "sm" | "md" | "lg";
}) {
  const configs = {
    idle: { bg: "bg-hover", text: "text-text-secondary", label: "Idle" },
    running: { bg: "bg-success/20", text: "text-success", label: "Running" },
    completed: { bg: "bg-accent/20", text: "text-accent", label: "Done" },
    failed: { bg: "bg-error/20", text: "text-error", label: "Failed" },
    waiting: { bg: "bg-warning/20", text: "text-warning", label: "Waiting" },
  };
  
  const config = configs[status];
  const textSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };
  const padding = { sm: "px-1.5 py-0.5", md: "px-2 py-1", lg: "px-3 py-1.5" };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${config.bg} ${config.text} font-medium ${textSizes[size]} ${padding[size]}`}>
      {status === "running" && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
      {config.label}
    </span>
  );
}