import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// GET: Fetch assignments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const lecturerId = searchParams.get("lecturerId");
  const scope = searchParams.get("scope");
  const reqSemester = searchParams.get("semester");

  try {
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { terms: true },
    });

    if (!activeYear) return NextResponse.json([]);

    let whereClause: any = {
      academicYear: activeYear.id,
    };

    if (reqSemester) {
      whereClause.semester = Number(reqSemester);
    } else if (scope !== "year") {
      const now = new Date();
      const currentTerm = activeYear.terms.find(
        (t) =>
          t.step1Start &&
          t.step4End &&
          now >= new Date(t.step1Start) &&
          now <= new Date(t.step4End)
      );
      whereClause.semester = currentTerm ? currentTerm.semester : 1;
    }

    if (subjectId) {
      whereClause.subjectId = Number(subjectId);
    } else if (lecturerId) {
      whereClause.lecturerId = lecturerId;
    }

    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            curriculumRef: {
              select: { id: true, name: true, chairId: true },
            },
          },
        },
        subject: {
          select: {
            code: true,
            name_th: true,
            name_en: true,
            credit: true,
            responsibleUserId: true,
            program: { select: { name_th: true } },
            responsibleUser: {
              select: { firstName: true, lastName: true, title: true },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    // ✅ normalize ฟิลด์ให้ครบทุกตัว ป้องกัน undefined
    const result = assignments.map((a) => ({
      ...a,
      examCritiqueHours: a.examCritiqueHours ?? 0,
      courseType: a.courseType ?? null,
      externalFaculty: a.externalFaculty ?? null,
      externalCourseCode: a.externalCourseCode ?? null,
      externalCourseName: a.externalCourseName ?? null,
      externalCourseNameEn: (a as any).externalCourseNameEn ?? null,
      externalCredit: a.externalCredit ?? null,
      evidenceLink: a.evidenceLink ?? null,
      // ✅ null = ยังไม่ถึงขั้นตอนนี้ (แตกต่างจาก PENDING)
      headApprovalStatus: a.headApprovalStatus ?? null,
      academicApprovalStatus: a.academicApprovalStatus ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST: Add lecturer to course (วิชาในคณะ)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subjectId, lecturerId, lecturerStatus, semester } = body;

    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: { terms: true },
    });

    if (!activeYear) {
      return NextResponse.json(
        { error: "ระบบยังไม่เปิดภาคการศึกษา (No Active Year)" },
        { status: 400 }
      );
    }

    const targetSemester = semester ? Number(semester) : 1;

    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeYear.id,
        semester: targetSemester,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "อาจารย์ท่านนี้มีชื่ออยู่ในรายวิชานี้แล้ว" },
        { status: 400 }
      );
    }

    const initialStatus =
      lecturerStatus === null || lecturerStatus === undefined
        ? ApprovalStatus.DRAFT
        : lecturerStatus;

    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeYear.id,
        semester: targetSemester,
        lectureHours: 0,
        labHours: 0,
        examHours: 0,
        examCritiqueHours: 0,
        lecturerStatus: initialStatus,
        responsibleStatus: ApprovalStatus.PENDING,
        headApprovalStatus: ApprovalStatus.PENDING,
        academicApprovalStatus: ApprovalStatus.PENDING,
      },
      include: { lecturer: true },
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to add lecturer" },
      { status: 500 }
    );
  }
}

// PUT: Update workload/status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      lectureHours,
      labHours,
      examHours,
      examCritiqueHours,
      lecturerStatus,
      lecturerFeedback,
      responsibleStatus,
      headApprovalStatus,
      academicApprovalStatus,
      approverId, // 👈 เพิ่ม: รับ userId ของคนที่ approve
    } = body;

    const dataToUpdate: any = {};
    let hoursUpdated = false;

    if (lectureHours !== undefined) {
      dataToUpdate.lectureHours = Number(lectureHours);
      hoursUpdated = true;
    }
    if (labHours !== undefined) {
      dataToUpdate.labHours = Number(labHours);
      hoursUpdated = true;
    }
    if (examHours !== undefined) {
      dataToUpdate.examHours = Number(examHours);
      hoursUpdated = true;
    }
    if (examCritiqueHours !== undefined) {
      dataToUpdate.examCritiqueHours = Number(examCritiqueHours);
      hoursUpdated = true;
    }

    // ถ้าอัพเดทชั่วโมง → reset status กลับเป็น PENDING
    if (hoursUpdated) {
      if (responsibleStatus === undefined)
        dataToUpdate.responsibleStatus = ApprovalStatus.PENDING;
      if (headApprovalStatus === undefined)
        dataToUpdate.headApprovalStatus = ApprovalStatus.PENDING;
      if (academicApprovalStatus === undefined)
        dataToUpdate.academicApprovalStatus = ApprovalStatus.PENDING;
    }

    if (lecturerStatus !== undefined)
      dataToUpdate.lecturerStatus =
        lecturerStatus === null ? ApprovalStatus.DRAFT : lecturerStatus;
    if (lecturerFeedback !== undefined)
      dataToUpdate.lecturerFeedback = lecturerFeedback;
    if (responsibleStatus !== undefined)
      dataToUpdate.responsibleStatus = responsibleStatus;

    // 👇 แก้ตรงนี้: set timestamp และ approver ด้วยทุกครั้ง
    if (headApprovalStatus !== undefined) {
      dataToUpdate.headApprovalStatus = headApprovalStatus;
      dataToUpdate.headApprovedAt = new Date();
      dataToUpdate.headApproverId = approverId ?? null;
    }
    if (academicApprovalStatus !== undefined) {
      dataToUpdate.academicApprovalStatus = academicApprovalStatus;
      dataToUpdate.academicApprovedAt = new Date();
      dataToUpdate.academicApproverId = approverId ?? null;
    }

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}

export { PUT as PATCH };

// DELETE: Remove lecturer
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id)
    return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.teachingAssignment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}