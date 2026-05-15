import { NextRequest } from "next/server";

const YT_HOST_RE = /^(?:www\.|m\.)?(?:youtube\.com|youtu\.be)$/;

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!YT_HOST_RE.test(parsed.hostname)) {
    return Response.json({ error: "Not a YouTube URL" }, { status: 400 });
  }

  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    url,
  )}&format=json`;
  const r = await fetch(oembed, { cache: "no-store" });
  if (!r.ok) {
    return Response.json(
      { error: "oEmbed request failed" },
      { status: r.status },
    );
  }
  const data = (await r.json()) as { title?: string };
  return Response.json({ title: data.title ?? "" });
}
