"use server";

import { prisma as db } from "@/lib/prisma";// หรือ import { prisma as db } from "@/lib/prisma"; ตามที่คุณตั้งค่าไว้
import { revalidatePath } from "next/cache";

// 1. ดึงข้อมูลทั้งหมดมาแสดง (Load Data)
export async function getAcademicYearData() {
  try {
    // ดึง Config ของทุกเทอม
    const termConfigs = await db.termConfiguration.findMany({
      orderBy: [{ academicYear: 'desc' }, { semester: 'asc' }],
      include: {
        courseOfferings: true // ดึงข้อมูลวิชาที่เปิดสอนมาด้วย
      }
    });

    // ดึงวิชาทั้งหมด (Master Subject) 
    // ✅ อัปเดต: ดึงข้อมูลผู้รับผิดชอบ (responsibleUser) และ หลักสูตร (program) มาด้วย
    const allSubjects = await db.subject.findMany({
        orderBy: { code: 'asc' },
        include: {
            responsibleUser: {
                select: {
                    id: true,
                    title: true,
                    firstName: true,
                    lastName: true
                }
            },
            program: {
                select: {
                    id: true,
                    name_th: true,
                    year: true
                }
            }
        }
    });

    return { termConfigs, allSubjects };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { termConfigs: [], allSubjects: [] };
  }
}

// 2. สร้างปีการศึกษาใหม่ (Create Year)
export async function createAcademicYear(year: number) {
  try {
    // เช็คก่อนว่ามีปีนี้หรือยัง
    const existing = await db.termConfiguration.findFirst({
      where: { academicYear: year }
    });

    if (existing) {
      return { success: false, message: "ปีการศึกษานี้มีอยู่แล้ว" };
    }

    // สร้าง 3 เทอมรวดเดียว (1, 2, 3)
    await db.termConfiguration.createMany({
      data: [
        { academicYear: year, semester: 1 },
        { academicYear: year, semester: 2 },
        { academicYear: year, semester: 3 }, // ภาคฤดูร้อน
      ]
    });

    revalidatePath("/manage/academic-year"); // รีเฟรชหน้าจอ (แก้ path ตามที่คุณใช้งานจริง)
    return { success: true, message: `สร้างปี ${year} เรียบร้อย` };
  } catch (error) {
    console.error(error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างปี" };
  }
}

// 3. เปิดใช้งานเทอม (Set Active Term)
export async function setActiveTerm(termConfigId: string) {
  try {
    // ใช้ Transaction เพื่อความชัวร์ (ปิดทุกอัน -> เปิดอันเดียว)
    await db.$transaction([
      // 1. ปิด isActive ของทุกเทอมให้เป็น false
      db.termConfiguration.updateMany({
        data: { isActive: false }
      }),
      // 2. เปิด isActive ของเทอมที่เลือกเป็น true
      db.termConfiguration.update({
        where: { id: termConfigId },
        data: { isActive: true }
      })
    ]);

    revalidatePath("/manage/academic-year");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

// 4. อัปเดต Timeline (Update Timeline)
export async function updateTimeline(
  termConfigId: string, 
  data: { 
    step1Start?: Date, step1End?: Date,
    step2Start?: Date, step2End?: Date,
    step3Start?: Date, step3End?: Date,
    step4Start?: Date, step4End?: Date,
  }
) {
  try {
    await db.termConfiguration.update({
      where: { id: termConfigId },
      data: data
    });
    
    revalidatePath("/manage/academic-year");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

// 5. เปิด/ปิด รายวิชา (Toggle Course)
export async function toggleCourseOffering(
  termConfigId: string, 
  subjectId: number, 
  isOpen: boolean
) {
  try {
    if (isOpen) {
      // ถ้าสั่งเปิด -> สร้าง record ใน CourseOffering
      await db.courseOffering.upsert({
        where: {
          termConfigId_subjectId: {
            termConfigId,
            subjectId
          }
        },
        create: { termConfigId, subjectId, isOpen: true },
        update: { isOpen: true }
      });
    } else {
      // ถ้าสั่งปิด -> set isOpen = false
      await db.courseOffering.updateMany({
        where: { termConfigId, subjectId },
        data: { isOpen: false }
      });
    }

    revalidatePath("/manage/academic-year");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}