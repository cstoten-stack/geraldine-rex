import OpenAI from "openai";
import { GERALDINE_INSTRUCTIONS } from "@/lib/geraldine";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.messages || !Array.isArray(body.messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions: GERALDINE_INSTRUCTIONS,
    input: body.messages.map((m: any) => ({
      role: m.role,
      content: [{ type: "input_text", text: m.content }],
    })),
  });

  return Response.json({
    reply: response.output_text ?? "",
  });
}
