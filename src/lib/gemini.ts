// Gemini SDK는 더 이상 사용하지 않음 (REST API 직접 호출)

export function chunkText(text: string, size = 600, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}
