// app/api/assignments/external/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── helper: หา subjectId placeholder สำหรับ external course ───
// กลยุทธ์: ใช้ subject แรกของ program แรกที่มีในระบบเป็น placeholder
// (เพราะ subjectId เป็น required ใน schema)
// *** ถ้าโปรเจกต์มี subject พิเศษสำหรับ external ให้เปลี่ยนตรงนี้ ***
async function getExternalPlaceholderSubjectId(): Promise<number> {
  const subject = await prisma.subject.findFirst({
    orderBy: { id: "asc" },
  });
  if (!subject) throw new Error("ไม่พบ subject ในระบบ กรุณาเพิ่มรายวิชาก่อน");
  return subject.id;
}

// ==========================================================
// GET /api/assignments/external
// ==========================================================
/**
 * GET /api/assignments/external?chairId=xxx   → ประธานหลักสูตร
 *   - ดึงเฉพาะ assignment ที่ headApproverId = chairId
 *   - ไม่ filter headApprovalStatus (ประธานเห็นทุก status)
 *
 * GET /api/assignments/external               → รองคณบดีวิชาการ
 *   - ดึงทุก external assignment
 *   - filter เฉพาะที่ headApprovalStatus = "APPROVED" แล้วเท่านั้น
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chairId = searchParams.get("chairId");

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) return NextResponse.json([]);

    const whereClause: any = {
      academicYear: activeYear.id,
      courseType: "EXTERNAL",
    };

    if (chairId) {
      // ประธานหลักสูตร → เห็นเฉพาะของตัวเอง ทุก status
      whereClause.headApproverId = chairId;
    } else {
      // รองคณบดี → เห็นทุกคน แต่เฉพาะที่ประธานรับรองแล้ว
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
            responsibleUserId: true,
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

    // Group by subjectId + semester เพื่อให้ structure เหมือน /api/courses
    const subjectMap = new Map<string, any>();

    for (const a of externalAssignments) {
      const key = `${a.subjectId}-${a.semester}`;

      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          id: a.subject.id,
          code: a.subject.code,
          name_th: a.subject.name_th,
          name_en: a.subject.name_en,
          credit: a.subject.credit,
          responsibleUserId: a.subject.responsibleUserId,
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

// ==========================================================
// POST /api/assignments/external  → ผู้สอนเพิ่มวิชานอกคณะ
// ==========================================================
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

    // Validation
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

    // subjectId เป็น required ใน schema → ต้องใช้ placeholder
    const placeholderSubjectId = await getExternalPlaceholderSubjectId();

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
        lecturerStatus: "PENDING",
        responsibleStatus: "PENDING",
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

// ==========================================================
// PUT /api/assignments/external  → แก้ไขวิชานอกคณะ
// ==========================================================
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

    // ตรวจสอบว่า assignment นี้มีอยู่จริงและเป็น EXTERNAL
    const existing = await prisma.teachingAssignment.findUnique({
      where: { id },
    });
    if (!existing) return NextResponse.json({ error: "ไม่พบรายวิชา" }, { status: 404 });
    if (existing.courseType !== "EXTERNAL") {
      return NextResponse.json({ error: "ไม่สามารถแก้ไขวิชาภายในผ่าน endpoint นี้" }, { status: 400 });
    }

    // ถ้าประธานส่งกลับ (REJECTED) → reset approval เพื่อให้ส่งใหม่ได้
    const resetApproval = existing.headApprovalStatus === "REJECTED";

    const updated = await prisma.teachingAssignment.update({
      where: { id },
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
        // reset approval เมื่อแก้ไข ให้ส่งใหม่ผ่าน submitToChair
        ...(resetApproval && {
          headApprovalStatus: null,
          headApprovedAt: null,
          academicApprovalStatus: null,
          academicApprovedAt: null,
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