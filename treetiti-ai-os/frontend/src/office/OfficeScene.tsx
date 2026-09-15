import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DESKS, ROOMS, SCENE_H, SCENE_W, deskFor } from "./config";
import { Mascot } from "./Mascot";
import { useOffice } from "./OfficeStore";

type Camera = { x: number; y: number; zoom: number };

const FIT_PAD = 60;

function fitScale(vw: number, vh: number): number {
  return Math.min((vw - FIT_PAD) / SCENE_W, (vh - FIT_PAD) / SCENE_H);
}

export function OfficeScene() {
  const { agents, focused, setFocused, selectAgent } = useOffice();
  const navigate = useNavigate();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ px: number; py: number; x: number; y: number }>({ px: 0, py: 0, x: 0, y: 0 });
  const camRef = useRef(cam);
  camRef.current = cam;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effective = fitScale(size.w, size.h) * cam.zoom;

  // Center the camera on an agent's desk (used by "focus" click).
  const focusDesk = useCallback(
    (key: string) => {
      const d = deskFor(key);
      if (!d) return;
      const zoom = 1.45;
      const s = fitScale(size.w, size.h) * zoom;
      const x = SCENE_W / 2 - d.x * s;
      const y = SCENE_H / 2 - d.y * s;
      setCam({ x, y, zoom });
    },
    [size],
  );

  useEffect(() => {
    if (focused) focusDesk(focused);
  }, [focused, focusDesk]);

  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setCam((c) => ({ ...c, zoom: Math.min(2.6, Math.max(0.5, c.zoom * factor)) }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    dragStart.current = { px: e.clientX, py: e.clientY, x: cam.x, y: cam.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.px;
    const dy = e.clientY - dragStart.current.py;
    setCam((c) => ({ x: dragStart.current.x + dx, y: dragStart.current.y + dy, zoom: c.zoom }));
  };
  const onPointerUp = () => setDragging(false);

  const resetCam = () => setCam({ x: 0, y: 0, zoom: 1 });

  const activeCount = Object.values(agents).filter((a) => a.phase !== "idle").length;

  return (
    <div
      ref={viewportRef}
      className="absolute inset-0 overflow-hidden cursor-grab select-none"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setDragging(false)}
      style={{ touchAction: "none" }}
    >
      {/* deep-space floor */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 30%, #14141e 0%, #0b0b12 55%, #06060a 100%)",
        }}
      />
      {/* floor grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(900px 700px at 50% 45%, black, transparent)",
          WebkitMaskImage: "radial-gradient(900px 700px at 50% 45%, black, transparent)",
        }}
      />

      {/* camera layer */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: SCENE_W,
          height: SCENE_H,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${effective})`,
          transformOrigin: "50% 50%",
          marginLeft: -SCENE_W / 2,
          marginTop: -SCENE_H / 2,
          transition: dragging ? "none" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* rooms */}
        {ROOMS.map((room) => (
          <div
            key={room.id}
            className="absolute rounded-3xl border"
            style={{
              left: room.x,
              top: room.y,
              width: room.w,
              height: room.h,
              borderColor: `${room.accent}2e`,
              background: `linear-gradient(180deg, ${room.accent}12, rgba(10,10,16,0.55))`,
              boxShadow: `inset 0 0 60px ${room.accent}0d, 0 10px 50px rgba(0,0,0,0.35)`,
            }}
          >
            <div
              className="absolute top-3 left-5 text-[11px] font-semibold tracking-[0.28em]"
              style={{ color: room.accent, opacity: 0.85 }}
            >
              {room.label}
            </div>
            {room.id === "output" && (
              <div className="absolute bottom-4 right-5 text-[10px] text-text-muted tracking-widest">
                LATEST OUTPUTS → SYSTEM
              </div>
            )}
          </div>
        ))}

        {/* desks */}
        {DESKS.map((d) => {
          const live = agents[d.key];
          const phase = live?.phase ?? "idle";
          const isFocused = focused === d.key;
          const animClass =
            phase === "working"
              ? "office-working"
              : phase === "done"
                ? "office-done"
                : phase === "failed"
                  ? "office-fail"
                  : phase === "retrying"
                    ? "office-working"
                    : "office-idle";
          return (
            <div
              key={d.key}
              className="absolute"
              style={{ left: d.x, top: d.y }}
              onClick={(e) => {
                e.stopPropagation();
                setFocused(d.key);
              }}
            >
              {/* desk */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border"
                style={{
                  width: 74,
                  height: 46,
                  left: 0,
                  top: -8,
                  borderColor: isFocused ? d.accent : "rgba(255,255,255,0.08)",
                  background: isFocused
                    ? `linear-gradient(180deg, ${d.accent}33, rgba(0,0,0,0.4))`
                    : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))",
                  boxShadow: isFocused ? `0 0 30px ${d.accent}55` : "none",
                }}
              >
                {/* monitor glow */}
                <div
                  className="absolute left-1/2 top-3 -translate-x-1/2 rounded"
                  style={{
                    width: 30,
                    height: 20,
                    background: `linear-gradient(180deg, ${d.accent}55, ${d.accent}1a)`,
                    border: `1px solid ${d.accent}44`,
                  }}
                />
              </div>

              {/* mascot */}
              <div className="relative -translate-x-1/2 -translate-y-[52px] pointer-events-none">
                {phase !== "idle" && (
                  <span
                    className="absolute left-1/2 top-1/2 rounded-full pointer-events-none office-pulse-ring"
                    style={{
                      width: 44,
                      height: 44,
                      marginLeft: -22,
                      marginTop: -22,
                      border: `2px solid ${d.accent}`,
                      animation: "office-pulse-ring 1.6s ease-out infinite",
                    }}
                  />
                )}
                <div
                  className="cursor-pointer transition-transform duration-200 hover:scale-105"
                  style={{ animation: `${animClass} 2.4s ease-in-out infinite`, filter: `drop-shadow(0 6px 14px ${d.accent}22)` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAgent?.(d.key);
                    navigate(`/chat?agent=${encodeURIComponent(d.key)}`);
                  }}
                >
                  <Mascot accent={d.accent} icon={d.icon} size={56} />
                </div>
              </div>

              {/* status bubble */}
              {phase !== "idle" && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap"
                  style={{
                    bottom: 56,
                    background: "rgba(8,8,14,0.92)",
                    border: `1px solid ${d.accent}66`,
                    color: d.accent,
                    animation: "office-bubble-in 240ms ease-out",
                    boxShadow: `0 4px 18px ${d.accent}22`,
                  }}
                >
                  {phase === "working" && "WORKING"}
                  {phase === "retrying" && "RETRYING"}
                  {phase === "done" && "DONE"}
                  {phase === "failed" && "FAILED"}
                </div>
              )}

              {/* name tag */}
              <div
                className="absolute left-1/2 -translate-x-1/2 text-center text-[10px] tracking-wider"
                style={{
                  top: 22,
                  color: phase === "idle" ? "rgba(255,255,255,0.4)" : d.accent,
                  fontWeight: phase === "idle" ? 400 : 600,
                }}
              >
                {d.name.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* HUD controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <div className="rounded-xl border border-border bg-primary/80 backdrop-blur px-3 py-2 text-[11px] text-text-secondary">
          {activeCount > 0 ? (
            <span>
              <span className="text-accent">{activeCount}</span> agent
              {activeCount === 1 ? "" : "s"} active
            </span>
          ) : (
            "All agents idle"
          )}
        </div>
        <button
          onClick={resetCam}
          className="rounded-xl border border-border bg-primary/80 backdrop-blur px-3 py-2 text-[11px] text-text-secondary hover:text-text-primary hover:border-border-hover transition"
        >
          ⌖ Reset view
        </button>
      </div>

      {dragging && <div className="absolute inset-0" style={{ cursor: "grabbing" }} />}
    </div>
  );
}