import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const chatModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "임베딩 실패");
  return data.embedding.values;
}

export function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks.filter((c) => c.trim().length > 0);
}
