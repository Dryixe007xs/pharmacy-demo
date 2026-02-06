import { NextResponse } from "next/server";
import { ApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma"; 

// GET: Fetch assignments
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subjectId');
  const lecturerId = searchParams.get('lecturerId'); 
  const scope = searchParams.get('scope'); 

  try {
    const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
        include: { terms: true } 
    });

    if (!activeYear) return NextResponse.json([]);

    let whereClause: any = {
        academicYear: activeYear.id, 
    };

    if (scope !== 'year') {
        const now = new Date();
        const currentTerm = activeYear.terms.find(t => 
            t.step1Start && t.step4End && now >= new Date(t.step1Start) && now <= new Date(t.step4End)
        );
        whereClause.semester = currentTerm ? currentTerm.semester : 1;
    }

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
                // ❌ ลบ semester: true ออก เพราะใน Subject ไม่มี field นี้
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

    // 1. หา Active Year
    const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
        include: { terms: true }
    });

    if (!activeYear) {
        return NextResponse.json({ error: "ระบบยังไม่เปิดภาคการศึกษา (No Active Year)" }, { status: 400 });
    }

    // ✅ แก้ไข: ลบการดึง subject.semester ออก แล้วใช้ Logic วันที่แทน
    let targetSemester = 1; // Default
    
    // หาเทอมปัจจุบันตามช่วงเวลา
    const now = new Date();
    const currentTerm = activeYear.terms.find(t => 
        t.step1Start && t.step4End && now >= new Date(t.step1Start) && now <= new Date(t.step4End)
    );
    
    if (currentTerm) {
        targetSemester = currentTerm.semester;
    }

    // 2. ตรวจสอบข้อมูลซ้ำ
    const existing = await prisma.teachingAssignment.findFirst({
      where: {
        subjectId: Number(subjectId),
        lecturerId: lecturerId,
        academicYear: activeYear.id,
        semester: targetSemester
      }
    });

    if (existing) {
      return NextResponse.json({ error: "อาจารย์ท่านนี้มีชื่ออยู่ในรายวิชานี้แล้ว" }, { status: 400 });
    }

    const initialStatus = (lecturerStatus === null || lecturerStatus === undefined) ? ApprovalStatus.DRAFT : lecturerStatus;

    // 3. บันทึกข้อมูล
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
        deanApprovalStatus: ApprovalStatus.PENDING
      },
      include: { lecturer: true }
    });

    return NextResponse.json(newAssignment);
  } catch (error) {
    console.error(error);
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