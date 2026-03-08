"use client";

import { forwardRef, type SyntheticEvent } from "react";
import type { Timestamp } from "@/app/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface VideoPlayerProps {
  url: string;
  timestamps: Timestamp[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * A thin wrapper around a native `<video>` element.
 * Accepts a forwarded ref so parent components can seek programmatically.
 */
const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  function VideoPlayer({ url }, ref) {
    const handleMetadataReady = (e: SyntheticEvent<HTMLVideoElement>) => {
      // Reset playhead to the start once metadata is available
      (e.target as HTMLVideoElement).currentTime = 0;
    };

    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-zinc-900">
        <video
          ref={ref}
          src={url}
          className="w-full h-full"
          controls
          preload="metadata"
          onLoadedMetadata={handleMetadataReady}
        />
      </div>
    );
  },
);

export default VideoPlayer;
