import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

  // 한국어 조사/어미 제거 후 핵심 검색어 추출
  const particles = ["짜리", "에서", "으로", "에는", "부터", "까지", "처럼", "보다", "이라", "라는", "이란", "이고", "은?", "는?", "은", "는", "이", "가", "을", "를", "의", "에", "로", "과", "와", "도", "만"];

  const rawWords = question.trim().split(/\s+/).filter((w: string) => w.length > 1);
  const termSet = new Set<string>();

  for (const word of rawWords) {
    termSet.add(word);
    for (const p of particles) {
      if (word.endsWith(p) && word.length - p.length >= 1) {
        termSet.add(word.slice(0, word.length - p.length));
        break;
      }
    }
  }
  const keywords = Array.from(termSet).slice(0, 10);

  let docs: Array<{ filename: string; content: string }> | null = null;

  // 키워드로 관련 청크 검색 (토큰 한도 고려해 6개 제한)
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

  // 매칭 없으면 최신 청크로 폴백
  if (!docs || docs.length === 0) {
    const { data: recentDocs, error: dbError } = await supabase
      .from("rag_documents")
      .select("filename, content")
      .order("created_at", { ascending: false })
      .limit(6);

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
