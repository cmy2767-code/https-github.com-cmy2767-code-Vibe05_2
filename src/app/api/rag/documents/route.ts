import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAdmin(req: NextRequest) {
  const cookie = req.cookies.get("admin_auth")?.value;
  return !!process.env.ADMIN_PASSWORD && cookie === btoa(process.env.ADMIN_PASSWORD);
}

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

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
  }

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
