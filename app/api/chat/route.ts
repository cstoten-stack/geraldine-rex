import OpenAI from "openai";
import { GERALDINE_INSTRUCTIONS } from "@/lib/geraldine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.messages || !Array.isArray(body.messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  const recordId = typeof body.record_id === "string" ? body.record_id : null;

  const inputMessages = [
    ...(recordId
      ? [
          {
            role: "user" as const,
            content: [
              {
                type: "input_text" as const,
                text: `Context: This request is being made from Rex. record_id=${recordId}. If useful, ask what record type it is (contact, property, listing) and what outcome is needed.`,
              },
            ],
          },
        ]
      : []),
    ...body.messages.map((m: any) => ({
      role: m.role,
      content: [{ type: "input_text", text: String(m.content ?? "") }],
    })),
  ];

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    instructions: GERALDINE_INSTRUCTIONS,
    input: inputMessages,
  });

  return Response.json({ reply: response.output_text ?? "" });
}
