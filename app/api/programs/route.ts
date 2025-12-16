import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PUT: แก้ไขข้อมูลหลักสูตร (เปลี่ยนประธาน)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, programChairId } = body;

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) },
      data: {
        programChairId: programChairId ? Number(programChairId) : null
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
        programChairId: programChairId ? Number(programChairId) : null
      }
    });

    return NextResponse.json(newProgram);
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}

// ✅ DELETE: ลบหลักสูตร (เพิ่มใหม่)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    // ลบหลักสูตร (ระวัง: ถ้ามีวิชาผูกอยู่ อาจจะลบไม่ได้ถ้าไม่ได้ตั้ง cascade ไว้)
    await prisma.program.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: "Program deleted successfully" });
  } catch (error) {
    console.error("Error deleting program:", error);
    // กรณีลบไม่ได้เพราะมีข้อมูลผูกมัด
    return NextResponse.json({ error: "ไม่สามารถลบหลักสูตรได้เนื่องจากมีรายวิชาผูกอยู่" }, { status: 500 });
  }
}