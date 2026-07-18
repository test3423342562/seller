"use client";

import { useState } from "react";
import useSource from "./source";
import useSubtitle from "./subtitile";

const SERVERS = ["icarus", "atlas", "orion", "athena"];

export default function SourcePlayer() {
  const [tmdbId, setTmdbId] = useState("1184918");
  const [imdbId, setImdbId] = useState("tt29623480");
  const [title, setTitle] = useState("The Wild Robot");
  const [year, setYear] = useState("2024");
  const [server, setServer] = useState("icarus");
  const [ready, setReady] = useState(false);

  const { data, isLoading, isError } = useSource({
    media_type: "movie",
    tmdbId: ready ? tmdbId : "",
    imdbId: ready ? imdbId || null : null,
    server,
    season: 1,
    episode: 1,
    title,
    year,
  });

  const {
    data: subtitleData,
    isLoading: isSubtitleLoading,
    isError: isSubtitleError,
  } = useSubtitle({
    media_type: "movie",
    tmdbId: ready ? tmdbId : "",
    season: 1,
    episode: 1,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 flex flex-col gap-4 max-w-md mx-auto">
      <input
        placeholder="TMDB ID"
        value={tmdbId}
        onChange={(e) => {
          setTmdbId(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />
      <input
        placeholder="IMDB ID"
        value={imdbId}
        onChange={(e) => {
          setImdbId(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />
      <input
        placeholder="Year"
        value={year}
        onChange={(e) => {
          setYear(e.target.value);
          setReady(false);
        }}
        className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
      />

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

      <button
        onClick={() => setReady(true)}
        disabled={!tmdbId || !imdbId}
        className="py-2 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30"
      >
        Fetch
      </button>

      {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}
      {isError && (
        <p className="text-sm text-red-400">Error fetching source.</p>
      )}

      {data?.links.map((track, i) => (
        <div
          key={i}
          className="flex justify-between text-sm border-b border-zinc-800 py-2"
        >
          <span>{track.resolution ? `${track.resolution}p` : track.type}</span>
          <a href={track.link} target="_blank" className="text-blue-400">
            open
          </a>
        </div>
      ))}

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
              <a href={sub.file} target="_blank" className="text-blue-400">
                open
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
