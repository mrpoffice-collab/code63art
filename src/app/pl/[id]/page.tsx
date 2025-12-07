"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

const WORKER_URL = "https://upload-worker.mrpoffice.workers.dev";

interface Track {
  url: string;
  title: string;
}

interface PlaylistConfig {
  name: string;
  tracks: Track[];
}

export default function CustomPlaylistPage() {
  const params = useParams();
  const id = params.id as string;

  const [playlist, setPlaylist] = useState<PlaylistConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Fetch playlist config
  useEffect(() => {
    if (!id) return;

    fetch(`${WORKER_URL}/pl/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Playlist not found");
        return res.json();
      })
      .then((data) => {
        setPlaylist(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      // Auto-advance to next track
      if (playlist && currentIndex < playlist.tracks.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [currentIndex, playlist]);

  // Auto-play when track changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && playlist && isPlaying) {
      audio.play().catch(() => {});
    }
  }, [currentIndex, playlist]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const playTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play().catch(() => {});
    }, 100);
  };

  const prevTrack = () => {
    if (currentIndex > 0) {
      playTrack(currentIndex - 1);
    }
  };

  const nextTrack = () => {
    if (playlist && currentIndex < playlist.tracks.length - 1) {
      playTrack(currentIndex + 1);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>Loading playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>{error || "Playlist not found"}</p>
      </div>
    );
  }

  const currentTrack = playlist.tracks[currentIndex];

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Audio Element */}
      {currentTrack && (
        <audio ref={audioRef} src={currentTrack.url} preload="metadata" />
      )}

      {/* Header */}
      <div className="bg-zinc-800 px-6 py-4 border-b border-zinc-700">
        <h1 className="text-lg font-semibold text-white">{playlist.name}</h1>
        <p className="text-sm text-zinc-400">{playlist.tracks.length} tracks</p>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        {playlist.tracks.map((track, index) => (
          <button
            key={`${track.url}-${index}`}
            onClick={() => playTrack(index)}
            className={`w-full px-6 py-4 flex items-center gap-4 text-left border-b border-zinc-800 transition-colors ${
              index === currentIndex
                ? "bg-zinc-800 text-white"
                : "text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            <span className="w-8 text-center text-sm text-zinc-500">
              {index === currentIndex && isPlaying ? (
                <span className="text-green-400">▶</span>
              ) : (
                index + 1
              )}
            </span>
            <span className="flex-1 truncate">{track.title}</span>
          </button>
        ))}
      </div>

      {/* Player Controls */}
      <div className="bg-zinc-800 px-6 py-4 border-t border-zinc-700">
        <div className="mx-auto max-w-md space-y-3">
          {/* Current Track */}
          <p className="text-center text-sm font-medium text-white truncate">
            {currentTrack?.title || "No track selected"}
          </p>

          {/* Progress Bar */}
          <div
            className="group relative h-2 cursor-pointer rounded-full bg-white/20"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time */}
          <div className="flex justify-between text-xs text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            {/* Previous */}
            <button
              onClick={prevTrack}
              disabled={currentIndex === 0}
              className="p-2 text-white disabled:opacity-30"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition-transform hover:scale-105"
            >
              {isPlaying ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={nextTrack}
              disabled={currentIndex === playlist.tracks.length - 1}
              className="p-2 text-white disabled:opacity-30"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          {/* Branding */}
          <p className="text-center text-xs text-white/30">code63.art</p>
        </div>
      </div>
    </div>
  );
}
