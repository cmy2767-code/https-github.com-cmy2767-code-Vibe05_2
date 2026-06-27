import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
  );
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
  const names = (data.models ?? []).map((m: { name: string }) => m.name);
  return NextResponse.json(names);
}
