import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const curriculum = searchParams.get("curriculum");

    // 1. หาปีการศึกษา (Active Term Fallback)
    let targetYear = yearParam ? parseInt(yearParam) : undefined;
    if (!targetYear) {
        const activeTerm = await prisma.termConfiguration.findFirst({ where: { isActive: true } });
        targetYear = activeTerm?.academicYear || 2567;
    }

    // 2. สร้างเงื่อนไข Where
    let whereClause: any = {
        academicYear: targetYear,
        // deanApprovalStatus: 'APPROVED' // (Optional: เปิดบรรทัดนี้ถ้าจะเอาเฉพาะที่อนุมัติแล้ว)
    };

    if (curriculum && curriculum !== 'all') {
        whereClause.subject = {
            program: {
                name_th: curriculum
            }
        };
    }

    // 3. Query Assignments
    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        lecturer: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            title: true, // ใช้ title แทน academicPosition
          }
        },
        subject: {
          select: {
            code: true,
            name_th: true,
            credit: true,
            program: {
                select: { name_th: true }
            },
            responsibleUserId: true,
          }
        }
      },
      orderBy: [
        { semester: 'asc' },
        { subject: { code: 'asc' } }
      ]
    });

    // 4. Vice Dean Query
    const viceDeanRaw = await prisma.user.findFirst({
      where: { 
        OR: [
            { role: 'VICE_DEAN' },
            { adminTitle: { contains: 'รองคณบดี' } } 
        ]
      },
      select: { firstName: true, lastName: true, title: true, adminTitle: true }
    });

    const viceDean = viceDeanRaw ? {
        firstName: viceDeanRaw.firstName,
        lastName: viceDeanRaw.lastName,
        academicPosition: viceDeanRaw.title,
        adminTitle: viceDeanRaw.adminTitle || "รองคณบดีฝ่ายวิชาการ"
    } : null;

    // 5. Program Chair Query
    let programChair = null;
    
    if (curriculum && curriculum !== 'all') {
        const program = await prisma.program.findFirst({
            where: { name_th: curriculum }, 
            include: {
                // ✅ ใช้ programChair ให้ตรงกับ Schema
                programChair: { 
                    select: { 
                        firstName: true, 
                        lastName: true, 
                        title: true, 
                        adminTitle: true
                    }
                }
            }
        });

        if (program && program.programChair) {
            programChair = {
                firstName: program.programChair.firstName,
                lastName: program.programChair.lastName,
                academicPosition: program.programChair.title,
                adminTitle: "ประธานหลักสูตร"
            };
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