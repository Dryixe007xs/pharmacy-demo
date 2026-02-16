// app/api/curriculums/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// =========================================================
// GET: ดึงข้อมูลหลักสูตรทั้งหมด
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
            adminTitle: true
          }
        },
        _count: { 
          select: { 
            staffs: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    return NextResponse.json(curriculums);
  } catch (error) {
    console.error("GET Curriculums Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch curriculums" }, 
      { status: 500 }
    );
  }
}

// =========================================================
// POST: สร้างหลักสูตรใหม่
// =========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: "ต้องระบุชื่อหลักสูตร" }, 
        { status: 400 }
      );
    }

    const newCurriculum = await prisma.curriculum.create({
      data: {
        name: body.name,
        chairId: body.chairId || null
      },
      include: {
        chair: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json(newCurriculum, { status: 201 });
  } catch (error) {
    console.error("POST Curriculum Error:", error);
    return NextResponse.json(
      { error: "Failed to create curriculum" }, 
      { status: 500 }
    );
  }
}

// =========================================================
// PUT: อัปเดตหลักสูตร + ย้ายงานที่ค้างอนุมัติ
// =========================================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, chairId, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID required" }, 
        { status: 400 }
      );
    }

    console.log(`🔄 [API] Updating Curriculum #${id} -> New Chair: ${chairId}`);

    // ✅ 1. อัปเดตข้อมูลหลักสูตร
    const updatedCurriculum = await prisma.curriculum.update({
      where: { id: Number(id) },
      data: {
        name: name || undefined,
        chairId: chairId !== undefined ? (chairId || null) : undefined
      },
      include: {
        chair: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            email: true
          }
        }
      }
    });

    console.log("✅ [API] Curriculum updated successfully");

    // =========================================================================
    // 🔥 2. ย้ายภาระงานที่ค้างอนุมัติ (เฉพาะรายวิชาของบุคลากรในหลักสูตรนี้)
    // =========================================================================
    if (chairId) {
      console.log(`🔄 [API] Migrating pending tasks to new chair...`);

      // ขั้นตอน 1: หาบุคลากรทั้งหมดในหลักสูตรนี้
      const staffIds = await prisma.user.findMany({
        where: { curriculumId: Number(id) },
        select: { id: true }
      });

      const staffIdList = staffIds.map(s => s.id);
      console.log(`🔎 [API] Found ${staffIdList.length} staff members in Curriculum #${id}`);

      if (staffIdList.length > 0) {
        // ขั้นตอน 2: หางานที่ค้างอนุมัติของบุคลากรเหล่านี้
        const pendingTasks = await prisma.teachingAssignment.findMany({
          where: {
            lecturerId: { in: staffIdList },
            headApprovalStatus: 'PENDING'
          },
          select: { 
            id: true, 
            lecturerId: true,
            subject: {
              select: {
                code: true,
                name_th: true
              }
            }
          }
        });

        console.log(`🔎 [API] Found ${pendingTasks.length} pending tasks to migrate`);

        if (pendingTasks.length > 0) {
          const taskIds = pendingTasks.map(t => t.id);
          
          // ขั้นตอน 3: ย้ายงานไปให้ประธานคนใหม่
          const updateResult = await prisma.teachingAssignment.updateMany({
            where: {
              id: { in: taskIds }
            },
            data: {
              headApproverId: String(chairId)
            }
          });
          
          console.log(`✅ [API] Migrated ${updateResult.count} tasks to new chair ${chairId}`);
        } else {
          console.log("ℹ️ [API] No pending tasks to migrate");
        }
      } else {
        console.log("⚠️ [API] No staff members in this curriculum");
      }
    }

    return NextResponse.json(updatedCurriculum);
  } catch (error) {
    console.error("❌ [API] Update Error:", error);
    return NextResponse.json(
      { error: "Update failed" }, 
      { status: 500 }
    );
  }
}

// =========================================================
// DELETE: ลบหลักสูตร
// =========================================================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID required" }, 
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีบุคลากรในหลักสูตรนี้หรือไม่
    const staffCount = await prisma.user.count({
      where: { curriculumId: Number(id) }
    });

    if (staffCount > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เนื่องจากมีบุคลากร ${staffCount} คนในหลักสูตรนี้` },
        { status: 400 }
      );
    }

    await prisma.curriculum.delete({
      where: { id: Number(id) }
    });

    console.log(`✅ [API] Deleted Curriculum #${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [API] Delete Error:", error);
    return NextResponse.json(
      { error: "Delete failed" }, 
      { status: 500 }
    );
  }
}