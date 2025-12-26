// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

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
          
          // ใช้ ?? null เพื่อกัน undefined
          firstName: profile.given_name ?? null,
          lastName: profile.family_name ?? null,
          
          role: "USER",       // ค่า Default สำหรับคนมาใหม่
          department: null,   // ค่า Default
          image: null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      
      // ------------------------------------------------------------------
      // 1. กรณีมีการสั่ง Update (เช่น การกดปุ่ม "สวมรอย" จากหน้าบ้าน)
      // ------------------------------------------------------------------
      if (trigger === "update" && session?.impersonateId) {
        // ค้นหาข้อมูลของคนที่เราจะสวมรอย
        const targetUser = await prisma.user.findUnique({
          where: { id: session.impersonateId },
        });

        if (targetUser) {
          // แทนที่ข้อมูลใน Token ด้วยข้อมูลของคนที่เราสวมรอย
          token.id = targetUser.id;
          token.role = targetUser.role;
          token.department = targetUser.department;
          token.firstName = targetUser.firstName;
          token.lastName = targetUser.lastName;
          token.isImpersonating = true; // แปะป้ายว่าตอนนี้เป็นตัวปลอมนะ
        }
        return token;
      }

      // ------------------------------------------------------------------
      // 2. กรณี Login ครั้งแรก (User จริง login เข้ามา)
      // ------------------------------------------------------------------
      if (user) {
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
      if (session.user && token) {
        // Map ข้อมูลจาก Token กลับไปที่ Session เพื่อให้หน้าเว็บใช้
        session.user.id = token.id; 
        session.user.role = token.role;
        session.user.department = token.department;
        session.user.isImpersonating = token.isImpersonating;

        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        
        // จัดการชื่อแสดงผล
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
    error: "/",
  },
};