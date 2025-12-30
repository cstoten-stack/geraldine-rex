import OpenAI from "openai";
import { GERALDINE_INSTRUCTIONS } from "@/lib/geraldine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body?.messages)) {
      return new Response("Invalid messages payload", { status: 400 });
    }

    const recordId =
      typeof body.record_id === "string" ? body.record_id : null;

    // Build a single system context block
    const systemContext = recordId
      ? `${GERALDINE_INSTRUCTIONS}

Additional context:
This conversation is happening inside Rex.
record_id=${recordId}.
Use this context only if relevant.`
      : GERALDINE_INSTRUCTIONS;

    // Pass conversation exactly as-is
    const input = body.messages.map((m: any) => ({
      role: m.role,
      content: [
        {
          type: "input_text",
          text: String(m.content ?? ""),
        },
      ],
    }));

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: systemContext,
      input,
    });

    return Response.json({
      reply: response.output_text ?? "",
    });
  } catch (err: any) {
    console.error("CHAT ERROR", err);
    return new Response(
      "Chat request failed",
      { status: 500 }
    );
  }
}
