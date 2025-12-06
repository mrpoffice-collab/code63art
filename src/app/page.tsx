"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const STORAGE_KEY = "code63-art-shared"; // Shared across all pages

const STYLE_PRESETS = [
  { name: "Japanese Garden", prompt: "beautiful japanese zen garden, cherry blossoms, peaceful, watercolor style" },
  { name: "Cyberpunk", prompt: "cyberpunk city, neon lights, futuristic, digital art, vibrant colors" },
  { name: "Watercolor", prompt: "beautiful watercolor painting, soft colors, artistic, flowing" },
  { name: "Forest", prompt: "enchanted forest, mystical, nature, green foliage, fantasy art" },
  { name: "Abstract", prompt: "abstract geometric art, modern, colorful shapes, contemporary" },
  { name: "Steampunk", prompt: "steampunk machinery, gears, brass, vintage, industrial art" },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [qrStrength, setQrStrength] = useState(1.8);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from shared localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.url) setUrl(data.url);
        if (data.prompt) setPrompt(data.prompt);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to shared localStorage when data changes
  useEffect(() => {
    if (!isHydrated) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    const existing = saved ? JSON.parse(saved) : {};
    const data = { ...existing, url, prompt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [isHydrated, url, prompt]);

  const handleGenerate = async () => {
    if (!url || !prompt) {
      setError("Please enter both a URL and a style prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, prompt, qrStrength }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      const output = Array.isArray(data.image) ? data.image[0] : data.image;
      setImageUrl(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "qr-art.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">QR Art</h1>
          <p className="mt-2 text-zinc-500">
            QR code embedded directly into AI-generated artwork
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              URL to encode
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Quick styles
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.name}
                  onClick={() => setPrompt(style.prompt)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    prompt === style.prompt
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Style prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the artistic style you want..."
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              QR Code Strength: {qrStrength.toFixed(1)}
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-zinc-500">Artistic</span>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={qrStrength}
                onChange={(e) => setQrStrength(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-zinc-500">Scannable</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Higher = more scannable, Lower = more artistic (1.8+ recommended for scanning)
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-4 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating... (20-40 seconds)
              </span>
            ) : (
              "Generate QR Art"
            )}
          </button>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          {imageUrl && (
            <div className="mt-8 space-y-4">
              <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
                <Image
                  src={imageUrl}
                  alt="Generated QR Art"
                  width={768}
                  height={768}
                  className="w-full"
                  unoptimized
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Download Image
                </button>
                <button
                  onClick={() => {
                    setImageUrl(null);
                    handleGenerate();
                  }}
                  className="flex-1 rounded-lg border border-zinc-300 bg-white py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
