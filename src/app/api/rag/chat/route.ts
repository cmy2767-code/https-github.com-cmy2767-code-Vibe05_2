import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getEmbedding } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 30;

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { question, history = [] }: { question: string; history: HistoryMessage[] } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

  let docs: Array<{ filename: string; content: string }> | null = null;

  // 1순위: 의미 기반 벡터 검색
  const embedding = await getEmbedding(question);
  if (embedding) {
    const { data: vectorDocs } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: 6,
    });
    if (vectorDocs && vectorDocs.length > 0) {
      docs = vectorDocs;
    }
  }

  // 2순위: 키워드 검색 (임베딩 실패 또는 결과 없을 때)
  if (!docs || docs.length === 0) {
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
    // 긴 단어(구체적인 단어) 우선 정렬
    const keywords = Array.from(termSet).sort((a, b) => b.length - a.length).slice(0, 10);

    // 가장 구체적인 단어부터 단독 검색 → 결과 충분하면 바로 사용
    for (const keyword of keywords.slice(0, 3)) {
      if (keyword.length < 2) continue;
      const { data } = await supabase
        .from("rag_documents")
        .select("filename, content")
        .ilike("content", `%${keyword}%`)
        .limit(6);
      if (data && data.length >= 2) {
        docs = data;
        break;
      }
    }

    // 단독 검색 결과 부족하면 OR 합산 검색
    if (!docs || docs.length < 2) {
      const { data: keywordDocs } = await supabase
        .from("rag_documents")
        .select("filename, content")
        .or(keywords.map((k: string) => `content.ilike.%${k}%`).join(","))
        .limit(6);
      if (keywordDocs && keywordDocs.length > 0) {
        docs = keywordDocs;
      }
    }
  }

  // 3순위: 최신 청크 폴백
  if (!docs || docs.length === 0) {
    const { data: recentDocs, error: dbError } = await supabase
      .from("rag_documents")
      .select("filename, content")
      .order("created_at", { ascending: false })
      .limit(6);
    if (dbError) return new Response(`[DB오류] ${dbError.message}`, { status: 500 });
    docs = recentDocs;
  }

  if (!docs || docs.length === 0) {
    return new Response("업로드된 문서가 없습니다. 먼저 문서를 업로드해주세요.");
  }

  const context = docs
    .map((d) => `[출처: ${d.filename}]\n${d.content}`)
    .join("\n\n---\n\n");

  const systemPrompt = `당신은 업로드된 문서를 기반으로 질문에 답하는 AI 어시스턴트입니다.
아래 문서 내용을 참고하여 질문에 정확하고 친절하게 한국어로 답변해주세요.
문서에 없는 내용은 "문서에서 찾을 수 없습니다"라고 말해주세요.
이전 대화 내용도 참고하여 맥락에 맞게 답변하세요.

[문서 내용]
${context}`;

  // 시스템 프롬프트 + 이전 대화 + 현재 질문
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const text = json.choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // skip malformed lines
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
