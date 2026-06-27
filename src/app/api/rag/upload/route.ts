import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { extractText } from "@/lib/document-parser";
import { chunkText } from "@/lib/gemini";
import { getEmbeddings } from "@/lib/embeddings";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    try {
      text = await extractText(buffer, file.name);
    } catch (e) {
      return NextResponse.json({ error: `[텍스트추출 실패] ${e instanceof Error ? e.message : e}` }, { status: 500 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "파일에서 텍스트를 추출할 수 없습니다." }, { status: 400 });
    }

    const chunks = chunkText(text);

    // 임베딩 생성 (HF_API_KEY 없으면 null로 저장 후 키워드 검색으로 폴백)
    const embeddings = await getEmbeddings(chunks);

    const rows = chunks.map((content, i) => ({
      filename: file.name,
      content,
      chunk_index: i,
      embedding: embeddings[i] ?? null,
    }));

    const { error } = await supabase.from("rag_documents").insert(rows);
    if (error) return NextResponse.json({ error: `[Supabase 오류] ${error.message}` }, { status: 500 });

    const hasEmbeddings = embeddings.some((e) => e !== null);
    return NextResponse.json({ filename: file.name, chunks: chunks.length, semantic: hasEmbeddings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
