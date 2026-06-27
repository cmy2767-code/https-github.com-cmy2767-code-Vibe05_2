import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get("team_auth")?.value;
  const expected = btoa(process.env.TEAM_PASSWORD ?? "");

  if (!cookie || cookie !== expected) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("로그인이 필요합니다.", { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/rag/:path*", "/api/rag/:path*"],
};
