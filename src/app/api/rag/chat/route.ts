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

  // 현재 질문이 너무 짧으면 (2글자 이하) 대화 히스토리에서 맥락 보완
  const searchQuery = question.trim().length <= 4 && history.length > 0
    ? history.filter((m) => m.role === "user").slice(-1)[0]?.content + " " + question.trim()
    : question.trim();

  // 1순위: 의미 기반 벡터 검색
  const embedding = await getEmbedding(searchQuery);
  if (embedding) {
    const { data: vectorDocs } = await supabase.rpc("match_documents", {
      query_embedding: embedding,
      match_count: 10,
    });
    if (vectorDocs && vectorDocs.length > 0) {
      docs = vectorDocs;
    }
  }

  // 2순위: 키워드 검색 (임베딩 실패 또는 결과 없을 때)
  if (!docs || docs.length === 0) {
    const particles = ["짜리", "에서", "으로", "에는", "부터", "까지", "처럼", "보다", "이라", "라는", "이란", "이고", "은?", "는?", "은", "는", "이", "가", "을", "를", "의", "에", "로", "과", "와", "도", "만"];
    const rawWords = searchQuery.trim().split(/\s+/).filter((w: string) => w.length > 1);
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
        .limit(10);
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
        .limit(10);
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
      .limit(10);
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

규칙:
1. 아래 [문서 내용]을 꼼꼼히 읽고, 질문과 관련된 내용을 찾아 정확하게 한국어로 답변하세요.
2. 문서에서 찾은 내용을 그대로 인용하거나 요약하여 답변하세요. 절대 추측하거나 문서에 없는 내용을 만들어내지 마세요.
3. 문서에 관련 내용이 일부라도 있으면 그 내용을 바탕으로 최선을 다해 답변하세요.
4. 정말로 관련 내용이 없는 경우에만 "업로드된 문서에서 해당 내용을 찾을 수 없습니다."라고 말하세요.
5. 답변은 자연스러운 한국어 문장으로 작성하고, 목록이 있으면 줄바꿈으로 구분하세요.
6. 이전 대화 내용도 참고하여 맥락에 맞게 답변하세요.

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
      temperature: 0.1,
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
