import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { chatModel } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

  // 최신 청크 가져오기
  const { data: docs, error: dbError } = await supabase
    .from("rag_documents")
    .select("filename, content")
    .order("created_at", { ascending: false })
    .limit(8);

  if (dbError) {
    return new Response(`[DB오류] ${dbError.message}`, { status: 500 });
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

  let result;
  try {
    result = await chatModel.generateContentStream(prompt);
  } catch (e) {
    return new Response(`[Gemini오류] ${e instanceof Error ? e.message : e}`, { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
