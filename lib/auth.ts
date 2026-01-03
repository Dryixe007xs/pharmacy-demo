// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true, // เปิด debug เพื่อดู error ใน Vercel logs
  session: {
    strategy: "jwt",
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: { 
        params: { 
          scope: "openid profile email User.Read",
          prompt: "select_account" 
        } 
      },
      
      profile(profile) {
        console.log("✅ Azure AD Profile:", JSON.stringify(profile, null, 2));
        return {
          id: profile.sub,
          email: profile.email || profile.preferred_username || profile.upn,
          name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim(),
          firstName: profile.given_name ?? null,
          lastName: profile.family_name ?? null,
          role: "USER",
          department: null,
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      console.log("🔑 JWT Callback - Trigger:", trigger, "Has User:", !!user);

      if (trigger === "update" && session?.impersonateId) {
        try {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.impersonateId },
          });

          if (targetUser) {
            console.log("👤 Impersonating:", targetUser.email);
            token.id = targetUser.id;
            token.role = targetUser.role;
            token.department = targetUser.department;
            token.firstName = targetUser.firstName;
            token.lastName = targetUser.lastName;
            token.isImpersonating = true;
          }
        } catch (error) {
          console.error("❌ Error in impersonation:", error);
        }
        return token;
      }

      if (user) {
        console.log("👤 User Login:", user.email);
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.isImpersonating = false;
      }

      return token;
    },

    async session({ session, token }) {
      console.log("📝 Session Callback");
      
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string | null;
        session.user.isImpersonating = token.isImpersonating as boolean;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
        
        const nameParts = [token.firstName, token.lastName].filter(Boolean);
        if (nameParts.length > 0) {
          session.user.name = nameParts.join(" ");
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/error",
  },
};