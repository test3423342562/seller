import { NextRequest, NextResponse } from "next/server";
import { validateBackendToken } from "@/lib/validate-token";
import { isValidReferer } from "@/lib/allowed-referers";
import { fetchWithTimeout } from "@/lib/fetch-timeout";
import { createClient } from "@supabase/supabase-js";
import { encryptUrl } from "@/lib/encryptor";
import { createCors, handleOptions } from "@/lib/cors";

const supabase = createClient(
  process.env.SUPABASE_URL_BERKAS!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_BERKAS!,
);

// /workers/subdomain
const PROXY_WORKERS = [
  "https://snowy-brook-8333.berkas016.workers.dev/",
  "https://withered-wind-d29d.berkas015.workers.dev/",
  "https://dry-sea-54e2.berkas014.workers.dev/",
  "https://late-lake-bf67.berkas013.workers.dev/",
  "https://tight-fog-8f33.berkas012.workers.dev/",
  "https://dawn-sound-29da.berkas011.workers.dev/",
  "https://hidden-term-bd90.berkas010.workers.dev/",
  "https://long-pine-34a6.berkas09.workers.dev/",
  "https://lingering-frog-21bf.berkas08.workers.dev/",
  "https://royal-boat-ed13.berkas07.workers.dev/",
  "https://bitter-disk-bffb.berkas06.workers.dev/",
  "https://rough-waterfall-90f0.berkas05.workers.dev/",
  //
  "https://tight-glitter-3cac.berkas04.workers.dev/",
  "https://tiny-meadow-5f2b.berkas03.workers.dev/",
  "https://rapid-forest-0c46.berkas02.workers.dev/",
  "https://autumn-bonus-a535.berkas01.workers.dev/",
  "https://zxcstream.berkas65.workers.dev/",
  "https://zxcstream.berkas64.workers.dev/",
  "https://zxcstream.berkas63.workers.dev/",
  "https://zxcstream.berkas61.workers.dev/",
  "https://zxcstream.berkas60.workers.dev/",
  "https://zxcstream.berkas58.workers.dev/",
  "https://zxcstream.berkas57.workers.dev/",
  "https://zxcstream.berkas55.workers.dev/",
  "https://zxcstream.berkas54.workers.dev/",
  "https://zxcstream.berkas53.workers.dev/",
  "https://zxcstream.berkas52.workers.dev/",
  "https://zxcstream.berkas51.workers.dev/",
  "https://zxcstream.berkas50.workers.dev/",
  "https://zxcstream.berkas49.workers.dev/",
  "https://zxcstream.berkas48.workers.dev/",
  "https://zxcstream.berkas47.workers.dev/",
  "https://zxcstream.berkas46.workers.dev/",
  "https://zxcstream.berkas45.workers.dev/",
  //
  "https://zxcstream.berkas44.workers.dev/",
  "https://zxcstream.berkas43.workers.dev/",
  "https://zxcstream.berkas42.workers.dev/",
  "https://zxcstream.berkas41.workers.dev/",
  "https://zxcstream.berkas40.workers.dev/",
  "https://zxcstream.berkas39.workers.dev/",
  "https://zxcstream.berkas38.workers.dev/",
  "https://zxcstream.berkas37.workers.dev/",
  "https://zxcstream.berkas36.workers.dev/",
  "https://zxcstream.berkas35.workers.dev/",
  "https://zxcstream.berkas34.workers.dev/",
  "https://zxcstream.berkas33.workers.dev/",
  "https://zxcstream.berkas32.workers.dev/",
  "https://zxcstream.berkas31.workers.dev/",
  "https://zxcstream.berkas30.workers.dev/",
  "https://zxcstream.berkas29.workers.dev/",
  "https://zxcstream.berkas28.workers.dev/",
  "https://zxcstream.berkas27.workers.dev/",
  "https://berkas.berkas26.workers.dev/",
  "https://berkas.berkas25.workers.dev/",
  "https://zxcstream.berkas24.workers.dev/",
  "https://zxcstream.berkas23.workers.dev/",
  "https://zxcstream.berkas22.workers.dev/",
  "https://zxcstream.berkas21.workers.dev/",
  "https://zxcstream.berkas20.workers.dev/",
  "https://zxcstream.berkas19.workers.dev/",
  "https://zxcstream.berkas18.workers.dev/",
  "https://zxcstream.berkas17.workers.dev/",
  "https://zxcstream.berkas16.workers.dev/",
  "https://zxcstream.berkas15.workers.dev/",
  "https://zxcstream.berkas14.workers.dev/",
  "https://zxcstream.berkas13.workers.dev/",
  "https://zxcstream.berkas12.workers.dev/",
  "https://zxcstream.berkas11.workers.dev/",
  "https://zxcstream.berkas10.workers.dev/",
  "https://zxcstream.berkas9.workers.dev/",
  "https://zxcstream.berkas8.workers.dev/",
  "https://zxcstream.berkas7.workers.dev/",
  "https://zxcstream.berkas6.workers.dev/",
  "https://zxcstream.berkas5.workers.dev/",
  "https://zxcstream.berkas4.workers.dev/",
  "https://zxcstream.berkas3.workers.dev/",
  "https://zxcstream.berkas2.workers.dev/",
  "https://zxcstream.berkas1.workers.dev/",
  "https://berkas.test075-123.workers.dev/",
  "https://berkas.test078-123.workers.dev/",
  "https://berkas.test077-123.workers.dev/",
  "https://berkas.test076-123.workers.dev/",
  "https://berkas.test068-abc.workers.dev/",
  "https://berkas.test073-123.workers.dev/",
  "https://berkas.test074-123.workers.dev/",
  "https://berkas.test072-123.workers.dev/",
  "https://berkas.test071-123.workers.dev/",
  "https://berkas.test070-123.workers.dev/",
  "https://berkas.test069-123.workers.dev/",
  "https://berkas.test0670-123.workers.dev/",
  "https://berkas.test063-123.workers.dev/",
  "https://berkas.test06-123.workers.dev/",
  "https://berkas.test064-123.workers.dev/",
  "https://berkas.test065-123.workers.dev/",
  "https://berkas.test061-123.workers.dev/",
  "https://berkas.test059-123.workers.dev/",
  "https://berkas.test060-123.workers.dev/",
  "https://berkas.test062-123.workers.dev/",
  "https://berkas.test055-123.workers.dev/",
  "https://berkas.test058-123.workers.dev/",
  "https://berkas.test057-123.workers.dev/",
  "https://berkas.test056-123.workers.dev/",
  "https://berkas.test052-123.workers.dev/",
  "https://berkas.test054-123.workers.dev/",
  "https://berkas.test053-123.workers.dev/",
  "https://berkas.test051-123.workers.dev/",
  "https://berkas.test047-123.workers.dev/",
  "https://berkas.test049-123.workers.dev/",
  "https://berkas.test050-123.workers.dev/",
  "https://berkas.test048-123.workers.dev/",
  "https://berkas.test045.workers.dev/",
  "https://berkas.test046-43r.workers.dev/",
  "https://berkas.test98-a64.workers.dev/",
  "https://berkas.test97-f4b.workers.dev/",
  "https://berkas.test96-27b.workers.dev/",
  "https://berkas.test95-7d8.workers.dev/",
  "https://berkas.test100-1ff.workers.dev/",
  "https://berkas.test-zxcstream.workers.dev/",
  "https://berkas.test042.workers.dev/",
  "https://berkas.test041.workers.dev/",
  "https://berkas.zxcstream.workers.dev/", //Test040
  "https://berkas.test038.workers.dev/",
  "https://berkas.test032.workers.dev/",
  "https://berkas.test034.workers.dev/",
  "https://berkas.test035.workers.dev/",
  "https://berkas.test033.workers.dev/",
  "https://berkas.test031.workers.dev/",
  "https://berkas.test030.workers.dev/",
  "https://berkas.test029.workers.dev/",
  "https://berkas.test027.workers.dev/",
  "https://berkas.test028.workers.dev/",
  "https://berkas.test025.workers.dev/",
  "https://berkas.test026.workers.dev/",
  "https://berkas.test024.workers.dev/",
  "https://berkas.test023.workers.dev/",
  "https://berkas.test022.workers.dev/",
  "https://berkas.test021.workers.dev/",
  "https://berkas.test017.workers.dev/",
  "https://berkas.test019.workers.dev/",
  "https://berkas.test018.workers.dev/",
  "https://berkas.test020.workers.dev/",
  // "https://berkas.test013.workers.dev/",
  "https://berkas.test015-505.workers.dev/",
  "https://berkas.test016.workers.dev/",
  "https://berkas.test014-25a.workers.dev/",
  "https://berkas.test09-635.workers.dev/",
  "https://berkas.test010-f3d.workers.dev/",
  "https://berkas.test011.workers.dev/",
  "https://berkas.test012.workers.dev/",
  "https://berkas.test05-187.workers.dev/",
  "https://berkas.test06-c51.workers.dev/",
  "https://berkas.test07-84f.workers.dev/",
  "https://berkas.test08-0df.workers.dev/",
  "https://berkas.test01-05a.workers.dev/",
  "https://berkas.test02-663.workers.dev/",
  // "https://berkas.test03-4fb.workers.dev/",
  // "https://berkas.test04-cee.workers.dev/",
];

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
  await supabase
    .from("proxy_blacklist")
    .upsert(
      { proxy, expires_at: await getNext8AMPH() },
      { onConflict: "proxy" },
    );
  console.log(`[PROXY] ⛔ blacklisted ${proxy}`);
}

async function getActiveProxies(proxies: string[]): Promise<string[]> {
  const { data } = await supabase
    .from("proxy_blacklist")
    .select("proxy")
    .gt("expires_at", new Date().toISOString());
  const blocked = new Set((data ?? []).map((r: any) => r.proxy));
  return proxies.filter((p) => !blocked.has(p));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getHealthyWorker(
  candidates: string[],
): Promise<{ worker: string | null; proxyLeft: number }> {
  let proxyLeft = candidates.length;

  for (const worker of shuffle(candidates)) {
    try {
      const res = await fetchWithTimeout(worker, { method: "HEAD" }, 3000);
      if (res.status === 429) {
        await blacklistProxy(worker);
        proxyLeft -= 1;
        continue;
      }
      if (res.ok) {
        return { worker, proxyLeft };
      }
    } catch (err) {
      console.error(worker, err);
    }
  }

  return { worker: null, proxyLeft };
}

const STREAMDATA_URL = "https://streamdata.vaplayer.ru/api.php";

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
      `[BERKAS] ${tmdbId}/${mediaType}${extra} | ${status} | ${reason}`,
    );
  };

  try {
    const tmdbId = req.nextUrl.searchParams.get("a");
    const mediaType = req.nextUrl.searchParams.get("b");
    const season = req.nextUrl.searchParams.get("c");
    const episode = req.nextUrl.searchParams.get("d");
    const title = req.nextUrl.searchParams.get("f");
    const year = req.nextUrl.searchParams.get("g");
    const imdbId = req.nextUrl.searchParams.get("imdb"); // optional
    const ts = Number(req.nextUrl.searchParams.get("gago"));
    const token = req.nextUrl.searchParams.get("putangnamo")!;
    const f_token = req.nextUrl.searchParams.get("f_token")!;

    if (!tmdbId || !mediaType || !title || !year || !ts || !token) {
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

    // -------- Cache Lookup --------
    let streamUrls: string[];
    let subtitles: any[];

    const cacheQuery = supabase
      .from("berkas_cache")
      .select("stream_urls, subtitles")
      .eq("tmdb_id", tmdbId)
      .eq("media_type", mediaType)
      .eq("season", season ?? "")
      .eq("episode", episode ?? "")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    const { data: cached } = await cacheQuery;

    if (cached) {
      console.log(`[BERKAS] cache hit`);
      streamUrls = cached.stream_urls ?? [];
      subtitles = cached.subtitles ?? [];
    } else {
      const qs = new URLSearchParams({
        tmdb: tmdbId,
        type: mediaType,
      });

      if (mediaType === "tv") {
        qs.set("season", season!);
        qs.set("episode", episode!);
      }

      const res = await fetchWithTimeout(
        `${STREAMDATA_URL}?${qs.toString()}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
            Origin: "https://nextgencloudfabric.com",
            Referer: "https://nextgencloudfabric.com/",
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.7",
          },
        },
        8000,
      );
      const data = await res.json();

      streamUrls = data?.data?.stream_urls ?? [];

      if (data?.status_code !== "200" || !streamUrls.length) {
        logRequest(404, "no streams found");
        return cors(
          NextResponse.json(
            { success: false, error: "No streams found" },
            { status: 404 },
          ),
        );
      }

      subtitles = (data?.default_subs ?? []).map((sub: any, index: number) => ({
        id: sub.sid ?? sub.id ?? index,
        display:
          sub.lang ?? sub.language ?? sub.display ?? sub.code ?? "Unknown",
        language: sub.code ?? "",
        file: sub.url ?? sub.file,
      }));

      await supabase.from("berkas_cache").upsert(
        {
          tmdb_id: tmdbId,
          media_type: mediaType,
          season: season ?? "",
          episode: episode ?? "",
          stream_urls: streamUrls,
          subtitles,
          refreshed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
        },
        { onConflict: "tmdb_id,media_type,season,episode" },
      );
    }

    const activeProxies = await getActiveProxies(PROXY_WORKERS);
    const { worker: proxyWorker, proxyLeft } =
      await getHealthyWorker(activeProxies);

    if (!proxyWorker) {
      logRequest(503, "all proxy workers unavailable");
      return cors(
        NextResponse.json(
          { success: false, error: "No proxy workers available" },
          { status: 503 },
        ),
      );
    }

    const links = await Promise.all(
      streamUrls.map(async (url, i) => {
        const encrypted = await encryptUrl(url);

        return {
          type: "hls" as const,
          link: `${proxyWorker}?data=${encodeURIComponent(encrypted)}`,
          resolution: streamUrls.length - i,
        };
      }),
    );

    logRequest(200, "OK!!!!!");
    return cors(
      NextResponse.json({
        success: true,
        links,
        subtitles,
        meow: !!cached,
        proxyLeft,
      }),
    );
  } catch (err: any) {
    console.error("API Error:", err);
    logRequest(500, `exception: ${err?.message}`);
    return cors(
      NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
