import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lecturerId = searchParams.get("lecturerId");

  if (!lecturerId) {
    return NextResponse.json({ error: "Lecturer ID is required" }, { status: 400 });
  }

  try {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    const lecturerRaw = await prisma.user.findUnique({
      where: { id: lecturerId },
      include: { curriculumRef: true },
    });

    if (!lecturerRaw) {
      return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
    }

    const lecturer = {
      firstName: lecturerRaw.firstName,
      lastName: lecturerRaw.lastName,
      email: lecturerRaw.email,
      academicPosition: lecturerRaw.title,
      curriculum: lecturerRaw.curriculumRef?.name || "-",
      department: "คณะเภสัชศาสตร์",
    };

    let whereClause: any = {
      lecturerId,
      academicApprovalStatus: "APPROVED",
    };

    if (activeYear) {
      whereClause.academicYear = activeYear.id;
    }

    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            code: true,
            name_th: true,
            credit: true,
            // ✅ ดึง courseOfferings เพื่อหา responsible ของ term นั้น
            courseOfferings: {
              where: {
                termConfig: {
                  academicYear: activeYear?.id,
                }
              },
              select: {
                responsibleUserId: true,
                termConfig: {
                  select: { semester: true }
                }
              }
            }
          },
        },
      },
      orderBy: { semester: "asc" },
    });

    // ✅ map responsibleUserId จาก CourseOffering ของ semester ที่ตรงกัน
    const assignmentsWithResponsible = assignments.map((a) => {
      const matchingOffering = a.subject.courseOfferings.find(
        (o) => o.termConfig.semester === a.semester
      );
      return {
        ...a,
        subject: {
          ...a.subject,
          responsibleUserId: matchingOffering?.responsibleUserId ?? null,
        }
      };
    });

    const viceDeanRaw = await prisma.user.findFirst({
      where: { role: 'VICE_DEAN' },
      select: { title: true, firstName: true, lastName: true, adminTitle: true },
    });

    const viceDean = viceDeanRaw
      ? {
          name: `${viceDeanRaw.title || ''} ${viceDeanRaw.firstName} ${viceDeanRaw.lastName}`.trim(),
          position: viceDeanRaw.adminTitle || 'รองคณบดีฝ่ายวิชาการ',
        }
      : { name: '-', position: 'รองคณบดีฝ่ายวิชาการ' };

    return NextResponse.json({ 
      lecturer, 
      assignments: assignmentsWithResponsible, 
      viceDean 
    });
  } catch (error) {
    console.error("Error fetching personal report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}