// app/api/term-config/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; 

export async function GET() {
  try {
    // 1. ค้นหาปีการศึกษาที่เปิดใช้งานอยู่ (Active Year)
    const activeYear = await prisma.academicYear.findFirst({
      where: { isActive: true },
      include: {
        terms: true // ดึงข้อมูลเทอมทั้งหมด (1, 2, 3) มาด้วย
      }
    });

    // ถ้าไม่มีปีไหน Active เลย
    if (!activeYear) {
      return NextResponse.json(null, { status: 404 });
    }

    // 2. คำนวณหา "เทอมปัจจุบัน" จากวันที่ (Timeline Logic)
    const now = new Date();
    
    // ลองหาเทอมที่ วันนี้ อยู่ในช่วงเวลาดำเนินการ (ตั้งแต่ Step 1 ถึง Step 4)
    let currentTermConfig = activeYear.terms.find(term => {
        // ต้องมีวันเริ่มและวันจบครบถ้วนถึงจะเช็คได้
        if (!term.step1Start || !term.step4End) return false;
        
        const start = new Date(term.step1Start);
        const end = new Date(term.step4End);
        
        // ปรับเวลาให้ครอบคลุมทั้งวัน
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return now >= start && now <= end;
    });

    // 3. กรณี Fallback: ถ้าวันนี้ไม่อยู่ในช่วงเวลาของเทอมไหนเลย
    if (!currentTermConfig) {
        // ให้ Default เป็นเทอม 1 หรือเทอมแรกสุดที่หาเจอ
        currentTermConfig = activeYear.terms.find(t => t.semester === 1) || activeYear.terms[0];
    }

    // 4. ส่งข้อมูลกลับไป
    // รวมข้อมูล Config ของเทอมนั้น + ระบุเลขปีและเทอมให้ชัดเจน
    return NextResponse.json({
        ...currentTermConfig,
        academicYear: activeYear.id,      // เช่น 2569
        semester: currentTermConfig?.semester || 1 // เช่น 1
    });

  } catch (error) {
    console.error("Error fetching active term config:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}