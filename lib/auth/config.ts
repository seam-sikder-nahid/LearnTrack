import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { githubConnections, userSettings } from "@/lib/db/schema";

/**
 * §5 Authentication.
 *
 * - GitHub OAuth is the only sign-in method (the app IS the GitHub
 *   integration; there is no separate "learning" identity to manage).
 * - Scope is `read:user repo` — `repo` is required to create/read/write
 *   files in the user's chosen repository (§11/§12). We do not request
 *   broader scopes (e.g. `admin:org`, `delete_repo`).
 * - The OAuth access token is persisted server-side only, in the `accounts`
 *   table managed by the Drizzle adapter, and is only ever read through
 *   `lib/github/token.ts` (never returned from `auth()` to a client
 *   component — see the `session` callback below, which deliberately does
 *   NOT attach the token to the session object).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      // Deliberately minimal: id + github username only. No tokens, no
      // internal DB ids beyond what the UI needs to render.
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user, profile, isNewUser }) {
      if (!user.id) return;
      if (isNewUser) {
        await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();
      }
      const githubProfile = profile as { id?: number; login?: string } | undefined;
      if (githubProfile?.id && githubProfile.login) {
        await db
          .insert(githubConnections)
          .values({
            userId: user.id,
            githubUserId: String(githubProfile.id),
            githubUsername: githubProfile.login,
          })
          .onConflictDoUpdate({
            target: githubConnections.userId,
            set: { githubUsername: githubProfile.login },
          });
        await db
          .update(users)
          .set({ githubUsername: githubProfile.login })
          .where(eq(users.id, user.id));
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
