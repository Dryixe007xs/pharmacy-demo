import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || "2567";
    const curriculum = searchParams.get("curriculum");

    // 1. ดึงข้อมูลการสอน (Assignments)
    // หมายเหตุ: ตรงนี้ถ้าใน DB ไม่มี field academicYear ใน teachingAssignment ให้ใช้ subject.program.year แทน
    const assignments = await prisma.teachingAssignment.findMany({
      where: {
        // กรองตามปีการศึกษา (ลองเช็คดูว่าใน Schema คุณมี field ไหน)
        // ถ้าไม่มี academicYear ใน teachingAssignment ให้ใช้ logic นี้:
        subject: {
            program: {
                year: Number(year)
            }
        }
      },
      include: {
        lecturer: {
          select: { id: true, firstName: true, lastName: true, academicPosition: true }
        },
        subject: {
          select: {
            code: true,
            name_th: true,
            credit: true,
            program: {
                select: { name_th: true, degree_level: true }
            }
          }
        }
      },
      orderBy: { subject: { code: 'asc' } }
    });

    // 2. หาชื่อ "รองคณบดีฝ่ายวิชาการ"
    const viceDean = await prisma.user.findFirst({
      where: { role: 'VICE_DEAN' },
      select: { firstName: true, lastName: true, academicPosition: true, adminTitle: true }
    });

    // 3. หาชื่อ "ประธานหลักสูตร" (ตามที่เลือก)
    let programChair = null;
    
    if (curriculum && curriculum !== 'all') {
        const program = await prisma.program.findFirst({
            where: { name_th: { contains: curriculum } }, 
            include: {
                programChair: {
                    select: { firstName: true, lastName: true, academicPosition: true, adminTitle: true }
                }
            }
        });

        // ✅ แก้จุดแดงตรงนี้: เช็คก่อนว่าเจอ program ไหม
        if (program) {
            programChair = program.programChair;
        }
    }

    return NextResponse.json({
        assignments,
        viceDean,
        programChair
    });

  } catch (error) {
    console.error("Yearly Report Error:", error);
    return NextResponse.json({ error: "Failed to fetch yearly report" }, { status: 500 });
  }
}