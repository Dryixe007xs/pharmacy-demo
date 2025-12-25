import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงข้อมูลหลักสูตร (อย่าลืม include ตามที่คุยกันรอบที่แล้ว)
export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        programChair: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            academicPosition: true,
            adminTitle: true,
          },
        },
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
    const { id, programChairId } = body;

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) }, // ID ของ Program ยังเป็น Int (ถูกแล้ว)
      data: {
        // ❌ ของเดิม: programChairId ? Number(programChairId) : null
        // ✅ แก้ใหม่: ส่ง String ไปตรงๆ (หรือ null ถ้าไม่มีค่า)
        programChairId: programChairId || null 
      },
      include: { // Include เพื่อให้ Frontend ได้ชื่อไปโชว์ทันที
        programChair: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                academicPosition: true,
                adminTitle: true,
            }
        }
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
    const { name_th, year, degree_level, programChairId } = body;

    if (!name_th || !year) {
      return NextResponse.json({ error: "Name and Year are required" }, { status: 400 });
    }

    const newProgram = await prisma.program.create({
      data: {
        name_th,
        year: Number(year),
        degree_level: degree_level || "ปริญญาตรี",
        // ✅ แก้ใหม่: ส่ง String ไปตรงๆ เหมือนกัน
        programChairId: programChairId || null
      },
      include: {
        programChair: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                academicPosition: true,
                adminTitle: true,
            }
        }
      }
    });

    return NextResponse.json(newProgram);
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}

// DELETE: ลบหลักสูตร (อันนี้ถูกต้องแล้ว)
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