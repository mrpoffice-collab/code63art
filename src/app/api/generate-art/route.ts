import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, aspectRatio = "1:1" } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    let output;

    if (model === "schnell") {
      // Flux Schnell - fast and cheap (~$0.003)
      output = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: aspectRatio,
            output_format: "png",
            output_quality: 90,
          },
        }
      );
    } else {
      // Flux Dev - higher quality (~$0.025)
      output = await replicate.run(
        "black-forest-labs/flux-dev",
        {
          input: {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: aspectRatio,
            output_format: "png",
            guidance: 3.5,
            num_inference_steps: 28,
          },
        }
      );
    }

    console.log("Art output:", output);

    // Handle FileOutput objects
    let imageUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const firstItem = output[0];
      if (typeof firstItem === "string") {
        imageUrl = firstItem;
      } else if (firstItem && firstItem.href) {
        imageUrl = firstItem.href;
      } else if (firstItem && typeof firstItem.toString === "function") {
        const str = firstItem.toString();
        if (str.startsWith("http")) {
          imageUrl = str;
        }
      }
    } else if (typeof output === "string") {
      imageUrl = output;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL in response" }, { status: 500 });
    }

    return NextResponse.json({ image: imageUrl });
  } catch (error) {
    console.error("Replicate error:", error);
    return NextResponse.json(
      { error: "Failed to generate art" },
      { status: 500 }
    );
  }
}
