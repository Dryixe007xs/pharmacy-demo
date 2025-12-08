import { PrismaClient, Program, Role, UserType } from '@prisma/client' 
import bcrypt from 'bcryptjs' 
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// --- Constants ---
const COURSES_DATA_FILE = 'courses_data.json'; 
const USERS_DATA_FILE = 'users_data.json'; 

// Helper: แยกชื่อหลักสูตรและปี พ.ศ. (แก้ไขใหม่ให้รองรับ "ตกแผน")
function parseProgramInfo(curriculumFull: string): { name: string, year: number | null } {
    if (!curriculumFull) return { name: '', year: null };
    
    // 1. ดึงปี พ.ศ. ออกมา
    const yearMatch = curriculumFull.match(/พ\.ศ\.\s*(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
    
    // 2. ทำความสะอาดชื่อหลักสูตร
    // ลบส่วนที่เป็น (พ.ศ. xxxx) ออก แต่เก็บส่วนอื่นไว้
    let name = curriculumFull.replace(/\(พ\.ศ\.\s*\d{4}.*\)/, '').trim(); 
    
    // ตัดคำว่า สาขาวิชา... ถ้าต้องการให้ชื่อสั้นลง (Optional)
    const branchIndex = name.indexOf('สาขาวิชา');
    if (branchIndex !== -1) {
        name = name.substring(0, branchIndex).trim();
    }

    // *** จุดสำคัญที่เพิ่มเข้ามา *** // ถ้าต้นฉบับมีคำว่า "ตกแผน" ให้เติมต่อท้ายชื่อด้วย เพื่อให้เป็นคนละหลักสูตรกับตัวปกติ
    if (curriculumFull.includes("ตกแผน")) {
        name = `${name} (ตกแผน)`;
    }

    return { name, year };
}

// Helper: ล้างข้อมูลเก่า
async function clearData() {
    console.log('\n🧹 Clearing Program & Subject Data...');
    await prisma.teachingAssignment.deleteMany({});
    await prisma.subject.deleteMany({});
    await prisma.program.deleteMany({});
    console.log('✅ Cleared course-related data.');
}

async function main() {
  console.log('🚀 Start seeding...')
  const defaultPassword = await bcrypt.hash('password123', 10);

  // =======================================================
  // 1. SEED USERS
  // =======================================================
  const userFilePath = path.join(__dirname, USERS_DATA_FILE)
  if (!fs.existsSync(userFilePath)) {
    console.error(`❌ ไม่พบไฟล์ ${USERS_DATA_FILE}`); return;
  }
  
  const usersData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
  console.log(`Found ${usersData.length} users.`);

  for (const row of usersData) {
    if (!row.email) continue

    let userType: UserType = UserType.ACADEMIC; 
    const curriculumCheck = row.curriculum || ""; 
    if (curriculumCheck.includes("สายสนับสนุน")) {
        userType = UserType.SUPPORT;
    }

    const jsonRoleText = row.role ? row.role.trim() : ""; 
    let systemRole: Role = Role.LECTURER; 

    if (userType === UserType.SUPPORT) {
        systemRole = Role.ADMIN;
    } else if (jsonRoleText.includes("รอง")) {
        systemRole = Role.VICE_DEAN; 
    } else if (jsonRoleText.includes("ประธานหลักสูตร")) {
        systemRole = Role.PROGRAM_CHAIR; 
    }

    try {
      const baseUserData = {
        email: row.email.trim(),
        title: row.title ? row.title.trim() : null,
        academicPosition: row.academicPosition ? row.academicPosition.trim() : null,
        firstName: row.firstName ? row.firstName.trim() : null,
        lastName: row.lastName ? row.lastName.trim() : null,
        academicRank: row.academicRank ? row.academicRank.trim() : null,
        workStatus: row.workStatus,
        department: row.department ? row.department.trim() : null, 
        curriculum: row.curriculum ? row.curriculum.trim() : null, 
        adminTitle: row.role ? row.role.trim() : null, 
        role: systemRole, 
        userType: userType, 
      };

      await prisma.user.upsert({
        where: { email: row.email },
        update: { ...baseUserData },
        create: { ...baseUserData, password: defaultPassword },
      })
    } catch (e) {
      console.error(`❌ Error user ${row.email}:`, e)
    }
  }
  console.log('✅ Users Processed.');

  // =======================================================
  // 2. SEED PROGRAMS & SUBJECTS
  // =======================================================
  
  await clearData();

  const courseFilePath = path.join(__dirname, COURSES_DATA_FILE)
  if (!fs.existsSync(courseFilePath)) { 
      console.warn(`⚠️ ไม่พบไฟล์ ${COURSES_DATA_FILE}`); 
      return; 
  }
  
  const sampleSubjectData = JSON.parse(fs.readFileSync(courseFilePath, 'utf8'));
  console.log(`Found ${sampleSubjectData.length} course records.`);

  const pc_nat = await prisma.user.findUnique({ where: { email: 'nat.na@up.ac.th' } });
  const programMap = new Map<string, Program>();

  for (const item of sampleSubjectData) {
      // 2.1 แยกชื่อหลักสูตร (ตอนนี้จะแยก ตกแผน/ปกติ ออกจากกันแล้ว)
      const { name: programNameTh, year: programYear } = parseProgramInfo(item.curriculum_full || "");
      const programKey = `${programNameTh}-${programYear}`;
      
      let program = programMap.get(programKey);
      
      // 2.2 สร้าง Program ถ้ายังไม่มี
      if (!program && programNameTh) {
          program = await prisma.program.findFirst({ 
              where: { name_th: programNameTh, year: programYear || undefined } 
          }) || undefined;
          
          if (!program) {
              program = await prisma.program.create({
                  data: {
                      name_th: programNameTh,
                      year: programYear || 0,
                      degree_level: item.degree_level || "ป.ตรี",
                      programChairId: pc_nat?.id, 
                  }
              });
              console.log(`✨ Created Program: ${programNameTh} (${programYear})`);
          }
          programMap.set(programKey, program);
      }
      
      if (!program) continue;

      let responsibleUserId = null;
      if (item.lecturer_email) {
          const responsiblePerson = await prisma.user.findUnique({
              where: { email: item.lecturer_email.trim() }
          });
          if (responsiblePerson) {
              responsibleUserId = responsiblePerson.id;
          }
      }

      const subjectCode = item.code ? item.code.toString() : 'UNKNOWN';
      
      // 2.3 Upsert วิชา (ตอนนี้ programId จะต่างกันแล้วถ้าระหว่าง ปกติ กับ ตกแผน)
      await prisma.subject.upsert({
          where: { 
              code_programId: { 
                  code: subjectCode, 
                  programId: program.id 
              } 
          }, 
          update: {
              name_th: item.nameTh,
              name_en: item.nameEn,
              credit: item.credit, 
              program_full_name: item.curriculum_full,
              responsibleUserId: responsibleUserId,
          },
          create: {
              code: subjectCode,
              name_th: item.nameTh,
              name_en: item.nameEn,
              credit: item.credit,
              program_full_name: item.curriculum_full,
              programId: program.id,
              responsibleUserId: responsibleUserId,
              instructor: null 
          }
      });
  }
  
  console.log('🎉 Course & Subject Seeding Finished!');
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })