"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";

const STORAGE_KEY = "code63-art-shared"; // Shared across all pages

const STYLE_PRESETS = [
  { name: "Cyberpunk City", prompt: "cyberpunk city at night, neon lights, rain reflections, futuristic, highly detailed digital art" },
  { name: "Japanese Garden", prompt: "beautiful japanese zen garden, cherry blossoms, peaceful pond, watercolor style, serene" },
  { name: "Abstract", prompt: "abstract geometric art, vibrant colors, modern contemporary, flowing shapes" },
  { name: "Fantasy Forest", prompt: "enchanted magical forest, mystical lighting, fantasy art, detailed vegetation" },
  { name: "Ocean Sunset", prompt: "dramatic ocean sunset, waves crashing, golden hour, photorealistic" },
  { name: "Space Nebula", prompt: "cosmic nebula, stars, galaxies, deep space, vibrant colors, astronomical art" },
];

const ASPECT_RATIOS = [
  { name: "Square", value: "1:1" },
  { name: "Portrait", value: "3:4" },
  { name: "Landscape", value: "4:3" },
  { name: "Wide", value: "16:9" },
  { name: "Tall", value: "9:16" },
];

const QR_POSITIONS = [
  { name: "Bottom Right", value: "br" },
  { name: "Bottom Left", value: "bl" },
  { name: "Top Right", value: "tr" },
  { name: "Top Left", value: "tl" },
  { name: "Center", value: "center" },
];

export default function ArtQRPage() {
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"schnell" | "dev">("schnell");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [qrPosition, setQrPosition] = useState("br");
  const [qrSize, setQrSize] = useState(120);
  const [qrPadding, setQrPadding] = useState(20);
  const [loading, setLoading] = useState(false);
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load from shared localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.url) setUrl(data.url);
        if (data.prompt) setPrompt(data.prompt);
        if (data.model) setModel(data.model);
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
    const data = { ...existing, url, prompt, model };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [isHydrated, url, prompt, model]);

  useEffect(() => {
    if (!artUrl || !url) return;

    const composite = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const qrDataUrl = await QRCode.toDataURL(url, {
          width: qrSize,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });

        const qrImg = new Image();
        qrImg.onload = () => {
          let x = 0, y = 0;
          const padding = qrPadding;

          switch (qrPosition) {
            case "br": x = canvas.width - qrSize - padding; y = canvas.height - qrSize - padding; break;
            case "bl": x = padding; y = canvas.height - qrSize - padding; break;
            case "tr": x = canvas.width - qrSize - padding; y = padding; break;
            case "tl": x = padding; y = padding; break;
            case "center": x = (canvas.width - qrSize) / 2; y = (canvas.height - qrSize) / 2; break;
          }

          ctx.fillStyle = "white";
          ctx.fillRect(x - 4, y - 4, qrSize + 8, qrSize + 8);
          ctx.drawImage(qrImg, x, y, qrSize, qrSize);
          setCompositeUrl(canvas.toDataURL("image/png"));
        };
        qrImg.src = qrDataUrl;
      };
      img.src = artUrl;
    };

    composite();
  }, [artUrl, url, qrPosition, qrSize, qrPadding]);

  const handleGenerate = async () => {
    if (!prompt) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setArtUrl(null);
    setCompositeUrl(null);

    try {
      const response = await fetch("/api/generate-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, aspectRatio }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to generate");
      setArtUrl(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!compositeUrl) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = "art-qr.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Art + QR</h1>
          <p className="mt-2 text-zinc-500">Generate AI artwork with a standard QR code overlay</p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">URL for QR Code</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Quick styles</label>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.name}
                    onClick={() => setPrompt(style.prompt)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      prompt === style.prompt
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Art Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the artwork you want..."
                rows={3}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value)}
                    className={`rounded border px-3 py-1.5 text-sm ${
                      aspectRatio === ar.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {ar.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Model</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={model === "schnell"} onChange={() => setModel("schnell")} className="accent-blue-500" />
                  <span className="text-sm">Flux Schnell</span>
                  <span className="text-xs text-zinc-500">(~2s, $0.003)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={model === "dev"} onChange={() => setModel("dev")} className="accent-blue-500" />
                  <span className="text-sm">Flux Dev</span>
                  <span className="text-xs text-zinc-500">(~10s, $0.025)</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="font-medium text-zinc-700">QR Code Settings</h3>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">Position</label>
                <div className="flex flex-wrap gap-2">
                  {QR_POSITIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => setQrPosition(pos.value)}
                      className={`rounded border px-3 py-1.5 text-xs ${
                        qrPosition === pos.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      {pos.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">Size: {qrSize}px</label>
                <input type="range" min="60" max="200" value={qrSize} onChange={(e) => setQrSize(parseInt(e.target.value))} className="w-full accent-blue-500" />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">Padding: {qrPadding}px</label>
                <input type="range" min="10" max="60" value={qrPadding} onChange={(e) => setQrPadding(parseInt(e.target.value))} className="w-full accent-blue-500" />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Art"}
            </button>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">{error}</div>
            )}
          </div>

          <div>
            <canvas ref={canvasRef} className="hidden" />

            {compositeUrl ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
                  <img src={compositeUrl} alt="Art with QR" className="w-full" />
                </div>
                <button onClick={handleDownload} className="w-full rounded-lg border border-zinc-300 bg-white py-3 font-medium text-zinc-700 hover:bg-zinc-50">
                  Download Image
                </button>
              </div>
            ) : artUrl ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-sm">
                  <img src={artUrl} alt="Generated Art" className="w-full" />
                </div>
                <p className="text-center text-sm text-zinc-500">Enter a URL above to add QR code</p>
              </div>
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white">
                <p className="text-zinc-400">Preview will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
