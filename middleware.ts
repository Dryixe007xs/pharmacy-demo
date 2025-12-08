import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Secret Key ต้องตรงกับที่ใช้ใน API Login/Register
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

// หน้าที่ "ไม่ต้อง" Login ก็เข้าได้
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/register'];

// API ที่ "ไม่ต้อง" Login ก็เรียกได้
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ----------------------------------------------------
    // 1. ปล่อยผ่านไฟล์ Static และไฟล์ระบบของ Next.js ทันที
    // ----------------------------------------------------
    if (
        pathname.startsWith('/_next') || 
        pathname.startsWith('/static') || 
        pathname.includes('.') // ไฟล์ที่มีนามสกุล (รูปภาพ, css, ฯลฯ)
    ) {
        return NextResponse.next();
    }

    // ----------------------------------------------------
    // 2. ปล่อยผ่าน Public API
    // ----------------------------------------------------
    if (PUBLIC_API_ROUTES.includes(pathname)) {
        return NextResponse.next();
    }

    // อ่าน Token จาก Cookie (ใช้ชื่อ auth_token ตามที่เราตั้งใน API ล่าสุด)
    const token = request.cookies.get('auth_token')?.value;

    // ----------------------------------------------------
    // 3. จัดการหน้า Login/Register และหน้าแรก (Public Pages)
    // ----------------------------------------------------
    if (PUBLIC_ROUTES.includes(pathname)) {
        // ถ้ามี Token แล้ว (Login อยู่แล้ว) 
        // ไม่ควรให้เข้าหน้า Login หรือหน้า Welcome อีก -> ดีดไปหน้า Dashboard
        if (token) {
            try {
                await jwtVerify(token, SECRET_KEY);
                // Redirect ไปหน้า Dashboard ทันที
                return NextResponse.redirect(new URL('/dashboard', request.url));
            } catch (err) {
                // ถ้า Token มีแต่ใช้ไม่ได้ (หมดอายุ/ปลอม) -> ให้เข้าหน้าปกติได้ และลบ Cookie ทิ้ง
                const response = NextResponse.next();
                response.cookies.delete('auth_token');
                return response;
            }
        }
        return NextResponse.next();
    }

    // ----------------------------------------------------
    // 4. จัดการหน้าที่ต้อง Login (Protected Routes - หน้าอื่นๆ ที่เหลือทั้งหมด)
    // ----------------------------------------------------
    
    // กรณีที่ 4.1: ไม่มี Token เลย -> ดีดไปหน้า Login
    if (!token) {
        // ถ้าเป็นการเรียก API ให้ตอบ 401 แทนการ Redirect
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // กรณีที่ 4.2: มี Token -> ตรวจสอบความถูกต้อง
    try {
        await jwtVerify(token, SECRET_KEY);
        
        // Token ถูกต้อง -> ปล่อยผ่าน
        return NextResponse.next();

    } catch (error) {
        // Token ผิดพลาด/หมดอายุ -> ดีดไปหน้า Login และลบ Cookie ทิ้ง
        console.error('Middleware Auth Error:', error); 
        const response = NextResponse.redirect(new URL('/auth/login', request.url));
        response.cookies.delete('auth_token');
        return response;
    }
}

// Config Matcher: ให้ Middleware ทำงานทุกหน้า ยกเว้นไฟล์ที่ไม่จำเป็น
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};