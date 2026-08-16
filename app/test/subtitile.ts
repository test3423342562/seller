import axios from "axios";
import { useState, useEffect } from "react";
import { generateFrontendToken } from "./source";

export interface MediaOption {
  id: string;
  display: string;
  file: string;
}

export interface SubtitleResponse {
  success: boolean;
  subtitles: MediaOption[];
  cached: boolean;
}

interface UseSubtitleParams {
  media_type: string;
  tmdbId: string;
  season?: number;
  episode?: number;
  title: string;
  year: string;
}

interface UseSubtitleResult {
  data: SubtitleResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export default function useSubtitle(
  params: UseSubtitleParams,
): UseSubtitleResult {
  const { media_type, tmdbId, season, episode, title, year } = params;

  const [data, setData] = useState<SubtitleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tmdbId || !media_type) return;

    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { f_token, f_ts } = generateFrontendToken(String(tmdbId));

        const { ts, token } = await fetchBackendToken(tmdbId, f_token, f_ts);

        const url = buildSubtitleURL({
          tmdbId,
          media_type,
          season,
          episode,
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
  }, [tmdbId, media_type, season, episode, title, year]);

  return {
    data,
    isLoading,
    isError: error !== null,
    error,
  };
}

async function fetchBackendToken(id: string, f_token: string, ts: number) {
  const res = await axios.post("/backend/token", {
    idd: id,
    f_token,
    ts,
  });

  return res.data;
}

interface BuildSubtitleURLParams {
  tmdbId: string;
  media_type: string;
  season?: number;
  episode?: number;
  title: string;
  year: string;
  ts: number;
  token: string;
  f_token: string;
}

function buildSubtitleURL({
  tmdbId,
  media_type,
  season,
  episode,
  title,
  year,
  ts,
  token,
  f_token,
}: BuildSubtitleURLParams) {
  const params = new URLSearchParams({
    a: String(tmdbId),
    b: media_type,
    gago: String(ts),
    putangnamo: token,
    f_token,
    title,
    date: year,
  });

  if (media_type === "tv") {
    if (season !== undefined) {
      params.append("c", String(season));
    }

    if (episode !== undefined) {
      params.append("d", String(episode));
    }
  }

  return `/backend/subtitle?${params.toString()}`;
}
