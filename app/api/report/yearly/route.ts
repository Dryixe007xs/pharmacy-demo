import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const curriculum = searchParams.get("curriculum");
    const programId = searchParams.get("programId");

    const userRole = session.user.role;
    const canViewAll = userRole === "ADMIN" || userRole === "VICE_DEAN";
    const isProgramChair = userRole === "PROGRAM_CHAIR";

    let programs: any[] = [];
    let userProgramIds: number[] = [];
    let whereClause: any = {};

    // Program Chair
    if (isProgramChair) {
      const programsChaired = await prisma.program.findMany({
        where: { programChairId: session.user.id },
        select: { id: true, name_th: true, year: true }
      });

      if (programsChaired.length === 0 && !isNaN(Number(session.user.id))) {
        const programsChairedInt = await prisma.program.findMany({
          // @ts-ignore
          where: { programChairId: Number(session.user.id) },
          select: { id: true, name_th: true, year: true }
        });
        programsChaired.push(...programsChairedInt);
      }

      if (programsChaired.length > 0) {
        userProgramIds = programsChaired.map(p => p.id);
        programs = programsChaired;
      }
    }

    // กำหนดปีการศึกษา
    let targetYear = yearParam ? parseInt(yearParam) : undefined;
    if (!targetYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }, select: { id: true }
      });
      targetYear = activeYear?.id || (new Date().getFullYear() + 543);
    }

    whereClause.academicYear = targetYear;

    // ✅ แสดงเฉพาะรายวิชาที่ผ่านการอนุมัติครบทั้งสองขั้น
    whereClause.headApprovalStatus = "APPROVED";
    whereClause.academicApprovalStatus = "APPROVED";

    // Where Clause
    if (isProgramChair) {
      if (userProgramIds.length > 0) {
        whereClause.subject = { programId: { in: userProgramIds } };
      } else {
        return NextResponse.json({ assignments: [], programs: [] });
      }
    } else if (canViewAll) {
      if (curriculum && curriculum !== 'all') {
        const isNumeric = !isNaN(Number(curriculum));
        if (isNumeric) whereClause.subject = { programId: parseInt(curriculum) };
        else whereClause.subject = { program: { name_th: curriculum } };
      } else if (programId) {
        whereClause.subject = { programId: parseInt(programId) };
      }

      if (!programs.length) {
        const allPrograms = await prisma.program.findMany({
          select: { id: true, name_th: true, year: true },
          orderBy: [{ name_th: 'asc' }]
        });
        const uniquePrograms = new Map();
        allPrograms.forEach(p => uniquePrograms.set(p.name_th, p));
        programs = Array.from(uniquePrograms.values());
      }
    }

    // Query
    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      select: {
        id: true,
        semester: true,
        lectureHours: true,
        labHours: true,
        examHours: true,
        examCritiqueHours: true,
        courseType: true,
        externalFaculty: true,
        externalCourseCode: true,
        externalCourseName: true,
        externalCourseNameEn: true,
        externalCredit: true,
        lecturer: {
          select: { id: true, firstName: true, lastName: true, title: true }
        },
        subject: {
          select: {
            code: true,
            name_th: true,
            name_en: true, // ✅ ชื่อภาษาอังกฤษ
            credit: true,
            responsibleUserId: true,
            program: { select: { id: true, name_th: true, year: true } },
          }
        }
      },
      orderBy: [{ semester: 'asc' }, { subject: { code: 'asc' } }]
    });

    // Vice Dean Info
    const viceDeanRaw = await prisma.user.findFirst({
      where: {
        OR: [{ role: 'VICE_DEAN' }, { adminTitle: { contains: 'รองคณบดี' } }]
      },
      select: { firstName: true, lastName: true, title: true, adminTitle: true }
    });
    const viceDean = viceDeanRaw ? {
      firstName: viceDeanRaw.firstName,
      lastName: viceDeanRaw.lastName,
      academicPosition: viceDeanRaw.title,
      adminTitle: viceDeanRaw.adminTitle || "รองคณบดีฝ่ายวิชาการ"
    } : null;

    return NextResponse.json({ assignments, programs, viceDean, programChair: null });

  } catch (error) {
    console.error("Yearly Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}