import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lecturerId = searchParams.get("lecturerId");

  if (!lecturerId) {
    return NextResponse.json({ error: "Lecturer ID is required" }, { status: 400 });
  }

  try {
    // 1. ดึงข้อมูลอาจารย์เจ้าของรายงาน (Profile)
    const lecturer = await prisma.user.findUnique({
        where: { id: lecturerId }, // ใช้ String ID ได้เลย
        select: {
            firstName: true,
            lastName: true,
            email: true,
            academicPosition: true,
            curriculum: true,
            department: true
        }
    });

    // 2. ดึงภาระงานสอน (Assignments)
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        lecturerId: lecturerId,
      },
      include: {
        subject: {
            include: {
                program: true 
            }
        }, 
      },
      orderBy: {
        subject: {
          code: 'asc'
        }
      }
    });

    // ส่งกลับไปทั้งคู่
    return NextResponse.json({ lecturer, assignments });

  } catch (error) {
    console.error("Error fetching personal report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}