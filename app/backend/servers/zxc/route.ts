import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { isValidReferer } from "@/lib/allowed-referers";

const UPSTREAM_BASE = "https://scrennnifu.click";

function encodeUrl(url: string): string {
  return Buffer.from(url).toString("base64url");
}

function decodeUrl(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    if (!decoded.startsWith(UPSTREAM_BASE)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return new NextResponse("Missing ID", { status: 400 });

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    let target: string;

    const decoded = decodeUrl(id);
    if (decoded) {
      target = decoded;
    } else {
      // Original entry: movie-ttXXXX or tv-ttXXXX-s-e
      const parts = id.split("-");
      const type = parts[0];
      const imdbId = parts[1];
      const season = parts[2];
      const episode = parts[3];

      if (!type || !imdbId)
        return new NextResponse("Invalid ID", { status: 400 });

      target =
        type === "tv"
          ? `${UPSTREAM_BASE}/serial/${imdbId}/${season}/${episode}/playlist.m3u8`
          : `${UPSTREAM_BASE}/movie/${imdbId}/playlist.m3u8`;
    }

    const upstream = await fetchWithTimeout(
      target,
      {
        headers: {
          Referer: "https://screenify.fun/",
          Origin: "https://screenify.fun/",
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
        },
        cache: "no-store",
      },
      5000,
    );

    if (!upstream.ok)
      return new NextResponse(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
      });

    const contentType = upstream.headers.get("content-type") || "";
    const isPlaylist =
      contentType.includes("mpegurl") || target.endsWith(".m3u8");

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    };

    if (isPlaylist) {
      const playlist = await upstream.text();
      // proxyBase built from request headers, not req.nextUrl.origin
      const host =
        req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const proxyBase = `${proto}://${host}/backend/servers/zxc`;
      const rewritten = rewriteM3U8(playlist, target, proxyBase);

      return new NextResponse(rewritten, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=10, s-maxage=10",
        },
      });
    }

    return NextResponse.redirect(target);
  } catch (err) {
    console.error(err);
    return new NextResponse("Server error", { status: 500 });
  }
}

function rewriteM3U8(text: string, baseUrl: string, proxyBase: string) {
  // Resolve a possibly-relative URL against baseUrl, then proxy it if it's an m3u8
  function proxyIfM3u8(raw: string): string {
    let url: string;
    try {
      url = new URL(raw, baseUrl).toString();
    } catch {
      return raw;
    }
    if (url.endsWith(".m3u8")) {
      return `${proxyBase}?id=${encodeUrl(url)}`;
    }
    // segments: return absolute URL so client fetches directly
    return url;
  }

  return (
    text
      // Rewrite bare URLs on their own line (stream/segment entries)
      .replace(/^([^#\s][^\n]*)$/gm, (line) => {
        line = line.trim();
        if (!line || line.startsWith("#")) return line;
        return proxyIfM3u8(line);
      })
      // Rewrite URI="..." attributes (audio/subtitle tracks)
      .replace(/URI="([^"]+)"/g, (_, uri) => {
        return `URI="${proxyIfM3u8(uri)}"`;
      })
  );
}
