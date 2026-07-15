import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const tmdbId = searchParams.get("tmdbId");
  const season = searchParams.get("season");
  const episode = searchParams.get("episode");
  const imdbId = searchParams.get("imdbId");
  if (!imdbId || !season || !episode) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const targetUrl = `https://api.introdb.app/intro?imdb_id=${imdbId}&season=${season}&episode=${episode}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json();

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch intro data" },
      { status: 500 }
    );
  }
}

// const targetUrl =
//   `https://veloratv.ru/api/intro-end/confirmed` +
//   `?tmdbId=${tmdbId}&season=${season}&episode=${episode}`;
