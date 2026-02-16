import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lecturerId = searchParams.get("lecturerId");

  if (!lecturerId) {
    return NextResponse.json({ error: "Lecturer ID is required" }, { status: 400 });
  }

  try {
    // 1. หา Active Year เพื่อดึงเฉพาะงานของปีการศึกษาปัจจุบัน
    const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true }
    });

    // 2. ดึงข้อมูลโปรไฟล์อาจารย์
    const lecturerRaw = await prisma.user.findUnique({
        where: { id: lecturerId },
        include: {
            curriculumRef: true, 
        }
    });

    if (!lecturerRaw) {
        return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
    }

    const lecturer = {
        firstName: lecturerRaw.firstName,
        lastName: lecturerRaw.lastName,
        email: lecturerRaw.email,
        academicPosition: lecturerRaw.title,
        curriculum: lecturerRaw.curriculumRef?.name || "-",
        department: "คณะเภสัชศาสตร์"
    };

    // 3. กำหนดเงื่อนไขการดึงภาระงานสอน
    let whereClause: any = {
      lecturerId: lecturerId,
      academicApprovalStatus: 'APPROVED', // ต้องผ่านรองวิชาการแล้วเท่านั้น
    };

    // ถ้ามีปีที่เปิดใช้งานอยู่ ให้ดึงเฉพาะของปีนั้น
    if (activeYear) {
        whereClause.academicYear = activeYear.id;
    }

    // 4. ดึงข้อมูล
    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        subject: {
            select: {
                code: true,
                name_th: true,
                responsibleUserId: true,
                credit: true, 
            }
        }, 
      },
      orderBy: {
        semester: 'asc'
      }
    });

    return NextResponse.json({ lecturer, assignments });

  } catch (error) {
    console.error("Error fetching personal report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}