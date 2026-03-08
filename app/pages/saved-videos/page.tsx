"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ArchivedRecording {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  timestamps: { timestamp: string; description: string }[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SavedVideosPage() {
  const [recordings, setRecordings] = useState<ArchivedRecording[]>([]);
  const [query, setQuery] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const stored: ArchivedRecording[] = JSON.parse(
      localStorage.getItem("savedVideos") ?? "[]",
    );
    setRecordings(stored);
  }, []);

  // Derived filtered list
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return recordings;
    return recordings.filter(
      (rec) =>
        rec.name.toLowerCase().includes(q) ||
        rec.timestamps.some((ts) => ts.description.toLowerCase().includes(q)),
    );
  }, [query, recordings]);

  const removeRecording = (id: string) => {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    localStorage.setItem("savedVideos", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8 text-center tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
          Saved Recordings
        </h1>

        {/* Search bar */}
        <div className="mb-6 relative">
          <Input
            type="text"
            placeholder="Search recordings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 pl-10 pr-4 py-2 rounded-full focus:ring-2 focus:ring-white focus:border-transparent"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            size={18}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((rec) => (
            <div
              key={rec.id}
              className="group bg-zinc-900 rounded-lg overflow-hidden transition-all duration-300 hover:bg-zinc-800 hover:-translate-y-1 hover:shadow-lg hover:shadow-red-900/20"
            >
              <div className="aspect-video">
                <video
                  src={rec.url}
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 tracking-wide">
                  {rec.name}
                </h2>
                <div className="flex justify-between items-center">
                  <Link
                    href={`/pages/video/${rec.id}`}
                    className="text-white hover:text-gray-300 text-sm font-medium tracking-wider uppercase transition-colors"
                  >
                    View Analysis
                  </Link>
                  <Button
                    onClick={() => removeRecording(rec.id)}
                    variant="destructive"
                    size="icon"
                    className="rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-zinc-400 mt-8 text-lg font-light">
            {query ? "No recordings match your search." : "No recordings saved yet."}
          </p>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/pages/upload"
            className="text-white hover:text-gray-300 text-lg font-medium tracking-wide transition-colors"
          >
            Back to Analyzer
          </Link>
        </div>
      </div>
    </div>
  );
}
