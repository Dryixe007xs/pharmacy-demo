// app/api/curriculums/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =========================================================
// GET: ดึงข้อมูล
// =========================================================
export async function GET() {
  try {
    const curriculums = await prisma.curriculum.findMany({
      include: {
        chair: { 
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true,
            adminTitle: true,
            academicRank: true
          }
        },
        _count: { 
          select: { 
            programs: true,
            staffs: true 
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(curriculums);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// =========================================================
// PUT: อัปเดตประธาน + อัปเดต Program + ย้ายงาน
// =========================================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, chairId } = body;

    console.log(`🔥 [API] Request to update Curriculum #${id} -> New Chair: ${chairId}`);

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // 1. อัปเดตประธานใน Curriculum Master (ตารางหลัก)
    const updatedCurriculum = await prisma.curriculum.update({
      where: { id: Number(id) },
      data: {
        chairId: chairId ? String(chairId) : null
      }
    });

    console.log("✅ [API] Curriculum Master Updated.");

    // =========================================================================
    // 🔥 2. เพิ่มเติม: อัปเดตประธานในตาราง Program ด้วย! (สำคัญมาก)
    // เพื่อให้สิทธิ์ "Program Chair" ในหน้า Frontend ย้ายไปหาคนใหม่ทันที
    // =========================================================================
    if (chairId) {
        // กรณีตั้งประธานใหม่ -> เอา ID ไปใส่ในทุก Program ของ Curriculum นี้
        await prisma.program.updateMany({
            where: { curriculumId: Number(id) },
            data: { programChairId: String(chairId) }
        });
        console.log(`✅ [API] Synced Program Chair for all programs in Curriculum #${id}`);
    } else {
        // กรณีลบประธานออก (Set null)
        await prisma.program.updateMany({
            where: { curriculumId: Number(id) },
            data: { programChairId: null }
        });
    }

    // =========================================================================
    // 🔥 3. SPECIAL FIX: กวาดแก้ "จ่าหน้าซอง" ภาระงานที่ค้างอยู่ (Migrate Pending Tasks)
    // =========================================================================
    if (chairId) {
      // ขั้นตอน 1: หา Program ทั้งหมดใน Curriculum นี้
      const programs = await prisma.program.findMany({
        where: { curriculumId: Number(id) },
        select: { id: true }
      });
      const programIds = programs.map(p => p.id);
      console.log(`🔎 [API] Found Programs in Curriculum #${id}:`, programIds);

      if (programIds.length > 0) {
        // ขั้นตอน 2: หา TeachingAssignment ที่ค้างอยู่ (PENDING)
        const pendingTasks = await prisma.teachingAssignment.findMany({
          where: {
            subject: {
              programId: { in: programIds }
            },
            headApprovalStatus: 'PENDING' 
          },
          select: { id: true, headApproverId: true }
        });

        console.log(`🔎 [API] Found ${pendingTasks.length} pending tasks to migrate.`);
        
        if (pendingTasks.length > 0) {
            const taskIds = pendingTasks.map(t => t.id);
            
            // ขั้นตอน 3: สั่งอัปเดตเปลี่ยนคนอนุมัติเป็นคนใหม่
            const updateResult = await prisma.teachingAssignment.updateMany({
                where: {
                    id: { in: taskIds }
                },
                data: {
                    headApproverId: String(chairId)
                }
            });
            
            console.log(`🎉 [API] SUCCESS! Updated ${updateResult.count} tasks to new chair ${chairId}`);
        }
      } else {
          console.log("⚠️ [API] No programs found in this curriculum. Skipping task migration.");
      }
    }

    return NextResponse.json(updatedCurriculum);
  } catch (error) {
    console.error("❌ [API] Update Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}