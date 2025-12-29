import OpenAI, { toFile } from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const form = await req.formData();

  const image = form.get("image");
  const prompt = String(form.get("prompt") ?? "").trim();

  if (!image || !(image instanceof File)) {
    return new Response("Missing image", { status: 400 });
  }
  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const imgFile = await toFile(
    Buffer.from(await image.arrayBuffer()),
    image.name || "image.png",
    { type: image.type || "image/png" }
  );

  const rsp = await client.images.edit({
    model: "gpt-image-1",
    image: imgFile,
    prompt,
  });

  const b64 = rsp.data?.[0]?.b64_json;
  if (!b64) return new Response("No image returned", { status: 500 });

  return Response.json({ b64 });
}
