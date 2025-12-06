import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { url, prompt, negativePrompt, qrStrength } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const output = await replicate.run(
      "zylim0702/qr_code_controlnet:628e604e13cf63d8ec58bd4d238474e8986b054bc5e1326e50995fdbc851c557",
      {
        input: {
          url: url,
          prompt: prompt,
          negative_prompt: negativePrompt || "ugly, disfigured, low quality, blurry, nsfw",
          num_inference_steps: 20,
          guidance_scale: 9,
          qr_conditioning_scale: qrStrength || 1.8,
          seed: Math.floor(Math.random() * 1000000),
        },
      }
    );

    console.log("Replicate output type:", typeof output);
    console.log("Replicate output:", output);

    // Handle FileOutput objects from newer Replicate SDK
    let imageUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      // FileOutput objects have a url() method or can be converted to string
      if (typeof firstItem === "string") {
        imageUrl = firstItem;
      } else if (firstItem && typeof firstItem.url === "function") {
        imageUrl = firstItem.url();
      } else if (firstItem && typeof firstItem.toString === "function" && firstItem.toString() !== "[object Object]") {
        imageUrl = firstItem.toString();
      } else if (firstItem && firstItem.href) {
        imageUrl = firstItem.href;
      }
    } else if (typeof output === "string") {
      imageUrl = output;
    }

    console.log("Extracted imageUrl:", imageUrl);

    if (!imageUrl) {
      console.error("Could not extract image URL from output");
      return NextResponse.json({ error: "No image URL in response" }, { status: 500 });
    }

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("Replicate error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
