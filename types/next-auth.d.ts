// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * ขยาย type ของ Session (สิ่งที่ใช้ในหน้าเว็บ)
   */
  interface Session {
    user: {
      id: string
      role: string       // หรือใส่เป็น Enum Role ก็ได้ถ้า import มา
      department: string | null
    } & DefaultSession["user"]
  }

  /**
   * ขยาย type ของ User (สิ่งที่ดึงมาจาก Database)
   */
  interface User {
    id: string
    role: string
    department: string | null
  }
}