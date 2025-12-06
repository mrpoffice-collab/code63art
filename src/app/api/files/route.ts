import { NextRequest, NextResponse } from "next/server";

const B2_KEY_ID = process.env.B2_KEY_ID || "";
const B2_APP_KEY = process.env.B2_APP_KEY || "";
const BUCKET_NAME = "code63-media";

async function getB2Auth() {
  const authString = Buffer.from(`${B2_KEY_ID}:${B2_APP_KEY}`).toString("base64");
  const response = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: { Authorization: `Basic ${authString}` },
  });

  if (!response.ok) {
    throw new Error("B2 authorization failed");
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "";

    // Get B2 auth
    const auth = await getB2Auth();

    // Get bucket ID
    const bucketsResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId: auth.accountId, bucketName: BUCKET_NAME }),
    });

    const bucketsData = await bucketsResponse.json();
    const bucket = bucketsData.buckets?.[0];
    if (!bucket) {
      throw new Error("Bucket not found");
    }

    // List files
    const filesResponse = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_file_names`, {
      method: "POST",
      headers: {
        Authorization: auth.authorizationToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucketId: bucket.bucketId,
        prefix: prefix,
        maxFileCount: 1000,
        delimiter: "/",
      }),
    });

    if (!filesResponse.ok) {
      throw new Error("Failed to list files");
    }

    const filesData = await filesResponse.json();

    // Format response
    const files = filesData.files?.map((f: { fileName: string; contentLength: number; uploadTimestamp: number; contentType: string }) => ({
      name: f.fileName,
      size: f.contentLength,
      uploaded: f.uploadTimestamp,
      type: f.contentType,
      url: `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${encodeURIComponent(f.fileName).replace(/%2F/g, "/")}`,
    })) || [];

    // Get folders (from delimiter)
    const folders = filesData.files
      ?.filter((f: { fileName: string }) => f.fileName.endsWith("/"))
      .map((f: { fileName: string }) => f.fileName) || [];

    return NextResponse.json({ files, folders });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
