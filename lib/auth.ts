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
      
      // ✅ 1. อนุญาตให้ Link บัญชีอัตโนมัติ (แก้ปัญหาพี่บุคลากรเข้าไม่ได้)
      allowDangerousEmailAccountLinking: true, 
      
      authorization: { 
        params: { 
          scope: "openid profile email", // ✅ ใช้ Scope แค่นี้พอ ไม่ติด Admin
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
    // ✅ 2. ด่านตรวจคนเข้าเมือง: เช็คว่ามีอีเมลใน DB ไหม?
    async signIn({ user }) {
      if (!user.email) return false;

      // ค้นหา User ใน Database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        return true; // ✅ มีชื่อ -> ให้เข้าได้ (และระบบจะ Link ID ให้เอง)
      } else {
        console.log(`🚫 Access Denied: ${user.email} is not in database.`);
        return false; // ❌ ไม่มีชื่อ -> ห้ามเข้า
      }
    },

    async jwt({ token, user, trigger, session }) {
      // ✅ 3. ระบบสวมรอย (Impersonate) - ใส่คืนมาให้แล้วครับ
      if (trigger === "update" && session?.impersonateId) {
        try {
          const targetUser = await prisma.user.findUnique({
            where: { id: session.impersonateId },
          });

          if (targetUser) {
            console.log("🎭 Impersonating Target:", targetUser.email);
            // เปลี่ยนข้อมูลใน Token เป็นของเป้าหมาย
            token.id = targetUser.id;
            token.role = targetUser.role;
            token.department = targetUser.department;
            token.firstName = targetUser.firstName;
            token.lastName = targetUser.lastName;
            token.isImpersonating = true; // แปะป้ายว่ากำลังสวมรอย
          }
        } catch (error) {
          console.error("❌ Error in impersonation:", error);
        }
        return token; // ส่ง Token ที่สวมรอยแล้วกลับไปทันที
      }

      // ✅ 4. การ Login ปกติ (ถ้าไม่ได้สวมรอย)
      if (user) {
        // อัปเดตข้อมูลให้ตรงกับ DB ล่าสุดเสมอ
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
        token.isImpersonating = false; // Reset สถานะสวมรอย
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
    error: "/auth/error", 
  },
};