import { NextResponse } from "next/server";
import { SignJWT } from "jose"; 
import { prisma } from "@/lib/prisma"; // เรียกใช้ Prisma

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
    }

    // 1. ค้นหาว่าอีเมลนี้มีอยู่ในระบบแล้วหรือยัง?
    const existingUser = await prisma.user.findFirst({
        where: { email: email }
    });

    let userToLogin;

    if (existingUser) {
        // --- กรณี A: เจออีเมลในระบบ (เป็นบุคลากรที่มีรายชื่ออยู่แล้ว) ---
        // ถือว่าเป็นการ "ยืนยันตัวตน" หรือ "ตั้งรหัสผ่านใหม่" เพื่อเข้าใช้งาน
        
        // อัปเดตรหัสผ่านให้เป็นค่าล่าสุดที่ผู้ใช้กรอกมา (เพื่อให้ Login ครั้งต่อไปได้)
        userToLogin = await prisma.user.update({
            where: { id: existingUser.id },
            data: { 
                password: password, // บันทึกรหัสผ่านใหม่
                // อาจจะอัปเดตสถานะว่า Active แล้วตรงนี้ก็ได้
            }
        });
        
        console.log("Account Claimed:", userToLogin.email);

    } else {
        // --- กรณี B: ไม่เจออีเมลในระบบ (สมาชิกใหม่จริงๆ) ---
        // สร้าง User ใหม่ตามปกติ
        
        // ลองสร้างชื่อจากอีเมล (หรือรับจาก Frontend ถ้ามี)
        const tempUsername = email.split('@')[0];

        userToLogin = await prisma.user.create({
            data: {
                email: email,
                password: password,
                // ใส่ Field อื่นๆ ให้ครบตาม Schema ของคุณ (ผมใส่ค่า Default ไว้กัน Error)
                firstName: tempUsername, 
                lastName: "", 
                academicRank: "สมาชิกทั่วไป", // หรือ User
                department: "ทั่วไป",
                // username: tempUsername, // เปิดบรรทัดนี้ถ้าใน DB มี field username
            }
        });
    }

    // 2. เตรียมข้อมูลสำหรับสร้าง Token
    // (รวมชื่อ-นามสกุล เพื่อให้ Navbar แสดงผลสวยๆ)
    const fullName = `${userToLogin.title || ''}${userToLogin.firstName || ''} ${userToLogin.lastName || ''}`.trim() || userToLogin.email.split('@')[0];
    const role = userToLogin.academicRank || "สมาชิกทั่วไป"; // ใช้ตำแหน่งทางวิชาการเป็น Role หรือจะใช้ field 'role' โดยตรงก็ได้

    // 3. สร้าง JWT Token
    const token = await new SignJWT({ 
        userId: userToLogin.id.toString(),
        email: userToLogin.email,
        role: role,
        name: fullName
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SECRET_KEY);

    // 4. ส่ง Response กลับไป
    const response = NextResponse.json({
        success: true,
        message: existingUser ? "Welcome back! Account activated." : "Registration successful",
        user: { 
            name: fullName,
            role: role,
            email: userToLogin.email,
            image: "", // ถ้าใน DB มี field image ก็ใส่ userToLogin.image
            password: "" // ไม่ส่ง password กลับไป
        }
    });

    // ฝัง Cookie
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
    console.error("Register Error:", error);
    return NextResponse.json({ success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล" }, { status: 500 });
  }
}