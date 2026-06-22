import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ แก้ไขจุดที่ 1: ล็อกเป้าให้ดึงเฉพาะ EXTERNAL-PLACEHOLDER เท่านั้น
async function getExternalPlaceholderSubjectId(): Promise<number> {
  const subject = await prisma.subject.findFirst({
    where: { code: "EXTERNAL-PLACEHOLDER" },
  });
  if (!subject) throw new Error("ไม่พบรายวิชา EXTERNAL-PLACEHOLDER ในระบบ กรุณาแจ้งแอดมินให้เพิ่มวิชานี้ก่อน");
  return subject.id;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chairId = searchParams.get("chairId");
    const showAll = searchParams.get("showAll") === "true";

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return NextResponse.json([]);

    const whereClause: any = {
      academicYear: activeYear.id,
      courseType: "EXTERNAL",
    };

    if (chairId) {
      whereClause.headApproverId = chairId;
    } else if (!showAll) {
      whereClause.headApprovalStatus = "APPROVED";
    }

    const externalAssignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            curriculumRef: {
              select: { id: true, name: true, chairId: true },
            },
          },
        },
        subject: {
          select: {
            id: true,
            code: true,
            name_th: true,
            name_en: true,
            credit: true,
            program: {
              select: {
                id: true,
                name_th: true,
                programChairId: true,
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    if (externalAssignments.length === 0) return NextResponse.json([]);

    const subjectMap = new Map<string, any>();

    for (const a of externalAssignments) {
      // ✅ แก้ไขจุดที่ 2: ใช้ รหัสวิชานอกคณะ ในการจัดกลุ่ม ไม่ให้มันยุบรวมกัน
      const key = `${a.externalCourseCode}-${a.semester}`;

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: a.subject.id,
          code: a.externalCourseCode || "ไม่มีรหัสวิชา",
          name_th: a.externalCourseName || "ไม่มีชื่อวิชา",
          name_en: a.externalCourseNameEn || "",
          credit: a.externalCredit || "-",
          program: a.subject.program,
          responsibleUser: null,
          semester: a.semester,
          teachingAssignments: [],
          status: "IN_PROGRESS",
        });
      }

      subjectMap.get(key).teachingAssignments.push({
        ...a,
        examCritiqueHours: a.examCritiqueHours ?? 0,
        headApprovalStatus: a.headApprovalStatus ?? null,
        academicApprovalStatus: a.academicApprovalStatus ?? null,
      });
    }

    return NextResponse.json(Array.from(subjectMap.values()));
  } catch (error) {
    console.error("GET /api/assignments/external error:", error);
    return NextResponse.json(
      { error: "Failed to fetch external assignments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      lecturerId,
      faculty,
      code,
      nameTh,
      nameEn,
      credit,
      semester,
      lectureHours,
      labHours,
      examHours,
      examCritiqueHours,
      evidenceLink,
    } = body;

    if (!lecturerId) return NextResponse.json({ error: "กรุณาระบุผู้สอน" }, { status: 400 });
    if (!faculty?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อคณะ/หน่วยงาน" }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "กรุณากรอกรหัสวิชา" }, { status: 400 });
    if (!nameTh?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อรายวิชา (ไทย)" }, { status: 400 });
    if (!credit?.trim()) return NextResponse.json({ error: "กรุณากรอกหน่วยกิต" }, { status: 400 });
    if (!evidenceLink?.trim()) return NextResponse.json({ error: "กรุณาแนบลิงก์เอกสารอ้างอิง" }, { status: 400 });

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) return NextResponse.json({ error: "ไม่พบปีการศึกษาที่เปิดใช้งาน" }, { status: 400 });

    const placeholderSubjectId = await getExternalPlaceholderSubjectId();

    const lecturer = await prisma.user.findUnique({
      where: { id: lecturerId },
      include: { curriculumRef: { select: { chairId: true } } },
    });
    
    // ดึงรหัสประธานหลักสูตรมาเตรียมไว้
    const resolvedHeadApproverId = lecturer?.curriculumRef?.chairId ?? null;

    const assignment = await prisma.teachingAssignment.create({
      data: {
        lecturerId,
        subjectId: placeholderSubjectId,
        academicYear: activeYear.id,
        semester: semester ?? 1,
        lectureHours: lectureHours ?? 0,
        labHours: labHours ?? 0,
        examHours: examHours ?? 0,
        examCritiqueHours: examCritiqueHours ?? 0,
        courseType: "EXTERNAL",
        externalFaculty: faculty,
        externalCourseCode: code,
        externalCourseName: nameTh,
        externalCourseNameEn: nameEn ?? null,
        externalCredit: credit,
        evidenceLink,
        lecturerStatus: "APPROVED", // สถานะผู้สอน: อนุมัติเลย
        responsibleStatus: "APPROVED", // ✅ สถานะผู้รับผิดชอบ: ต้องเป็น APPROVED เพราะวิชานอกคณะไม่มีผู้รับผิดชอบ
        headApproverId: resolvedHeadApproverId, // ✅ แก้ไขจุดที่ 3: ผูกคนอนุมัติให้ประธานหลักสูตร ไม่ใช่ null
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST /api/assignments/external error:", error);
    return NextResponse.json(
      { error: "Failed to create external assignment" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      id,
      faculty,
      code,
      nameTh,
      nameEn,
      credit,
      semester,
      lectureHours,
      labHours,
      examHours,
      examCritiqueHours,
      evidenceLink,
    } = body;

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!faculty?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อคณะ/หน่วยงาน" }, { status: 400 });
    if (!code?.trim()) return NextResponse.json({ error: "กรุณากรอกรหัสวิชา" }, { status: 400 });
    if (!nameTh?.trim()) return NextResponse.json({ error: "กรุณากรอกชื่อรายวิชา (ไทย)" }, { status: 400 });
    if (!evidenceLink?.trim()) return NextResponse.json({ error: "กรุณาแนบลิงก์เอกสารอ้างอิง" }, { status: 400 });

    const existing = await prisma.teachingAssignment.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) return NextResponse.json({ error: "ไม่พบรายวิชา" }, { status: 404 });
    if (existing.courseType !== "EXTERNAL") {
      return NextResponse.json({ error: "ไม่สามารถแก้ไขวิชาภายในผ่าน endpoint นี้" }, { status: 400 });
    }

    const resetApproval = existing.headApprovalStatus === "REJECTED";

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: {
        semester: semester ?? existing.semester,
        lectureHours: lectureHours ?? existing.lectureHours,
        labHours: labHours ?? existing.labHours,
        examHours: examHours ?? existing.examHours,
        examCritiqueHours: examCritiqueHours ?? existing.examCritiqueHours,
        externalFaculty: faculty,
        externalCourseCode: code,
        externalCourseName: nameTh,
        externalCourseNameEn: nameEn ?? null,
        externalCredit: credit,
        evidenceLink,
        ...(resetApproval && {
          headApprovalStatus: null,
          headApprovedAt: null,
          academicApprovalStatus: null,
          academicApprovedAt: null,
          lecturerFeedback: null, // 🌟 ล้างคำคอมเมนต์ที่ถูกตีกลับจากประธานออก เมื่อมีการแก้และบันทึกใหม่
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/assignments/external error:", error);
    return NextResponse.json(
      { error: "Failed to update external assignment" },
      { status: 500 }
    );
  }
}