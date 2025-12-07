"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";

const WORKER_URL = "https://upload-worker.mrpoffice.workers.dev";
const B2_BASE = "https://f005.backblazeb2.com/file/code63-media/";

interface PlayerConfig {
  audio: string;
  image: string | null;
  title: string | null;
}

export default function ShortPlayerPage() {
  const params = useParams();
  const id = params.id as string;

  const [config, setConfig] = useState<PlayerConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch player config
  useEffect(() => {
    if (!id) return;

    fetch(`${WORKER_URL}/p/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Player not found");
        return res.json();
      })
      .then((data) => {
        setConfig(data);
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
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [config]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
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

  // Resolve URLs (support both full URLs and short paths)
  const resolveUrl = (url: string | null) => {
    if (!url) return null;
    return url.startsWith("http") ? url : B2_BASE + url;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>{error || "Player not found"}</p>
      </div>
    );
  }

  const audioUrl = resolveUrl(config.audio);
  const imageUrl = resolveUrl(config.image);

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col">
      {/* Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Image Section */}
      <div className="flex-1 flex items-center justify-center p-4">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={config.title || "Artwork"}
            className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Player Controls Section */}
      <div className="bg-zinc-800 px-6 py-6">
        <div className="mx-auto max-w-md space-y-4">
          {/* Title */}
          {config.title && (
            <h1 className="text-center text-lg font-semibold text-white">
              {config.title}
            </h1>
          )}

          {/* Progress Bar */}
          <div
            className="group relative h-2 cursor-pointer rounded-full bg-white/20"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>

          {/* Time */}
          <div className="flex justify-between text-sm text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Play Button */}
          <div className="flex justify-center">
            <button
              onClick={togglePlay}
              disabled={!isLoaded}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
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
          </div>

          {/* Branding */}
          <p className="text-center text-xs text-white/30">code63.art</p>
        </div>
      </div>
    </div>
  );
}
