// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: { params: { prompt: "select_account" } }, 
      allowDangerousEmailAccountLinking: true, 
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email || profile.preferred_username || profile.upn, 
          name: profile.name || `${profile.given_name} ${profile.family_name}`,
          firstName: profile.given_name,
          lastName: profile.family_name,
          role: "USER",
          image: null,
          adminTitle: null,
          department: null,
          title: null,
          academicPosition: null,
          academicRank: null,
          workStatus: null,
          curriculum: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session) {
        return { ...token, ...session.user };
      }

      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
      }

      // ใน Next.js 15 cookies() ต้อง await
      const cookieStore = await cookies();
      const impersonateId = cookieStore.get("impersonateId")?.value;

      if (impersonateId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: impersonateId }
        });

        if (targetUser) {
          token.id = targetUser.id;
          token.role = targetUser.role; 
          token.department = targetUser.department;
          token.firstName = targetUser.firstName;
          token.lastName = targetUser.lastName;
          token.isImpersonating = true;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;       
        session.user.department = token.department as any;
        (session.user as any).isImpersonating = token.isImpersonating;

        const nameParts = [token.firstName, token.lastName].filter(Boolean);
        if (nameParts.length > 0) {
           session.user.name = nameParts.join(" ");
        }

        (session.user as any).firstName = token.firstName;
        (session.user as any).lastName = token.lastName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};