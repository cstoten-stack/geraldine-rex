import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Strong guardrail: sky only, nothing else changes.
const HARD_RULE =
  "Edit ONLY the sky. Keep the entire property and everything below the roofline exactly unchanged. " +
  "Do not change cars, paving, garden, windows, doors, roof, brick colour, signage, bins, people, shadows, lighting, perspective, or any objects. " +
  "Treat the sky as a masked area and do not alter any other pixels. ";

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

    const buffer = Buffer.from(await image.arrayBuffer());

    const imgFile = await toFile(buffer, image.name || "image.jpg", {
      type: image.type || "image/jpeg",
    });

    const response = await client.images.edit({
      model: "gpt-image-1",
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
