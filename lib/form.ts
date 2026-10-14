// Enforce a streaming cap even when Content-Length is absent (chunked uploads).
export async function boundedForm(
  request: Request,
  maxBytes = 17 * 1024 * 1024,
) {
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new Error("הבקשה גדולה מדי");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("בקשה ריקה");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("הבקשה גדולה מדי");
    }
    chunks.push(value);
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") || "" },
    body: Buffer.concat(chunks),
  }).formData();
}
