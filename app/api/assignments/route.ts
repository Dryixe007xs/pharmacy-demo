import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 

// GET: Fetch assignments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subjectId');
  const lecturerId = searchParams.get('lecturerId'); 
  const scope = searchParams.get('scope'); // ✅ รับค่า scope เพิ่ม (เช่น 'year')

  try {
    // 1. หา Active Term เพื่อเอา "ปีการศึกษาปัจจุบัน"
    const activeTerm = await prisma.termConfiguration.findFirst({
        where: { isActive: true }
    });

    if (!activeTerm) return NextResponse.json([]);

    // 2. สร้างเงื่อนไขการค้นหา
    let whereClause: any = {
        academicYear: activeTerm.academicYear, // กรองปีปัจจุบันเสมอ
    };

    // ✅ ถ้าส่ง scope='year' มา เราจะไม่กรอง semester (เพื่อให้ได้ข้อมูลทั้งปี)
    // แต่ถ้าไม่ส่ง (ค่า default) ให้กรองเอาเฉพาะเทอม Active
    if (scope !== 'year') {
        whereClause.semester = activeTerm.semester;
    }

    if (subjectId) {
      whereClause.subjectId = Number(subjectId); 
    } 
    else if (lecturerId) {
      whereClause.lecturerId = lecturerId; 
    } 

    // 3. ดึงข้อมูล
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
                    select: { id: true, name: true, chairId: true }
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
                program: { select: { name_th: true } },
                responsibleUser: { select: { firstName: true, lastName: true, title: true } }
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
    const { subjectId, lecturerId, lecturerStatus } = body;

    const activeTerm = await prisma.termConfiguration.findFirst({
        where: { isActive: true }
    });

    if (!activeTerm) {
        return NextResponse.json({ error: "ระบบยังไม่เปิดภาคการศึกษา (No Active Term)" }, { status: 400 });
    }

    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeTerm.academicYear,
        semester: activeTerm.semester
      }
    });

    if (existing) {
      return NextResponse.json({ error: "อาจารย์ท่านนี้มีชื่ออยู่ในรายวิชานี้แล้ว" }, { status: 400 });
    }

    const initialStatus = (lecturerStatus === null || lecturerStatus === undefined) ? ApprovalStatus.DRAFT : lecturerStatus;

    const newAssignment = await prisma.teachingAssignment.create({
      data: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeTerm.academicYear,
        semester: activeTerm.semester,
        lectureHours: 0,
        labHours: 0,
        examHours: 0,
        examCritiqueHours: 0,
        lecturerStatus: initialStatus,
        responsibleStatus: ApprovalStatus.PENDING,
        headApprovalStatus: ApprovalStatus.PENDING,
        deanApprovalStatus: ApprovalStatus.PENDING
      },
      include: { lecturer: true }
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add lecturer" }, { status: 500 });
  }
}

// PUT: Update workload/status
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { 
        id, lectureHours, labHours, examHours, examCritiqueHours, 
        lecturerStatus, lecturerFeedback, responsibleStatus, headApprovalStatus, deanApprovalStatus 
    } = body;

    const dataToUpdate: any = {};
    let hoursUpdated = false;

    if (lectureHours !== undefined) { dataToUpdate.lectureHours = Number(lectureHours); hoursUpdated = true; }
    if (labHours !== undefined) { dataToUpdate.labHours = Number(labHours); hoursUpdated = true; }
    if (examHours !== undefined) { dataToUpdate.examHours = Number(examHours); hoursUpdated = true; }
    if (examCritiqueHours !== undefined) { dataToUpdate.examCritiqueHours = Number(examCritiqueHours); hoursUpdated = true; }

    if (hoursUpdated) {
        if (responsibleStatus === undefined) dataToUpdate.responsibleStatus = ApprovalStatus.PENDING;
        if (headApprovalStatus === undefined) dataToUpdate.headApprovalStatus = ApprovalStatus.PENDING;
        if (deanApprovalStatus === undefined) dataToUpdate.deanApprovalStatus = ApprovalStatus.PENDING;
    }

    if (lecturerStatus !== undefined) dataToUpdate.lecturerStatus = lecturerStatus === null ? ApprovalStatus.DRAFT : lecturerStatus;
    if (lecturerFeedback !== undefined) dataToUpdate.lecturerFeedback = lecturerFeedback;
    if (responsibleStatus !== undefined) dataToUpdate.responsibleStatus = responsibleStatus;
    if (headApprovalStatus !== undefined) dataToUpdate.headApprovalStatus = headApprovalStatus;
    if (deanApprovalStatus !== undefined) dataToUpdate.deanApprovalStatus = deanApprovalStatus;

    const updated = await prisma.teachingAssignment.update({
      where: { id: Number(id) },
      data: dataToUpdate
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export { PUT as PATCH };

// DELETE: Remove lecturer
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.teachingAssignment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}