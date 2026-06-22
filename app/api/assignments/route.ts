import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    const targetSemester = whereClause.semester;

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
            program: { select: { name_th: true } },
            courseOfferings: {
              where: {
                termConfig: {
                  academicYear: activeYear.id,
                  semester: targetSemester,
                }
              },
              select: {
                responsibleUserId: true,
                responsibleUser: {
                  select: { id: true, firstName: true, lastName: true, title: true },
                }
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const result = assignments.map((a) => {
      const offering = a.subject.courseOfferings[0];
      return {
        ...a,
        subject: {
          ...a.subject,
          responsibleUserId: offering?.responsibleUserId ?? null,
          responsibleUser: offering?.responsibleUser ?? null,
        },
        examCritiqueHours: a.examCritiqueHours ?? 0,
        courseType: a.courseType ?? null,
        externalFaculty: a.externalFaculty ?? null,
        externalCourseCode: a.externalCourseCode ?? null,
        externalCourseName: a.externalCourseName ?? null,
        externalCourseNameEn: (a as any).externalCourseNameEn ?? null,
        externalCredit: a.externalCredit ?? null,
        evidenceLink: a.evidenceLink ?? null,
        headApprovalStatus: a.headApprovalStatus ?? null,
        academicApprovalStatus: a.academicApprovalStatus ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

// POST: Add lecturer to course
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjectId,
      lecturerId,
      lecturerStatus,
      semester,
      courseType,
      externalFaculty,
      externalCourseCode,
      externalCourseName,
      externalCourseNameEn,
      externalCredit,
      evidenceLink,
    } = body;

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
    const isExternal = courseType === "EXTERNAL";

    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeYear.id,
        semester: targetSemester,
        ...(isExternal && externalCourseCode ? { externalCourseCode } : {}),
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

    let resolvedHeadApproverId: string | null = null;

    if (isExternal) {
      const lecturer = await prisma.user.findUnique({
        where: { id: lecturerId },
        include: {
          curriculumRef: { select: { chairId: true } },
        },
      });
      resolvedHeadApproverId = lecturer?.curriculumRef?.chairId ?? null;
    } else {
      const subject = await prisma.subject.findUnique({
        where: { id: Number(subjectId) },
        include: { program: { select: { programChairId: true } } },
      });
      resolvedHeadApproverId = subject?.program?.programChairId ?? null;
    }

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
        responsibleStatus: isExternal
          ? ApprovalStatus.APPROVED
          : ApprovalStatus.PENDING,
        headApprovalStatus: null,
        academicApprovalStatus: null,
        headApproverId: resolvedHeadApproverId,
        academicApproverId: null,
        courseType: isExternal ? "EXTERNAL" : "INTERNAL",
        externalFaculty: externalFaculty ?? null,
        externalCourseCode: externalCourseCode ?? null,
        externalCourseName: externalCourseName ?? null,
        externalCourseNameEn: externalCourseNameEn ?? null,
        externalCredit: externalCredit ?? null,
        evidenceLink: evidenceLink ?? null,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = session.user as any;
    const isAdmin = currentUser.role === "ADMIN";

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
      rejectionReason, 
      approverId,
      adminOverride, 
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const isPrivilegedChange =
      lecturerStatus !== undefined ||
      headApprovalStatus !== undefined ||
      academicApprovalStatus !== undefined ||
      adminOverride === true;

    if (adminOverride === true && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: เฉพาะแอดมินเท่านั้นที่สามารถบังคับแก้ไขสถานะ/ชั่วโมงนี้ได้" },
        { status: 403 }
      );
    }

    const existingAssignment = await prisma.teachingAssignment.findUnique({
      where: { id: Number(id) },
      select: { courseType: true },
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: "ไม่พบข้อมูลภาระงาน" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    let hoursUpdated = false;

    if (lectureHours !== undefined) { dataToUpdate.lectureHours = Number(lectureHours); hoursUpdated = true; }
    if (labHours !== undefined) { dataToUpdate.labHours = Number(labHours); hoursUpdated = true; }
    if (examHours !== undefined) { dataToUpdate.examHours = Number(examHours); hoursUpdated = true; }
    if (examCritiqueHours !== undefined) { dataToUpdate.examCritiqueHours = Number(examCritiqueHours); hoursUpdated = true; }

    if (hoursUpdated && !adminOverride) {
      if (responsibleStatus === undefined) {
        dataToUpdate.responsibleStatus =
          existingAssignment.courseType === "EXTERNAL"
            ? ApprovalStatus.APPROVED
            : ApprovalStatus.PENDING;
      }
      if (headApprovalStatus === undefined) {
        dataToUpdate.headApprovalStatus = null;
        dataToUpdate.headApprovedAt = null;
        dataToUpdate.lecturerFeedback = null;
      }
      if (academicApprovalStatus === undefined) {
        dataToUpdate.academicApprovalStatus = null;
        dataToUpdate.academicApprovedAt = null;
      }
    }

    if (lecturerStatus !== undefined) {
      dataToUpdate.lecturerStatus =
        lecturerStatus === null ? ApprovalStatus.DRAFT : lecturerStatus;
    }

    if (lecturerFeedback !== undefined) {
      dataToUpdate.lecturerFeedback = lecturerFeedback;
    }

    if (responsibleStatus !== undefined) {
      dataToUpdate.responsibleStatus = responsibleStatus;
    }

    if (headApprovalStatus !== undefined) {
      if (headApprovalStatus === null) {
        dataToUpdate.headApprovalStatus = null;
        dataToUpdate.headApprovedAt = null;
        dataToUpdate.lecturerFeedback = null;
        if (academicApprovalStatus === undefined) {
          dataToUpdate.academicApprovalStatus = null;
          dataToUpdate.academicApprovedAt = null;
        }
      } else {
        dataToUpdate.headApprovalStatus = headApprovalStatus;
        dataToUpdate.headApprovedAt = new Date();

        // 🌟 บังคับใส่ Tag ทันทีแม้ว่า rejectionReason จะว่างเปล่า
        if (headApprovalStatus === "REJECTED") {
          dataToUpdate.lecturerFeedback = `[CHAIR_REJECT]: ${rejectionReason || "ไม่ระบุเหตุผล"}`;
        } else if (headApprovalStatus === "PENDING") {
          dataToUpdate.lecturerFeedback = null;
        }

        if (approverId) {
          dataToUpdate.headApproverId = approverId;
        } else if (headApprovalStatus === "PENDING") {
          const assignment = await prisma.teachingAssignment.findUnique({
            where: { id: Number(id) },
            include: {
              lecturer: {
                include: {
                  curriculumRef: { select: { chairId: true } },
                },
              },
              subject: {
                include: { program: { select: { programChairId: true } } },
              },
            },
          });

          if (assignment?.courseType === "EXTERNAL") {
            const chairId = assignment?.lecturer?.curriculumRef?.chairId;
            if (chairId) dataToUpdate.headApproverId = chairId;
          } else {
            const chairId = assignment?.subject?.program?.programChairId;
            if (chairId) dataToUpdate.headApproverId = chairId;
          }
        }
      }
    }

    if (academicApprovalStatus !== undefined) {
      if (academicApprovalStatus === null) {
        dataToUpdate.academicApprovalStatus = null;
        dataToUpdate.academicApprovedAt = null;
      } else {
        dataToUpdate.academicApprovalStatus = academicApprovalStatus;
        dataToUpdate.academicApprovedAt = new Date();

        if (approverId) {
          dataToUpdate.academicApproverId = approverId;
        } else {
          const viceDean = await prisma.user.findFirst({
            where: { role: "VICE_DEAN" },
            select: { id: true },
          });
          if (viceDean) dataToUpdate.academicApproverId = viceDean.id;
        }
      }
    }

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT error:", error);
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