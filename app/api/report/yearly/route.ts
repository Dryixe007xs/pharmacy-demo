import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const isMeta = searchParams.get("meta") === "true";
    const yearParam = searchParams.get("year");
    const curriculum = searchParams.get("curriculum");
    const programId = searchParams.get("programId");

    const userRole = session.user.role;
    const canViewAll = userRole === "ADMIN" || userRole === "VICE_DEAN";
    const isProgramChair = userRole === "PROGRAM_CHAIR";

    // ─── META BRANCH ─────────────────────────────────────────────────────────
    if (isMeta) {
      const academicYears = await prisma.academicYear.findMany({
        select: { id: true, isActive: true },
        orderBy: { id: "desc" },
      });

      const availableYears = academicYears.map((y) => y.id);
      const activeYear =
        academicYears.find((y) => y.isActive)?.id ?? availableYears[0] ?? null;

      let programs: { id: number; name_th: string }[] = [];
      if (canViewAll) {
        const allPrograms = await prisma.program.findMany({
          select: { id: true, name_th: true },
          orderBy: { name_th: "asc" },
        });
        const unique = new Map<string, { id: number; name_th: string }>();
        allPrograms.forEach((p) => unique.set(p.name_th, p));
        programs = Array.from(unique.values());
      }

      let programChairCurriculum: string | null = null;
      if (isProgramChair) {
        const chaired = await prisma.program.findFirst({
          where: {
            OR: [
              { programChairId: session.user.id },
              // @ts-ignore
              { programChairId: Number(session.user.id) },
            ],
          },
          select: { name_th: true },
        });
        programChairCurriculum = chaired?.name_th ?? null;
      }

      return NextResponse.json({
        availableYears,
        activeYear,
        programs,
        programChairCurriculum,
      });
    }

    // ─── DATA BRANCH ─────────────────────────────────────────────────────────
    let programs: any[] = [];
    let userProgramIds: number[] = [];
    let whereClause: any = {};

    if (isProgramChair) {
      const programsChaired = await prisma.program.findMany({
        where: { programChairId: session.user.id },
        select: { id: true, name_th: true, year: true },
      });

      if (programsChaired.length === 0 && !isNaN(Number(session.user.id))) {
        const programsChairedInt = await prisma.program.findMany({
          // @ts-ignore
          where: { programChairId: Number(session.user.id) },
          select: { id: true, name_th: true, year: true },
        });
        programsChaired.push(...programsChairedInt);
      }

      if (programsChaired.length > 0) {
        userProgramIds = programsChaired.map((p) => p.id);
        programs = programsChaired;
      }
    }

    let targetYear = yearParam ? parseInt(yearParam) : undefined;
    if (!targetYear) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      targetYear = activeYear?.id ?? new Date().getFullYear() + 543;
    }

    whereClause.academicYear = targetYear;
    whereClause.headApprovalStatus = "APPROVED";
    whereClause.academicApprovalStatus = "APPROVED";

    if (isProgramChair) {
      if (userProgramIds.length > 0) {
        whereClause.subject = { programId: { in: userProgramIds } };
      } else {
        return NextResponse.json({ assignments: [], programs: [] });
      }
    } else if (canViewAll) {
      if (curriculum && curriculum !== "all") {
        const isNumeric = !isNaN(Number(curriculum));
        if (isNumeric)
          whereClause.subject = { programId: parseInt(curriculum) };
        else whereClause.subject = { program: { name_th: curriculum } };
      } else if (programId) {
        whereClause.subject = { programId: parseInt(programId) };
      }

      if (!programs.length) {
        const allPrograms = await prisma.program.findMany({
          select: { id: true, name_th: true, year: true },
          orderBy: [{ name_th: "asc" }],
        });
        const uniquePrograms = new Map();
        allPrograms.forEach((p) => uniquePrograms.set(p.name_th, p));
        programs = Array.from(uniquePrograms.values());
      }
    }

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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
          },
        },
        subject: {
          select: {
            code: true,
            name_th: true,
            name_en: true,
            credit: true,
            program: {
              select: {
                id: true,
                name_th: true,
                year: true,
                degree_level: true,
              },
            },
            // ✅ ดึง courseOfferings เพื่อหา responsible ของ term นั้น
            courseOfferings: {
              where: {
                termConfig: {
                  academicYear: targetYear,
                }
              },
              select: {
                responsibleUserId: true,
                termConfig: {
                  select: { semester: true }
                }
              }
            },
          },
        },
      },
      orderBy: [{ semester: "asc" }, { subject: { code: "asc" } }],
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
        },
      };
    });

    const viceDeanRaw = await prisma.user.findFirst({
      where: {
        OR: [{ role: "VICE_DEAN" }, { adminTitle: { contains: "รองคณบดี" } }],
      },
      select: {
        firstName: true,
        lastName: true,
        title: true,
        adminTitle: true,
      },
    });

    const viceDean = viceDeanRaw
      ? {
          firstName: viceDeanRaw.firstName,
          lastName: viceDeanRaw.lastName,
          academicPosition: viceDeanRaw.title,
          adminTitle: viceDeanRaw.adminTitle || "รองคณบดีฝ่ายวิชาการ",
        }
      : null;

    return NextResponse.json({
      assignments: assignmentsWithResponsible,
      programs,
      viceDean,
      programChair: null,
    });
  } catch (error) {
    console.error("Yearly Report Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}