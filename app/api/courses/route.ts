// app/api/courses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { prisma } from "@/lib/prisma"; // ✅ แก้ Import เป็น prisma และ path เป็น @/lib/prisma

// GET: Fetch courses (Supports ?filter=active)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); 

    let subjectWhereClause: any = {};
    let assignmentWhereClause: any = {};

    if (filter === 'active') {
        // ✅ เปลี่ยน db. เป็น prisma.
        const activeTerm = await prisma.termConfiguration.findFirst({
            where: { isActive: true }
        });

        if (!activeTerm) return NextResponse.json([]); 

        subjectWhereClause = {
            courseOfferings: {
                some: {
                    termConfigId: activeTerm.id,
                    isOpen: true
                }
            },
            // responsibleUserId: session.user.id 
        };

        assignmentWhereClause = {
            academicYear: activeTerm.academicYear,
            semester: activeTerm.semester
        };
    }

    // ✅ เปลี่ยน db. เป็น prisma.
    const courses = await prisma.subject.findMany({
      where: subjectWhereClause,
      select: { 
        id: true,
        code: true,
        name_th: true,
        name_en: true,
        credit: true,
        instructor: true,
        program_full_name: true,
        responsibleUserId: true, 
        program: {
            select: {
                id: true,
                name_th: true,
                year: true,
                degree_level: true,
                programChairId: true,
                programChair: {      
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        title: true,
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
                title: true, 
            }
        },
        teachingAssignments: {
           where: assignmentWhereClause,
           include: {
             lecturer: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    title: true,
                    email: true,
                    curriculumRef: { 
                        select: { id: true, name: true, chairId: true } 
                    }
                }
             }, 
           },
           orderBy: { id: 'asc' }
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

// POST: Create a new course
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      code, name_th, name_en, credit, programId, responsibleUserId, instructor 
    } = body;

    // ✅ เปลี่ยน db. เป็น prisma.
    const newCourse = await prisma.subject.create({
        data: {
            code,
            name_th,
            name_en,
            credit,
            programId: Number(programId), 
            responsibleUserId: responsibleUserId || null, 
            instructor,
        }
    });
    return NextResponse.json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ error: 'Error creating course' }, { status: 500 });
  }
}

// PUT: Update a course
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { 
      id, code, name_th, name_en, credit, programId, responsibleUserId, instructor 
    } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // ✅ เปลี่ยน db. เป็น prisma.
    const updatedCourse = await prisma.subject.update({
        where: { id: Number(id) }, 
        data: {
            code,
            name_th,
            name_en,
            credit,
            programId: Number(programId),
            responsibleUserId: responsibleUserId || null,
            instructor,
        }
    });
    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ error: 'Error updating course' }, { status: 500 });
  }
}

// DELETE: Delete a course
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // ✅ เปลี่ยน db. เป็น prisma.
    await prisma.teachingAssignment.deleteMany({
        where: { subjectId: Number(id) }
    });

    // ✅ เปลี่ยน db. เป็น prisma.
    await prisma.subject.delete({
        where: { id: Number(id) }
    });

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: 'Error deleting course' }, { status: 500 });
  }
}