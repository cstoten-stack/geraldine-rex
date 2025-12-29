"use client";

import { useState } from "react";

export default function Page() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;

    const isEmbedded =
  typeof window !== "undefined" && window.self !== window.top;

    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });

    const data = await res.json();
    setMessages([...next, { role: "assistant", content: data.reply }]);
  }

  return (
    <main
  style={{
    padding: isEmbedded ? 8 : 16,
    fontFamily: "system-ui",
  }}
>

      <h1>Geraldine</h1>

      <div
        style={{
          border: "1px solid #ddd",
          padding: 12,
          height: 360,
          overflowY: "auto",
          marginBottom: 12,
        }}
      >
        {messages.map((m, i) => (
          <p key={i}>
            <strong>{m.role}:</strong> {m.content}
          </p>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask Geraldine…"
        style={{ width: "100%", height: 80 }}
      />

      <button onClick={send} style={{ marginTop: 8 }}>
        Send
      </button>
    </main>
  );
}
const recordId =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("record_id")
    : null;
body: JSON.stringify({ messages: next, record_id: recordId }),

