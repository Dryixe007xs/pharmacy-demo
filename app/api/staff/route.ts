import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงข้อมูล
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      include: { managedPrograms: true }
    });

    const formattedUsers = users.map((user) => {
      // รวมชื่อเต็ม
      const fullName = `${user.academicPosition || user.title || ''} ${user.firstName || ''} ${user.lastName || ''}`.trim();
      
      const managedProgramNames = user.managedPrograms.length > 0 
        ? user.managedPrograms.map(p => p.name_th).join(", ") 
        : "";

      let status = "ACTIVE";
      const ws = user.workStatus || "";
      if (ws.includes("ลาศึกษาต่อ")) status = "STUDY_LEAVE";
      else if (ws.includes("ฝึกอบรม")) status = "TRAINING";

      return {
        id: user.id,
        email: user.email,
        name: fullName, 
        role: user.role,
        academicRank: user.academicRank || "-",
        department: user.department || "",
        curriculum: user.curriculum || "",
        managedPrograms: managedProgramNames,
        createdAt: user.createdAt.toISOString(),
        workStatus: status,
        adminTitle: user.adminTitle || "",
        // แก้ไข: ใช้ academicPosition แทน position (ที่ไม่มีใน DB)
        position: user.academicPosition || "" 
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to fetch staff data" }, { status: 500 });
  }
}

// POST: เพิ่มบุคลากรใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // ใช้รหัสผ่านจำลอง (ตัด bcrypt ออกเพื่อลดปัญหา dependency)
    const defaultPasswordHash = "$2b$10$DUMMYHASHFOREASYDEVNOBCRYPTREQUIRED"; 

    // Map status code กลับเป็นภาษาไทย
    let workStatusThai = "ปฏิบัติงาน";
    if (body.workStatus === "STUDY_LEAVE") workStatusThai = "ลาศึกษาต่อ";
    else if (body.workStatus === "TRAINING") workStatusThai = "ฝึกอบรมในประเทศ";

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: defaultPasswordHash,
        title: body.title,
        academicPosition: body.academicPosition,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department, 
        curriculum: body.curriculum, 
        adminTitle: body.adminTitle, 
        role: body.role,
        workStatus: workStatusThai,
        // ถ้าเป็น ADMIN ให้เป็นสายสนับสนุน (SUPPORT)
        userType: body.role === 'ADMIN' ? 'SUPPORT' : 'ACADEMIC' 
      }
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error("Create Error:", error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: "อีเมลนี้มีอยู่ในระบบแล้ว" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// PUT: แก้ไขข้อมูลบุคลากร
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    let workStatusThai = "ปฏิบัติงาน";
    if (body.workStatus === "STUDY_LEAVE") workStatusThai = "ลาศึกษาต่อ";
    else if (body.workStatus === "TRAINING") workStatusThai = "ฝึกอบรมในประเทศ";

    const updatedUser = await prisma.user.update({
      where: { id: body.id },
      data: {
        email: body.email,
        title: body.title,
        academicPosition: body.academicPosition,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department,
        curriculum: body.curriculum,
        adminTitle: body.adminTitle,
        role: body.role,
        workStatus: workStatusThai,
        userType: body.role === 'ADMIN' ? 'SUPPORT' : 'ACADEMIC'
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE: ลบข้อมูล
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await prisma.user.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}