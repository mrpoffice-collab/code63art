"use client";

import { useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";

function PlayerContent() {
  const searchParams = useSearchParams();
  const audioUrl = searchParams.get("a") || "";
  const imageUrl = searchParams.get("i") || "";
  const title = searchParams.get("t") || "";

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

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
  }, []);

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

  if (!audioUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>No audio specified</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-900">
      {/* Background - dark with centered image */}
      {imageUrl && (
        <>
          {/* Blurred background fill */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          {/* Sharp centered image */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt=""
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </>
      )}

      {/* Overlay for better contrast on controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      {/* Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Content */}
      <div className="relative flex min-h-screen flex-col items-center justify-end pb-12 px-6">
        {/* Title */}
        {title && (
          <h1 className="mb-8 text-center text-2xl font-bold text-white drop-shadow-lg">
            {title}
          </h1>
        )}

        {/* Player Controls */}
        <div className="w-full max-w-md space-y-4">
          {/* Progress Bar */}
          <div
            className="group relative h-2 cursor-pointer rounded-full bg-white/30"
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
          <div className="flex justify-between text-sm text-white/70">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Play Button */}
          <div className="flex justify-center">
            <button
              onClick={togglePlay}
              disabled={!isLoaded}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-zinc-900 shadow-lg transition-transform hover:scale-105 disabled:opacity-50"
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
        </div>

        {/* Branding */}
        <p className="mt-8 text-xs text-white/40">code63.art</p>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-900 text-white">
        <p>Loading...</p>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}
