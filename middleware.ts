import { NextResponse } from "next/server";
import { auth } from "./src/auth";
import { PROTECTED_PATHS } from "./src/lib/constants";

export default auth(async (req) => {
  const isProtected = PROTECTED_PATHS.some((path) => req.nextUrl.pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  if (!req.auth?.user) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
