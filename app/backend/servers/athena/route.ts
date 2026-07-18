import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createClient } from "@supabase/supabase-js";
import { createCors, handleOptions } from "@/lib/cors";

const supabase = createClient(
  process.env.SUPABASE_URL_SCREENIFY!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_SCREENIFY!,
);

const SCREENIFY = "https://www.screenify.fun";

const DAEDALUS_WORKERS = ["test52-b2c", "zxcprime371"];

async function resolveWorker(upstreamPath: string): Promise<string | null> {
  const shuffled = [...DAEDALUS_WORKERS].sort(() => Math.random() - 0.5);

  for (const worker of shuffled) {
    const baseUrl = `https://daedalus.${worker}.workers.dev`;
    try {
      const probe = await fetchWithTimeout(
        baseUrl,
        { method: "GET" },
        4000,
      ).catch(() => null);

      if (
        probe &&
        (probe.status === 200 || probe.status === 404 || probe.status === 206)
      ) {
        return `${baseUrl}${upstreamPath}`;
      }
    } catch {
      // try next
    }
  }

  return null;
}

async function fetchSrc(
  imdbId: string,
  media_type: string,
  season: string | null,
  episode: string | null,
): Promise<string | null> {
  const watchPage =
    media_type === "tv"
      ? `${SCREENIFY}/watch-series/${imdbId}`
      : `${SCREENIFY}/watch-movies/${imdbId}`;

  const page = await fetchWithTimeout(
    watchPage,
    {
      headers: {
        Referer: `${SCREENIFY}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      cache: "no-store",
    },
    12000,
  );

  if (!page.ok) return null;

  const html = await page.text();
  const match = html.match(/var initialSrc='([^']+)'/);
  if (!match) return null;

  let srcPath = match[1];

  if (media_type === "tv" && season && episode) {
    srcPath = srcPath.replace(
      /\/(\d+)\/(\d+)\/playlist\.m3u8$/,
      `/${season}/${episode}/playlist.m3u8`,
    );
  }

  return srcPath;
}

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const { cors, isAllowed } = createCors(req);

  if (!isAllowed) {
    return cors(
      NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      ),
    );
  }

  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[ATHENA] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const imdbId = req.nextUrl.searchParams.get("e");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !ts || !token) {
      logRequest(404, "missing params");
      return cors(
        NextResponse.json(
          { success: false, error: "need token" },
          { status: 404 },
        ),
      );
    }

    if (Date.now() - ts > 8000) {
      logRequest(403, "token expired");
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(403, "invalid token");
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      logRequest(403, "invalid referrer");
      return cors(
        NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      );
    }

    if (!imdbId) {
      logRequest(404, "missing imdbId");
      return cors(
        NextResponse.json(
          { success: false, error: "Missing imdbId" },
          { status: 404 },
        ),
      );
    }

    const seasonKey = season ?? "";
    const episodeKey = episode ?? "";

    // check cache first
    let srcPath: string | null = null;

    const { data: cached } = await supabase
      .from("screenify_source")
      .select("src_path")
      .eq("imdb_id", imdbId)
      .eq("media_type", mediaType)
      .eq("season", seasonKey)
      .eq("episode", episodeKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.src_path) {
      srcPath = cached.src_path;
    }

    if (!srcPath) {
      try {
        srcPath = await fetchSrc(imdbId, mediaType, season, episode);

        if (!srcPath) {
          const mxId = imdbId.replace(/^tt/, "mx");
          srcPath = await fetchSrc(mxId, mediaType, season, episode);
        }
      } catch (err: any) {
        logRequest(504, `exception: ${err?.message}`);
        return cors(
          NextResponse.json(
            { success: false, error: "Timed out" },
            { status: 504 },
          ),
        );
      }

      if (!srcPath) {
        logRequest(502, "source not found");
        return cors(
          NextResponse.json(
            { success: false, error: "Source not found" },
            { status: 502 },
          ),
        );
      }

      // cache the freshly resolved src
      await supabase.from("screenify_source").upsert(
        {
          imdb_id: imdbId,
          tmdb_id: tmdbId,
          media_type: mediaType,
          season: seasonKey,
          episode: episodeKey,
          src_path: srcPath,
        },
        {
          onConflict: "imdb_id,media_type,season,episode",
          ignoreDuplicates: true,
        },
      );
    }

    console.log("srcPath", srcPath);
    const upstreamPath = new URL(`${SCREENIFY}${srcPath}`).pathname;

    const workerUrl = await resolveWorker(upstreamPath);

    if (!workerUrl) {
      logRequest(502, "no working worker");
      return cors(
        NextResponse.json(
          { success: false, error: "No available Daedalus worker" },
          { status: 502 },
        ),
      );
    }

    const signedUrl = await signWorkerUrl(workerUrl);

    logRequest(200, "OK!!!!!");
    return cors(
      NextResponse.json({
        success: true,
        links: [{ type: "hls", link: signedUrl }],
        subtitles: [],
        meow: !!cached,
      }),
    );
  } catch (err: any) {
    logRequest(500, `exception: ${err?.message}`);
    return cors(
      NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}

// lib/sign-worker-url.ts
export async function signWorkerUrl(workerUrl: string): Promise<string> {
  const url = new URL(workerUrl);
  const pathname = url.pathname;
  const exp = String(Date.now() + 6 * 60 * 60 * 1000); // 6 hours

  const secret = process.env.DAEDALUS!;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${pathname}:${exp}`),
  );

  const tok = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  url.searchParams.set("tok", tok);
  url.searchParams.set("exp", exp);
  return url.toString();
}
