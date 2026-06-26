import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("rag_documents")
    .select("filename, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unique = Array.from(
    new Map(data.map((d) => [d.filename, d])).values()
  );

  return NextResponse.json(unique);
}

export async function DELETE(req: Request) {
  const { filename } = await req.json();
  const { error } = await supabase
    .from("rag_documents")
    .delete()
    .eq("filename", filename);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
