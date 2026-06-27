import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  if (password !== process.env.TEAM_PASSWORD) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("team_auth", btoa(process.env.TEAM_PASSWORD), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
    sameSite: "lax",
  });

  return res;
}
