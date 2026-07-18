import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createClient } from "@supabase/supabase-js";
import { createCors, handleOptions } from "@/lib/cors";

const supabaseSubtitle = createClient(
  process.env.SUPABASE_URL_MOVIEBOX_SUBTITLE!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX_SUBTITLE!,
);

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

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !ts || !token) {
      return cors(
        NextResponse.json(
          { success: false, error: "need token" },
          { status: 404 },
        ),
      );
    }

    if (Date.now() - ts > 8000) {
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 403 },
        ),
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      return cors(
        NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 },
        ),
      );
    }

    const { data } = await supabaseSubtitle
      .from("moviebox_subtitles_cache")
      .select("subtitles")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .maybeSingle();

    if (!data) {
      return cors(
        NextResponse.json(
          { success: false, error: "Subtitles not found" },
          { status: 404 },
        ),
      );
    }

    return cors(
      NextResponse.json({
        success: true,
        subtitles: data?.subtitles ?? [],
        cached: !!data,
      }),
    );
  } catch (err: any) {
    return cors(
      NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
