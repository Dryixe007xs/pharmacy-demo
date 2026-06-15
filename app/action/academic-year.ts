"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// 1. Fetch all data
export async function getAcademicYearData() {
  try {
    const termConfigs = await db.termConfiguration.findMany({
      orderBy: [{ academicYear: 'desc' }, { semester: 'asc' }],
      include: {
        // ✅ เพิ่ม responsibleUser ใน courseOfferings
        courseOfferings: {
          include: {
            responsibleUser: {
              select: { id: true, title: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    const allSubjects = await db.subject.findMany({
      orderBy: { code: 'asc' },
      include: {
        program: {
          select: { id: true, name_th: true, year: true }
        }
      }
    });

    // ✅ ดึง users สำหรับ dropdown เลือก responsible
    const allUsers = await db.user.findMany({
      where: { userType: 'ACADEMIC', deletedAt: null },
      select: { id: true, title: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' }
    });

    const academicYears = await db.academicYear.findMany({
      orderBy: { id: 'desc' }
    });

    return { termConfigs, allSubjects, allUsers, academicYears };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { termConfigs: [], allSubjects: [], allUsers: [], academicYears: [] };
  }
}

// 2. Create Year (with Copy option)
export async function createAcademicYear(year: number, isCopyFromPrevious: boolean = false) {
  try {
    const existing = await db.academicYear.findUnique({ where: { id: year } });
    if (existing) return { success: false, message: `Academic year ${year} already exists.` };

    await db.$transaction(async (tx) => {
      await tx.academicYear.create({ data: { id: year, isActive: false } });

      const semesters = [1, 2, 3];
      for (const semester of semesters) {
        const newTerm = await tx.termConfiguration.create({
          data: { academicYear: year, semester: semester }
        });

        if (isCopyFromPrevious) {
          const previousYear = year - 1;
          const prevTermConfig = await tx.termConfiguration.findUnique({
            where: {
              academicYear_semester: { academicYear: previousYear, semester: semester }
            },
            include: { courseOfferings: true }
          });

          if (prevTermConfig && prevTermConfig.courseOfferings.length > 0) {
            const subjectsToOpen = prevTermConfig.courseOfferings
              .filter(c => c.isOpen)
              .map(c => ({
                termConfigId: newTerm.id,
                subjectId: c.subjectId,
                isOpen: true,
                // ✅ copy responsibleUserId มาด้วย
                responsibleUserId: c.responsibleUserId ?? null
              }));

            if (subjectsToOpen.length > 0) {
              await tx.courseOffering.createMany({ data: subjectsToOpen });
            }
          }
        }
      }
    });

    revalidatePath("/admin/academic-year");
    return { success: true, message: `Created academic year ${year} successfully.` };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create academic year." };
  }
}

// 3. Delete Year
export async function deleteAcademicYear(year: number) {
  try {
    const target = await db.academicYear.findUnique({ where: { id: year } });
    if (target?.isActive) {
      return { success: false, message: "Cannot delete an active academic year." };
    }
    await db.academicYear.delete({ where: { id: year } });
    revalidatePath("/admin/academic-year");
    return { success: true, message: `Deleted academic year ${year} successfully.` };
  } catch (error) {
    console.error("Error deleting year:", error);
    return { success: false, message: "Failed to delete academic year." };
  }
}

// 4. Set Active Year
export async function setActiveYear(year: number) {
  try {
    await db.$transaction(async (tx) => {
      await tx.academicYear.updateMany({ data: { isActive: false } });
      await tx.academicYear.update({ where: { id: year }, data: { isActive: true } });
    });
    revalidatePath("/admin/academic-year");
    return { success: true, message: `Set academic year ${year} as active.` };
  } catch (error) {
    return { success: false, message: "Failed to set active year." };
  }
}

// 5. Update Timeline
export async function updateTimeline(termConfigId: string, data: any) {
  try {
    await db.termConfiguration.update({ where: { id: termConfigId }, data: data });
    revalidatePath("/admin/academic-year");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// 6. Toggle Course
export async function toggleCourseOffering(termConfigId: string, subjectId: number, isOpen: boolean) {
  try {
    if (isOpen) {
      await db.courseOffering.upsert({
        where: { termConfigId_subjectId: { termConfigId, subjectId } },
        create: { termConfigId, subjectId, isOpen: true },
        update: { isOpen: true }
      });
    } else {
      await db.courseOffering.updateMany({
        where: { termConfigId, subjectId },
        data: { isOpen: false }
      });
    }
    revalidatePath("/admin/academic-year");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// 7. ✅ เพิ่มใหม่ — Update responsible ของ CourseOffering
export async function updateCourseResponsible(
  termConfigId: string,
  subjectId: number,
  responsibleUserId: string | null
) {
  try {
    await db.courseOffering.upsert({
      where: { termConfigId_subjectId: { termConfigId, subjectId } },
      create: { termConfigId, subjectId, isOpen: false, responsibleUserId },
      update: { responsibleUserId }
    });
    revalidatePath("/admin/academic-year");
    return { success: true };
  } catch (error) {
    console.error("Error updating responsible:", error);
    return { success: false };
  }
}