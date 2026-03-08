/* FirstWatch — shared domain types for medical monitoring */

/** A single monitoring feed (camera or sensor) */
export interface MonitorFeed {
  id: string;
  label: string;
  zone: string;
  address: string;
  thumbnail: string;
  streamUrl?: string;
}

/** A group of feeds in a single zone / room */
export interface MonitorZone {
  id: string;
  name: string;
  feeds: MonitorFeed[];
}

/** A detected medical incident from the AI pipeline */
export interface Incident {
  id: string;
  feed: MonitorFeed;
  category: string;
  occurredAt: Date;
  thumbnail?: string;
  summary?: string;
}

/** Bounding-box payload returned by the vision model */
export interface BoundingBoxPayload {
  videoMeta: {
    filename: string;
    width: number;
    height: number;
    fps: number;
    frameCount: number;
    sampleInterval: number;
  };
  detections: Record<
    string,
    {
      regions: [number, number, number, number][];
      scores: number[];
      isKeyframe: boolean;
    }
  >;
}
