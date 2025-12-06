"use client";

import { useState, useEffect } from "react";

interface FileItem {
  name: string;
  size: number;
  uploaded: number;
  type: string;
  url: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (prefix: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files?prefix=${encodeURIComponent(prefix)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load files");
      }
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const copyUrl = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopied(name);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFileName = (fullPath: string) => {
    const parts = fullPath.split("/");
    return parts[parts.length - 1] || parts[parts.length - 2] + "/";
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length ? parts.join("/") + "/" : "");
  };

  const navigateToFolder = (folderName: string) => {
    setCurrentPath(folderName);
  };

  // Group files by folder
  const folders = [...new Set(files.map(f => {
    const parts = f.name.split("/");
    if (parts.length > 1) {
      return parts.slice(0, -1).join("/") + "/";
    }
    return null;
  }).filter(Boolean))] as string[];

  const currentFiles = files.filter(f => !f.name.endsWith("/"));

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">B2 File Browser</h1>
          <p className="mt-2 text-zinc-500">Browse your files and copy URLs</p>
        </header>

        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentPath("")}
            className="text-blue-600 hover:underline"
          >
            code63-media
          </button>
          {currentPath && currentPath.split("/").filter(Boolean).map((part, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-zinc-400">/</span>
              <button
                onClick={() => setCurrentPath(arr.slice(0, i + 1).join("/") + "/")}
                className="text-blue-600 hover:underline"
              >
                {part}
              </button>
            </span>
          ))}
        </div>

        {/* Navigation */}
        {currentPath && (
          <button
            onClick={navigateUp}
            className="mb-4 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {/* Folders */}
            {folders.filter(f => f.startsWith(currentPath) && f !== currentPath).map(folder => {
              const displayName = folder.replace(currentPath, "").split("/")[0];
              if (!displayName) return null;
              const fullPath = currentPath + displayName + "/";
              if (folders.includes(fullPath) || folder === fullPath) {
                return (
                  <button
                    key={folder}
                    onClick={() => navigateToFolder(fullPath)}
                    className="w-full flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="font-medium">{displayName}</span>
                  </button>
                );
              }
              return null;
            })}

            {/* Files */}
            {currentFiles.filter(f => {
              const filePath = f.name.substring(0, f.name.lastIndexOf("/") + 1);
              return filePath === currentPath || (!currentPath && !f.name.includes("/"));
            }).map(file => (
              <div
                key={file.name}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg className="h-5 w-5 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{getFileName(file.name)}</p>
                    <p className="text-xs text-zinc-500">
                      {formatSize(file.size)} • {formatDate(file.uploaded)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                  >
                    Play
                  </a>
                  <button
                    onClick={() => copyUrl(file.url, file.name)}
                    className={`rounded px-3 py-1.5 text-sm ${
                      copied === file.name
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {copied === file.name ? "Copied!" : "Copy URL"}
                  </button>
                </div>
              </div>
            ))}

            {currentFiles.length === 0 && folders.length === 0 && (
              <div className="text-center py-12 text-zinc-500">No files found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
