import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const teamPw = process.env.TEAM_PASSWORD;
  const adminPw = process.env.ADMIN_PASSWORD;

  if (!teamPw) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const isAdmin = adminPw && password === adminPw;
  const isTeam = password === teamPw;

  if (!isAdmin && !isTeam) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
    sameSite: "lax" as const,
  };

  const res = NextResponse.json({ ok: true, isAdmin: !!isAdmin });
  res.cookies.set("team_auth", btoa(teamPw), cookieOptions);

  if (isAdmin && adminPw) {
    res.cookies.set("admin_auth", btoa(adminPw), cookieOptions);
  }

  return res;
}
