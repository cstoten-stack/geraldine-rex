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

const MAX_BYTES = 4 * 1024 * 1024; // 4MB dall-e-2 limit

async function toPngUnder4MB(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();

  let width = meta.width ?? 2000;
  width = Math.min(width, 1600);

  for (let i = 0; i < 6; i++) {
    const png = await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .ensureAlpha() // force RGBA
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
      })
      .toBuffer();

    if (png.length <= MAX_BYTES) return png;

    width = Math.floor(width * 0.85);
  }

  return sharp(input)
    .resize({ width: 900, withoutEnlargement: true })
    .ensureAlpha()
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

    const pngBuffer = await toPngUnder4MB(inputBuffer);

    const imgFile = await toFile(pngBuffer, "image.png", {
      type: "image/png",
    });

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
