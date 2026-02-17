// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: false,
  session: {
    strategy: "jwt",
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      
      allowDangerousEmailAccountLinking: true, 
      
      authorization: { 
        params: { 
          scope: "openid profile email", 
          prompt: "select_account" 
        } 
      },
      
      profile(profile) {
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
    async signIn({ user }) {
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        return true; 
      } else {
        console.log(`🚫 Access Denied: ${user.email} is not in database.`);
        return false; 
      }
    },

    async jwt({ token, user, trigger, session }) {
      // ✅ Impersonate Logic — ทำงานเหมือนเดิมทุกอย่าง
      if (trigger === "update" && session?.impersonateId) {
        try {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.impersonateId },
            include: { 
              curriculumRef: { select: { id: true, name: true } }
            }
          });

          if (targetUser) {
            console.log("🎭 Impersonating Target:", targetUser.email);
            token.id = targetUser.id;
            token.role = targetUser.role;
            token.department = targetUser.department;
            token.firstName = targetUser.firstName;
            token.lastName = targetUser.lastName;
            token.title = targetUser.title;
            token.image = targetUser.image; 
            token.isImpersonating = true;
            token.curriculumId = targetUser.curriculumRef?.id || null;
            token.curriculumName = targetUser.curriculumRef?.name || null;
          }
        } catch (error) {
          console.error("❌ Error in impersonation:", error);
        }
        return token;
      }

      // ✅ ถ้า token มีข้อมูลครบแล้ว (request ปกติหลัง login) — return เลย ไม่ query DB
      if (!user && token.id) {
        return token;
      }

      // ✅ Normal Login — query DB แค่ครั้งแรกครั้งเดียว
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { 
            curriculumRef: { select: { id: true, name: true } }
          }
        });
        
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.department = dbUser.department;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.title = dbUser.title;
          token.image = dbUser.image; 
          token.curriculumId = dbUser.curriculumRef?.id || null;
          token.curriculumName = dbUser.curriculumRef?.name || null;
        }
        token.isImpersonating = false; 
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string | null;
        session.user.isImpersonating = token.isImpersonating as boolean;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
        session.user.title = token.title as string | null;
        session.user.image = token.image as string | null;
        session.user.curriculumId = token.curriculumId as number | null; 
        session.user.curriculumName = token.curriculumName as string | null;

        const nameParts = [
          token.title,
          token.firstName, 
          token.lastName
        ].filter(Boolean);

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