# code63.art

AI-generated song artwork with lyrics and QR codes. Create printable cards that link to a full audio player experience.

## Live Site
https://code63.art

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Vercel        │     │ Cloudflare       │     │ Backblaze B2    │
│   (Next.js)     │     │ Worker           │     │ (Storage)       │
│                 │     │                  │     │                 │
│ - Song Art page │────▶│ upload-worker    │────▶│ code63-media    │
│ - /play page    │     │ (proxy uploads)  │     │ bucket          │
│ - /files page   │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Features

- **QR Art** (`/`): QR code embedded directly into AI-generated artwork
- **Art + QR** (`/art-qr`): AI art with standard QR code overlay
- **Song Art** (`/song-art`): Lyrics layouts with AI art and QR codes
- **Files** (`/files`): Browse and upload files to B2 storage
- **Player** (`/play`): Full-screen audio player with artwork background

## Environment Variables

### Vercel
```
REPLICATE_API_TOKEN=r8_xxx    # For AI image generation
B2_KEY_ID=xxx                  # Backblaze B2 key ID
B2_APP_KEY=xxx                 # Backblaze B2 app key
```

### Cloudflare Worker
Set these in Cloudflare dashboard → Workers → upload-worker → Settings → Variables:
```
B2_KEY_ID=xxx
B2_APP_KEY=xxx
```

## Key Files

| File | Purpose |
|------|---------|
| `src/app/song-art/page.tsx` | Main artwork creator with lyrics, QR, layouts |
| `src/app/play/page.tsx` | Audio player page (linked from QR codes) |
| `src/app/files/page.tsx` | B2 file browser with drag-drop upload |
| `src/app/api/files/route.ts` | API to list B2 bucket contents |
| `src/app/api/generate-art/route.ts` | API to generate AI images via Replicate |
| `cloudflare-worker/upload-worker.js` | Cloudflare Worker that proxies uploads to B2 |

## Cloudflare Worker

The upload worker proxies browser uploads to B2 (bypasses CORS issues).

**Worker URL:** `https://upload-worker.mrpoffice.workers.dev`

**To update the worker:**
1. Cloudflare dashboard → Workers & Pages → upload-worker
2. Click "Edit Code"
3. Paste contents of `cloudflare-worker/upload-worker.js`
4. Click "Deploy"

**Accepts:**
- Audio files → stored in `audio/` folder
- Images → stored in `images/` folder

## DNS Setup (Cloudflare + GoDaddy)

1. GoDaddy nameservers point to Cloudflare
2. Cloudflare DNS records:
   - `code63.art` → A record or CNAME to Vercel
   - Proxy status should be OFF (gray cloud) for Vercel

## B2 Storage

**Bucket:** `code63-media`
**Public URL pattern:** `https://f005.backblazeb2.com/file/code63-media/[path]`

**Free tier:** 1GB/day download bandwidth (~200-250 song plays at 4-5MB each)

## User Workflow (Creating a Player Card)

1. Go to Song Art page
2. Fill in title, lyrics, art prompt
3. Put audio URL (from B2) in QR field
4. Click "Generate" to create AI artwork
5. Click "Create Player" → copy the player URL
6. Paste player URL into QR field (artwork stays same)
7. Download - QR now links to full player experience

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000
