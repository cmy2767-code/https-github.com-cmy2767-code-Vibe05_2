import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

export const chatModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export async function getEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
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
