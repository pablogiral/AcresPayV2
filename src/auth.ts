import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/options";

const configuredAuthUrl =
  process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;

if (configuredAuthUrl) {
  const normalizedAuthUrl = configuredAuthUrl.startsWith("http")
    ? configuredAuthUrl
    : `https://${configuredAuthUrl}`;

  process.env.AUTH_URL = normalizedAuthUrl;
  process.env.NEXTAUTH_URL = normalizedAuthUrl;
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
