// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  /**
   * 1. ขยาย Type ของ Session (สิ่งที่ใช้ใน component: useSession)
   */
  interface Session {
    user: {
      id: string
      role: string
      department: string | null
      firstName: string | null
      lastName: string | null
      isImpersonating?: boolean
    } & DefaultSession["user"]
  }

  /**
   * 2. ขยาย Type ของ User (สิ่งที่ได้จาก Provider หรือ Adapter)
   */
  interface User {
    id: string
    role: string
    department: string | null
    firstName: string | null
    lastName: string | null
    // ถ้าใน Database schema คุณมี field อื่นๆ อีก ให้มาเติมตรงนี้
    // เช่น adminTitle?: string | null
  }
}

declare module "next-auth/jwt" {
  /**
   * 3. ขยาย Type ของ JWT Token
   */
  interface JWT {
    id: string
    role: string
    department: string | null
    firstName: string | null
    lastName: string | null
    isImpersonating?: boolean
  }
}