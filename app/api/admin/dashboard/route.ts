import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semesterParam = searchParams.get('semester');
  const yearParam = searchParams.get('year');

  try {
    // 1. หาข้อมูล Term ID ที่ต้องการก่อน (สำคัญมาก เพื่อเอาไปกรอง CourseOffering)
    let targetYear: number;
    let targetSemester: number;

    // ถ้ามีการส่งค่ามา ให้ใช้ค่านั้น ถ้าไม่มีให้หา Active Term
    if (semesterParam && yearParam) {
        targetYear = parseInt(yearParam);
        targetSemester = parseInt(semesterParam);
    } else {
        const activeTerm = await prisma.termConfiguration.findFirst({ where: { isActive: true } });
        if (!activeTerm) return NextResponse.json({ data: [], meta: {} });
        targetYear = activeTerm.academicYear;
        targetSemester = activeTerm.semester;
    }

    // หา ID ของ Term นั้นๆ เพื่อเอาไป Query ต่อ
    const targetTermConfig = await prisma.termConfiguration.findFirst({
        where: {
            academicYear: targetYear,
            semester: targetSemester
        }
    });

    if (!targetTermConfig) {
        return NextResponse.json({ data: [], meta: { year: targetYear, semester: targetSemester } });
    }

    // 2. ดึงข้อมูลอาจารย์ + วิชา (โดยกรองเฉพาะวิชาที่เปิดสอนในเทอมนี้)
    const instructors = await prisma.user.findMany({
        where: {
            // (Optional) อาจจะกรองเฉพาะคนที่มี Role เป็น USER/INSTRUCTOR
            // role: { not: 'ADMIN' } 
        },
        orderBy: { firstName: 'asc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            responsibleSubjects: {
                // ✅ แก้ไขจุดนี้: กรองเฉพาะวิชาที่ "เปิดสอน" (Open) ในเทอมนี้เท่านั้น
                where: {
                    courseOfferings: {
                        some: {
                            termConfigId: targetTermConfig.id, // ต้องตรงกับเทอมที่เลือก
                            isOpen: true // และสถานะต้องเปิด
                        }
                    }
                },
                select: {
                    id: true,
                    code: true,
                    name_th: true,
                    // ดึง Assignments มาเช็คสถานะเหมือนเดิม
                    teachingAssignments: {
                        where: {
                            academicYear: targetYear,
                            semester: targetSemester
                        },
                        select: {
                            lecturerStatus: true,
                            responsibleStatus: true,
                            headApprovalStatus: true
                        }
                    }
                }
            }
        }
    });

    // 3. Transform Data (เหมือนเดิม แต่ตอนนี้ courses จะมีแค่ 78 วิชาตามที่ต้องการแล้ว)
    const dashboardData = instructors.map(inst => {
        const courses = inst.responsibleSubjects.map(sub => {
            const assigns = sub.teachingAssignments;
            let status = 'WAITING'; // เริ่มต้นเป็น รอเริ่ม (เพราะวิชาเปิดแล้ว แต่ยังไม่มี Assignment)

            if (assigns.length > 0) {
                const allApproved = assigns.every(a => a.headApprovalStatus === 'APPROVED');
                const anyRejected = assigns.some(a => a.headApprovalStatus === 'REJECTED' || a.responsibleStatus === 'REJECTED');
                const allSubmitted = assigns.every(a => a.responsibleStatus === 'APPROVED');

                if (allApproved) status = 'APPROVED';
                else if (anyRejected) status = 'REJECTED';
                else if (allSubmitted) status = 'PENDING_HEAD';
                else status = 'IN_PROGRESS';
            }

            return {
                id: sub.id,
                code: sub.code,
                name: sub.name_th,
                status: status
            };
        });

        return {
            id: String(inst.id),
            name: `${inst.title || ''}${inst.firstName} ${inst.lastName}`.trim(),
            department: "คณะเภสัชศาสตร์",
            courses: courses
        };
    }).filter(inst => inst.courses.length > 0); // ตัดอาจารย์ที่ไม่มีสอนในเทอมนี้ออก

    return NextResponse.json({
        data: dashboardData,
        meta: { year: targetYear, semester: targetSemester }
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}