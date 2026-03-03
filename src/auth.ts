import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/options";

const configuredAuthUrl =
  process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;

if (!process.env.AUTH_SECRET && process.env.NODE_ENV !== "production") {
  process.env.AUTH_SECRET = "acrespay-local-dev-secret";
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

if (configuredAuthUrl) {
  const normalizedAuthUrl = configuredAuthUrl.startsWith("http")
    ? configuredAuthUrl
    : `https://${configuredAuthUrl}`;

  process.env.AUTH_URL = normalizedAuthUrl;
  process.env.NEXTAUTH_URL = normalizedAuthUrl;
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
