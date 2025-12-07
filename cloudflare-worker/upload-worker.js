// Cloudflare Worker for B2 uploads and short URL player configs
// Deploy to: upload-worker.mrpoffice.workers.dev
//
// KV Setup: Create a KV namespace called "PLAYERS" in Cloudflare dashboard
// then bind it to this worker as "PLAYERS"

const BUCKET_NAME = 'code63-media';

// Generate a short ID (6 chars = 56 billion combinations)
function generateShortId() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Filename',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route: GET /p/:id - Get player config
    if (request.method === 'GET' && url.pathname.startsWith('/p/')) {
      const id = url.pathname.slice(3); // Remove "/p/"

      if (!env.PLAYERS) {
        return new Response(JSON.stringify({ error: 'KV not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const config = await env.PLAYERS.get(id, 'json');

      if (!config) {
        return new Response(JSON.stringify({ error: 'Player not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify(config), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Route: POST /p - Create player config
    if (request.method === 'POST' && url.pathname === '/p') {
      if (!env.PLAYERS) {
        return new Response(JSON.stringify({ error: 'KV not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      try {
        const config = await request.json();

        // Validate required fields
        if (!config.audio) {
          return new Response(JSON.stringify({ error: 'audio URL required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        // Generate unique ID (retry if collision)
        let id;
        let attempts = 0;
        do {
          id = generateShortId();
          const existing = await env.PLAYERS.get(id);
          if (!existing) break;
          attempts++;
        } while (attempts < 5);

        // Store config (no expiration - permanent)
        await env.PLAYERS.put(id, JSON.stringify({
          audio: config.audio,
          image: config.image || null,
          title: config.title || null,
          created: Date.now(),
        }));

        return new Response(JSON.stringify({ id }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Route: POST / - Original file upload
    if (request.method === 'POST' && url.pathname === '/') {
      try {
        // Get filename from header
        const filename = request.headers.get('X-Filename') || 'upload.mp3';
        const contentType = request.headers.get('Content-Type') || 'audio/mpeg';

        // Generate unique key - detect if audio or image
        const timestamp = Date.now();
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const isImage = contentType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(filename);
        const folder = isImage ? 'images' : 'audio';
        const key = `${folder}/${timestamp}-${safeName}`;

        // Get B2 auth
        const authString = btoa(`${env.B2_KEY_ID}:${env.B2_APP_KEY}`);
        const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
          headers: { Authorization: `Basic ${authString}` },
        });

        if (!authResponse.ok) {
          throw new Error('B2 auth failed');
        }

        const auth = await authResponse.json();

        // Get bucket ID
        const bucketsResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId: auth.accountId, bucketName: BUCKET_NAME }),
        });

        const bucketsData = await bucketsResponse.json();
        const bucket = bucketsData.buckets?.[0];
        if (!bucket) {
          throw new Error('Bucket not found');
        }

        // Get upload URL
        const uploadUrlResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
          method: 'POST',
          headers: {
            Authorization: auth.authorizationToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bucketId: bucket.bucketId }),
        });

        const uploadData = await uploadUrlResponse.json();

        // Get file content
        const fileBuffer = await request.arrayBuffer();

        // Upload to B2
        const uploadResponse = await fetch(uploadData.uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: uploadData.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(key),
            'Content-Type': contentType,
            'Content-Length': fileBuffer.byteLength.toString(),
            'X-Bz-Content-Sha1': 'do_not_verify',
          },
          body: fileBuffer,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const result = await uploadResponse.json();
        const publicUrl = `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${key}`;

        return new Response(JSON.stringify({
          success: true,
          url: publicUrl,
          fileName: result.fileName,
          size: result.contentLength,
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          error: error.message || 'Upload failed',
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
