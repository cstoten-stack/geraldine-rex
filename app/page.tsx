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
const [file, setFile] = useState<File | null>(null);
const [imgPrompt, setImgPrompt] = useState("");
const [resultB64, setResultB64] = useState<string | null>(null);
const [editing, setEditing] = useState(false);

async function editImage() {
  if (!file || !imgPrompt.trim()) return;
  setEditing(true);
  setResultB64(null);

  const fd = new FormData();
  fd.append("image", file);
  fd.append("prompt", imgPrompt);

  const res = await fetch("/api/image-edit", { method: "POST", body: fd });
  const data = await res.json();
  setResultB64(data.b64);
  setEditing(false);
}
<h2 style={{ marginTop: 20 }}>Image editing</h2>

<input
  type="file"
  accept="image/*"
  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
/>

<textarea
  value={imgPrompt}
  onChange={(e) => setImgPrompt(e.target.value)}
  placeholder="eg Make the sky a soft seasonal blue with gentle cloud cover. Keep the house unchanged."
  style={{ width: "100%", height: 80, marginTop: 8 }}
/>

<button
  onClick={editImage}
  disabled={editing || !file || !imgPrompt.trim()}
  style={{ marginTop: 8 }}
>
  {editing ? "Editing…" : "Edit image"}
</button>

{resultB64 ? (
  <div style={{ marginTop: 10 }}>
    <img
      src={`data:image/png;base64,${resultB64}`}
      style={{ width: "100%", border: "1px solid #ddd" }}
    />
  </div>
) : null}

