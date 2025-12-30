import OpenAI from "openai";
import { GERALDINE_INSTRUCTIONS } from "@/lib/geraldine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body?.messages)) {
      return new Response("Invalid messages payload", { status: 400 });
    }

    const recordId =
      typeof body.record_id === "string" ? body.record_id : null;

    const instructions = recordId
      ? `${GERALDINE_INSTRUCTIONS}\n\nAdditional context: This is inside Rex. record_id=${recordId}. Use only if relevant.`
      : GERALDINE_INSTRUCTIONS;

    const input: ChatMsg[] = body.messages.map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? ""),
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input,
    });

    return Response.json({ reply: response.output_text ?? "" });
  } catch (err: any) {
    console.error("CHAT ERROR", err);
    return new Response(
      err?.message || "Chat request failed",
      { status: 500 }
    );
  }
}
