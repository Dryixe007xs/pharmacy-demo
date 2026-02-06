// app/api/programs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

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
            title: true,
            adminTitle: true,
            email: true
          },
        },
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

// POST: เพิ่มหลักสูตรใหม่
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name_th, year, degree_level, programChairId, curriculumId } = body;

    if (!name_th || !year) {
      return NextResponse.json({ error: "Name and Year are required" }, { status: 400 });
    }

    const newProgram = await prisma.program.create({
      data: {
        name_th,
        year: Number(year), // ปีเป็นตัวเลข ถูกแล้ว
        degree_level: degree_level || "ปริญญาตรี",
        
        // ✅ แก้ไข: ไม่ใช้ Number() กับ programChairId เพราะมันเป็น String ("user-11")
        programChairId: programChairId ? String(programChairId) : null,
        
        // curriculumId น่าจะเป็น Int (ถ้าใน Database เป็น Int)
        curriculumId: curriculumId ? Number(curriculumId) : null 
      },
      include: {
        programChair: {
            select: { id: true, firstName: true, lastName: true }
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

// PUT: แก้ไขข้อมูลหลักสูตร
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name_th, year, degree_level, programChairId, curriculumId } = body;

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name_th) updateData.name_th = name_th;
    if (year) updateData.year = Number(year);
    if (degree_level) updateData.degree_level = degree_level;
    
    // ✅ แก้ไข: ไม่ใช้ Number() กับ programChairId
    if (programChairId !== undefined) {
        updateData.programChairId = programChairId ? String(programChairId) : null;
    }

    if (curriculumId !== undefined) {
        updateData.curriculumId = curriculumId ? Number(curriculumId) : null;
    }

    const updatedProgram = await prisma.program.update({
      where: { id: Number(id) }, 
      data: updateData,
      include: { 
        programChair: {
            select: { id: true, firstName: true, lastName: true }
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

// DELETE: ลบหลักสูตร (คงเดิม)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "Program ID is required" }, { status: 400 });

    await prisma.program.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: "Program deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "ไม่สามารถลบหลักสูตรได้" }, { status: 500 });
  }
}