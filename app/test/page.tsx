"use client";

import { useState } from "react";
import useSource from "./source";
import useSubtitle from "./subtitile";

const SERVERS = ["icarus", "atlas", "orion", "athena"];

export default function SourcePlayer() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("tv");

  const [tmdbId, setTmdbId] = useState("1434");
  const [imdbId, setImdbId] = useState("tt0182576");
  const [title, setTitle] = useState("Family Guy");
  const [year, setYear] = useState("1999");

  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("1");

  const [server, setServer] = useState("icarus");
  const [ready, setReady] = useState(false);

  const { data, isLoading, isError } = useSource({
    media_type: mediaType,
    tmdbId: ready ? tmdbId : "",
    imdbId: ready ? imdbId || null : null,
    server,
    season: Number(season),
    episode: Number(episode),
    title,
    year,
  });

  const {
    data: subtitleData,
    isLoading: isSubtitleLoading,
    isError: isSubtitleError,
  } = useSubtitle({
    media_type: mediaType,
    tmdbId: ready ? tmdbId : "",
    season: Number(season),
    episode: Number(episode),
    title,
    year,
  });

  const handleMediaTypeChange = (type: "movie" | "tv") => {
    setMediaType(type);
    setReady(false);

    if (type === "tv") {
      setTmdbId("1434");
      setImdbId("tt0182576");
      setTitle("Family Guy");
      setYear("1999");
      setSeason("1");
      setEpisode("1");
    } else {
      setTmdbId("1339713");
      setImdbId("tt37287335");
      setTitle("Obsession");
      setYear("2025");
      setSeason("1");
      setEpisode("1");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col gap-4 max-w-md mx-auto">
      {/* Media Type */}
      <div className="grid grid-cols-2 gap-2">
        {(["movie", "tv"] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleMediaTypeChange(type)}
            className={`py-2 text-sm rounded border transition-colors ${
              mediaType === type
                ? "border-blue-500 text-blue-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
            }`}
          >
            {type === "tv" ? "TV Show" : "Movie"}
          </button>
        ))}
      </div>

      {/* TMDB ID */}
      <input
        placeholder="TMDB ID"
        value={tmdbId}
        onChange={(e) => {
          setTmdbId(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />

      {/* IMDb ID */}
      <input
        placeholder="IMDb ID"
        value={imdbId}
        onChange={(e) => {
          setImdbId(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />

      {/* Title */}
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />

      {/* Year */}
      <input
        placeholder="Year"
        value={year}
        onChange={(e) => {
          setYear(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />

      {/* Season / Episode */}
      {mediaType === "tv" && (
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Season"
            value={season}
            onChange={(e) => {
              setSeason(e.target.value);
              setReady(false);
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
          />

          <input
            placeholder="Episode"
            value={episode}
            onChange={(e) => {
              setEpisode(e.target.value);
              setReady(false);
            }}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Servers */}
      <div className="grid grid-cols-3 gap-2">
        {SERVERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setServer(s);
              setReady(false);
            }}
            className={`py-2 text-sm rounded border transition-colors ${
              server === s
                ? "border-blue-500 text-blue-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Fetch */}
      <button
        onClick={() => setReady(true)}
        disabled={!tmdbId || !imdbId}
        className="py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
      >
        Fetch
      </button>

      {/* Source Loading */}
      {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}

      {/* Source Error */}
      {isError && (
        <p className="text-sm text-red-400">Error fetching source.</p>
      )}

      {/* Sources */}
      {data?.links.map((track, i) => (
        <div
          key={i}
          className="flex justify-between text-sm border-b border-zinc-800 py-2"
        >
          <span>{track.resolution ? `${track.resolution}p` : track.type}</span>

          <a
            href={track.link}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400"
          >
            open
          </a>
        </div>
      ))}

      {/* Subtitles */}
      {ready && (
        <div className="mt-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
            Subtitles
          </p>

          {isSubtitleLoading && (
            <p className="text-sm text-zinc-500">Loading subtitles...</p>
          )}

          {isSubtitleError && (
            <p className="text-sm text-red-400">Error fetching subtitles.</p>
          )}

          {!isSubtitleLoading &&
            !isSubtitleError &&
            subtitleData?.subtitles.length === 0 && (
              <p className="text-sm text-zinc-500">No subtitles found.</p>
            )}

          {subtitleData?.subtitles.map((sub, i) => (
            <div
              key={sub.id ?? i}
              className="flex justify-between text-sm border-b border-zinc-800 py-2"
            >
              <span>{sub.display}</span>

              <a
                href={sub.file}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400"
              >
                open
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
