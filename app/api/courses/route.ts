import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงข้อมูลรายวิชาทั้งหมด พร้อมข้อมูลที่เกี่ยวข้อง
export async function GET() {
  try {
    const courses = await prisma.subject.findMany({
      select: { // ใช้ select เพื่อควบคุม output ให้ชัดเจน
        id: true,
        code: true,
        name_th: true,
        name_en: true,
        credit: true,
        instructor: true,
        program_full_name: true,
        responsibleUserId: true, // *** MUST BE SELECTED ***: ใช้สำหรับการกรองในหน้า workload
        program: true,
        responsibleUser: {
            select: { // ดึงเฉพาะ field ที่จำเป็นของ Responsible User
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                academicPosition: true,
                title: true,
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

// POST: เพิ่มรายวิชาใหม่ (สำหรับหน้า courses/page.tsx)
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
            // Save Responsible User ID and Instructor text
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

// PUT: แก้ไขข้อมูลรายวิชา (สำหรับหน้า courses/page.tsx)
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
            // Update Responsible User ID and Instructor text
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

// DELETE: ลบรายวิชา (สำหรับหน้า courses/page.tsx)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Must delete related TeachingAssignments first due to foreign key constraints
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