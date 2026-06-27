import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

  // Extract keywords from question for relevant chunk search
  const keywords = question
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 1)
    .slice(0, 5);

  let docs: Array<{ filename: string; content: string }> | null = null;

  // Search for relevant chunks using keyword matching
  if (keywords.length > 0) {
    const { data: searchResults } = await supabase
      .from("rag_documents")
      .select("filename, content")
      .or(keywords.map((k: string) => `content.ilike.%${k}%`).join(","))
      .limit(6);

    if (searchResults && searchResults.length > 0) {
      docs = searchResults;
    }
  }

  // Fall back to most recent chunks if no keyword matches
  if (!docs || docs.length === 0) {
    const { data: recentDocs, error: dbError } = await supabase
      .from("rag_documents")
      .select("filename, content")
      .order("created_at", { ascending: false })
      .limit(8);

    if (dbError) {
      return new Response(`[DB오류] ${dbError.message}`, { status: 500 });
    }
    docs = recentDocs;
  }

  if (!docs || docs.length === 0) {
    return new Response("업로드된 문서가 없습니다. 먼저 문서를 업로드해주세요.");
  }

  const context = docs
    .map((d) => `[출처: ${d.filename}]\n${d.content}`)
    .join("\n\n---\n\n");

  const prompt = `당신은 업로드된 문서를 기반으로 질문에 답하는 AI 어시스턴트입니다.
아래 문서 내용을 참고하여 질문에 정확하고 친절하게 한국어로 답변해주세요.
문서에 없는 내용은 "문서에서 찾을 수 없습니다"라고 말해주세요.

[문서 내용]
${context}

[질문]
${question}`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    const data = await groqRes.json();
    return new Response(
      `[AI오류] ${data.error?.message ?? JSON.stringify(data)}`,
      { status: 500 }
    );
  }

  // Parse SSE stream from Groq and forward text tokens
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;

          try {
            const json = JSON.parse(payload);
            const text = json.choices?.[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
