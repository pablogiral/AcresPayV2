import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const providers: NonNullable<NextAuthConfig["providers"]> = [
  Credentials({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const existing = await db.query.users.findFirst({
        where: eq(users.email, String(credentials.email))
      });

      if (!existing?.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(String(credentials.password), existing.passwordHash);
      if (!isValid) {
        return null;
      }

      return {
        id: existing.id,
        email: existing.email,
        name: existing.name,
        image: existing.image
      };
    }
  })
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(Google);
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.unshift(GitHub);
}

export const authConfig = {
  adapter: DrizzleAdapter(db),
  pages: {
    signIn: "/"
  },
  session: {
    strategy: "database"
  },
  providers,
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  },
  events: {
    async linkAccount({ user }) {
      if (!user.id) {
        return;
      }

      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }
  }
} satisfies NextAuthConfig;
