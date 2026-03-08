"use client";

import React, { useRef, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BoundingBox {
  box_2d: number[];
  label: string;
}

interface BoundingBoxDrawerProps {
  imageUrl: string;
  boxes: BoundingBox[];
}

/* ------------------------------------------------------------------ */
/*  Color palette for box outlines                                     */
/* ------------------------------------------------------------------ */

const BOX_COLORS = [
  "#ef4444", "#22c55e", "#3b82f6", "#eab308", "#f97316",
  "#ec4899", "#8b5cf6", "#a16207", "#6b7280", "#d4a373",
  "#06b6d4", "#14b8a6", "#d946ef", "#84cc16", "#1e3a5f",
  "#7f1d1d", "#0d9488", "#6b8e23", "#fb923c", "#c4b5fd",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Maintain aspect ratio while fitting within maxDim × maxDim. */
function fitDimensions(
  srcW: number,
  srcH: number,
  maxDim: number,
): [number, number] {
  if (srcW <= maxDim && srcH <= maxDim) return [srcW, srcH];

  const ratio = srcW > srcH ? maxDim / srcW : maxDim / srcH;
  return [Math.round(srcW * ratio), Math.round(srcH * ratio)];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BoundingBoxDrawer({ imageUrl, boxes }: BoundingBoxDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const [w, h] = fitDimensions(img.width, img.height, 640);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      // Draw each bounding box
      for (let i = 0; i < boxes.length; i++) {
        const { box_2d, label } = boxes[i];
        let [y1, x1, y2, x2] = box_2d;

        // Normalised (0-1000) → pixel coords
        y1 = (y1 / 1000) * h;
        x1 = (x1 / 1000) * w;
        y2 = (y2 / 1000) * h;
        x2 = (x2 / 1000) * w;

        // Ensure correct ordering
        if (x1 > x2) [x1, x2] = [x2, x1];
        if (y1 > y2) [y1, y2] = [y2, y1];

        const color = BOX_COLORS[i % BOX_COLORS.length];

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        ctx.fillStyle = color;
        ctx.font = "12px sans-serif";
        ctx.fillText(label, x1 + 8, y1 + 6);
      }
    };
  }, [imageUrl, boxes]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "auto" }} />;
}