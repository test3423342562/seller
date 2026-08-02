// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";
// import { validateBackendToken } from "@/lib/validate-token";
// import { isValidReferer } from "@/lib/allowed-referers";
// import { createClient } from "@supabase/supabase-js";
// import { createCors, handleOptions } from "@/lib/cors";
// import { encryptUrl } from "@/lib/encryptor";

// const supabase = createClient(
//   process.env.SUPABASE_URL_MOVIEBOX!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY_MOVIEBOX!,
// );

// let blacklistCache: Set<string> | null = null;
// let blacklistCacheTime = 0;
// const BLACKLIST_TTL = 5 * 60_000;

// async function getActiveProxies(proxies: string[]): Promise<string[]> {
//   if (!blacklistCache || Date.now() - blacklistCacheTime > BLACKLIST_TTL) {
//     const { data } = await supabase
//       .from("proxy_blacklist")
//       .select("proxy")
//       .gt("expires_at", new Date().toISOString());
//     blacklistCache = new Set((data ?? []).map((r: any) => r.proxy));
//     blacklistCacheTime = Date.now();
//   }
//   return proxies.filter((p) => !blacklistCache!.has(p));
// }

// function shuffle<T>(arr: T[]): T[] {
//   const a = [...arr];
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a;
// }

// function getRandomAfricanIP() {
//   const ranges: [number, number][] = [
//     [41, 57], [41, 60], [41, 72], [41, 73], [41, 116], [41, 138],
//     [41, 160], [41, 175], [41, 188], [41, 203], [41, 215], [41, 222],
//     [102, 0], [102, 22], [102, 68], [102, 89], [102, 130], [102, 164],
//     [102, 176], [102, 212], [105, 16], [105, 48], [105, 112], [105, 160],
//     [105, 224], [197, 136], [197, 148], [197, 156], [197, 210], [197, 232],
//     [197, 248], [45, 96], [45, 100], [45, 108],
//   ];
//   const base = ranges[Math.floor(Math.random() * ranges.length)];
//   const rand = () => Math.floor(Math.random() * 254) + 1;
//   return `${base[0]}.${base[1]}.${rand()}.${rand()}`;
// }

// export async function getWorkingProxy(url: string, proxies: string[]) {
//   const activeProxies = await getActiveProxies(proxies);
//   const shuffledProxies = shuffle(activeProxies);
//   if (!shuffledProxies.length) return null;
//   const encrypted = await encryptUrl(url);
//   for (const proxy of shuffledProxies) {
//     try {
//       const res = await fetchWithTimeout(
//         `${proxy}?data=${encodeURIComponent(encrypted)}`,
//         { method: "HEAD", headers: { Range: "bytes=0-1" } },
//         3000,
//       );
//       if (res.ok) return proxy;
//     } catch (e: any) {}
//   }
//   return null;
// }

// export async function OPTIONS(req: NextRequest) {
//   return handleOptions(req);
// }

// export async function GET(req: NextRequest) {
//   const { cors, isAllowed } = createCors(req);

//   if (!isAllowed) {
//     return cors(
//       NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
//     );
//   }

//   const logRequest = (status: number, reason: string) => {
//     const tmdbId = req.nextUrl.searchParams.get("a");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get("c");
//     const episode = req.nextUrl.searchParams.get("d");
//     const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
//     console.log(`[ICARUS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`);
//   };

//   try {
//     const tmdbId    = req.nextUrl.searchParams.get("a");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season    = req.nextUrl.searchParams.get("c");
//     const episode   = req.nextUrl.searchParams.get("d");
//     const title     = req.nextUrl.searchParams.get("f");
//     const ts        = Number(req.nextUrl.searchParams.get("gago"));
//     const token     = req.nextUrl.searchParams.get("putangnamo")!;
//     const f_token   = req.nextUrl.searchParams.get("f_token")!;
//     const dubCode   = req.nextUrl.searchParams.get("dubCode");
//     const dubType   = req.nextUrl.searchParams.get("dubType");

//     if (!tmdbId || !mediaType || !title || !ts || !token) {
//       logRequest(404, "missing params");
//       return cors(NextResponse.json({ success: false, error: "need token" }, { status: 404 }));
//     }

//     if (Date.now() - ts > 8000) {
//       logRequest(403, "token expired");
//       return cors(NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 }));
//     }

//     if (!validateBackendToken(tmdbId, f_token, ts, token)) {
//       logRequest(403, "invalid token");
//       return cors(NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 }));
//     }

//     const referer = req.headers.get("referer") || "";
//     if (!isValidReferer(referer)) {
//       logRequest(403, "invalid referrer");
//       return cors(NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }));
//     }

//     // -------- MovieBox Logic --------
//     const randomIP = getRandomAfricanIP();
//     const baseUrl = `https://h5-api.aoneroom.com/wefeed-h5api-bff`;
//     const headers = {
//       "X-Client-Info": '{"timezone":"Africa/Nairobi"}',
//       "Accept-Language": "en-US,en;q=0.5",
//       Accept: "application/json",
//       "User-Agent": "okhttp/4.12.0",
//       "X-Forwarded-For": randomIP,
//       "CF-Connecting-IP": randomIP,
//       "X-Real-IP": randomIP,
//     };

//     // -------- Cache Lookup (dubs) --------
//     let dubs: any[];

//     const { data: cached } = await supabase
//       .from("moviebox_cache")
//       .select("dubs")
//       .eq("tmdb_id", tmdbId)
//       .eq("media_type", mediaType)
//       .maybeSingle();

//     if (cached) {
//       dubs = cached.dubs ?? [];
//     } else {
//       const searchRes = await fetchWithTimeout(
//         `${baseUrl}/subject/search`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Accept: "application/json",
//             Referer: "https://h5.aoneroom.com/",
//             Origin: "https://h5.aoneroom.com",
//           },
//           body: JSON.stringify({
//             keyword: `${title}`,
//             page: 1,
//             perPage: 24,
//             subjectType: mediaType === "tv" ? 2 : 1,
//           }),
//         },
//         8000,
//       );

//       const searchJson = await searchRes.json();
//       const results = searchJson?.data?.data || searchJson?.data || searchJson;
//       const items = results?.items || [];

//       if (!items.length) {
//         logRequest(404, "no search results");
//         return cors(NextResponse.json({ success: false, error: "No search results" }, { status: 404 }));
//       }

//       const normalizedTitle = title?.toLowerCase().trim().replace(/-/g, " ");
//       const LANG_TAGS =
//         /\[(tagalog|hindi|dubbed|multi|spanish|french|arabic|korean|japanese|tamil|telugu)\]/i;
//       const queryWords = normalizedTitle!.split(/\s+/).filter(Boolean);

//       let selectedItem = items.find((item: any) => {
//         const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
//         if (LANG_TAGS.test(itemTitle)) return false;
//         const itemTitleClean = itemTitle.replace(/\bs\d+(-s\d+)?\b/gi, "").trim();
//         const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
//         if (queryWords.length <= 2 && itemWordsClean.length !== queryWords.length) return false;
//         return queryWords.every((word) => itemTitle.includes(word));
//       });

//       if (!selectedItem) {
//         selectedItem = items.find((item: any) => {
//           const itemTitle = item.title?.toLowerCase().replace(/-/g, " ") || "";
//           const itemTitleClean = itemTitle.replace(/\bs\d+(-s\d+)?\b/gi, "").trim();
//           const itemWordsClean = itemTitleClean.split(/\s+/).filter(Boolean);
//           if (queryWords.length <= 2 && itemWordsClean.length !== queryWords.length) return false;
//           return queryWords.every((word) => itemTitle.includes(word));
//         });
//       }

//       if (!selectedItem) {
//         logRequest(404, "unavailable");
//         return cors(NextResponse.json({ success: false, error: "Unavailable" }, { status: 404 }));
//       }

//       const rawSubjectId = selectedItem?.subjectId;
//       if (!rawSubjectId) {
//         logRequest(404, "subjectId not found");
//         return cors(NextResponse.json({ success: false, error: "SubjectId Not Found" }, { status: 404 }));
//       }

//       const detailRes = await fetchWithTimeout(
//         `${baseUrl}/detail?detailPath=${selectedItem.detailPath}`,
//         {
//           headers: {
//             ...headers,
//             Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${selectedItem.detailPath}?id=${rawSubjectId}&type=/movie/detail`,
//             Origin: "https://fmoviesunblocked.net",
//           },
//         },
//         8000,
//       );
//       const detailJson = await detailRes.json();
//       const info = detailJson?.data?.data || detailJson?.data || detailJson;

//       dubs = info?.subject?.dubs || [];

//       if (dubs.length === 0) {
//         dubs = [{
//           subjectId: rawSubjectId,
//           detailPath: selectedItem.detailPath,
//           original: true,
//           lanCode: "orig",
//           lanName: "Original Audio",
//           type: 0,
//           constructed: true,
//         }];
//       }
//     }

//     // -------- Resolve active subjectId/detailPath from dubs --------
//     const original =
//       dubs.find((d: any) => d.original === true) ??
//       dubs.find((d: any) => d.lanCode === "en") ??
//       dubs[0];

//     if (!original) {
//       logRequest(404, "no original dub entry");
//       return cors(NextResponse.json({ success: false, error: "No original entry in dubs" }, { status: 404 }));
//     }

//     let subjectId: string = original.subjectId;
//     let detailPath: string = original.detailPath;
//     let activeDubType: number = original.type ?? 0;
//     let activeDubLang: string = original.lanCode ?? "orig";

//     if (dubCode) {
//       const dubEntry = dubs.find(
//         (d: any) => d.lanCode === dubCode && d.type === Number(dubType ?? "0"),
//       );
//       if (dubEntry) {
//         subjectId = dubEntry.subjectId;
//         detailPath = dubEntry.detailPath;
//         activeDubType = dubEntry.type ?? 0;
//         activeDubLang = dubEntry.lanCode;
//       }
//     }

//     // -------- Cache Lookup (downloads) --------
//     let sortedDownloads: any[];
//     let subtitles: any[] = [];

//     const dlQuery = supabase
//       .from("moviebox_downloads_cache")
//       .select("downloads")
//       .eq("tmdb_id", tmdbId)
//       .eq("media_type", mediaType)
//       .eq("dub", activeDubLang)
//       .eq("type", activeDubType)
//       .gt("expires_at", new Date().toISOString());

//     if (season) dlQuery.eq("season", season);
//     else dlQuery.eq("season", "");

//     if (episode) dlQuery.eq("episode", episode);
//     else dlQuery.eq("episode", "");

//     const { data: cachedDownloads } = await dlQuery.maybeSingle();

//     if (cachedDownloads) {
//       console.log(`[ICARUS] downloads cache hit`);
//       sortedDownloads = cachedDownloads.downloads ?? [];
//     } else {
//       const params = new URLSearchParams({ subjectId, detailPath });
//       if (mediaType === "tv") {
//         if (season) params.set("se", String(season));
//         if (episode) params.set("ep", String(episode));
//       }

//       const sourcesRes = await fetchWithTimeout(
//         `${baseUrl}/subject/download?${params.toString()}`,
//         {
//           headers: {
//             ...headers,
//             Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`,
//             Origin: "https://fmoviesunblocked.net",
//           },
//         },
//         8000,
//       );

//       const sourcesJson = await sourcesRes.json();
//       const sources = sourcesJson?.data?.data || sourcesJson?.data || sourcesJson;
//       const downloads = sources?.downloads || [];

//       if (!downloads.length) {
//         if (!dubCode) {
//           logRequest(404, "no download sources");
//           return cors(NextResponse.json({ success: false, error: "No download sources" }, { status: 404 }));
//         }

//         subjectId = dubs[0].subjectId;
//         detailPath = dubs[0].detailPath;
//         activeDubLang = dubs[0].lanCode ?? "orig";
//         activeDubType = dubs[0].type ?? 0;

//         const retryParams = new URLSearchParams({ subjectId, detailPath });
//         if (mediaType === "tv") {
//           if (season) retryParams.set("se", String(season));
//           if (episode) retryParams.set("ep", String(episode));
//         }

//         const retryRes = await fetchWithTimeout(
//           `${baseUrl}/subject/download?${retryParams}`,
//           {
//             headers: {
//               ...headers,
//               Referer: `https://fmoviesunblocked.net/spa/videoPlayPage/movies/${detailPath}?id=${subjectId}&type=/movie/detail`,
//               Origin: "https://fmoviesunblocked.net",
//             },
//           },
//           8000,
//         );

//         const retryJson = await retryRes.json();
//         const retrySources = retryJson?.data?.data || retryJson?.data || retryJson;
//         downloads.push(...(retrySources?.downloads || []));
//         subtitles = (retrySources?.captions || []).map((c: any) => ({
//           id: c.lan,
//           display: c.lanName,
//           file: c.url,
//         }));

//         if (!downloads.length) {
//           logRequest(404, "no download sources");
//           return cors(NextResponse.json({ success: false, error: "No download sources" }, { status: 404 }));
//         }
//       }

//       sortedDownloads = downloads
//         .filter((d: any) => d?.url && typeof d.url === "string")
//         .sort((a: any, b: any) => (b.resolution || 0) - (a.resolution || 0));

//       if (!sortedDownloads.length) {
//         logRequest(404, "no valid download URLs");
//         return cors(NextResponse.json({ success: false, error: "No valid download URLs" }, { status: 404 }));
//       }

//       subtitles = (sources?.captions || []).map((c: any) => ({
//         id: c.lan,
//         display: c.lanName,
//         file: c.url,
//       }));
//     }

//     const proxies = [
//       "https://little-frog-dbca.icarus049.workers.dev/",
//       "https://damp-rain-dad6.icarus048.workers.dev/",
//       "https://tight-fog-810b.icarus046.workers.dev/",
//       "https://dawn-violet-1bfc.icarus045.workers.dev/",
//       "https://small-bonus-631a.icarus044.workers.dev/",
//       "https://old-smoke-c852.icarus043.workers.dev/",
//       "https://late-meadow-f5cf.icarus042.workers.dev/",
//       "https://autumn-sky-7829.icarus041.workers.dev/",
//       "https://super-tree-8f2e.icarus040.workers.dev/",
//       "https://steep-sky-b7c6.icarus039.workers.dev/",
//       "https://patient-base-d281.icarus038.workers.dev/",
//       "https://sweet-frost-4413.icarus037.workers.dev/",
//       "https://wild-frost-90b0.icarus035.workers.dev/",
//       "https://frosty-term-80f0.icarus036.workers.dev/",
//       "https://misty-wildflower-f895.icarus034.workers.dev/",
//       "https://snowy-lab-9d5f.icarus033.workers.dev/",
//       "https://rough-pond-0449.icarus032.workers.dev/",
//       "https://weathered-mountain-aca0.icarus031.workers.dev/",
//       "https://fragrant-surf-698c.icarus030.workers.dev/",
//       "https://curly-snowflake-2593.icarus029.workers.dev/",
//       "https://calm-glitter-8377.icarus028.workers.dev/",
//       "https://withered-lab-a730.icarus027.workers.dev/",
//       "https://blue-flower-fe30.icarus026.workers.dev/",
//       "https://billowing-truth-c158.icarus025.workers.dev/",
//       "https://divine-sun-7d33.icarus024.workers.dev/",
//       "https://billowing-dream-d9ad.icarus023.workers.dev/",
//       "https://mute-flower-d701.icarus022.workers.dev/",
//       "https://dark-boat-61e0.icarus021.workers.dev/",
//       "https://billowing-bread-6c35.icarus019.workers.dev/",
//       "https://gentle-frost-0125.icarus018.workers.dev/",
//       "https://summer-poetry-a019.icarus017.workers.dev/",
//       "https://billowing-sea-003c.icarus016.workers.dev/",
//       "https://summer-poetry-0561.icarus015.workers.dev/",
//       "https://dawn-mud-4987.icarus014.workers.dev/",
//       "https://old-surf-c6eb.icarus012.workers.dev/",
//       "https://wandering-flower-cc32.icarus011.workers.dev/",
//       "https://small-recipe-9008.icarus09.workers.dev/",
//       "https://morning-haze-36e3.icarus08.workers.dev/",
//       "https://little-limit-e11e.icarus05.workers.dev/",
//       "https://ancient-limit-83f0.icarus03.workers.dev/",
//       "https://sparkling-credit-c6b8.icarus02.workers.dev/",
//       "https://green-dawn-9241.icarus01.workers.dev/",
//       "https://proxy.icarus14.workers.dev/",
//       "https://proxy.icarus13.workers.dev/",
//       "https://proxy.icarus12.workers.dev/",
//       "https://proxy.icarus11.workers.dev/",
//       "https://proxy.icarus10.workers.dev/",
//       "https://proxy.icarus9.workers.dev/",
//       "https://proxy.icarus8.workers.dev/",
//       "https://proxy.icarus7.workers.dev/",
//       "https://proxy.icarus3.workers.dev/",
//       "https://icarus.test155-123.workers.dev/",
//       "https://proxy.icarus1.workers.dev/",
//       "https://proxy.icarus2.workers.dev/",
//       "https://late-snowflake-5076.zxcprime362.workers.dev/",
//       "https://weathered-frost-60b0.zxcprime361.workers.dev/",
//       "https://icarus.test154-123.workers.dev/",
//       "https://icarus.test156-123.workers.dev/",
//       "https://icarus.test157-123.workers.dev/",
//       "https://icarus.test153-224.workers.dev/",
//       "https://icarus.test152-5d8.workers.dev/",
//       "https://icarus.test151-009.workers.dev/",
//       "https://icarus.test150-e8d.workers.dev/",
//       "https://proxy.zxcprime359-test1.workers.dev/",
//       "https://proxy.orbitprime27.workers.dev/",
//       "https://proxy.silverlantern64.workers.dev/",
//       "https://proxy.zxcprime380.workers.dev/",
//       "https://orange-tooth-0e36.zxcprime369.workers.dev/",
//       "https://silent-glitter-744f.zxcprime365.workers.dev/",
//       "https://nameless-feather-4fca.zxcprime364.workers.dev/",
//       "https://proxy.test4-eb0.workers.dev/",
//       "https://proxy.test3-ed1.workers.dev/",
//       "https://proxy.test2-425.workers.dev/",
//       "https://proxy.test1-845.workers.dev/",
//       "https://proxy.zxcprime.workers.dev/",
//       "https://proxy.zxcprime3.workers.dev/",
//       "https://proxy.zxcprime2.workers.dev/",
//       "https://orange-poetry-e481.jindaedalus2.workers.dev/",
//       "https://proxy.primezxc9.workers.dev/",
//       "https://sweet-dust-bdb3.vetenabejar.workers.dev/",
//       "https://long-frog-ec4e.coupdegrace21799.workers.dev/",
//       "https://damp-bonus-5625.mosangfour.workers.dev/",
//       "https://orange-paper-a80d.j61202287.workers.dev/",
//       "https://still-butterfly-9b3e.zxcprime360.workers.dev/",
//       "https://empty-pond-805b.zxcprime363.workers.dev/",
//     ];

//     const workingProxy = await getWorkingProxy(sortedDownloads[0].url, proxies);
//     if (!workingProxy) {
//       logRequest(502, "no working proxy");
//       return cors(NextResponse.json({ success: false, error: "No working proxy available" }, { status: 502 }));
//     }

//     const links = await Promise.all(
//       sortedDownloads.map(async (d: any) => {
//         const encrypted = await encryptUrl(d.url);
//         return {
//           resolution: d.resolution,
//           format: d.format,
//           size: d.size,
//           type: d.url.includes(".m3u8") ? "hls" : "mp4",
//           link: `${workingProxy}?data=${encodeURIComponent(encrypted)}`,
//         };
//       }),
//     );

//     const activeDub =
//       dubs.find((d: any) => d.lanCode === activeDubLang) ?? dubs[0];

//     logRequest(200, "OK!!!!!");
//     return cors(
//       NextResponse.json({
//         success: true,
//         links,
//         subtitles,
//         dubs: dubs.map((d: any) => ({
//           lang: d.lanCode,
//           type: d.type,
//           name:
//             d.type === 1
//               ? d.lanName.replace(/\b(dub|audio)\b/gi, "").trim().replace(/sub$/i, "").trim() + " (Subtitle)"
//               : d.lanName.replace(/\b(dub|audio|sub)\b/gi, "").trim(),
//           original: d.original,
//         })),
//         meow: !!cached,
//         meowmeow: !!cachedDownloads,
//         active: {
//           langCode: activeDub?.lanCode ?? "",
//           langType: activeDub?.type ?? 0,
//           langName: activeDub?.lanName?.replace(/\b(dub|audio)\b/gi, "").trim() ?? "",
//         },
//         fallback: dubCode ? dubCode !== activeDub?.lanCode : false,
//       }),
//     );
//   } catch (err: any) {
//     logRequest(500, `exception: ${err?.message}`);
//     return cors(
//       NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 }),
//     );
//   }
// }
// ICARUS SERVER (thin proxy)
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { createCors, handleOptions } from "@/lib/cors";

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

    console.log(
      `[ICARUS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason} | ts: ${new Date().toISOString()} | IP: ${ip}`,
    );
  };

  try {
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

    // Forward only the extraction params to Backend B
    const params = new URLSearchParams({
      tmdbId,
      mediaType,
      title,
      ...(season && { season }),
      ...(episode && { episode }),
      ...(dubCode && { dubCode }),
      ...(dubType && { dubType }),
    });

    const res = await fetch(
      `https://online-seller-tau.vercel.app/backend_/servers/icarus__?${params.toString()}`,
      { method: "GET" },
    );

    const data = await res.json();

    if (!data.success) {
      logRequest(data.status || 500, data.error || "extraction failed");
      return cors(
        NextResponse.json(
          { success: false, error: data.error || "extraction failed" },
          { status: data.status || 500 },
        ),
      );
    }

    logRequest(200, "OK");
    return cors(NextResponse.json(data));
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
