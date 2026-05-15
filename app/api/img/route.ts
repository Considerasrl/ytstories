import { NextRequest } from "next/server";

const VIDEO_ID_RE = /^[\w-]{11}$/;

// Try thumbnails in descending order of quality. All three are clean 16:9.
// maxresdefault.jpg (1280x720) — only present when the uploader supplied HD.
// hq720.jpg (1280x720) — typically available.
// mqdefault.jpg (320x180) — universally available.
const CANDIDATES = ["maxresdefault.jpg", "hq720.jpg", "mqdefault.jpg"];

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("v") ?? "";
  if (!VIDEO_ID_RE.test(v)) {
    return new Response("Invalid video id", { status: 400 });
  }

  for (const variant of CANDIDATES) {
    const upstream = await fetch(`https://i.ytimg.com/vi/${v}/${variant}`, {
      cache: "no-store",
    });
    if (!upstream.ok) continue;
    const buf = await upstream.arrayBuffer();
    // YouTube sometimes returns a tiny 1x1 placeholder for missing thumbs.
    if (buf.byteLength < 2048) continue;
    return new Response(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  return new Response("Thumbnail not found", { status: 404 });
}
