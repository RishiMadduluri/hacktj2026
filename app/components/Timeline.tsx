"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TimelineEvent {
  startTime: number;
  endTime: number;
  type: "normal" | "warning";
  label: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  totalDuration: number;
  currentTime?: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TICK_COUNT = 14;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Timeline({
  events,
  totalDuration,
  currentTime = 0,
}: TimelineProps) {
  const [tooltip, setTooltip] = useState<{
    event: TimelineEvent;
    pos: { x: number; y: number };
  } | null>(null);

  /** Format seconds as M:SS */
  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = String(Math.floor(sec % 60)).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <>
      <div className="w-full overflow-hidden">
        <div className="relative w-full h-24 bg-gray-800 overflow-x-auto">
          <div className="absolute w-full min-w-full">
            {/* Base track + tick marks */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-600 -translate-y-1/2">
              {Array.from({ length: TICK_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-3 w-px bg-gray-500"
                  style={{
                    left: `${(i / (TICK_COUNT - 1)) * 100}%`,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                    {Math.floor((i / (TICK_COUNT - 1)) * totalDuration)}s
                  </span>
                </div>
              ))}
            </div>

            {/* Event segments */}
            {events.map((ev, i) => {
              const leftPct = (ev.startTime / totalDuration) * 100;
              const widthPct =
                ((ev.endTime - ev.startTime) / totalDuration) * 100;

              return (
                <div
                  key={i}
                  className={cn(
                    "absolute h-2 rounded-full cursor-pointer",
                    ev.type === "warning"
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-blue-500 hover:bg-blue-400",
                  )}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      event: ev,
                      pos: {
                        x: rect.left + rect.width / 2,
                        y: rect.top - 20,
                      },
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}

            {/* Playhead indicator */}
            {currentTime > 0 && (
              <div
                className="absolute w-0.5 h-8 bg-white"
                style={{
                  left: `${(currentTime / totalDuration) * 100}%`,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tooltip portal */}
      {tooltip &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            className="fixed px-4 py-3 bg-gray-800/95 text-white text-sm pointer-events-none z-50 w-[250px] shadow-xl border border-gray-700/50"
            style={{
              left: `${tooltip.pos.x}px`,
              top: `${tooltip.pos.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-medium text-sm mb-1.5">
              {tooltip.event.label}
            </div>
            <div className="text-gray-300 text-xs flex justify-between items-center">
              <span>Time: {fmtTime(tooltip.event.startTime)}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded",
                  tooltip.event.type === "warning"
                    ? "bg-red-500/20 text-red-200"
                    : "bg-blue-500/20 text-blue-200",
                )}
              >
                {tooltip.event.type === "warning" ? "Critical" : "Normal"}
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
