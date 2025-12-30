import OpenAI, { toFile } from "openai";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HARD_RULE =
  "Edit ONLY the sky. Keep the entire property and everything below the roofline exactly unchanged. " +
  "Do not change cars, paving, garden, windows, doors, roof, brick colour, signage, bins, people, shadows, lighting, perspective, or any objects. " +
  "Treat the sky as a masked area and do not alter any other pixels. ";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB (dall-e-2 limit)

// Convert any image to a PNG under 4MB by resizing + compressing.
async function toPngUnder4MB(input: Buffer): Promise<Buffer> {
  // Read metadata first
  const meta = await sharp(input).metadata();

  // Start with original size, but cap very large images
  let width = meta.width ?? 2000;

  // A sensible initial cap for property photos
  width = Math.min(width, 1600);

  // Try a few passes: shrink width until under the limit
  for (let i = 0; i < 6; i++) {
    const png = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true, // often reduces size a lot for skies/walls
      })
      .toBuffer();

    if (png.length <= MAX_BYTES) return png;

    // Reduce width and try again
    width = Math.floor(width * 0.85);
  }

  // Final attempt: more aggressive shrink
  return sharp(input)
    .resize({ width: 900, withoutEnlargement: true })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
    })
    .toBuffer();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const image = form.get("image");
    const userPrompt = String(form.get("prompt") ?? "").trim();

    if (!image || !(image instanceof File)) {
      return new Response("Missing or invalid image file", { status: 400 });
    }

    if (!userPrompt) {
      return new Response("Missing prompt", { status: 400 });
    }

    const finalPrompt = HARD_RULE + userPrompt;

    const inputBuffer = Buffer.from(await image.arrayBuffer());

    // Convert to a compliant PNG for dall-e-2
    const pngBuffer = await toPngUnder4MB(inputBuffer);

    const imgFile = await toFile(pngBuffer, "image.png", { type: "image/png" });

    const response = await client.images.edit({
      model: "dall-e-2",
      image: imgFile,
      prompt: finalPrompt,
    });

    const b64 = response.data?.[0]?.b64_json;

    if (!b64) {
      console.error("OpenAI response had no image", response);
      return new Response("No image returned from OpenAI", { status: 500 });
    }

    return Response.json({ b64 });
  } catch (err: any) {
    console.error("IMAGE EDIT ERROR", err);
    return new Response(err?.message || "Image edit failed on server", {
      status: 500,
    });
  }
}
