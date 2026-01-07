// app/api/report/yearly/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || "2567";
    const curriculum = searchParams.get("curriculum");

    let whereClause: any = {
        academicYear: Number(year) 
    };

    if (curriculum && curriculum !== 'all') {
        whereClause.subject = {
            program: {
                name_th: curriculum
            }
        };
    }

    // 1. Assignments
    const assignments = await prisma.teachingAssignment.findMany({
      where: whereClause,
      include: {
        lecturer: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            title: true, // ✅ ใช้ title เป็นหลัก
            // academicPosition: true // ❌ เอาออกตามที่สั่ง
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
      orderBy: { subject: { code: 'asc' } }
    });

    // 2. Vice Dean
    const viceDeanRaw = await prisma.user.findFirst({
      where: { role: 'VICE_DEAN' },
      select: { firstName: true, lastName: true, title: true, adminTitle: true } // ✅ title only
    });

    const viceDean = viceDeanRaw ? {
        ...viceDeanRaw,
        academicPosition: viceDeanRaw.title, // Map title -> academicPosition เพื่อให้ Frontend ใช้ง่าย
    } : null;

    // 3. Program Chair
    let programChair = null;
    
    if (curriculum && curriculum !== 'all') {
        const program = await prisma.program.findFirst({
            where: { name_th: curriculum }, 
            include: {
                programChair: {
                    select: { 
                        firstName: true, 
                        lastName: true, 
                        title: true, // ✅ title only
                        adminTitle: true
                    }
                }
            }
        });

        if (program && program.programChair) {
            programChair = {
                firstName: program.programChair.firstName,
                lastName: program.programChair.lastName,
                academicPosition: program.programChair.title // Map title -> academicPosition
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