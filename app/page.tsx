"use client";

import { useEffect, useMemo, useState } from "react";

type ChatMsg = { role: "user" | "assistant"; content: string };

const DEFAULT_SKY_PROMPT =
  "Make the sky a soft seasonal blue with gentle cloud variation. Keep the property unchanged. No dramatic sunset unless already present. No HDR, heavy contrast, or oversaturation. Keep it believable for a local Hertfordshire buyer.";

export default function Page() {
  const isEmbedded =
    typeof window !== "undefined" && window.self !== window.top;

  const recordId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("record_id");
  }, []);

  /* ---------------- Chat state ---------------- */
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  /* ---------------- Image edit state ---------------- */
  const [file, setFile] = useState<File | null>(null);
  const [imgPrompt, setImgPrompt] = useState("");
  const [editing, setEditing] = useState(false);
  const [resultB64, setResultB64] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  useEffect(() => {
    setResultB64(null);
    setImgError(null);
  }, [file]);

  /* ---------------- Chat ---------------- */
  async function sendChat() {
    setChatError(null);

    const text = input.trim();
    if (!text) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, record_id: recordId }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Chat request failed");
      }

      const data = (await res.json()) as { reply?: string };
      setMessages([...next, { role: "assistant", content: data.reply ?? "" }]);
    } catch (e: any) {
      setChatError(e?.message ?? "Chat failed");
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "Sorry, something went wrong on my side. Can you try again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  /* ---------------- Image edit ---------------- */
  async function editImage() {
    setImgError(null);
    setResultB64(null);

    if (!file) {
      setImgError("Please choose an image first.");
      return;
    }

    const finalPrompt = imgPrompt.trim() || DEFAULT_SKY_PROMPT;

    setEditing(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("prompt", finalPrompt);
      if (recordId) fd.append("record_id", recordId);

      const res = await fetch("/api/image-edit", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Image edit failed");
      }

      const data = (await res.json()) as { b64?: string };
      if (!data.b64) throw new Error("No image returned from server");

      setResultB64(data.b64);
    } catch (e: any) {
      setImgError(e?.message ?? "Image edit failed");
    } finally {
      setEditing(false);
    }
  }

  return (
    <main
      style={{
        padding: isEmbedded ? 8 : 16,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        maxWidth: 980,
        margin: "0 auto",
      }}
    >
      <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>Geraldine</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {/* ---------------- Chat panel ---------------- */}
        <section
          style={{
            flex: "1 1 460px",
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Chat</h2>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 10,
              height: 360,
              overflowY: "auto",
              background: "#fff",
            }}
          >
            {messages.length === 0 ? (
              <p style={{ opacity: 0.7 }}>
                Ask for a client ready email, listing copy, blog outline, or
                marketing advice.
              </p>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.6,
                      fontWeight: 600,
                    }}
                  >
                    {m.role}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))
            )}
          </div>

          {chatError && (
            <div style={{ marginTop: 8, color: "#b00020", fontSize: 13 }}>
              {chatError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Geraldine…"
              style={{
                flex: 1,
                height: 70,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
                resize: "vertical",
              }}
              disabled={sending}
            />
            <button
              onClick={sendChat}
              disabled={sending || !input.trim()}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                height: 44,
                alignSelf: "flex-start",
              }}
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </section>

        {/* ---------------- Image editing panel ---------------- */}
        <section
          style={{
            flex: "1 1 460px",
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Image editing</h2>
          <p style={{ marginTop: 0, opacity: 0.7 }}>
            Upload a property photo and click Edit image. If no prompt is
            entered, a default seasonal blue sky edit will be applied.
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !imgPrompt.trim()) {
                  setImgPrompt(DEFAULT_SKY_PROMPT);
                }
              }}
            />

            <textarea
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              placeholder={DEFAULT_SKY_PROMPT}
              style={{
                width: "100%",
                height: 90,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
                resize: "vertical",
              }}
            />

            <button
              onClick={editImage}
              disabled={editing || !file}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                cursor: "pointer",
                height: 44,
                width: 140,
              }}
            >
              {editing ? "Editing…" : "Edit image"}
            </button>

            {imgError && (
              <div style={{ color: "#b00020", fontSize: 13 }}>{imgError}</div>
            )}

            {resultB64 && (
              <div style={{ marginTop: 6 }}>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  Result
                </div>
                <img
                  src={`data:image/png;base64,${resultB64}`}
                  alt="Edited property image"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid #eee",
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
