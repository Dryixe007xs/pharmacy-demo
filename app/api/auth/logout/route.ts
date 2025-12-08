import { NextResponse } from "next/server";

export async function POST() {
    // สร้าง Response
    const response = NextResponse.json({ 
        success: true, 
        message: "Logged out successfully" 
    });
    
    // *** หัวใจสำคัญ: สั่งลบ Cookie ที่ชื่อ auth_token ออกจาก Server ***
    response.cookies.delete("auth_token");
    
    return response;
}