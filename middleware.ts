import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// กำหนดหน้าเว็บที่ "คนทั่วไป" เข้าได้ (ไม่ต้อง Login)
// นอกเหนือจากนี้ จะต้อง Login ด้วย Microsoft เท่านั้น
const PUBLIC_ROUTES = ['/', '/auth/login']; 

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ปล่อยผ่านไฟล์ระบบ และ API ของ NextAuth (สำคัญมาก ห้ามลบ)
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') ||
    pathname.startsWith('/api/auth') // ปล่อยให้ Microsoft Callback ทำงาน
  ) {
    return NextResponse.next();
  }

  // 2. ตรวจสอบสถานะการ Login (เช็ค Token ของ NextAuth เท่านั้น)
  // ใช้ Cookies เบื้องต้นในการเช็คที่ Middleware
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value;

  const isAuthenticated = !!sessionToken;

  // 3. จัดการการเข้าถึงหน้าเว็บ
  
  // กรณี: เข้าหน้าที่เป็น Public (เช่น หน้า Welcome)
  if (PUBLIC_ROUTES.includes(pathname)) {
    // ถ้า Login อยู่แล้ว -> ดีดไปหน้า Dashboard เลย (ไม่ต้องดูหน้า Welcome ซ้ำ)
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // ถ้ายังไม่ Login -> ปล่อยให้ดูหน้า Welcome ได้
    return NextResponse.next();
  }

  // กรณี: เข้าหน้าที่ต้อง Login (Protected Routes เช่น Dashboard)
  if (!isAuthenticated) {
    // ถ้าไม่มี Token -> ดีดกลับไปหน้าแรก (Welcome Page) ให้ไปกดปุ่ม Login
    return NextResponse.redirect(new URL('/', request.url));
  }

  // อนุญาตให้ผ่าน
  return NextResponse.next();
}

// Config Matcher
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};