import { NextRequest, NextResponse } from "next/server";

const B2_KEY_ID = process.env.B2_KEY_ID || "";
const B2_APP_KEY = process.env.B2_APP_KEY || "";
const BUCKET_NAME = "code63-media";

// Cache for B2 auth token
let authCache: { token: string; apiUrl: string; expires: number } | null = null;

async function getB2Auth() {
  // Return cached auth if still valid
  if (authCache && Date.now() < authCache.expires) {
    return authCache;
  }

  const authString = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString("base64");
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: { Authorization: `Basic ${authString}` },
  });

  if (!response.ok) {
    throw new Error("B2 authorization failed");
  }

  const data = await response.json();
  authCache = {
    token: data.authorizationToken,
    apiUrl: data.apiUrl,
    expires: Date.now() + 23 * 60 * 60 * 1000, // 23 hours
  };
  return authCache;
}

// GET: Get B2 upload URL for direct browser upload
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Get B2 auth
    const auth = await getB2Auth();

    // Get bucket ID (we need this for upload URL)
    const bucketsResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: "POST",
      headers: {
        Authorization: auth.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId: B2_KEY_ID.substring(0, 12), bucketName: BUCKET_NAME }),
    });

    if (!bucketsResponse.ok) {
      throw new Error("Failed to get bucket info");
    }

    const bucketsData = await bucketsResponse.json();
    const bucket = bucketsData.buckets?.[0];
    if (!bucket) {
      throw new Error("Bucket not found");
    }

    // Get upload URL
    const uploadUrlResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: "POST",
      headers: {
        Authorization: auth.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bucketId: bucket.bucketId }),
    });

    if (!uploadUrlResponse.ok) {
      throw new Error("Failed to get upload URL");
    }

    const uploadData = await uploadUrlResponse.json();

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `audio/${timestamp}-${safeName}`;

    const publicUrl = `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${key}`;

    return NextResponse.json({
      uploadUrl: uploadData.uploadUrl,
      authToken: uploadData.authorizationToken,
      fileName: key,
      publicUrl: publicUrl,
    });
  } catch (error) {
    console.error("B2 error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}

// POST: Fallback for small files (kept for compatibility)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "audio";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${folder}/${timestamp}-${safeName}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to B2
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    // Return the public URL
    const publicUrl = `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${key}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key: key,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
