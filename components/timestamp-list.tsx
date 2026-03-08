"use client";

import { Button } from "@/components/ui/button";
import {
  Clock,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Timestamp } from "@/app/types";
import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface TimestampListProps {
  timestamps: Timestamp[];
  onTimestampClick: (ts: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TimestampList({
  timestamps,
  onTimestampClick,
}: TimestampListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [overflowing, setOverflowing] = useState<Set<number>>(new Set());
  const descRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  /* Detect which descriptions overflow their container */
  const measureOverflow = useCallback(() => {
    const result = new Set<number>();
    timestamps.forEach((_, idx) => {
      const el = descRefs.current[idx];
      if (!el) return;
      if (el.scrollWidth > el.offsetWidth || el.scrollHeight > el.offsetHeight) {
        result.add(idx);
      }
    });
    setOverflowing(result);
  }, [timestamps]);

  useEffect(() => {
    const timer = setTimeout(measureOverflow, 120);
    window.addEventListener("resize", measureOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measureOverflow);
    };
  }, [measureOverflow]);

  /* Expand / collapse toggle */
  const toggleItem = (idx: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="grid gap-2">
      {/* Legend */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-white">Key Moments</h2>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-zinc-400">Safe</span>
          </span>
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span className="text-zinc-400">Dangerous</span>
          </span>
        </div>
      </div>

      {/* Timestamp cards */}
      <div className="grid gap-2">
        {timestamps.map((item, idx) => {
          const dangerous = item.isDangerous;
          const isExpanded = expanded.has(idx);
          const hasOverflow = overflowing.has(idx);

          return (
            <Button
              key={idx}
              variant="outline"
              className={`group w-full justify-start gap-2 h-auto py-4 transition-all duration-200 text-left relative overflow-hidden ${dangerous
                  ? "bg-red-950/20 border-red-900/50 hover:bg-red-950/30 hover:border-red-700/70"
                  : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600"
                }`}
              onClick={() => onTimestampClick(item.timestamp)}
            >
              {/* Left accent bar */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 ${dangerous
                    ? "bg-red-500 group-hover:bg-red-400"
                    : "bg-green-500 group-hover:bg-green-400"
                  }`}
              />

              {dangerous ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              ) : (
                <Shield className="h-4 w-4 shrink-0 text-green-400" />
              )}

              <div className="flex flex-col items-start w-full overflow-hidden">
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <span className="font-mono text-white shrink-0">
                    {item.timestamp}
                  </span>
                  {dangerous && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                      Dangerous
                    </span>
                  )}
                </div>

                <div className="w-full mt-1.5">
                  <div
                    className={`relative text-sm transition-all duration-200 ${hasOverflow ? "cursor-pointer" : ""}`}
                    onClick={(e: React.MouseEvent) =>
                      hasOverflow && toggleItem(idx, e)
                    }
                  >
                    <p
                      ref={(el) => {
                        descRefs.current[idx] = el;
                      }}
                      className={`whitespace-pre-wrap break-words ${isExpanded ? "" : "line-clamp-1"} ${dangerous ? "text-red-200/80" : "text-zinc-400"
                        }`}
                    >
                      {item.description}
                    </p>

                    {hasOverflow && (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e: React.MouseEvent) => toggleItem(idx, e)}
                        onKeyDown={(e: React.KeyboardEvent) =>
                          e.key === "Enter" && toggleItem(idx, e)
                        }
                        className={`flex items-center gap-1 text-xs mt-1 cursor-pointer transition-colors ${dangerous
                            ? "text-red-400 hover:text-red-300"
                            : "text-zinc-500 hover:text-zinc-300"
                          }`}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show more
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
