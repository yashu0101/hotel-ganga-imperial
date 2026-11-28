// Reading a public endpoint's JSON body with a size cap. The cap counts the bytes actually received, so a chunked
// upload without a Content-Length header cannot get past it, and anything other than a JSON object is refused.
export type JsonBody = { ok: true; body: Record<string, unknown> } | { ok: false; status: 400 | 413; error: string };

export async function readJsonObject(req: Request, maxBytes: number): Promise<JsonBody> {
  const tooLarge = { ok: false, status: 413, error: "Request too large." } as const;
  if (Number(req.headers.get("content-length")) > maxBytes) return tooLarge;
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (req.body) {
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return tooLarge;
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (body && typeof body === "object" && !Array.isArray(body))
      return { ok: true, body: body as Record<string, unknown> };
  } catch {
    // Not JSON: answered below like any other unusable body.
  }
  return { ok: false, status: 400, error: "Invalid request." };
}
