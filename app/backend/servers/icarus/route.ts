import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createCors, handleOptions } from "@/lib/cors";
import { createClient } from "@supabase/supabase-js";
import { encryptUrl } from "@/lib/encryptor";
import { getWorkingProxy, proxies } from "@/lib/icarus-extractor-latest";

const supabase = createClient(
  process.env.SUPABASE_URL_MOVIEBOX_WEB!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX_WEB!,
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

  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const message = `[ICARUS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason} | ts: ${new Date().toISOString()} | IP: ${ip}`;

    if (status >= 500) {
      console.error(message);
    } else if (status >= 400) {
      console.warn(message);
    } else {
      console.log(message);
    }
  };

  try {
    // Keep the original params
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const title = req.nextUrl.searchParams.get("f");
    const date = req.nextUrl.searchParams.get("date");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;
    const dubCode = req.nextUrl.searchParams.get("dubCode");
    const dubType = req.nextUrl.searchParams.get("dubType");

    if (!tmdbId || !mediaType || !title || !ts || !token) {
      logRequest(400, "missing params");

      return cors(
        NextResponse.json(
          { success: false, error: "need token" },
          { status: 400 },
        ),
      );
    }

    if (Date.now() - ts > 120000) {
      logRequest(401, "token expired");

      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 401 },
        ),
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(401, "invalid token");

      return cors(
        NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 401 },
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

    // --------------------------------------------------
    // CACHE LOOKUP
    // --------------------------------------------------

    const { data: cachedDubsRow } = await supabase
      .from("moviebox_cache")
      .select("dubs")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .maybeSingle();

    if (cachedDubsRow) {
      const dubs = cachedDubsRow.dubs ?? [];

      const original =
        dubs.find((d: any) => d.original === true) ??
        dubs.find((d: any) => d.lanCode === "en") ??
        dubs[0];

      if (original) {
        let activeDubType: number = original.type ?? 0;
        let activeDubLang: string = original.lanCode ?? "orig";

        if (dubCode) {
          const dubEntry = dubs.find(
            (d: any) =>
              d.lanCode === dubCode && d.type === Number(dubType ?? "0"),
          );

          if (dubEntry) {
            activeDubType = dubEntry.type ?? 0;
            activeDubLang = dubEntry.lanCode;
          }
        }

        let dlQuery = supabase
          .from("moviebox_downloads_cache")
          .select("downloads")
          .eq("tmdb_id", tmdbId)
          .eq("media_type", mediaType)
          .eq("dub", activeDubLang)
          .eq("type", activeDubType)
          .gt("expires_at", new Date().toISOString());

        if (season) {
          dlQuery = dlQuery.eq("season", season);
        } else {
          dlQuery = dlQuery.eq("season", "");
        }

        if (episode) {
          dlQuery = dlQuery.eq("episode", episode);
        } else {
          dlQuery = dlQuery.eq("episode", "");
        }

        const { data: cachedDl } = await dlQuery.maybeSingle();

        if (cachedDl) {
          const sortedDownloads = cachedDl.downloads ?? [];

          if (sortedDownloads.length) {
            const workingProxy = await getWorkingProxy(proxies);

            if (!workingProxy) {
              logRequest(502, "No working proxy available");

              return cors(
                NextResponse.json(
                  {
                    success: false,
                    error: "No working proxy available",
                  },
                  { status: 502 },
                ),
              );
            }

            const links = await Promise.all(
              sortedDownloads.map(async (d: any) => {
                const encrypted = await encryptUrl(d.url);

                return {
                  resolution: d.resolutions,
                  format: d.format,
                  size: d.size,
                  type: d.url.includes(".m3u8")
                    ? ("hls" as const)
                    : ("mp4" as const),
                  link: `${workingProxy}?data=${encodeURIComponent(encrypted)}`,
                };
              }),
            );

            const activeDub =
              dubs.find((d: any) => d.lanCode === activeDubLang) ?? dubs[0];

            const data = {
              success: true as const,
              links,
              subtitles: [] as any[],

              dubs: dubs.map((d: any) => ({
                lang: d.lanCode,
                type: d.type,
                name:
                  d.type === 1
                    ? d.lanName
                        .replace(/\b(dub|audio)\b/gi, "")
                        .trim()
                        .replace(/sub$/i, "")
                        .trim() + " (Subtitle)"
                    : d.lanName.replace(/\b(dub|audio|sub)\b/gi, "").trim(),
                original: d.original,
              })),

              meow: true,
              meowmeow: true,

              active: {
                langCode: activeDub?.lanCode ?? "",
                langType: activeDub?.type ?? 0,
                langName:
                  activeDub?.lanName?.replace(/\b(dub|audio)\b/gi, "").trim() ??
                  "",
              },

              top: true,

              fallback: dubCode ? dubCode !== activeDub?.lanCode : false,
            };

            logRequest(200, "OK (cache hit)");

            return cors(NextResponse.json(data));
          }
        }
      }
    }

    // --------------------------------------------------
    // CACHE MISS → BACKEND
    // --------------------------------------------------

    const params = new URLSearchParams({
      tmdbId,
      mediaType,
      title,
      ...(date && { date }),
      ...(season && { season }),
      ...(episode && { episode }),
      ...(dubCode && { dubCode }),
      ...(dubType && { dubType }),
    });

    const res = await fetch(
      `https://school-project-production-9d70.up.railway.app/icarus?${params.toString()}`,
      {
        method: "GET",
      },
    );

    const data = await res.json();

    if (!data.success) {
      logRequest(data.status || 500, data.error || "extraction failed");

      return cors(
        NextResponse.json(
          {
            success: false,
            error: data.error || "extraction failed",
          },
          {
            status: data.status || 500,
          },
        ),
      );
    }

    logRequest(200, "OK");

    return cors(NextResponse.json(data));
  } catch (err: any) {
    logRequest(500, `exception: ${err?.message}`);

    return cors(
      NextResponse.json(
        {
          success: false,
          error: "Internal server error",
        },
        { status: 500 },
      ),
    );
  }
}
