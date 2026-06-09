import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;
        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        // Parents log in with their email.
        const user = await prisma.user.findUnique({
          where: { email: identifier },
          include: { household: true },
        });
        if (user) {
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            householdId: user.householdId,
            householdName: user.household.name,
          };
        }

        // Kids log in with their username and land in their own kid mode.
        const child = await prisma.childProfile.findUnique({
          where: { username: identifier },
          include: { household: true },
        });
        if (child?.passwordHash) {
          const valid = await bcrypt.compare(password, child.passwordHash);
          if (!valid) return null;
          return {
            id: child.id,
            role: "CHILD",
            householdId: child.householdId,
            householdName: child.household.name,
            childProfileId: child.id,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.householdId = (user as { householdId: string }).householdId;
        token.householdName = (user as { householdName: string }).householdName;
        token.childProfileId = (user as { childProfileId?: string }).childProfileId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.householdId = token.householdId as string;
      session.user.householdName = token.householdName as string;
      session.user.childProfileId = token.childProfileId as string | undefined;
      return session;
    },
  },
});
