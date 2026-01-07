// app/api/programs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงข้อมูลหลักสูตร
export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        programChair: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            // ✅ แก้ไข: ใช้ title แทน academicPosition
            title: true, 
            // academicPosition: true, // ❌ ลบทิ้ง
            adminTitle: true,
          },
        },
        // ✅ เพิ่ม: ดึงข้อมูล Curriculum (ตัวแม่) มาแสดงด้วย
        curriculumRef: {
            select: { id: true, name: true }
        }
      },
      orderBy: { year: 'desc' }
    });
    return NextResponse.json(programs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

// PUT: แก้ไขข้อมูลหลักสูตร
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, programChairId, curriculumId } = body; // ✅ รับ curriculumId มาด้วย

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) }, 
      data: {  
        programChairId: programChairId || null,
        // ✅ เพิ่ม: อัปเดตการผูกกับ Curriculum ตัวแม่ (ถ้ามีการส่งค่ามา)
        ...(curriculumId ? { curriculumId: Number(curriculumId) } : {})
      },
      include: { 
        programChair: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true, // ✅ ใช้ title
                // academicPosition: true, // ❌ ลบทิ้ง
                adminTitle: true,
            }
        },
        curriculumRef: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(updatedProgram);
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
  }
}

// POST: เพิ่มหลักสูตรใหม่
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name_th, year, degree_level, programChairId, curriculumId } = body; // ✅ รับ curriculumId

    if (!name_th || !year) {
      return NextResponse.json({ error: "Name and Year are required" }, { status: 400 });
    }

    const newProgram = await prisma.program.create({
      data: {
        name_th,
        year: Number(year),
        degree_level: degree_level || "ปริญญาตรี",
        programChairId: programChairId || null,
        // ✅ เพิ่ม: บันทึกว่าหลักสูตรปีนี้ สังกัด Curriculum ไหน
        curriculumId: curriculumId ? Number(curriculumId) : null
      },
      include: {
        programChair: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                title: true, // ✅ ใช้ title
                // academicPosition: true, // ❌ ลบทิ้ง
                adminTitle: true,
            }
        },
        curriculumRef: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(newProgram);
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}

// DELETE: ลบหลักสูตร
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    await prisma.program.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Program deleted successfully" });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json({ error: "ไม่สามารถลบหลักสูตรได้เนื่องจากมีรายวิชาผูกอยู่" }, { status: 500 });
  }
}