import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getEmbedding, chatModel } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

  const embedding = await getEmbedding(question);

  const { data: docs, error } = await supabase.rpc("match_documents", {
    query_embedding: JSON.stringify(embedding),
    match_count: 5,
  });

  if (error) {
    return new Response(`검색 오류: ${error.message}`, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    return new Response(
      "업로드된 문서가 없습니다. 먼저 문서를 업로드해주세요.",
      { status: 200 }
    );
  }

  const context = docs
    .map((d: { filename: string; content: string }, i: number) =>
      `[출처: ${d.filename}]\n${d.content}`
    )
    .join("\n\n---\n\n");

  const prompt = `당신은 업로드된 문서를 기반으로 질문에 답하는 AI 어시스턴트입니다.
아래 문서 내용을 참고하여 질문에 정확하고 친절하게 답변해주세요.
문서에 없는 내용은 "문서에서 찾을 수 없습니다"라고 말해주세요.

[문서 내용]
${context}

[질문]
${question}`;

  const result = await chatModel.generateContentStream(prompt);

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          controller.enqueue(new TextEncoder().encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
