import { NextResponse } from "next/server";
import { PrismaClient, ApprovalStatus } from "@prisma/client";

const prisma = new PrismaClient();

// GET: ดึงรายการผู้สอนและชั่วโมงสอน
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
      whereClause.lecturerId = Number(lecturerId);
    } 
    else {
      return NextResponse.json({ error: "Either Subject ID or Lecturer ID is required" }, { status: 400 });
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
                academicPosition: true,
            }
        },
        subject: { 
            select: {
                code: true,
                name_th: true,
                name_en: true,
                program: true,
                responsibleUserId: true,
                responsibleUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        academicPosition: true
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

// POST: เพิ่มผู้สอนเข้าในรายวิชา
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
        subjectId, 
        lecturerId, 
        academicYear = 2567, 
        semester = 1,
        lecturerStatus // รับค่านี้มาด้วย (เผื่อกรณี Owner เพิ่มตัวเองแล้วให้ Approve เลย)
    } = body;

    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: Number(lecturerId)
      }
    });

    if (existing) {
      return NextResponse.json({ error: "อาจารย์ท่านนี้มีชื่ออยู่ในรายวิชานี้แล้ว" }, { status: 400 });
    }

    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        subjectId: Number(subjectId),
        lecturerId: Number(lecturerId),
        academicYear,
        semester,
        lectureHours: 0,
        labHours: 0,
        examHours: 0, // ✅ เพิ่มค่าเริ่มต้น examHours
        // ถ้าส่ง lecturerStatus มา (เช่น APPROVED) ให้ใช้ค่านั้น ถ้าไม่ส่งให้ใช้ PENDING
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

// PUT: บันทึกแก้ไขชั่วโมงสอน หรือ อัปเดตสถานะการตรวจสอบ
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
        id, 
        lectureHours, 
        labHours, 
        examHours, // ✅ รับค่า examHours
        lecturerStatus, 
        lecturerFeedback,
        responsibleStatus, // ✅ รับค่า responsibleStatus (สำหรับส่งประธาน)
        headApprovalStatus // ✅ รับค่า headApprovalStatus (สำหรับประธานอนุมัติ)
    } = body;

    const dataToUpdate: any = {};

    // 1. อัปเดตชั่วโมงสอน (ถ้ามีการส่งมา)
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
        dataToUpdate.examHours = Number(examHours); // ✅ อัปเดต examHours
        hoursUpdated = true;
    }

    // 2. Logic การ Reset สถานะเมื่อมีการแก้ตัวเลข
    if (hoursUpdated) {
        // Default คือ Reset เป็น PENDING เพื่อความปลอดภัย
        // แต่ถ้า Request นี้ส่ง Status มาด้วย (เช่น Owner แก้ของตัวเองแล้ว Auto Approve) จะไม่ Reset ทับ
        if (!lecturerStatus) {
            dataToUpdate.lecturerStatus = ApprovalStatus.PENDING;
        }
        if (!responsibleStatus) {
            dataToUpdate.responsibleStatus = ApprovalStatus.PENDING;
        }
        // เมื่อแก้ตัวเลข สถานะการอนุมัติของหัวหน้า/คณบดี ควรถูก Reset เสมอเพื่อให้พิจารณาใหม่
        // ยกเว้นว่าคนแก้คือหัวหน้าเอง (ในที่นี้ขอ Reset ไปก่อนเพื่อความปลอดภัยของ Flow)
        if (!headApprovalStatus) {
             dataToUpdate.headApprovalStatus = ApprovalStatus.PENDING;
        }
    }

    // 3. อัปเดตสถานะต่างๆ (Override ค่าข้างบน ถ้ามีการส่งมาเจาะจง)
    if (lecturerStatus) dataToUpdate.lecturerStatus = lecturerStatus;
    if (lecturerFeedback !== undefined) dataToUpdate.lecturerFeedback = lecturerFeedback;
    
    // ✅ อัปเดตสถานะผู้รับผิดชอบ (เช่น กดส่งให้ประธาน)
    if (responsibleStatus) dataToUpdate.responsibleStatus = responsibleStatus;
    
    // ✅ อัปเดตสถานะประธานหลักสูตร
    if (headApprovalStatus) dataToUpdate.headApprovalStatus = headApprovalStatus;

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

// DELETE: ลบผู้สอนออกจากรายวิชา
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