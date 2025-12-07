"use client";

import { useState, useEffect } from "react";

interface FileItem {
  name: string;
  url: string;
  type: string;
}

interface Track {
  url: string;
  title: string;
}

const WORKER_URL = "https://upload-worker.mrpoffice.workers.dev";

export default function PlaylistBuilderPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Fetch files/folders for current path
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/files?prefix=${encodeURIComponent(currentPath)}`
        );
        const data = await response.json();

        // Filter audio files
        const audioFiles =
          data.files?.filter(
            (f: FileItem) =>
              f.type?.startsWith("audio/") ||
              /\.(mp3|wav|ogg|m4a|flac)$/i.test(f.name)
          ) || [];

        // Get folder names (remove current path prefix)
        const folderList =
          data.folders?.map((f: string) =>
            f.replace(currentPath, "").replace(/\/$/, "")
          ) || [];

        setFiles(audioFiles);
        setFolders(folderList);
      } catch (err) {
        console.error("Failed to fetch files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentPath]);

  const navigateToFolder = (folder: string) => {
    setCurrentPath(currentPath + folder + "/");
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length > 0 ? parts.join("/") + "/" : "");
  };

  const addTrack = (file: FileItem) => {
    // Don't add duplicates
    if (tracks.some((t) => t.url === file.url)) return;

    const title = file.name
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "")
      ?.replace(/^\d+-?/, "") || file.name;

    setTracks([...tracks, { url: file.url, title }]);
  };

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const moveTrack = (fromIndex: number, toIndex: number) => {
    const newTracks = [...tracks];
    const [moved] = newTracks.splice(fromIndex, 1);
    newTracks.splice(toIndex, 0, moved);
    setTracks(newTracks);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveTrack(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const savePlaylist = async () => {
    if (tracks.length === 0) return;

    setSaving(true);
    setSavedUrl(null);

    try {
      const response = await fetch(`${WORKER_URL}/pl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlistName || "My Playlist",
          tracks,
        }),
      });

      if (!response.ok) throw new Error("Failed to save playlist");

      const data = await response.json();
      setSavedUrl(`${window.location.origin}/pl/${data.id}`);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    if (savedUrl) {
      navigator.clipboard.writeText(savedUrl);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Playlist Builder</h1>
          <p className="text-zinc-500">
            Browse files, select songs, drag to reorder
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: File Browser */}
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
              <div className="flex items-center gap-2">
                {currentPath && (
                  <button
                    onClick={navigateUp}
                    className="rounded bg-zinc-100 px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-200"
                  >
                    ← Back
                  </button>
                )}
                <span className="text-sm text-zinc-500">
                  /{currentPath || ""}
                </span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-zinc-400">Loading...</div>
              ) : (
                <>
                  {/* Folders */}
                  {folders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => navigateToFolder(folder)}
                      className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50"
                    >
                      <span className="text-xl">📁</span>
                      <span className="text-zinc-700">{folder}</span>
                    </button>
                  ))}

                  {/* Audio Files */}
                  {files.map((file) => {
                    const isAdded = tracks.some((t) => t.url === file.url);
                    const displayName = file.name
                      .split("/")
                      .pop()
                      ?.replace(/\.[^.]+$/, "");

                    return (
                      <button
                        key={file.name}
                        onClick={() => addTrack(file)}
                        disabled={isAdded}
                        className={`flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left ${
                          isAdded
                            ? "bg-green-50 text-green-700"
                            : "hover:bg-zinc-50"
                        }`}
                      >
                        <span className="text-xl">🎵</span>
                        <span className="flex-1 truncate">{displayName}</span>
                        {isAdded && (
                          <span className="text-xs text-green-600">Added</span>
                        )}
                      </button>
                    );
                  })}

                  {folders.length === 0 && files.length === 0 && (
                    <div className="p-4 text-center text-zinc-400">
                      No audio files found
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Playlist */}
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-200 px-4 py-3">
              <input
                type="text"
                placeholder="Playlist name..."
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full rounded border border-zinc-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="max-h-[400px] overflow-auto">
              {tracks.length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  Click songs on the left to add them
                </div>
              ) : (
                tracks.map((track, index) => (
                  <div
                    key={`${track.url}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 border-b border-zinc-100 px-4 py-3 cursor-move ${
                      dragIndex === index ? "bg-blue-50" : "hover:bg-zinc-50"
                    }`}
                  >
                    <span className="text-zinc-400 text-sm w-6">{index + 1}</span>
                    <span className="text-zinc-400 cursor-grab">⋮⋮</span>
                    <span className="flex-1 truncate text-zinc-700">
                      {track.title}
                    </span>
                    <button
                      onClick={() => removeTrack(index)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-200 p-4 space-y-3">
              <div className="text-sm text-zinc-500">
                {tracks.length} track{tracks.length !== 1 && "s"}
              </div>

              <button
                onClick={savePlaylist}
                disabled={tracks.length === 0 || saving}
                className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Playlist"}
              </button>

              {savedUrl && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-green-800">
                    Playlist saved!
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={savedUrl}
                      className="flex-1 rounded border border-green-300 bg-white px-2 py-1 text-xs"
                    />
                    <button
                      onClick={copyUrl}
                      className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                  <a
                    href={savedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm text-green-600 hover:underline"
                  >
                    Open Playlist
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
