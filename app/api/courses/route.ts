import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; 
import { prisma } from "@/lib/prisma"; 

// GET: Fetch courses
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); 

    // ✅ กรณีที่ 1: ดึงรายวิชาสำหรับ Dashboard อาจารย์ (Active / Year)
    if (filter === 'active' || filter === 'year') {
        // 1. หาปีการศึกษาที่ Active
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
                                            select: { name_th: true }
                                        },
                                        responsibleUser: {
                                            select: {
                                                id: true, firstName: true, lastName: true, email: true, title: true,
                                            }
                                        },
                                        // ✅ ดึง Assignment เพื่อเอามาคำนวณ Status
                                        teachingAssignments: {
                                            select: {
                                                academicYear: true,
                                                semester: true,
                                                lecturerStatus: true,
                                                responsibleStatus: true, // ใช้ตัวนี้เช็คว่าผู้รับผิดชอบกดอนุมัติหรือยัง
                                                headApprovalStatus: true,
                                            }
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

        // 2. แปลงข้อมูลและคำนวณสถานะ (Flatten & Calculate Status)
        const courses = [];
        for (const term of activeYear.terms) {
            for (const offering of term.courseOfferings) {
                
                // กรองเอาเฉพาะ Assignment ของปีและเทอมนี้
                const termAssignments = offering.subject.teachingAssignments.filter(
                    a => a.academicYear === activeYear.id && a.semester === term.semester
                );

                // ✅ LOGIC คำนวณสถานะ (Status Calculation)
                let calculatedStatus = 'WAITING'; // Default: ยังไม่มีข้อมูล

                if (termAssignments.length > 0) {
                    // เช็คว่าทุกคนได้รับ Approved จาก Responsible หรือยัง
                    const allApproved = termAssignments.every(a => a.responsibleStatus === 'APPROVED');
                    // เช็คว่ามีใครโดน Reject ไหม
                    const anyRejected = termAssignments.some(a => a.responsibleStatus === 'REJECTED');
                    // เช็คว่าอาจารย์ส่งมาหรือยัง
                    const anySubmitted = termAssignments.some(a => a.lecturerStatus === 'APPROVED'); 

                    if (allApproved) {
                        calculatedStatus = 'APPROVED'; // อนุมัติครบทุกคนแล้ว
                    } else if (anyRejected) {
                        calculatedStatus = 'REJECTED'; // มีบางคนต้องแก้ไข
                    } else if (anySubmitted) {
                        calculatedStatus = 'PENDING';  // มีคนส่งมาแล้ว รอเราตรวจสอบ
                    } else {
                        calculatedStatus = 'IN_PROGRESS'; // มีชื่ออาจารย์ แต่ยังไม่มีใครส่ง
                    }
                }

                courses.push({
                    ...offering.subject,
                    teachingAssignments: [], // ไม่ต้องส่งไปเยอะ หนัก payload
                    semester: term.semester,
                    termConfigId: term.id,
                    status: calculatedStatus // ✅ ใช้ค่าที่คำนวณใหม่
                });
            }
        }

        return NextResponse.json(courses);
    }

    // ✅ กรณีที่ 2: ดึงรายวิชาทั้งหมด (สำหรับ Admin) - เหมือนเดิม
    const courses = await prisma.subject.findMany({
      include: { 
        program: { select: { name_th: true, year: true } },
        responsibleUser: { select: { firstName: true, lastName: true, title: true } }
      },
      orderBy: { id: 'desc' }
    });
    
    return NextResponse.json(courses);

  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// ... (POST, PUT, DELETE ให้คงเดิมไว้ครับ)
export async function POST(req: Request) {
    // (ใช้โค้ดเดิม)
    try {
        const body = await req.json();
        const newCourse = await prisma.subject.create({ data: body });
        return NextResponse.json(newCourse);
    } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function PUT(req: Request) {
    // (ใช้โค้ดเดิม)
    try {
        const body = await req.json();
        const { id, ...data } = body;
        const updated = await prisma.subject.update({ where: { id: Number(id) }, data });
        return NextResponse.json(updated);
    } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}

export async function DELETE(req: Request) {
    // (ใช้โค้ดเดิม)
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        await prisma.teachingAssignment.deleteMany({ where: { subjectId: Number(id) } });
        await prisma.subject.delete({ where: { id: Number(id) } });
        return NextResponse.json({ success: true });
    } catch (e) { return NextResponse.json({ error: 'Error' }, { status: 500 }); }
}