import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { encryptUrl } from "@/lib/encryptor";
import { createClient } from "@supabase/supabase-js";
import { createCors, handleOptions } from "@/lib/cors";

const supabase = createClient(
  process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
  process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
);

let blacklistCache: Set<string> | null = null;
let blacklistCacheTime = 0;
const BLACKLIST_TTL = 5 * 60_000;

async function getNext8AMPH(): Promise<string> {
  const now = new Date();
  const ph = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const next8AM = new Date(ph);
  next8AM.setHours(8, 0, 0, 0);
  if (ph >= next8AM) next8AM.setDate(next8AM.getDate() + 1);
  const diff = next8AM.getTime() - ph.getTime();
  return new Date(now.getTime() + diff).toISOString();
}

async function blacklistProxy(proxy: string) {
  const expires_at = await getNext8AMPH();
  await supabase
    .from("proxy_blacklist")
    .upsert(
      { proxy, expires_at },
      { onConflict: "proxy", ignoreDuplicates: false },
    );
  blacklistCache?.add(proxy);
  console.log(`[PROXY] ⛔ blacklisted ${proxy}`);
}

async function getActiveProxies(proxies: string[]): Promise<string[]> {
  if (!blacklistCache || Date.now() - blacklistCacheTime > BLACKLIST_TTL) {
    const { data } = await supabase
      .from("proxy_blacklist")
      .select("proxy")
      .gt("expires_at", new Date().toISOString());
    blacklistCache = new Set((data ?? []).map((r: any) => r.proxy));
    blacklistCacheTime = Date.now();
  }
  return proxies.filter((p) => !blacklistCache!.has(p));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const GOOD_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36",
  Origin: "https://goodstream.cc",
  Referer:
    "https://goodstream.cc/embed/W3cPjhjEzF?__cf_chl_tk=SUf37oAYSwhfVhF8URs6D8SK2iP_w5RW9NDtbtCzul8-1783909042-1.0.1.1-2jmKyV_qr4Y10vE0u8rjgxQxVJxZZwFDSCLLQ_FdlbI",
  Cookie:
    "cf_clearance=Shib.kVZbVDgJDU1GKv1nbUVUVOmaQ5xdjU5pvCwLxg-1783909046-1.2.1.1-3iK8K2GIOeCtRAJ3l3WmPdDHjpKVpo8ieaAy17TRByJ0l0wKYlDPz2dRkqyRSeqz0TziVHmaJraDRzSBukJ.zJxeUwgxvat9hz8kCvB9kMjEmtKQpFxcxoYQ3I7FguWEndAqQppX9Xo.wkTgzNHGaQZuzDE6znn7G0RvI2BcRsIIR0u4wlxrsANladOz8CRnsMN.EQ7mvPcHd3AWq0hXpsjG1n6WJljyriChUetClEthytE4mhzRc_3qMEPlJ85W2wz9RfuH1247.rEjaBt1ztWlACrkcUtDDsYOquAojthHFmKygvZOYhnw.KVZXacdIQGVSakwm4ISD9z4C4M_qkxqYV4gG6jdqvOBLKKFho3j9rU.VpZ1vzMErFSMYH5NgETYeV3sYBCSOQFtd.ELqqBLIM_vvCF6WMj1OPDynQSxX28EGs7irFkcJGLQh6WPwE4LzHYfPYUfuP76bfKx3tj6aE6HVYfhZlmNb7QYTkgC62NvSBh6eh3snymTMkVN",
};

const HOLLY_WORKERS = [
  "https://orion.zxcprime362.workers.dev/",
  "https://orion.test8-98b.workers.dev/",
  "https://orion.test15-e6c.workers.dev/",
  "https://orion.test14-b67.workers.dev/",
  "https://orion.test13-ab8.workers.dev/",
  "https://orion.test12-3d3.workers.dev/",
  "https://orion.test11-a1b.workers.dev/",
  "https://orion.test5-9ab.workers.dev/",
  "https://orion.test7-337.workers.dev/",
  "https://orion.test6-cb9.workers.dev/",
  "https://orion.test9-6da.workers.dev/",
  "https://lucky-leaf-9eed.test26-ee5.workers.dev/",
  "https://black-thunder-0223.test25-30d.workers.dev/",
  "https://plain-lab-17af.test24-6ad.workers.dev/",
  "https://small-wood-adba.test23-515.workers.dev/",
  "https://dawn-field-efbb.test22-f82.workers.dev/",
  "https://rapid-rain-1898.test21-0af.workers.dev/",
  "https://blue-sun-2b6e.test20-5b4.workers.dev/",
  "https://broken-paper-2e14.test19-31a.workers.dev/",
  "https://polished-rice-b094.test18-8cb.workers.dev/",
  "https://soft-bread-864e.test16-011.workers.dev/",
  "https://dry-moon-e266.test66-8cc.workers.dev/",
  "https://fragrant-rice-8998.test65-8de.workers.dev/",
  "https://restless-resonance-a8a8.test63-bfc.workers.dev/",
  "https://nameless-tooth-8cbb.test64-0d5.workers.dev/",
  "https://spring-darkness-8beb.test61-86c.workers.dev/",
  "https://odd-river-ed9f.test29-be6.workers.dev/",
  "https://shrill-smoke-e6eb.test60-598.workers.dev/",
  "https://twilight-resonance-eb4d.test28-f24.workers.dev/",
  "https://billowing-rain-7239.test27-15e.workers.dev/",
  "https://throbbing-dream-bb83.test62-63e.workers.dev/",
  "https://small-hall-439b.test83-291.workers.dev/",
  "https://rough-bonus-f4e3.test82-ac2.workers.dev/",
  "https://quiet-sun-4390.test80-1f4.workers.dev/",
  "https://curly-sea-0553.test79-29a.workers.dev/",
  "https://mute-bonus-b2b6.test78-564.workers.dev/",
  "https://fragrant-silence-a7d1.test77-a68.workers.dev/",
  "https://weathered-king-9f51.test76-4e9.workers.dev/",
  "https://delicate-dream-a0ac.test75-da4.workers.dev/",
  "https://twilight-mode-af23.test74-635.workers.dev/",
  "https://sweet-feather-58ef.test73-bfb.workers.dev/",
  "https://morning-bar-88d3.test74-635.workers.dev/",
  "https://curly-fire-36d7.test73-bfb.workers.dev/",
  "https://restless-term-9ca1.test72-165.workers.dev/",
  "https://wispy-sea-969e.test71-dc9.workers.dev/",
  "https://silent-rain-377c.test68-6e8.workers.dev/",
  "https://flat-darkness-ef7a.test70-ee3.workers.dev/",
  "https://restless-brook-d944.test67-989.workers.dev/",
  "https://silent-rain-377c.test68-6e8.workers.dev/",
  "https://long-dew-a85b.test84-c55.workers.dev/",
  "https://muddy-sky-afea.test92-0aa.workers.dev/",
];

export async function getWorkingProxy(proxies: string[]) {
  const activeProxies = await getActiveProxies(proxies);
  const shuffledProxies = shuffle(activeProxies);
  for (const proxy of shuffledProxies) {
    try {
      const res = await fetchWithTimeout(
        proxy,
        { method: "HEAD", headers: { Range: "bytes=0-1" } },
        3000,
      );
      if (res.status === 429) {
        await blacklistProxy(proxy);
        continue;
      }
      if (res.ok) {
        return proxy;
      }
    } catch (e: any) {
      // console.log(`[PROXY] ✗ ${proxy} | ${e?.message}`);
    }
  }
  return null;
}

const priority = (file: string) => {
  if (file.includes("tripplestream.online")) return 0;
  if (file.includes("/pl/")) return 1;
  if (file.includes("/streamsvr/")) return 2;
  return 3;
};

export async function OPTIONS(req: NextRequest) {
  return handleOptions(req);
}

export async function GET(req: NextRequest) {
  const { cors, isAllowed } = createCors(req);

  if (!isAllowed) {
    return cors(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    );
  }

  const logRequest = (status: number, reason: string) => {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
    console.log(
      `[ORION] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c") ?? "";
    const episode = req.nextUrl.searchParams.get("d") ?? "";
    const title = req.nextUrl.searchParams.get("f");
    const year = req.nextUrl.searchParams.get("g");
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
      logRequest(404, "missing params");
      return cors(
        NextResponse.json({ success: false, error: "need token" }, { status: 404 }),
      );
    }

    if (Date.now() - ts > 8000) {
      logRequest(403, "token expired");
      return cors(
        NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 }),
      );
    }

    if (!validateBackendToken(tmdbId, f_token, ts, token)) {
      logRequest(403, "invalid token");
      return cors(
        NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 }),
      );
    }

    const referer = req.headers.get("referer") || "";
    if (!isValidReferer(referer)) {
      logRequest(403, "invalid referrer");
      return cors(
        NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
      );
    }

    const worker = await getWorkingProxy(HOLLY_WORKERS);

    if (!worker) {
      logRequest(502, "no working worker");
      return cors(
        NextResponse.json({ success: false, error: "No available worker" }, { status: 502 }),
      );
    }

    // ─── CACHE CHECK ─────────────────────────────────────────────────────────
    const { data: cached } = await supabase
      .from("holly_movie_cache")
      .select("sources")
      .eq("tmdb_id", Number(tmdbId))
      .eq("media_type", mediaType)
      .eq("season", season)
      .eq("episode", episode)
      .single();

    if (cached?.sources?.length) {
      const encryptedH = await encryptUrl(JSON.stringify(GOOD_HEADERS));

      const links = await Promise.all(
        [...cached.sources]
          .sort((a: any, b: any) => priority(a.file) - priority(b.file))
          .map(async (source: any) => ({
            source: source.file.includes("/pl/")
              ? "pl"
              : source.file.includes("/streamsvr/")
                ? "streamsvr"
                : "default",
            type: source.type === "hls" ? "hls" : "mp4",
            link: `${worker}proxy?data=${encodeURIComponent(await encryptUrl(source.file))}&h=${encodeURIComponent(encryptedH)}`,
          })),
      );
      logRequest(200, "cache hit");
      return cors(NextResponse.json({ success: true, links, subtitles: [] }));
    }

    // ─── STEP 1: Scrape ──────────────────────────────────────────────────────
    const baseSlug = title
      .toLowerCase()
      .replace(/['''`]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const hollySlug =
      mediaType === "tv" && season && episode
        ? `${baseSlug}-season-${season}-episode-${episode}`
        : `${baseSlug}-${year}`;

    let step1Res = await fetchWithTimeout(
      `${worker}scrape?slug=${encodeURIComponent(hollySlug)}`,
      {},
      15000,
    );

    if (step1Res.status === 429) {
      const remaining = (await getActiveProxies(HOLLY_WORKERS)).filter(
        (w) => w !== worker,
      );
      for (const w of shuffle(remaining)) {
        const res = await fetchWithTimeout(
          `${w}scrape?slug=${encodeURIComponent(hollySlug)}`,
          {},
          15000,
        );
        if (res.status === 429) continue;
        step1Res = res;
        break;
      }
    }

    if (!step1Res.ok) {
      logRequest(502, "step 1 failed");
      return cors(
        NextResponse.json({ success: false, error: "Holly step 1 failed" }, { status: 502 }),
      );
    }

    const step1Data = await step1Res.json();
    const qualities = step1Data.qualities ?? [];

    if (!qualities.length) {
      logRequest(404, "no qualities found");
      return cors(
        NextResponse.json({ success: false, error: "No qualities found" }, { status: 404 }),
      );
    }

    // ─── STEP 2: Resolve embed ─────────────────────────────────────────────
    const bestQuality =
      qualities.find((q: any) => q.quality === "1080p") ??
      qualities.find((q: any) => q.quality === "default") ??
      qualities[0];
    const encryptedH = await encryptUrl(JSON.stringify(GOOD_HEADERS));
    const step2Res = await fetchWithTimeout(
      `${worker}resolve?embed_url=${encodeURIComponent(bestQuality.embed_url)}&h=${encodeURIComponent(encryptedH)}`,
      {},
      15000,
    );

    if (!step2Res.ok) {
      logRequest(502, "step 2 failed");
      return cors(
        NextResponse.json({ success: false, error: "Holly step 2 failed" }, { status: 502 }),
      );
    }

    const step2Data = await step2Res.json();
    const sources = step2Data.sources ?? [];

    if (!sources.length) {
      logRequest(404, "no sources from step 2");
      return cors(
        NextResponse.json({ success: false, error: "No sources from step 2" }, { status: 404 }),
      );
    }

    await supabase.from("holly_movie_cache").upsert(
      {
        tmdb_id: Number(tmdbId),
        media_type: mediaType,
        season,
        episode,
        embeds: qualities,
        sources,
      },
      { onConflict: "tmdb_id,media_type,season,episode" },
    );

    // ─── STEP 3: Build links ─────────────────────────────────────────────────
    const links = await Promise.all(
      [...sources]
        .sort((a: any, b: any) => priority(a.file) - priority(b.file))
        .map(async (source: any) => ({
          source: source.file.includes("/pl/")
            ? "pl"
            : source.file.includes("/streamsvr/")
              ? "streamsvr"
              : "default",
          type: source.type === "hls" ? "hls" : "mp4",
          link: `${worker}proxy?data=${encodeURIComponent(await encryptUrl(source.file))}&h=${encodeURIComponent(encryptedH)}`,
        })),
    );

    logRequest(200, "OK!!!!!");
    return cors(NextResponse.json({ success: true, links, subtitles: [] }));
  } catch (err) {
    console.error("Holly route error:", err);
    return cors(
      NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 }),
    );
  }
}

//OLD
// // import { fetchWithTimeout } from "@/lib/fetch-timeout";
// // import { NextRequest, NextResponse } from "next/server";
// // import { validateBackendToken } from "@/lib/validate-token";
// // import { isValidReferer } from "@/lib/allowed-referers";
// // import { createClient } from "@supabase/supabase-js";
// // import { createCors, handleOptions } from "@/lib/cors";

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
// //   process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
// // );

// // const HOLLY_WORKERS = [
// //   "zxcprime359",
// //   "zxcprime360",
// //   "zxcprime361",
// //   "zxcprime362",
// // ];

// // function randomWorker(): string {
// //   return HOLLY_WORKERS[Math.floor(Math.random() * HOLLY_WORKERS.length)];
// // }

// // async function dbGet(
// //   tmdbId: string,
// //   mediaType: string,
// //   season: string | null,
// //   episode: string | null,
// // ) {
// //   try {
// //     const { data, error } = await supabase.rpc("get_holly", {
// //       p_tmdb_id: Number(tmdbId),
// //       p_media_type: mediaType,
// //       p_season: season ? Number(season) : null,
// //       p_episode: episode ? Number(episode) : null,
// //     });
// //     if (error || !data) return null;
// //     return data as Array<{ quality: string; embed_url: string }>;
// //   } catch {
// //     return null;
// //   }
// // }

// // async function dbSave(
// //   tmdbId: string,
// //   mediaType: string,
// //   season: string | null,
// //   episode: string | null,
// //   qualities: Array<{ quality: string; embed_url: string }>,
// // ) {
// //   try {
// //     const { error } = await supabase.rpc("save_holly", {
// //       p_tmdb_id: Number(tmdbId),
// //       p_media_type: mediaType,
// //       p_season: season ? Number(season) : null,
// //       p_episode: episode ? Number(episode) : null,
// //       p_qualities: qualities,
// //     });
// //     if (error) console.warn("[holly dbSave] error:", error);
// //   } catch (err: any) {
// //     console.warn("[holly dbSave] exception:", err.message);
// //   }
// // }
// // export async function OPTIONS(req: NextRequest) {
// //   return handleOptions(req);
// // }
// // export async function GET(req: NextRequest) {
// //   const { cors, isAllowed } = createCors(req);

// //   if (!isAllowed) {
// //     return cors(
// //       NextResponse.json(
// //         { success: false, error: "Forbidden" },
// //         { status: 403 },
// //       ),
// //     );
// //   }
// //   try {
// //     const tmdbId = req.nextUrl.searchParams.get("a");
// //     const mediaType = req.nextUrl.searchParams.get("b");
// //     const season = req.nextUrl.searchParams.get("c");
// //     const episode = req.nextUrl.searchParams.get("d");
// //     const title = req.nextUrl.searchParams.get("f");
// //     const year = req.nextUrl.searchParams.get("g");
// //     const ts = Number(req.nextUrl.searchParams.get("gago"));
// //     const token = req.nextUrl.searchParams.get("putangnamo")!;
// //     const f_token = req.nextUrl.searchParams.get("f_token")!;

// //     if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "need token" },
// //           { status: 404 },
// //         ),
// //       );
// //     }

// //     if (Date.now() - Number(ts) > 8000) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Invalid token" },
// //           { status: 403 },
// //         ),
// //       );
// //     }

// //     if (!validateBackendToken(tmdbId, f_token, ts, token)) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Invalid token" },
// //           { status: 403 },
// //         ),
// //       );
// //     }

// //     const referer = req.headers.get("referer") || "";
// //     if (!isValidReferer(referer)) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Forbidden" },
// //           { status: 403 },
// //         ),
// //       );
// //     }

// //     // ─── STEP 1: Check cache, else fetch Holly metadata ───────────────────────
// //     let qualities: Array<{ quality: string; embed_url: string }>;

// //     const cached = await dbGet(tmdbId, mediaType, season, episode);

// //     if (cached) {
// //       qualities = cached;
// //     } else {
// //       const baseSlug = title
// //         .toLowerCase()
// //         .replace(/[^a-z0-9]+/g, "-")
// //         .replace(/^-|-$/g, "");

// //       const hollySlug =
// //         mediaType === "tv" && season && episode
// //           ? `${baseSlug}-season-${season}-episode-${episode}`
// //           : `${baseSlug}-${year}`;

// //       const step1Url = `https://holly-1.${randomWorker()}.workers.dev/?slug=${encodeURIComponent(hollySlug)}`;

// //       const step1Res = await fetchWithTimeout(step1Url, {}, 6000);
// //       if (!step1Res.ok) {
// //         return cors(
// //           NextResponse.json(
// //             {
// //               success: false,
// //               error: "Holly step 1 failed",
// //               status: step1Res.status,
// //             },
// //             { status: step1Res.status },
// //           ),
// //         );
// //       }

// //       const step1Data = await step1Res.json();
// //       qualities = step1Data.qualities ?? [];

// //       if (!qualities.length) {
// //         return cors(
// //           NextResponse.json(
// //             { success: false, error: "No qualities found from Holly" },
// //             { status: 404 },
// //           ),
// //         );
// //       }

// //       // fire-and-forget
// //       dbSave(tmdbId, mediaType, season, episode, qualities).catch((e: any) =>
// //         console.warn("[holly dbSave] failed:", e.message),
// //       );
// //     }

// //     // ─── STEP 2: Pick best quality → resolve embed ────────────────────────────
// //     const bestQuality =
// //       qualities.find((q) => q.quality === "1080p") ??
// //       qualities.find((q) => q.quality === "default") ??
// //       qualities[0];

// //     const embedUrl = bestQuality.embed_url;

// //     const step2Url = `https://holly-2.${randomWorker()}.workers.dev/?embed_url=${encodeURIComponent(embedUrl)}`;

// //     const step2Res = await fetchWithTimeout(step2Url, {}, 6000);
// //     if (!step2Res.ok) {
// //       return cors(
// //         NextResponse.json(
// //           {
// //             success: false,
// //             error: "Holly step 2 failed",
// //             status: step2Res.status,
// //           },
// //           { status: step2Res.status },
// //         ),
// //       );
// //     }

// //     const step2Data = await step2Res.json();
// //     const sources: Array<{ label: string; type: string; file: string }> =
// //       step2Data.sources ?? [];

// //     if (!sources.length) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "No sources from Holly step 2" },
// //           { status: 404 },
// //         ),
// //       );
// //     }

// //     const hlsSource =
// //       sources.find((s) => s.type === "mp4") ??
// //       sources.find((s) => s.type === "hls" && s.label === "LS-25") ??
// //       sources.find((s) => s.type === "hls");

// //     if (!hlsSource) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "No usable source found" },
// //           { status: 404 },
// //         ),
// //       );
// //     }

// //     // ─── STEP 3: Proxy the stream URL ─────────────────────────────────────────
// //     const proxiedUrl = `https://holly-3.${randomWorker()}.workers.dev/?url=${encodeURIComponent(hlsSource.file)}`;

// //     const proxyCheck = await fetchWithTimeout(
// //       proxiedUrl,
// //       { method: "GET", headers: { Range: "bytes=0-1" } },
// //       5000,
// //     ).catch(() => null);

// //     if (!proxyCheck?.ok) {
// //       return cors(
// //         NextResponse.json(
// //           { success: false, error: "Holly proxy check failed" },
// //           { status: 502 },
// //         ),
// //       );
// //     }

// //     return cors(
// //       NextResponse.json({
// //         success: true,
// //         c: !!cached,
// //         links: [
// //           {
// //             type: hlsSource.type === "hls" ? "hls" : "mp4",
// //             link: proxiedUrl,
// //           },
// //         ],
// //         subtitles: [],
// //       }),
// //     );
// //   } catch (err) {
// //     console.error("Holly route error:", err);
// //     return cors(
// //       NextResponse.json(
// //         { success: false, error: "Internal server error" },
// //         { status: 500 },
// //       ),
// //     );
// //   }
// // }
// import { fetchWithTimeout } from "@/lib/fetch-timeout";
// import { NextRequest, NextResponse } from "next/server";
// import { validateBackendToken } from "@/lib/validate-token";
// import { isValidReferer } from "@/lib/allowed-referers";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_HOLLY_SUPABASE_URL_HOLLY!,
//   process.env.HOLLY_SUPABASE_SERVICE_ROLE_KEY_HOLLY!,
// );

// const HOLLY_WORKERS = [
//   "test5-9ab",
//   "test7-337",
//   "test6-cb9",
//   "test9-6da",
//   "test8-98b",
//   "zxcprime5",
//   "zxcprime6",
//   "primezxc4",
//   "zxcprime360",
//   "zxcprime361",
//   "zxcprime367",
//   "zxcprime368",
//   "jinluxus303",
//   "zxcprime359",
//   "zxcprime362",
//   "jerometecson21799",
//   "jerometecsonn",
//   "amenohabakiri174",
//   //7 more
// ];

// async function getWorkingWorkerUrl(
//   urls: string[],
//   timeout = 15000,
// ): Promise<Response | null> {
//   for (const url of urls) {
//     try {
//       const res = await fetchWithTimeout(url, {}, timeout);
//       if (res.ok) return res;
//     } catch {}
//   }
//   return null;
// }

// type Quality = { quality: string; embed_url: string };
// type Source = { label: string; type: string; file: string };

// type CachedData = {
//   qualities: Quality[];
//   sources: Source[] | null;
// };

// async function dbGet(
//   tmdbId: string,
//   mediaType: string,
//   season: string | null,
//   episode: string | null,
// ): Promise<CachedData | null> {
//   try {
//     const { data, error } = await supabase.rpc("get_holly", {
//       p_tmdb_id: Number(tmdbId),
//       p_media_type: mediaType,
//       p_season: season ? Number(season) : null,
//       p_episode: episode ? Number(episode) : null,
//     });
//     if (error || !data) return null;
//     return data as CachedData;
//   } catch {
//     return null;
//   }
// }

// async function dbSave(
//   tmdbId: string,
//   mediaType: string,
//   season: string | null,
//   episode: string | null,
//   qualities: Quality[],
//   sources: Source[],
// ) {
//   try {
//     const { error } = await supabase.rpc("save_holly", {
//       p_tmdb_id: Number(tmdbId),
//       p_media_type: mediaType,
//       p_season: season ? Number(season) : null,
//       p_episode: episode ? Number(episode) : null,
//       p_qualities: qualities,
//       p_sources: sources,
//     });
//     if (error) console.warn("[holly dbSave] error:", error);
//   } catch (err: any) {
//     console.warn("[holly dbSave] exception:", err.message);
//   }
// }

// async function dbUpdateSources(
//   tmdbId: string,
//   mediaType: string,
//   season: string | null,
//   episode: string | null,
//   sources: Source[],
// ) {
//   try {
//     const { error } = await supabase.rpc("update_holly_sources", {
//       p_tmdb_id: Number(tmdbId),
//       p_media_type: mediaType,
//       p_season: season ? Number(season) : null,
//       p_episode: episode ? Number(episode) : null,
//       p_sources: sources,
//     });
//     if (error) console.warn("[holly dbUpdateSources] error:", error);
//   } catch (err: any) {
//     console.warn("[holly dbUpdateSources] exception:", err.message);
//   }
// }

// export async function GET(req: NextRequest) {
//   const logRequest = (status: number, reason: string) => {
//     const tmdbId = req.nextUrl.searchParams.get("a");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get("c");
//     const episode = req.nextUrl.searchParams.get("d");
//     const extra = mediaType === "tv" ? `/${season}/${episode}` : "";
//     console.log(
//       `[ORION] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
//     );
//   };
//   try {
//     const tmdbId = req.nextUrl.searchParams.get("a");
//     const mediaType = req.nextUrl.searchParams.get("b");
//     const season = req.nextUrl.searchParams.get("c");
//     const episode = req.nextUrl.searchParams.get("d");
//     const title = req.nextUrl.searchParams.get("f");
//     const year = req.nextUrl.searchParams.get("g");
//     const ts = Number(req.nextUrl.searchParams.get("gago"));
//     const token = req.nextUrl.searchParams.get("putangnamo")!;
//     const f_token = req.nextUrl.searchParams.get("f_token")!;
//     console.log(title);
//     if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
//       logRequest(404, "missing params");
//       return NextResponse.json(
//         { success: false, error: "need token" },
//         { status: 404 },
//       );
//     }

//     if (Date.now() - ts > 8000) {
//       logRequest(403, "token expired");
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     if (!validateBackendToken(tmdbId, f_token, ts, token)) {
//       logRequest(403, "invalid token");
//       return NextResponse.json(
//         { success: false, error: "Invalid token" },
//         { status: 403 },
//       );
//     }

//     const referer = req.headers.get("referer") || "";
//     if (!isValidReferer(referer)) {
//       logRequest(403, "invalid referrer");
//       return NextResponse.json(
//         { success: false, error: "Forbidden" },
//         { status: 403 },
//       );
//     }

//     const cached = await dbGet(tmdbId, mediaType, season, episode);

//     let sources: Source[] = [];

//     // ─── CASE 1: Full cache hit (qualities + sources) → skip step 1 & 2 ───────
//     if (cached?.sources?.length) {
//       sources = cached.sources;
//     }

//     // ─── CASE 2: Partial cache hit (qualities only) → skip step 1, run step 2 ─
//     else if (cached?.qualities?.length) {
//       const bestQuality =
//         cached.qualities.find((q) => q.quality === "1080p") ??
//         cached.qualities.find((q) => q.quality === "default") ??
//         cached.qualities[0];

//       const step2Res = await getWorkingWorkerUrl(
//         [...HOLLY_WORKERS]
//           .sort(() => Math.random() - 0.5)
//           .map(
//             (w) =>
//               `https://holly-2.${w}.workers.dev/?embed_url=${encodeURIComponent(bestQuality.embed_url)}`,
//           ),
//       );

//       if (!step2Res) {
//         logRequest(502, "step 2 failed");
//         return NextResponse.json(
//           { success: false, error: "Holly step 2 failed" },
//           { status: 502 },
//         );
//       }

//       const step2Data = await step2Res.json();
//       sources = step2Data.sources ?? [];

//       if (!sources.length) {
//         logRequest(404, "no sources from step 2");
//         return NextResponse.json(
//           { success: false, error: "No sources from Holly step 2" },
//           { status: 404 },
//         );
//       }

//       dbUpdateSources(tmdbId, mediaType, season, episode, sources).catch(
//         (e: any) => console.warn("[holly dbUpdateSources] failed:", e.message),
//       );
//     }

//     // ─── CASE 3: Cache miss → run step 1 + step 2, save everything ───────────
//     else {
//       const baseSlug = title!
//         .toLowerCase()
//         .replace(/['''`]/g, "")
//         .replace(/[^a-z0-9]+/g, "-")
//         .replace(/^-|-$/g, "");

//       const hollySlug =
//         mediaType === "tv" && season && episode
//           ? `${baseSlug}-season-${season}-episode-${episode}`
//           : `${baseSlug}-${year}`;

//       const step1Res = await getWorkingWorkerUrl(
//         [...HOLLY_WORKERS]
//           .sort(() => Math.random() - 0.5)
//           .map(
//             (w) =>
//               `https://holly-1.${w}.workers.dev/?slug=${encodeURIComponent(hollySlug)}`,
//           ),
//       );
//       if (!step1Res) {
//         logRequest(502, "step 1 failed");
//         return NextResponse.json(
//           { success: false, error: "Holly step 1 failed" },
//           { status: 502 },
//         );
//       }
//       const step1Data = await step1Res.json();
//       const qualities: Quality[] = step1Data.qualities ?? [];

//       if (!qualities.length) {
//         logRequest(404, "no qualities found");
//         return NextResponse.json(
//           { success: false, error: "No qualities found from Holly" },
//           { status: 404 },
//         );
//       }

//       const bestQuality =
//         qualities.find((q) => q.quality === "1080p") ??
//         qualities.find((q) => q.quality === "default") ??
//         qualities[0];

//       const step2Res = await getWorkingWorkerUrl(
//         [...HOLLY_WORKERS]
//           .sort(() => Math.random() - 0.5)
//           .map(
//             (w) =>
//               `https://holly-2.${w}.workers.dev/?embed_url=${encodeURIComponent(bestQuality.embed_url)}`,
//           ),
//       );
//       if (!step2Res) {
//         logRequest(502, "step 2 failed");
//         return NextResponse.json(
//           { success: false, error: "Holly step 2 failed" },
//           { status: 502 },
//         );
//       }
//       const step2Data = await step2Res.json();
//       sources = step2Data.sources ?? [];

//       if (!sources.length) {
//         logRequest(404, "no sources from step 2");
//         return NextResponse.json(
//           { success: false, error: "No sources from Holly step 2" },
//           { status: 404 },
//         );
//       }

//       dbSave(tmdbId, mediaType, season, episode, qualities, sources).catch(
//         (e: any) => console.warn("[holly dbSave] failed:", e.message),
//       );
//     }

//     // ─── STEP 3: Find first working proxied source ────────────────────────────
//     for (const source of sources) {
//       const res = await getWorkingWorkerUrl(
//         [...HOLLY_WORKERS]
//           .sort(() => Math.random() - 0.5)
//           .map(
//             (w) =>
//               `https://holly-3.${w}.workers.dev/?url=${encodeURIComponent(source.file)}`,
//           ),
//         6000,
//       );

//       if (res) {
//         const proxiedUrl = res.url;
//         logRequest(200, "OK!!!!!");
//         return NextResponse.json({
//           success: true,
//           c: !!cached,
//           links: [
//             { type: source.type === "hls" ? "hls" : "mp4", link: proxiedUrl },
//           ],
//           subtitles: [],
//         });
//       }
//     }
//     logRequest(502, "all sources failed proxy check");
//     return NextResponse.json(
//       { success: false, error: "All sources failed proxy check" },
//       { status: 502 },
//     );
//   } catch (err) {
//     console.error("Holly route error:", err);
//     return NextResponse.json(
//       { success: false, error: "Internal server error" },
//       { status: 500 },
//     );
//   }
// }
