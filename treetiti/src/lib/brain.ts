const BRAIN_URL = "http://localhost:8000/api/chat"

export async function askBrain(message: string): Promise<string | null> {
  try {
    const res = await fetch(BRAIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context: "" }),
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { reply?: string }
    const reply = typeof data.reply === "string" ? data.reply.trim() : ""
    return reply.length > 0 ? reply : null
  } catch {
    return null
  }
}
