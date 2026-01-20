// app/api/report/personal/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lecturerId = searchParams.get("lecturerId");

  if (!lecturerId) {
    return NextResponse.json({ error: "Lecturer ID is required" }, { status: 400 });
  }

  try {
    // 1. ดึงข้อมูลอาจารย์
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

    // 2. ดึงภาระงานสอน
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        lecturerId: lecturerId,
        // ✅ เพิ่มเงื่อนไขนี้: ดึงเฉพาะที่คณบดีอนุมัติแล้วเท่านั้น (จบกระบวนการ)
        deanApprovalStatus: 'APPROVED', 
      },
      include: {
        subject: {
            select: {
                code: true,
                name_th: true,
                responsibleUserId: true,
                // ตรวจสอบชื่อ field ใน Schema ว่าเป็น 'credit' หรือ 'credits' ให้ตรงกันนะครับ
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