import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const semesterParam = searchParams.get('semester');
  const yearParam = searchParams.get('year');

  try {
    // 1. หาข้อมูล Term ID เป้าหมาย (Logic เดิม: หาเทอมล่าสุด)
    let targetYear: number;
    let targetSemester: number;

    if (semesterParam && yearParam) {
        targetYear = parseInt(yearParam);
        targetSemester = parseInt(semesterParam);
    } else {
        const latestTerm = await prisma.termConfiguration.findFirst({
            orderBy: [
                { academicYear: 'desc' },
                { semester: 'desc' }
            ]
        });

        if (!latestTerm) return NextResponse.json({ data: [], meta: {} });
        targetYear = latestTerm.academicYear;
        targetSemester = latestTerm.semester;
    }

    const targetTermConfig = await prisma.termConfiguration.findFirst({
        where: { academicYear: targetYear, semester: targetSemester }
    });

    if (!targetTermConfig) {
        return NextResponse.json({ data: [], meta: { year: targetYear, semester: targetSemester } });
    }

    // 2. ดึงข้อมูลอาจารย์
    const instructors = await prisma.user.findMany({
        orderBy: { firstName: 'asc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            title: true,
            responsibleSubjects: {
                where: {
                    courseOfferings: {
                        some: {
                            termConfigId: targetTermConfig.id,
                            isOpen: true
                        }
                    }
                },
                select: {
                    id: true,
                    code: true,
                    name_th: true,
                    teachingAssignments: {
                        where: {
                            // เช็ค Assignment ที่ผูกกับ Subject นี้
                            academicYear: targetYear,
                            semester: targetSemester
                        },
                        select: {
                            lecturerStatus: true,
                            responsibleStatus: true,
                            headApprovalStatus: true,
                            academicApprovalStatus: true // ✅ เปลี่ยนมาใช้รองวิชาการแทนคณบดี
                        }
                    }
                }
            }
        }
    });

    // 3. แปลงข้อมูล
    const dashboardData = instructors.map(inst => {
        const courses = inst.responsibleSubjects.map(sub => {
            const assigns = sub.teachingAssignments;
            let status = 'WAITING'; 
            
            // ตัวแปรสำหรับส่งไป Frontend ให้เช็คละเอียด
            let headStatus = 'PENDING';
            let academicStatus = 'PENDING'; // ✅ เปลี่ยนตัวแปรให้ตรงความหมาย

            if (assigns.length > 0) {
                const allHeadApproved = assigns.every(a => a.headApprovalStatus === 'APPROVED');
                const allAcademicApproved = assigns.every(a => a.academicApprovalStatus === 'APPROVED'); // ✅ เปลี่ยน logic เช็ครองวิชาการ
                const anyRejected = assigns.some(a => a.headApprovalStatus === 'REJECTED' || a.responsibleStatus === 'REJECTED' || a.academicApprovalStatus === 'REJECTED');
                const allSubmitted = assigns.every(a => a.responsibleStatus === 'APPROVED');

                // Set ค่าสถานะรวม เพื่อส่งไปให้ Frontend ใช้
                if (allHeadApproved) headStatus = 'APPROVED';
                if (allAcademicApproved) academicStatus = 'APPROVED';

                // Logic คำนวณ Status หลัก (สำหรับแสดงผลเบื้องต้น)
                if (allAcademicApproved) status = 'APPROVED'; // ✅ จบกระบวนการจริงที่รองวิชาการ (สีเขียว)
                else if (allHeadApproved) status = 'PENDING_ACADEMIC'; // ✅ ประธานจบ รอรองฯ (เปลี่ยนจาก PENDING_DEAN)
                else if (anyRejected) status = 'REJECTED';
                else if (allSubmitted) status = 'PENDING_HEAD';
                else status = 'IN_PROGRESS';
            }

            return {
                id: sub.id,
                code: sub.code,
                name: sub.name_th,
                status: status,                 // สถานะสรุป
                headApprovalStatus: headStatus, // ส่งค่านี้ไปให้ Frontend ใช้เช็ค
                academicApprovalStatus: academicStatus  // ✅ เปลี่ยนชื่อ Key เป็น academic แทน dean
            };
        });

        return {
            id: String(inst.id),
            name: `${inst.title || ''}${inst.firstName} ${inst.lastName}`.trim(),
            department: "คณะเภสัชศาสตร์",
            courses: courses
        };
    }).filter(inst => inst.courses.length > 0);

    return NextResponse.json({
        data: dashboardData,
        meta: { year: targetYear, semester: targetSemester }
    });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}