import { NextResponse } from "next/server";
import { auth } from "./src/auth";

export default auth(async (req) => {
  if (!req.auth?.user) {
    const url = new URL("/", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/friends/:path*",
    "/my-bills/:path*",
    "/bill/:path*",
    "/settlement/:path*",
    "/combine-tickets/:path*",
    "/combined-settlement/:path*"
  ]
};
