import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const expireOptions = { httpOnly: true, maxAge: 0, path: "/" };
  res.cookies.set("team_auth", "", expireOptions);
  res.cookies.set("admin_auth", "", expireOptions);
  return res;
}
