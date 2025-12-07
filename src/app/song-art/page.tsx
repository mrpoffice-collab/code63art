"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";

const LAYOUTS = [
  { name: "Lyrics Page", value: "lyrics-page", width: 800, height: 1400 },
  { name: "Lyrics Poster", value: "lyrics-poster", width: 700, height: 1000 },
  { name: "Bookmark", value: "bookmark", width: 300, height: 1000 },
  { name: "Square Card", value: "square", width: 800, height: 800 },
];

const STORAGE_KEY = "code63-art-shared"; // Shared across all pages

const STYLE_PRESETS = [
  { name: "Dreamy", prompt: "dreamy ethereal atmosphere, soft pastel colors, gentle light, artistic" },
  { name: "Vintage", prompt: "vintage aesthetic, warm tones, nostalgic, film grain, retro" },
  { name: "Neon", prompt: "neon lights, cyberpunk, vibrant colors, night city, futuristic" },
  { name: "Nature", prompt: "beautiful nature scene, peaceful, serene, natural lighting" },
  { name: "Abstract", prompt: "abstract art, flowing shapes, vibrant colors, modern art" },
  { name: "Minimal", prompt: "minimalist design, clean lines, simple shapes, elegant" },
];

const QR_THEMES = [
  { name: "Classic", dark: "#000000", light: "#ffffff", bg: "#ffffff" },
  { name: "Subtle", dark: "#333333", light: "#f5f5f5", bg: "#f5f5f5" },
  { name: "Warm", dark: "#4a3728", light: "#f5e6d3", bg: "#f5e6d3" },
  { name: "Cool", dark: "#1a365d", light: "#e6f0ff", bg: "#e6f0ff" },
  { name: "Neon Pink", dark: "#ff00ff", light: "#1a1a2e", bg: "#1a1a2e" },
  { name: "Neon Green", dark: "#00ff88", light: "#0d1117", bg: "#0d1117" },
  { name: "Transparent", dark: "#000000", light: "transparent", bg: "transparent" },
];

export default function SongArtPage() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [prompt, setPrompt] = useState("");
  const [layout, setLayout] = useState(LAYOUTS[0]);
  const [model, setModel] = useState<"schnell" | "dev">("schnell");
  const [qrSize, setQrSize] = useState(80);
  const [qrTheme, setQrTheme] = useState(QR_THEMES[0]);
  const [qrOpacity, setQrOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [autoFitFont, setAutoFitFont] = useState(true);
  const [panelRatio, setPanelRatio] = useState(65); // % for art
  const [bgColor, setBgColor] = useState("auto"); // "auto" or hex color
  const [dominantColor, setDominantColor] = useState("#1a1a1a");
  const [columnCount, setColumnCount] = useState(1); // 1 or 2 columns
  const [loading, setLoading] = useState(false);
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"ai" | "upload">("ai");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.url) setUrl(data.url);
        if (data.title) setTitle(data.title);
        if (data.lyrics) setLyrics(data.lyrics);
        if (data.prompt) setPrompt(data.prompt);
        if (data.layoutValue) {
          const found = LAYOUTS.find(l => l.value === data.layoutValue);
          if (found) setLayout(found);
        }
        if (data.model) setModel(data.model);
        if (data.qrSize) setQrSize(data.qrSize);
        if (data.qrThemeName) {
          const found = QR_THEMES.find(t => t.name === data.qrThemeName);
          if (found) setQrTheme(found);
        }
        if (data.qrOpacity !== undefined) setQrOpacity(data.qrOpacity);
        if (data.fontSize) setFontSize(data.fontSize);
        if (data.autoFitFont !== undefined) setAutoFitFont(data.autoFitFont);
        if (data.panelRatio) setPanelRatio(data.panelRatio);
        if (data.bgColor) setBgColor(data.bgColor);
        if (data.columnCount) setColumnCount(data.columnCount);
      } catch (e) {
        console.error("Failed to load saved data", e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (!isHydrated) return;
    const data = {
      url,
      title,
      lyrics,
      prompt,
      layoutValue: layout.value,
      model,
      qrSize,
      qrThemeName: qrTheme.name,
      qrOpacity,
      fontSize,
      autoFitFont,
      panelRatio,
      bgColor,
      columnCount,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [isHydrated, url, title, lyrics, prompt, layout, model, qrSize, qrTheme, qrOpacity, fontSize, autoFitFont, panelRatio, bgColor, columnCount]);

  // Calculate auto font size based on lyrics length
  const getAutoFontSize = (lyricsText: string, layoutType: string): number => {
    const lineCount = lyricsText.split("\n").filter(l => l.trim()).length;
    const charCount = lyricsText.length;

    if (layoutType === "lyrics-page") {
      if (lineCount > 40 || charCount > 1500) return 12;
      if (lineCount > 30 || charCount > 1000) return 14;
      if (lineCount > 20 || charCount > 600) return 16;
      return 18;
    } else if (layoutType === "lyrics-poster") {
      if (lineCount > 35 || charCount > 1200) return 10;
      if (lineCount > 25 || charCount > 800) return 12;
      if (lineCount > 15 || charCount > 500) return 14;
      return 16;
    } else if (layoutType === "bookmark") {
      if (lineCount > 30 || charCount > 800) return 9;
      if (lineCount > 20 || charCount > 500) return 10;
      if (lineCount > 12 || charCount > 300) return 11;
      return 12;
    } else { // square
      if (lineCount > 20 || charCount > 600) return 12;
      if (lineCount > 12 || charCount > 400) return 14;
      return 16;
    }
  };

  const clearAll = () => {
    setUrl("");
    setTitle("");
    setLyrics("");
    setPrompt("");
    setArtUrl(null);
    setCompositeUrl(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Extract dominant color from image
  const getDominantColor = (img: HTMLImageElement): string => {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return "#1a1a1a";

    tempCanvas.width = 50;
    tempCanvas.height = 50;
    tempCtx.drawImage(img, 0, 0, 50, 50);

    const imageData = tempCtx.getImageData(0, 0, 50, 50).data;
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < imageData.length; i += 4) {
      r += imageData[i];
      g += imageData[i + 1];
      b += imageData[i + 2];
      count++;
    }

    r = Math.floor(r / count * 0.3); // Darken for text readability
    g = Math.floor(g / count * 0.3);
    b = Math.floor(b / count * 0.3);

    return `rgb(${r},${g},${b})`;
  };

  // Composite everything
  useEffect(() => {
    if (!artUrl) return;

    const composite = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = layout.width;
      canvas.height = layout.height;

      // Load and draw art
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        // Extract dominant color from image
        const extractedColor = getDominantColor(img);
        setDominantColor(extractedColor);

        // Fill background with chosen or auto color
        const actualBgColor = bgColor === "auto" ? extractedColor : bgColor;
        ctx.fillStyle = actualBgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate art position based on layout
        let artX = 0, artY = 0, artW = 0, artH = 0;

        // Helper to wrap text
        const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
          ctx.font = `${fontSize}px system-ui`;
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
          return lines;
        };

        // Calculate effective font size (auto or manual)
        const effectiveFontSize = autoFitFont ? getAutoFontSize(lyrics, layout.value) : fontSize;

        if (layout.value === "lyrics-page") {
          // Art as strip at top (20% height), lyrics below
          const artHeight = canvas.height * 0.22;
          const actualBgColor = bgColor === "auto" ? getDominantColor(img) : bgColor;

          // Draw art strip at top
          const scale = Math.max(canvas.width / img.width, artHeight / img.height);
          const sw = canvas.width / scale;
          const sh = artHeight / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, artHeight);

          // Gradient fade from art to text area using bg color
          const fadeGradient = ctx.createLinearGradient(0, artHeight - 40, 0, artHeight);
          fadeGradient.addColorStop(0, actualBgColor.replace("rgb", "rgba").replace(")", ",0)"));
          fadeGradient.addColorStop(1, actualBgColor);
          ctx.fillStyle = fadeGradient;
          ctx.fillRect(0, artHeight - 40, canvas.width, 40);

          // Title
          let currentY = artHeight + 40;
          ctx.fillStyle = "#ffffff";
          const titleSize = Math.max(effectiveFontSize + 10, 24);
          ctx.font = `bold ${titleSize}px system-ui`;
          ctx.textAlign = "center";
          if (title) {
            ctx.fillText(title, canvas.width / 2, currentY);
            currentY += titleSize + 20;
          }

          // Lyrics - fit as many lines as possible (supports columns)
          if (lyrics) {
            const lyricsLines = lyrics.split("\n");
            const lineHeight = Math.floor(effectiveFontSize * 1.4);
            const maxLyricsY = canvas.height - qrSize - 60;

            ctx.font = `${effectiveFontSize}px system-ui`;
            ctx.fillStyle = "#e0e0e0";

            if (columnCount === 2) {
              // Two column layout - left-aligned text, centered container
              const gap = 40; // Gap between columns
              const colWidth = (canvas.width - 100) / 2; // Each column width
              const totalWidth = colWidth * 2 + gap;
              const startX = (canvas.width - totalWidth) / 2; // Center the block
              const col1X = startX;
              const col2X = startX + colWidth + gap;
              ctx.textAlign = "left";

              // Split lyrics roughly in half by lines
              const nonEmptyLines = lyricsLines.filter(l => l.trim() !== '');
              const midPoint = Math.ceil(nonEmptyLines.length / 2);
              let lineIndex = 0;
              let currentCol = 1;
              let colY = currentY;

              for (const line of lyricsLines) {
                if (line.trim() === '') {
                  colY += lineHeight * 0.5;
                  continue;
                }

                lineIndex++;
                if (lineIndex > midPoint && currentCol === 1) {
                  currentCol = 2;
                  colY = currentY;
                }

                const colX = currentCol === 1 ? col1X : col2X;
                if (colY > maxLyricsY) continue;

                const wrapped = wrapText(line.trim(), colWidth, effectiveFontSize);
                for (const wrappedLine of wrapped) {
                  if (colY > maxLyricsY) break;
                  ctx.fillText(wrappedLine, colX, colY);
                  colY += lineHeight;
                }
              }
            } else {
              // Single column layout
              for (const line of lyricsLines) {
                if (currentY > maxLyricsY) break;

                if (line.trim() === '') {
                  currentY += lineHeight * 0.5;
                  continue;
                }

                const wrapped = wrapText(line.trim(), canvas.width - 80, effectiveFontSize);
                for (const wrappedLine of wrapped) {
                  if (currentY > maxLyricsY) break;
                  ctx.fillText(wrappedLine, canvas.width / 2, currentY);
                  currentY += lineHeight;
                }
              }
            }
          }

          // QR at bottom center
          if (url) {
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: qrSize,
              margin: 1,
              color: {
                dark: qrTheme.dark,
                light: qrTheme.light === "transparent" ? "#00000000" : qrTheme.light,
              },
            });
            const qrImg = new Image();
            qrImg.onload = () => {
              const qrX = (canvas.width - qrSize) / 2;
              const qrY = canvas.height - qrSize - 20;
              if (qrTheme.bg !== "transparent") {
                ctx.globalAlpha = qrOpacity;
                ctx.fillStyle = qrTheme.bg;
                ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
              }
              ctx.globalAlpha = qrOpacity;
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              ctx.globalAlpha = 1;
              setCompositeUrl(canvas.toDataURL("image/png"));
            };
            qrImg.src = qrDataUrl;
          } else {
            setCompositeUrl(canvas.toDataURL("image/png"));
          }
        } else if (layout.value === "lyrics-poster") {
          // Art on left (user-controlled %), lyrics on right
          const artWidth = Math.floor(canvas.width * (panelRatio / 100));
          const lyricsWidth = canvas.width - artWidth;
          const margin = 20;
          const actualBgColor = bgColor === "auto" ? getDominantColor(img) : bgColor;

          // Draw art covering left portion
          const scale = Math.max(artWidth / img.width, canvas.height / img.height);
          const sw = artWidth / scale;
          const sh = canvas.height / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, artWidth, canvas.height);

          // Gradient fade from art to text panel using background color
          const fadeGradient = ctx.createLinearGradient(artWidth - 80, 0, artWidth, 0);
          fadeGradient.addColorStop(0, actualBgColor.replace("rgb", "rgba").replace(")", ",0)"));
          fadeGradient.addColorStop(1, actualBgColor);
          ctx.fillStyle = fadeGradient;
          ctx.fillRect(artWidth - 80, 0, 80, canvas.height);

          // Calculate content height for vertical centering
          const titleSize = Math.max(effectiveFontSize + 6, 18);
          const lineHeight = Math.floor(effectiveFontSize * 1.3);
          let contentHeight = 0;

          // Calculate title height
          ctx.font = `bold ${titleSize}px system-ui`;
          if (title) {
            const titleWrapped = wrapText(title, lyricsWidth - margin * 2, titleSize);
            contentHeight += titleWrapped.length * (titleSize + 6) + 20;
          }

          // Calculate lyrics height
          ctx.font = `${effectiveFontSize}px system-ui`;
          if (lyrics) {
            const lyricsLines = lyrics.split("\n");
            for (const line of lyricsLines) {
              if (line.trim() === '') {
                contentHeight += lineHeight * 0.5;
              } else {
                const wrapped = wrapText(line.trim(), lyricsWidth - margin * 2, effectiveFontSize);
                contentHeight += wrapped.length * lineHeight;
              }
            }
          }

          // Center content vertically
          const availableHeight = canvas.height - margin * 2;
          let currentY = Math.max(margin, (availableHeight - contentHeight) / 2 + margin);

          // Draw title
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${titleSize}px system-ui`;
          ctx.textAlign = "left";
          if (title) {
            const titleWrapped = wrapText(title, lyricsWidth - margin * 2, titleSize);
            titleWrapped.forEach((line, i) => {
              ctx.fillText(line, artWidth + margin, currentY + i * (titleSize + 6));
            });
            currentY += titleWrapped.length * (titleSize + 6) + 20;
          }

          // Draw lyrics
          if (lyrics) {
            const lyricsLines = lyrics.split("\n");
            const maxLyricsY = canvas.height - margin;

            ctx.font = `${effectiveFontSize}px system-ui`;
            ctx.fillStyle = "#e0e0e0";

            for (const line of lyricsLines) {
              if (currentY > maxLyricsY) break;

              if (line.trim() === '') {
                currentY += lineHeight * 0.5;
                continue;
              }

              const wrapped = wrapText(line.trim(), lyricsWidth - margin * 2, effectiveFontSize);
              for (const wrappedLine of wrapped) {
                if (currentY > maxLyricsY) break;
                ctx.fillText(wrappedLine, artWidth + margin, currentY);
                currentY += lineHeight;
              }
            }
          }

          // QR on art side (bottom left of art area)
          if (url) {
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: qrSize,
              margin: 1,
              color: {
                dark: qrTheme.dark,
                light: qrTheme.light === "transparent" ? "#00000000" : qrTheme.light,
              },
            });
            const qrImg = new Image();
            qrImg.onload = () => {
              const qrX = margin;
              const qrY = canvas.height - qrSize - margin;
              if (qrTheme.bg !== "transparent") {
                ctx.globalAlpha = qrOpacity;
                ctx.fillStyle = qrTheme.bg;
                ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
              }
              ctx.globalAlpha = qrOpacity;
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              ctx.globalAlpha = 1;
              setCompositeUrl(canvas.toDataURL("image/png"));
            };
            qrImg.src = qrDataUrl;
          } else {
            setCompositeUrl(canvas.toDataURL("image/png"));
          }
        } else if (layout.value === "bookmark") {
          // Full art background with overlay for lyrics
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const sw = canvas.width / scale;
          const sh = canvas.height / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          // Gradient overlay from top to bottom for lyrics
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, "rgba(0,0,0,0.3)");
          gradient.addColorStop(0.15, "rgba(0,0,0,0.5)");
          gradient.addColorStop(0.5, "rgba(0,0,0,0.7)");
          gradient.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Use effectiveFontSize directly (allow user control)
          const bookmarkFontSize = effectiveFontSize;
          const bookmarkTitleSize = effectiveFontSize + 2;
          const lineHeight = Math.floor(bookmarkFontSize * 1.25);

          // Calculate QR position first (bottom area reserved)
          const qrAreaHeight = url ? qrSize + 20 : 0;
          const availableHeight = canvas.height - qrAreaHeight - 20; // 20px top margin

          // Calculate total content height for centering
          let contentHeight = 0;
          if (title) {
            contentHeight += bookmarkTitleSize + 15;
          }
          if (lyrics) {
            const lyricsLines = lyrics.split("\n");
            ctx.font = `${bookmarkFontSize}px system-ui`;
            for (const line of lyricsLines) {
              if (line.trim() === '') {
                contentHeight += lineHeight * 0.4;
              } else {
                const wrapped = wrapText(line.trim(), canvas.width - 24, bookmarkFontSize);
                contentHeight += wrapped.length * lineHeight;
              }
            }
          }

          // Center content vertically in available space
          let currentY = Math.max(20, (availableHeight - contentHeight) / 2 + 20);

          // Title
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${bookmarkTitleSize}px system-ui`;
          ctx.textAlign = "center";
          if (title) {
            ctx.fillText(title, canvas.width / 2, currentY);
            currentY += bookmarkTitleSize + 15;
          }

          // Lyrics
          if (lyrics) {
            ctx.font = `${bookmarkFontSize}px system-ui`;
            ctx.fillStyle = "#e0e0e0";
            const lyricsLines = lyrics.split("\n");
            const maxY = canvas.height - qrAreaHeight - 10;

            for (const line of lyricsLines) {
              if (currentY > maxY) break;
              if (line.trim() === '') {
                currentY += lineHeight * 0.4;
                continue;
              }
              const wrapped = wrapText(line.trim(), canvas.width - 24, bookmarkFontSize);
              for (const wrappedLine of wrapped) {
                if (currentY > maxY) break;
                ctx.fillText(wrappedLine, canvas.width / 2, currentY);
                currentY += lineHeight;
              }
            }
          }

          // QR at bottom (positioned based on qrSize)
          if (url) {
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: qrSize,
              margin: 1,
              color: {
                dark: qrTheme.dark,
                light: qrTheme.light === "transparent" ? "#00000000" : qrTheme.light,
              },
            });
            const qrImg = new Image();
            qrImg.onload = () => {
              const qrX = (canvas.width - qrSize) / 2;
              const qrY = canvas.height - qrSize - 10;
              if (qrTheme.bg !== "transparent") {
                ctx.globalAlpha = qrOpacity;
                ctx.fillStyle = qrTheme.bg;
                ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
              }
              ctx.globalAlpha = qrOpacity;
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              ctx.globalAlpha = 1;
              setCompositeUrl(canvas.toDataURL("image/png"));
            };
            qrImg.src = qrDataUrl;
          } else {
            setCompositeUrl(canvas.toDataURL("image/png"));
          }
        } else if (layout.value === "square") {
          // Full background art with larger overlay for text
          const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
          const sw = canvas.width / scale;
          const sh = canvas.height / scale;
          const sx = (img.width - sw) / 2;
          const sy = (img.height - sh) / 2;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

          // Dark overlay covering entire image for lyrics
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, "rgba(0,0,0,0.4)");
          gradient.addColorStop(0.2, "rgba(0,0,0,0.55)");
          gradient.addColorStop(0.6, "rgba(0,0,0,0.7)");
          gradient.addColorStop(1, "rgba(0,0,0,0.85)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Title at top
          let textStartY = 50;
          ctx.fillStyle = "#ffffff";
          const squareTitleSize = Math.max(effectiveFontSize + 6, 22);
          ctx.font = `bold ${squareTitleSize}px system-ui`;
          ctx.textAlign = "center";
          if (title) {
            ctx.fillText(title, canvas.width / 2, textStartY);
            textStartY += squareTitleSize + 25;
          }

          // Lyrics - overlay with optional columns
          if (lyrics) {
            const lyricsLines = lyrics.split("\n");
            const lineHeight = Math.floor(effectiveFontSize * 1.35);
            const maxLyricsY = canvas.height - qrSize - 40;

            ctx.font = `${effectiveFontSize}px system-ui`;
            ctx.fillStyle = "#e0e0e0";

            if (columnCount === 2) {
              // Two column layout - left-aligned text, centered container
              const gap = 40;
              const colWidth = (canvas.width - 100) / 2;
              const totalWidth = colWidth * 2 + gap;
              const startX = (canvas.width - totalWidth) / 2;
              const col1X = startX;
              const col2X = startX + colWidth + gap;
              ctx.textAlign = "left";

              const nonEmptyLines = lyricsLines.filter(l => l.trim() !== '');
              const midPoint = Math.ceil(nonEmptyLines.length / 2);
              let lineIndex = 0;
              let currentCol = 1;
              let colY = textStartY;

              for (const line of lyricsLines) {
                if (line.trim() === '') {
                  colY += lineHeight * 0.4;
                  continue;
                }

                lineIndex++;
                if (lineIndex > midPoint && currentCol === 1) {
                  currentCol = 2;
                  colY = textStartY;
                }

                const colX = currentCol === 1 ? col1X : col2X;
                if (colY > maxLyricsY) continue;

                const wrapped = wrapText(line.trim(), colWidth, effectiveFontSize);
                for (const wrappedLine of wrapped) {
                  if (colY > maxLyricsY) break;
                  ctx.fillText(wrappedLine, colX, colY);
                  colY += lineHeight;
                }
              }
            } else {
              // Single column
              let currentY = textStartY;
              for (const line of lyricsLines) {
                if (currentY > maxLyricsY) break;

                if (line.trim() === '') {
                  currentY += lineHeight * 0.4;
                  continue;
                }

                const wrapped = wrapText(line.trim(), canvas.width - 60, effectiveFontSize);
                for (const wrappedLine of wrapped) {
                  if (currentY > maxLyricsY) break;
                  ctx.fillText(wrappedLine, canvas.width / 2, currentY);
                  currentY += lineHeight;
                }
              }
            }
          }

          // QR bottom right
          if (url) {
            const qrDataUrl = await QRCode.toDataURL(url, {
              width: qrSize,
              margin: 1,
              color: {
                dark: qrTheme.dark,
                light: qrTheme.light === "transparent" ? "#00000000" : qrTheme.light,
              },
            });
            const qrImg = new Image();
            qrImg.onload = () => {
              const qrX = canvas.width - qrSize - 20;
              const qrY = canvas.height - qrSize - 20;
              if (qrTheme.bg !== "transparent") {
                ctx.globalAlpha = qrOpacity;
                ctx.fillStyle = qrTheme.bg;
                ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);
              }
              ctx.globalAlpha = qrOpacity;
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              ctx.globalAlpha = 1;
              setCompositeUrl(canvas.toDataURL("image/png"));
            };
            qrImg.src = qrDataUrl;
          } else {
            setCompositeUrl(canvas.toDataURL("image/png"));
          }
        }
      };
      img.src = artUrl;
    };

    composite();
  }, [artUrl, url, title, lyrics, layout, qrSize, qrTheme, qrOpacity, fontSize, autoFitFont, panelRatio, bgColor, columnCount]);

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
        body: JSON.stringify({ prompt, model }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      setArtUrl(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setArtUrl(dataUrl);
    };
    reader.onerror = () => {
      setError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!compositeUrl) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = `${title || "scrapbook"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCreatePlayer = async () => {
    if (!compositeUrl || !url) {
      setError("Need both artwork and audio URL to create player");
      return;
    }

    setCreatingPlayer(true);
    setError(null);
    setPlayerUrl(null);

    try {
      // Convert data URL to blob
      const response = await fetch(compositeUrl);
      const blob = await response.blob();

      // Upload to B2 via Cloudflare Worker
      const filename = `${title || "artwork"}-${Date.now()}.png`;
      const uploadResponse = await fetch("https://upload-worker.mrpoffice.workers.dev", {
        method: "POST",
        headers: {
          "X-Filename": filename,
          "Content-Type": "image/png",
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload artwork");
      }

      const uploadData = await uploadResponse.json();
      const imageUrl = uploadData.url;

      // Build player URL with short paths (strip B2 base URL)
      const B2_BASE = "https://f005.backblazeb2.com/file/code63-media/";
      const shortAudio = url.startsWith(B2_BASE) ? url.replace(B2_BASE, "") : url;
      const shortImage = imageUrl.startsWith(B2_BASE) ? imageUrl.replace(B2_BASE, "") : imageUrl;

      const playerParams = new URLSearchParams();
      playerParams.set("a", shortAudio);
      playerParams.set("i", shortImage);
      if (title) playerParams.set("t", title);

      const fullPlayerUrl = `${window.location.origin}/play?${playerParams.toString()}`;
      setPlayerUrl(fullPlayerUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create player");
    } finally {
      setCreatingPlayer(false);
    }
  };

  const copyPlayerUrl = () => {
    if (playerUrl) {
      navigator.clipboard.writeText(playerUrl);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Song Art</h1>
              <p className="mt-2 text-zinc-500">
                Create layouts with AI art, lyrics, and QR codes
              </p>
            </div>
            <button
              onClick={clearAll}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              Clear All
            </button>
          </div>

          {/* Workflow Guide */}
          <details className="mt-4 rounded-lg border border-blue-200 bg-blue-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-blue-800">
              How to create a scannable player card
            </summary>
            <ol className="px-4 pb-4 text-sm text-blue-700 list-decimal list-inside space-y-1">
              <li>Fill in title, lyrics, and art prompt</li>
              <li>Put your <strong>audio URL</strong> in QR field</li>
              <li>Click <strong>Generate</strong> to create artwork</li>
              <li>Click <strong>Create Player</strong> → copy the player URL</li>
              <li>Paste player URL into QR field (image stays the same)</li>
              <li><strong>Download</strong> - QR now links to full player experience</li>
            </ol>
          </details>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Layout Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Layout</label>
              <div className="flex flex-wrap gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLayout(l)}
                    className={`rounded border px-4 py-2 text-sm ${
                      layout.value === l.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Title / Song Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Lyrics */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Lyrics / Text</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Enter lyrics or text..."
                rows={4}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* URL */}
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">QR Code Link</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://spotify.com/track/... or any URL"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-2 text-xs text-zinc-500">Paste any link - Spotify, Suno, SoundCloud, or your own hosted audio</p>
            </div>

            {/* QR Theme */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
              <h3 className="font-medium text-zinc-700">QR Code Style</h3>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">Color Theme</label>
                <div className="flex flex-wrap gap-2">
                  {QR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => setQrTheme(theme)}
                      className={`flex items-center gap-2 rounded border px-3 py-1.5 text-xs ${
                        qrTheme.name === theme.name
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-sm border border-zinc-300"
                        style={{ background: theme.dark }}
                      />
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">
                  Opacity: {Math.round(qrOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.1"
                  value={qrOpacity}
                  onChange={(e) => setQrOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-zinc-500">
                  Size: {qrSize}px
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>

            {/* Layout Settings */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
              <h3 className="font-medium text-zinc-700">Layout Settings</h3>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-500">
                    Font Size: {autoFitFont ? `Auto (${getAutoFontSize(lyrics, layout.value)}px)` : `${fontSize}px`}
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      checked={autoFitFont}
                      onChange={(e) => setAutoFitFont(e.target.checked)}
                      className="accent-blue-500"
                    />
                    Auto-fit
                  </label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  disabled={autoFitFont}
                  className="w-full accent-blue-500 disabled:opacity-50"
                />
              </div>

              {layout.value === "lyrics-poster" && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-500">
                    Art / Lyrics Split: {panelRatio}% / {100 - panelRatio}%
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="80"
                    value={panelRatio}
                    onChange={(e) => setPanelRatio(parseInt(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}

              {(layout.value === "lyrics-page" || layout.value === "square") && (
                <div>
                  <label className="mb-2 block text-sm text-zinc-500">Columns</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setColumnCount(1)}
                      className={`rounded border px-4 py-2 text-sm ${
                        columnCount === 1
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      1 Column
                    </button>
                    <button
                      onClick={() => setColumnCount(2)}
                      className={`rounded border px-4 py-2 text-sm ${
                        columnCount === 2
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      2 Columns
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm text-zinc-500">Background Color</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBgColor("auto")}
                    className={`rounded border px-3 py-1.5 text-xs ${
                      bgColor === "auto"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    Auto (from image)
                  </button>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor === "auto" ? "#1a1a1a" : bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-zinc-300"
                    />
                    <span className="text-xs text-zinc-500">
                      {bgColor === "auto" ? `Auto: ${dominantColor}` : bgColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Source Toggle */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-4">
              <h3 className="font-medium text-zinc-700">Background Image</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setImageSource("ai")}
                  className={`flex-1 rounded border px-4 py-2 text-sm ${
                    imageSource === "ai"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  AI Generated
                </button>
                <button
                  onClick={() => setImageSource("upload")}
                  className={`flex-1 rounded border px-4 py-2 text-sm ${
                    imageSource === "upload"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  Upload Image
                </button>
              </div>

              {imageSource === "upload" ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 py-6 text-sm text-zinc-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Click to upload image
                  </button>
                  {artUrl && imageSource === "upload" && (
                    <p className="text-xs text-green-600">Image uploaded</p>
                  )}
                </div>
              ) : (
                <>
                  {/* Style Presets */}
                  <div>
                    <label className="mb-2 block text-sm text-zinc-500">Art Style</label>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_PRESETS.map((style) => (
                        <button
                          key={style.name}
                          onClick={() => setPrompt(style.prompt)}
                          className={`rounded-full border px-3 py-1.5 text-xs ${
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

                  {/* Prompt */}
                  <div>
                    <label className="mb-2 block text-sm text-zinc-500">Art Prompt</label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the background art..."
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Model */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={model === "schnell"} onChange={() => setModel("schnell")} className="accent-blue-500" />
                      <span className="text-sm">Flux Schnell</span>
                      <span className="text-xs text-zinc-500">($0.003)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={model === "dev"} onChange={() => setModel("dev")} className="accent-blue-500" />
                      <span className="text-sm">Flux Dev</span>
                      <span className="text-xs text-zinc-500">($0.025)</span>
                    </label>
                  </div>

                  {/* Generate */}
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 py-4 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Generating..." : "Generate Art"}
                  </button>
                </>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="flex flex-col items-center">
            <canvas ref={canvasRef} className="hidden" />

            {compositeUrl ? (
              <div className="space-y-4">
                <div className="overflow-auto rounded-xl border border-zinc-300 bg-white shadow-sm" style={{ maxHeight: "80vh" }}>
                  <img src={compositeUrl} alt="Song Art" className="w-full" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
                  >
                    Download
                  </button>
                  <button
                    onClick={handleCreatePlayer}
                    disabled={creatingPlayer || !url}
                    className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingPlayer ? "Creating..." : "Create Player"}
                  </button>
                </div>

                {playerUrl && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-800">Player Created!</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={playerUrl}
                        className="flex-1 rounded border border-blue-300 bg-white px-3 py-2 text-xs text-zinc-700"
                      />
                      <button
                        onClick={copyPlayerUrl}
                        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                      >
                        Copy
                      </button>
                    </div>
                    <a
                      href={playerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-blue-600 hover:underline"
                    >
                      Open Player
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white"
                style={{
                  width: Math.min(layout.width, 400),
                  height: Math.min(layout.height, 500),
                  aspectRatio: `${layout.width}/${layout.height}`
                }}
              >
                <p className="text-zinc-400">Preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
