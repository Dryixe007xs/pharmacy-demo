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
          image: null, // เริ่มต้นเป็น null ไปก่อน เดี๋ยวไปดึงจาก DB เอาชัวร์กว่า
        };
      },
    }),
  ],
  callbacks: {
    // 2. Check Database
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
      // ✅ 3. Impersonate Logic
      if (trigger === "update" && session?.impersonateId) {
        try {
          // ดึงข้อมูลเป้าหมาย พร้อมสังกัดใหม่
          const targetUser = await prisma.user.findUnique({
            where: { id: session.impersonateId },
            include: { 
                // ✅ ดึง Curriculum ใหม่มาด้วย
                curriculumRef: { select: { id: true, name: true } }
            }
          });

          if (targetUser) {
            console.log("🎭 Impersonating Target:", targetUser.email);
            
            token.id = targetUser.id;
            token.role = targetUser.role;
            token.department = targetUser.department; // อันเก่าเก็บไว้
            token.firstName = targetUser.firstName;
            token.lastName = targetUser.lastName;
            
            // ✅ ดึงคำนำหน้า (Title) ของเป้าหมาย
            token.title = targetUser.title;
            
            // ✅✅ เพิ่ม: ดึงรูปภาพของเป้าหมาย
            token.image = targetUser.image; 
            
            token.isImpersonating = true;
            
            // ✅ แปะสังกัดใหม่ใส่ Token
            token.curriculumId = targetUser.curriculumRef?.id || null;
            token.curriculumName = targetUser.curriculumRef?.name || null;
          }
        } catch (error) {
          console.error("❌ Error in impersonation:", error);
        }
        return token;
      }

      // ✅ 4. Normal Login
      if (user) {
        const dbUser = await prisma.user.findUnique({
             where: { email: user.email! },
             include: { 
                // ✅ ดึง Curriculum ใหม่มาด้วย
                curriculumRef: { select: { id: true, name: true } }
            }
        });
        
        if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.department = dbUser.department;
            token.firstName = dbUser.firstName;
            token.lastName = dbUser.lastName;
            
            // ✅ ดึงคำนำหน้า (Title) ของตัวเอง
            token.title = dbUser.title;

            // ✅✅ เพิ่ม: ดึงรูปภาพของตัวเองจาก DB
            token.image = dbUser.image; 
            
            // ✅ แปะสังกัดใหม่ใส่ Token
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
        
        // ส่ง title ไปด้วย (เผื่อใช้อย่างอื่น)
        session.user.title = token.title as string | null;

        // ✅✅ เพิ่ม: ส่งรูปลง Session (เพื่อให้ frontend เรียกใช้ session.user.image ได้)
        session.user.image = token.image as string | null;
        
        // ส่งสังกัดใหม่ไปหน้าบ้าน
        session.user.curriculumId = token.curriculumId as number | null; 
        session.user.curriculumName = token.curriculumName as string | null;

        // ✅ รวมร่างชื่อเต็ม (Title + First + Last)
        const nameParts = [
            token.title,     // เอาคำนำหน้ามาใส่ก่อน
            token.firstName, 
            token.lastName
        ].filter(Boolean); // กรองเอาเฉพาะตัวที่ไม่ว่าง (ไม่ null/undefined)

        if (nameParts.length > 0) {
          session.user.name = nameParts.join(" "); // เช่น "นาย วรวุฒิ คำมาบุตร"
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