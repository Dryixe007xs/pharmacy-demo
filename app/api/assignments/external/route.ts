import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: สร้างรายวิชานอกคณะใหม่
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
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
      lecturerId,
    } = body;

    // Validation
    if (!faculty?.trim() || !code?.trim() || !nameTh?.trim()) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (คณะ, รหัสวิชา, ชื่อวิชา)" },
        { status: 400 }
      );
    }
    if (!lecturerId) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้สอน" }, { status: 400 });
    }

    // หา active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });
    if (!activeYear) {
      return NextResponse.json(
        { error: "ไม่พบปีการศึกษาที่เปิดใช้งาน" },
        { status: 400 }
      );
    }

    // หา / สร้าง dummy subject สำหรับวิชานอกคณะ
    let dummySubject = await prisma.subject.findFirst({
      where: { code: "EXTERNAL-PLACEHOLDER" },
    });
    if (!dummySubject) {
      const firstProgram = await prisma.program.findFirst();
      if (!firstProgram) {
        return NextResponse.json(
          { error: "ไม่พบข้อมูลหลักสูตรในระบบ" },
          { status: 500 }
        );
      }
      dummySubject = await prisma.subject.create({
        data: {
          code: "EXTERNAL-PLACEHOLDER",
          name_th: "รายวิชานอกคณะ (Placeholder)",
          name_en: "External Course Placeholder",
          credit: "0",
          programId: firstProgram.id,
        },
      });
    }

    // ✅ สร้าง assignment สถานะ "รอส่ง"
    // headApprovalStatus และ academicApprovalStatus = null (ยังไม่ถึงขั้นตอนนี้)
    const assignment = await prisma.teachingAssignment.create({
      data: {
        lecturerId,
        subjectId: dummySubject.id,
        academicYear: activeYear.id,
        semester: semester ? Number(semester) : 1,

        lectureHours: Number(lectureHours) || 0,
        labHours: Number(labHours) || 0,
        examHours: Number(examHours) || 0,
        examCritiqueHours: Number(examCritiqueHours) || 0,

        courseType: "EXTERNAL",
        externalFaculty: faculty.trim(),
        externalCourseCode: code.trim(),
        externalCourseName: nameTh.trim(),
        externalCourseNameEn: nameEn?.trim() || null,
        externalCredit: credit?.trim() || null,
        evidenceLink: evidenceLink?.trim() || null,

        // ✅ "รอส่ง" = head/academic = null (ยังไม่ส่งประธาน)
        lecturerStatus: "APPROVED",
        responsibleStatus: "PENDING",
        headApprovalStatus: null,
        academicApprovalStatus: null,
      },
      include: {
        subject: { include: { program: true } },
      },
    });

    return NextResponse.json(
      { message: "บันทึกวิชานอกคณะสำเร็จ", data: assignment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating external course:", error);
    return NextResponse.json(
      {
        error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: แก้ไขรายวิชานอกคณะ (เฉพาะก่อนส่งประธาน)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      faculty,
      code,
      nameTh,
      credit,
      semester,
      lectureHours,
      labHours,
      examHours,
      examCritiqueHours,
      evidenceLink,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "ไม่พบ ID" }, { status: 400 });
    }

    // ✅ ตรวจสอบว่ายังแก้ไขได้
    const existing = await prisma.teachingAssignment.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    }
    if (
      existing.headApprovalStatus === "PENDING" ||
      existing.headApprovalStatus === "APPROVED"
    ) {
      return NextResponse.json(
        { error: "ไม่สามารถแก้ไขได้ เนื่องจากอยู่ในระหว่างการพิจารณาของประธาน" },
        { status: 403 }
      );
    }

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: {
        ...(faculty !== undefined && { externalFaculty: faculty.trim() }),
        ...(code !== undefined && { externalCourseCode: code.trim() }),
        ...(nameTh !== undefined && { externalCourseName: nameTh.trim() }),
        ...(credit !== undefined && { externalCredit: credit?.trim() || null }),
        ...(semester !== undefined && { semester: Number(semester) }),
        ...(lectureHours !== undefined && { lectureHours: Number(lectureHours) }),
        ...(labHours !== undefined && { labHours: Number(labHours) }),
        ...(examHours !== undefined && { examHours: Number(examHours) }),
        ...(examCritiqueHours !== undefined && {
          examCritiqueHours: Number(examCritiqueHours),
        }),
        ...(evidenceLink !== undefined && {
          evidenceLink: evidenceLink?.trim() || null,
        }),
      },
      include: {
        subject: { include: { program: true } },
      },
    });

    return NextResponse.json({ message: "แก้ไขสำเร็จ", data: updated });
  } catch (error) {
    console.error("Error updating external course:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" },
      { status: 500 }
    );
  }
}