// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Import มาจากไฟล์ที่เราแยกไว้

const handler = NextAuth(authOptions);

// ห้าม export authOptions ตรงนี้เด็ดขาด
export { handler as GET, handler as POST };