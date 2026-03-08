import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  POST /api/upload — upload a video file to Vercel Blob storage      */
/* ------------------------------------------------------------------ */

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file found in request" },
        { status: 400 },
      );
    }

    const { url } = await put(file.name, file, { access: "public" });

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 },
    );
  }
}
