// Cloudflare Worker for B2 uploads
// Deploy to: upload.code63.art

const BUCKET_NAME = 'code63-media';

// These will be set as Worker environment variables
// B2_KEY_ID and B2_APP_KEY

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Filename',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

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
  },
};
