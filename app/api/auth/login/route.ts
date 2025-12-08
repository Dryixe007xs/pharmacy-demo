import { NextResponse } from "next/server";
import { SignJWT } from "jose"; 
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body; 

    if (!username || !password) {
        return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    // --- 1. ค้นหา User ---
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: username }, 
                { email: username.includes("@") ? username : `${username}@up.ac.th` }
            ]
        }
    });

    if (!user) {
        return NextResponse.json({ success: false, message: "ไม่พบชื่อผู้ใช้งานนี้ในระบบ" }, { status: 401 });
    }

    // --- 2. ตรวจสอบรหัสผ่าน ---
    if (user.password !== password) {
       return NextResponse.json({ success: false, message: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    // --- 3. สร้าง Token ---
    const fullName = `${user.title || ''}${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0];
    
    const systemRole = user.role; 

    // คำนวณ "ตำแหน่งที่แสดงผล" (Display Title)
    let displayTitle = "สมาชิกทั่วไป";
    if (user.adminTitle && user.adminTitle !== "null" && user.adminTitle.trim() !== "") {
        displayTitle = user.adminTitle;
    } else if (user.academicRank && user.academicRank !== "null" && user.academicRank.trim() !== "") {
        displayTitle = user.academicRank;
    }

    const token = await new SignJWT({ 
        userId: user.id.toString(),
        email: user.email,
        role: systemRole,
        name: fullName
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SECRET_KEY);

    const response = NextResponse.json({
        success: true,
        message: "Login successful",
        user: { 
            id: user.id,
            name: fullName,
            email: user.email,
            image: "", 
            
            // ข้อมูลตำแหน่ง
            adminTitle: user.adminTitle,   
            academicRank: user.academicRank,
            displayPosition: displayTitle, 
            
            // *** เพิ่ม: ส่งข้อมูลหลักสูตรกลับไป ***
            curriculum: user.curriculum,
            department: user.department,
            
            role: systemRole, 
            password: "" 
        }
    });

    response.cookies.set({
        name: "auth_token",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
    });

    return response;

  } catch (error) {
    console.error("Prisma Login Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}