import axios from "axios";
import crypto from "crypto";
import { useState, useEffect } from "react";

export interface MediaOption {
  id: string;
  display: string;
  file: string;
}

export interface QualityTrack {
  resolution?: number;
  format?: string;
  size?: string;
  type: "mp4" | "hls";
  link: string;
}

export interface SourceTypes {
  success: boolean;
  links: QualityTrack[];
  subtitles: MediaOption[];
}

interface UseSourceParams {
  media_type: string;
  tmdbId: string;
  season: number;
  episode: number;
  imdbId: string | null;
  server: string;
  title: string;
  year: string;
  quality?: "4k" | null;
  onCancel?: () => void;
}

interface UseSourceResult {
  data: SourceTypes | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export default function useSource(params: UseSourceParams): UseSourceResult {
  const {
    media_type,
    tmdbId,
    season,
    episode,
    imdbId,
    server,
    title,
    year,
    quality,
  } = params;

  const [data, setData] = useState<SourceTypes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tmdbId || !imdbId) return;

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { f_token, f_ts } = generateFrontendToken(String(tmdbId));
        const { ts, token } = await fetchBackendToken(tmdbId, f_token, f_ts);

        const url = buildSourceURL({
          server,
          tmdbId,
          media_type,
          season,
          episode,
          imdbId,
          title,
          year,
          ts,
          token,
          f_token,
        });

        const res = await axios.get(url);
        setData(res.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    tmdbId,
    media_type,
    season,
    episode,
    imdbId,
    server,
    title,
    year,
    quality,
  ]);

  return { data, isLoading, isError: error !== null, error };
}

async function fetchBackendToken(id: string, f_token: string, ts: number) {
  const res = await axios.post("https://zxcprime.site/backend/token", {
    idd: id,
    f_token,
    ts,
  });
  return res.data;
}

interface BuildSourceURLParams {
  server: string;
  tmdbId: string;
  media_type: string;
  season: number;
  episode: number;
  imdbId: string | null;
  title: string;
  year: string;
  ts: number;
  token: string;
  f_token: string;
}

function buildSourceURL({
  server,
  tmdbId,
  imdbId,
  media_type,
  season,
  episode,
  title,
  year,
  ts,
  token,
  f_token,
}: BuildSourceURLParams) {
  const params = new URLSearchParams({
    a: String(tmdbId),
    b: media_type,
    gago: String(ts),
    putangnamo: token,
    f_token,
    f: title,
    g: year,
  });

  if (media_type === "tv") {
    params.append("c", String(season));
    params.append("d", String(episode));
  }

  if (imdbId) {
    params.append("e", imdbId);
  }

  return `https://zxcprime.site/backend/servers/${server}?${params.toString()}`;
}

export function generateFrontendToken(id: string) {
  const f_ts = Date.now();
  const f_token = crypto
    .createHash("sha256")
    .update(`${id}:${f_ts}`)
    .digest("hex");

  return { f_token, f_ts };
}
