// app/api/courses/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { prisma } from "@/lib/prisma"; 

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); 

    // ✅ กรณีที่ 1: ดึงรายวิชาที่เปิดสอนในปีปัจจุบัน (Active Year)
    if (filter === 'active' || filter === 'year') {
        const activeYear = await prisma.academicYear.findFirst({
            where: { isActive: true },
            include: {
                terms: {
                    include: {
                        courseOfferings: {
                            where: { isOpen: true },
                            include: {
                                subject: {
                                    include: {
                                        program: {
                                            include: {
                                                programChair: {
                                                    select: {
                                                        id: true, firstName: true, lastName: true, title: true, email: true, adminTitle: true
                                                    }
                                                }
                                            }
                                        },
                                        responsibleUser: {
                                            select: {
                                                id: true, firstName: true, lastName: true, email: true, title: true,
                                            }
                                        },
                                        teachingAssignments: {
                                            where: {
                                                // ✅ filter เฉพาะปีและ semester ที่ตรงกับ term นั้น
                                                // (ดึงแบบ flat ก่อน แล้วค่อย filter ทีหลังเหมือนเดิม)
                                            },
                                            include: {
                                                lecturer: {
                                                    select: {
                                                        id: true, firstName: true, lastName: true, title: true, email: true
                                                    }
                                                }
                                            },
                                            orderBy: { id: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!activeYear) return NextResponse.json([]);

        const courses = [];
        for (const term of activeYear.terms) {
            for (const offering of term.courseOfferings) {
                const relevantAssignments = offering.subject.teachingAssignments.filter(
                    a => a.academicYear === activeYear.id && a.semester === term.semester
                );
                courses.push({
                    ...offering.subject,
                    teachingAssignments: relevantAssignments,
                    semester: term.semester,
                    termConfigId: term.id,
                    status: relevantAssignments.length > 0 ? 'IN_PROGRESS' : 'WAITING'
                });
            }
        }

        return NextResponse.json(courses);
    }

    // ✅ กรณีที่ 2: ดึง Master Data รายวิชาทั้งหมด (สำหรับ Admin จัดการ)
    // ❌ ตัด teachingAssignments ออก เพราะหน้า manage/courses ไม่ได้ใช้
    const courses = await prisma.subject.findMany({
      include: { 
        program: {
            select: {
                id: true, name_th: true, year: true, degree_level: true, programChairId: true,
                programChair: {      
                    select: {
                        id: true, firstName: true, lastName: true, title: true, email: true, adminTitle: true
                    }
                }
            }
        },
        responsibleUser: {
            select: {
                id: true, firstName: true, lastName: true, email: true, title: true, 
            }
        },
      },
      orderBy: { id: 'desc' }
    });
    
    return NextResponse.json(courses);

  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, name_th, name_en, credit, programId, responsibleUserId, instructor } = body;

    const newCourse = await prisma.subject.create({
        data: {
            code, name_th, name_en, credit,
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, code, name_th, name_en, credit, programId, responsibleUserId, instructor } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updatedCourse = await prisma.subject.update({
        where: { id: Number(id) }, 
        data: {
            code, name_th, name_en, credit,
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.teachingAssignment.deleteMany({ where: { subjectId: Number(id) } });
    await prisma.subject.delete({ where: { id: Number(id) } });

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: 'Error deleting course' }, { status: 500 });
  }
}