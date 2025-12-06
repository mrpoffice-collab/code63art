"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "QR Art", description: "QR embedded in artwork" },
  { href: "/art-qr", label: "Art + QR", description: "Separate art with QR overlay" },
  { href: "/song-art", label: "Song Art", description: "Art + QR + lyrics layouts" },
  { href: "/files", label: "Files", description: "Browse B2 files" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900">
            code63.art
          </Link>
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
