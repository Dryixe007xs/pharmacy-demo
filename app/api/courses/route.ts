import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงข้อมูลรายวิชาทั้งหมด พร้อมภาระงาน (Assignments) และข้อมูลประธานหลักสูตร
export async function GET() {
  try {
    const courses = await prisma.subject.findMany({
      select: { 
        id: true,
        code: true,
        name_th: true,
        name_en: true,
        credit: true,
        instructor: true,
        program_full_name: true,
        responsibleUserId: true,
        // ✅ แก้ไขตรงนี้: เปลี่ยนจาก program: true เป็น select เพื่อดึง programChair
        program: {
            select: {
                id: true,
                name_th: true,
                year: true,
                degree_level: true,
                programChairId: true, // ดึง ID มาด้วยเผื่อใช้ check
                programChair: {       // ✅ ดึงชื่อ-นามสกุล ของประธานหลักสูตร
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        academicPosition: true,
                        email: true,
                        adminTitle: true
                    }
                }
            }
        },
        responsibleUser: {
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                academicPosition: true,
                title: true,
            }
        },
        // ดึงภาระงาน (Assignments) มาพร้อมกันเลย
        teachingAssignments: {
           include: {
             lecturer: true, 
           },
           orderBy: {
             id: 'asc' 
           }
        }
      },
      orderBy: { id: 'desc' }
    });
    return NextResponse.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// ... (ส่วน POST, PUT, DELETE ใช้โค้ดเดิมของคุณได้เลยครับ ไม่ต้องแก้) ...
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      code, 
      name_th, 
      name_en, 
      credit, 
      programId, 
      responsibleUserId, 
      instructor 
    } = body;

    const newCourse = await prisma.subject.create({
        data: {
            code,
            name_th,
            name_en,
            credit,
            programId: Number(programId),
            responsibleUserId: responsibleUserId ? Number(responsibleUserId) : null,
            instructor,
        }
    });
    return NextResponse.json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ error: 'Error creating course' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
      id,
      code, 
      name_th, 
      name_en, 
      credit, 
      programId, 
      responsibleUserId, 
      instructor 
    } = body;

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updatedCourse = await prisma.subject.update({
        where: { id: Number(id) },
        data: {
            code,
            name_th,
            name_en,
            credit,
            programId: Number(programId),
            responsibleUserId: responsibleUserId ? Number(responsibleUserId) : null,
            instructor,
        }
    });
    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: 'Error updating course' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.teachingAssignment.deleteMany({
        where: { subjectId: Number(id) }
    });

    await prisma.subject.delete({
        where: { id: Number(id) }
    });

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: 'Error deleting course' }, { status: 500 });
  }
}