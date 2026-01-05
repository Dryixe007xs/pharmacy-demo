// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      
      // ✅ จุดที่ 1: อนุญาตให้เชื่อมอีเมลที่ซ้ำกันได้เลย (ไม่ต้องลบ User เก่า)
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
    // ✅ จุดที่ 2: ฟังก์ชันเช็คประตูหน้าบ้าน (signIn)
    async signIn({ user, account, profile }) {
      // ถ้าไม่มีอีเมลมาเลย ให้ดีดออก
      if (!user.email) return false;

      // ค้นหาใน Database ว่ามีอีเมลนี้รออยู่แล้วหรือยัง?
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        // ✅ มีชื่อในบัญชีหนังหมา (ใน DB) -> อนุญาตให้เข้าได้ 
        // (ระบบจะทำการ Link กับ Microsoft ให้เอง เพราะเราเปิด allowDangerous... ไว้)
        return true; 
      } else {
        // ❌ ไม่มีชื่อใน DB -> ห้ามเข้า และห้ามสร้างใหม่
        console.log(`🚫 Access Denied: ${user.email} is not in database.`);
        return false; 
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.impersonateId) {
         // ... (Logic เดิมของคุณ)
         // ใส่โค้ดส่วน Impersonate เดิมกลับมาตรงนี้ได้เลยครับ
      }

      if (user) {
        // อัปเดตข้อมูลลง Token (ดึงจาก DB ล่าสุดเสมอเพื่อความชัวร์)
        const dbUser = await prisma.user.findUnique({
             where: { email: user.email! }
        });
        
        if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.department = dbUser.department;
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
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
    error: "/auth/error", // แนะนำให้สร้างหน้านี้ไว้บอก User ว่า "คุณไม่มีสิทธิ์ใช้งาน"
  },
};