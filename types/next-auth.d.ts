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
      
      // ✅ เพิ่ม 3 ตัวนี้ครับ
      title: string | null          // คำนำหน้า (นาย, ผศ. ดร.)
      curriculumId?: number | null  // ID สังกัดใหม่
      curriculumName?: string | null // ชื่อสังกัดใหม่
      
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
    
    // ✅ เพิ่มตรงนี้ด้วยเพื่อให้รับค่าจาก Database ได้
    title?: string | null
    curriculumId?: number | null 
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
    
    // ✅ เพิ่ม 3 ตัวนี้ให้ตรงกับ Session
    title?: string | null
    curriculumId?: number | null
    curriculumName?: string | null
    
    isImpersonating?: boolean
  }
}