import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { question } = await req.json();

  if (!question?.trim()) {
    return new Response("질문을 입력해주세요.", { status: 400 });
  }

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

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await geminiRes.json();

  if (!geminiRes.ok) {
    return new Response(
      `[Gemini오류] ${data.error?.message ?? JSON.stringify(data)}`,
      { status: 500 }
    );
  }

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    "응답을 생성할 수 없습니다.";

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
