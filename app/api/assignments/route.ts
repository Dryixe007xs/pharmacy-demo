// app/api/assignments/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, ApprovalStatus } from "@prisma/client";

const prisma = new PrismaClient();

// GET: Fetch assignments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subjectId');
  const lecturerId = searchParams.get('lecturerId'); 

  try {
    let whereClause: any = {};

    if (subjectId) {
      whereClause.subjectId = Number(subjectId); 
    } 
    else if (lecturerId) {
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
                    select: {
                        id: true,
                        name: true,
                        chairId: true
                    }
                }
            }
        },
        subject: { 
            select: {
                code: true,
                name_th: true,
                name_en: true,
                credit: true, 
                responsibleUserId: true,
                program: {
                    select: {
                        name_th: true,
                    }
                },
                responsibleUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        title: true,
                    }
                }
            }
        }
      },
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST: Add lecturer to course
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        subjectId, 
        lecturerId, 
        academicYear = 2567, 
        semester = 1,
        lecturerStatus 
    } = body;

    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId 
      }
    });

    if (existing) {
      return NextResponse.json({ error: "อาจารย์ท่านนี้มีชื่ออยู่ในรายวิชานี้แล้ว" }, { status: 400 });
    }

    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear,
        semester,
        lectureHours: 0,
        labHours: 0,
        examHours: 0,
        lecturerStatus: lecturerStatus || ApprovalStatus.PENDING, 
        responsibleStatus: ApprovalStatus.PENDING,
        headApprovalStatus: ApprovalStatus.PENDING,
        deanApprovalStatus: ApprovalStatus.PENDING
      },
      include: { lecturer: true }
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error("Error adding lecturer:", error);
    return NextResponse.json({ error: "Failed to add lecturer" }, { status: 500 });
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
        lecturerStatus, 
        lecturerFeedback,
        responsibleStatus, 
        headApprovalStatus,
        // ✅ เพิ่มตรงนี้: รับค่าสถานะอนุมัติจากคณบดี/รองคณบดี
        deanApprovalStatus 
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

    if (hoursUpdated) {
        // Reset สถานะเมื่อมีการแก้ไขชั่วโมงสอน
        if (!lecturerStatus) {
            dataToUpdate.lecturerStatus = ApprovalStatus.PENDING;
        }
        if (!responsibleStatus) {
            dataToUpdate.responsibleStatus = ApprovalStatus.PENDING;
        }
        if (!headApprovalStatus) {
             dataToUpdate.headApprovalStatus = ApprovalStatus.PENDING;
        }
        // ปกติถ้าแก้ชั่วโมง คณบดีก็ต้องอนุมัติใหม่ด้วย
        if (!deanApprovalStatus) {
             dataToUpdate.deanApprovalStatus = ApprovalStatus.PENDING;
        }
    }

    if (lecturerStatus) dataToUpdate.lecturerStatus = lecturerStatus;
    if (lecturerFeedback !== undefined) dataToUpdate.lecturerFeedback = lecturerFeedback;
    if (responsibleStatus) dataToUpdate.responsibleStatus = responsibleStatus;
    if (headApprovalStatus) dataToUpdate.headApprovalStatus = headApprovalStatus;
    
    // ✅ เพิ่มตรงนี้: อัปเดตสถานะคณบดีลง Database
    if (deanApprovalStatus) dataToUpdate.deanApprovalStatus = deanApprovalStatus;

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: dataToUpdate
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

// ✅ เพิ่มบรรทัดนี้: เพื่อให้รองรับ Method PATCH (เพราะ Frontend ใช้ fetch method: 'PATCH')
export { PUT as PATCH };

// DELETE: Remove lecturer
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.teachingAssignment.delete({
      where: { id: Number(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}