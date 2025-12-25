import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers"; // ✅ 1. เพิ่ม import นี้

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

      // สั่งให้ Microsoft ถามบัญชีทุกครั้ง
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

      // 1. ข้อมูลเริ่มต้น (จาก Login ปกติ)
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
      }

      // 🔥 2. LOGIC สวมรอย (สำคัญที่สุด) 🔥
      // เช็คว่ามี Cookie สั่งให้สวมรอยไหม?
      const cookieStore = await cookies();
      const impersonateId = cookieStore.get("impersonateId")?.value;

      if (impersonateId) {
         // ถ้ามี -> ไปดึงข้อมูลคนนั้นมาจาก DB สดๆ เลย
         const targetUser = await prisma.user.findUnique({
             where: { id: impersonateId }
         });

         if (targetUser) {
             console.log(`🕵️‍♂️ DEBUG MODE: Swapping session to ${targetUser.firstName}`);
             
             // สับเปลี่ยนข้อมูลใน Token เป็นของคนนั้นซะ!
             token.id = targetUser.id;
             token.role = targetUser.role; 
             token.department = targetUser.department;
             token.firstName = targetUser.firstName;
             token.lastName = targetUser.lastName;
             
             // แปะป้ายไว้หน่อยว่ากำลังสวมรอย
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
        
        // เพิ่ม Flag ลง Session ให้หน้าเว็บรู้
        (session.user as any).isImpersonating = token.isImpersonating;

        // จัดการเรื่องชื่อ (เอาอันล่าสุดที่เราแก้กันไว้)
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };