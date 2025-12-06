import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

const s3Client = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_APP_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = "code63-media";

// GET: Generate presigned URL for direct upload
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const contentType = searchParams.get("contentType") || "audio/mpeg";

    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    // Generate unique key
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `audio/${timestamp}-${safeName}`;

    // Create presigned URL for PUT
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `https://f005.backblazeb2.com/file/${BUCKET_NAME}/${key}`;

    return NextResponse.json({
      uploadUrl: presignedUrl,
      publicUrl: publicUrl,
      key: key,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
