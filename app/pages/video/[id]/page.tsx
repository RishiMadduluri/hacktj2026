"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import VideoPlayer from "@/components/video-player";
import TimestampList from "@/components/timestamp-list";
import { Timeline } from "@/app/components/Timeline";
import type { Timestamp } from "@/app/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StoredRecording {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  timestamps: Timestamp[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Convert "MM:SS" to total seconds. */
function parseTimestamp(ts: string): number {
  if (ts.includes(":")) {
    const [m, s] = ts.split(":").map(Number);
    return m * 60 + s;
  }
  return Number(ts);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const playerRef = useRef<HTMLVideoElement>(null);

  const [recording, setRecording] = useState<StoredRecording | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [duration, setDuration] = useState(0);

  /* Load from localStorage */
  useEffect(() => {
    const all: StoredRecording[] = JSON.parse(
      localStorage.getItem("savedVideos") ?? "[]",
    );
    const match = all.find((v) => v.id === id);
    if (match) {
      setRecording(match);
    } else {
      router.push("/saved-videos");
    }
  }, [id, router]);

  /* Track playhead + duration */
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;

    const onTime = () => setPlayhead(el.currentTime);
    const onMeta = () => setDuration(el.duration);

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    if (el.duration) onMeta();

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  /* Seek to a timestamp */
  const seekTo = (ts: string) => {
    const el = playerRef.current;
    if (!el) return;
    el.currentTime = parseTimestamp(ts);
    el.play();
  };

  /* Download handler */
  const triggerDownload = () => {
    if (!recording) return;
    const a = document.createElement("a");
    a.href = recording.url;
    a.download = recording.name.toLowerCase().endsWith(".mp4")
      ? recording.name
      : `${recording.name}.mp4`;
    a.setAttribute("type", "video/mp4");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!recording) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
          {recording.name}
        </h1>

        <div className="space-y-4">
          <VideoPlayer
            url={recording.url}
            timestamps={recording.timestamps}
            ref={playerRef}
          />

          {/* Timeline */}
          <div className="w-full mt-4 space-y-2 bg-gray-900/50 p-4 rounded-lg backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white">
              Key Moments Timeline
            </h2>
            <Timeline
              events={recording.timestamps.map((ts) => ({
                startTime: parseTimestamp(ts.timestamp),
                endTime: parseTimestamp(ts.timestamp) + 3,
                type: ts.isDangerous ? "warning" : "normal",
                label: ts.description,
              }))}
              totalDuration={duration || 100}
              currentTime={playhead}
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button
              onClick={triggerDownload}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-2 backdrop-blur-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download MP4
            </Button>
          </div>

          <TimestampList
            timestamps={recording.timestamps}
            onTimestampClick={seekTo}
          />
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pages/saved-videos"
            className="text-red-400 hover:text-red-300"
          >
            Back to Saved Recordings
          </Link>
        </div>
      </div>
    </div>
  );
}
