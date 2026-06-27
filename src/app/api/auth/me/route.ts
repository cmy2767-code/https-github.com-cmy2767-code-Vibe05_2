import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const adminCookie = req.cookies.get("admin_auth")?.value;
  const expected = btoa(process.env.ADMIN_PASSWORD ?? "");
  const isAdmin = !!process.env.ADMIN_PASSWORD && adminCookie === expected;
  return NextResponse.json({ isAdmin });
}
