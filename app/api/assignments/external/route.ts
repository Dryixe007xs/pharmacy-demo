import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      faculty,
      code,
      nameTh,
      nameEn,
      lectureHours,
      labHours,
      examHours,
      evidenceLink,
      lecturerId,
    } = body;

    // Validation
    if (!faculty || !code || !nameTh) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    if (!lecturerId) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้สอน" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามี active academic year หรือไม่
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
    });

    if (!activeYear) {
      return NextResponse.json(
        { error: "ไม่พบปีการศึกษาที่เปิดใช้งาน" },
        { status: 400 }
      );
    }

    // หา dummy subject สำหรับวิชานอกคณะ
    // (หรือสร้าง subject placeholder ถ้ายังไม่มี)
    let dummySubject = await prisma.subject.findFirst({
      where: {
        code: "EXTERNAL-PLACEHOLDER",
      },
    });

    // ถ้ายังไม่มี ให้สร้างใหม่
    if (!dummySubject) {
      // หา program แรกเพื่อใช้เป็น placeholder
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

    // สร้าง Teaching Assignment สำหรับวิชานอกคณะ
    const assignment = await prisma.teachingAssignment.create({
      data: {
        lecturerId,
        subjectId: dummySubject.id,
        academicYear: activeYear.id,
        semester: 1, // default ภาคต้น หรือให้เลือกได้
        
        lectureHours: Number(lectureHours) || 0,
        labHours: Number(labHours) || 0,
        examHours: Number(examHours) || 0,
        examCritiqueHours: 0,
        
        // 🎯 สำคัญ: ระบุว่าเป็นวิชานอกคณะ
        courseType: "EXTERNAL",
        externalFaculty: faculty,
        externalCourseCode: code,
        externalCourseName: nameTh,
        evidenceLink: evidenceLink || null,
        
        // สถานะเริ่มต้น
        lecturerStatus: "APPROVED", // อาจารย์กรอกเองจึงถือว่ายืนยันแล้ว
        responsibleStatus: "PENDING",
        headApprovalStatus: "PENDING",
        academicApprovalStatus: "PENDING",
      },
      include: {
        subject: {
          include: {
            program: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "บันทึกวิชานอกคณะสำเร็จ",
        data: assignment,
      },
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