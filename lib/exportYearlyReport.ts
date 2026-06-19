import * as XLSX from "xlsx";

interface InstructorData {
  id: string;
  name: string;
  email: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  isExternal?: boolean;
  externalFaculty?: string;
}

interface CourseData {
  code: string;
  name: string;
  credit: string | number;
  degreeLevel: string;
  isExternal?: boolean;
  instructors: InstructorData[];
}

interface SemesterGroup {
  termId: number;
  termTitle: string;
  courses: CourseData[];
}

// ── คำที่ใช้กรองเข้า (หมวดเฉพาะเจาะจง) ─────────────────────────────────────────
const SEMINAR_KEYWORDS = ["สัมมนา"];
const PROJECT_KEYWORDS = ["โครงงาน"];
const THESIS_KEYWORDS = ["วิทยานิพนธ์"];

// แบ่งกลุ่มคำของ 1.4 ฝึกงาน ออกเป็น 2 แบบ
const INTERNSHIP_INCLUDES = ["ฝึกงาน", "ปฏิบัติงาน", "สหกิจ", "ทักษะการบริบาล"]; // แค่มีคำพวกนี้อยู่ในชื่อก็ดึงมาเลย
const INTERNSHIP_STARTSWITH = ["ปฏิบัติการ"]; // ✅ ต้อง "ขึ้นต้น" ด้วยคำนี้เท่านั้น ถึงจะดึงมา

// ── ฟังก์ชันเช็คชื่อวิชา ───────────────────────────────────────────────────────
const isSeminar = (courseName: string) =>
  SEMINAR_KEYWORDS.some((kw) => courseName.includes(kw));

const isProject = (courseName: string) =>
  PROJECT_KEYWORDS.some((kw) => courseName.includes(kw));

const isThesis = (courseName: string) =>
  THESIS_KEYWORDS.some((kw) => courseName.includes(kw));

const isInternship = (courseName: string) => {
  const name = courseName.trim();
  return (
    INTERNSHIP_INCLUDES.some((kw) => name.includes(kw)) ||
    INTERNSHIP_STARTSWITH.some((kw) => name.startsWith(kw)) // ✅ เช็คแค่คำนำหน้า
  );
};

// ── คำที่ใช้กรองออก (บรรยาย + ปฏิบัติ ปกติ) ──────────────────────────────────
// ✅ โลจิกใหม่: ถ้ารายวิชานั้นไปตรงกับ สัมมนา, ฝึกงาน, โครงงาน หรือ วิทยานิพนธ์ แล้ว
// ให้เตะออกจากหมวด บรรยาย/ปฏิบัติการ ทันที ป้องกันการซ้อนทับ 100%
const isExcluded = (courseName: string) => {
  return (
    isSeminar(courseName) ||
    isInternship(courseName) ||
    isProject(courseName) ||
    isThesis(courseName)
  );
};

// ── แปลงชื่อภาคการศึกษาให้สั้น ───────────────────────────────────────────────
function shortenTerm(termTitle: string): string {
  if (termTitle.includes("ต้น")) return "ภาคต้น";
  if (termTitle.includes("ปลาย")) return "ภาคปลาย";
  if (termTitle.includes("ร้อน") || termTitle.includes("ฤดู")) return "ภาคฤดูร้อน";
  return termTitle;
}

// ── แปลง degree_level ให้เป็นชื่อเต็ม ────────────────────────────────────────
function normalizeLevel(level: string): string {
  if (!level || level === "-") return "-";
  const l = level.toLowerCase().trim();
  if (l.includes("ป.ตรี") || l.includes("ปตรี") || l.includes("bachelor") || l === "undergraduate") return "ปริญญาตรี";
  if (l.includes("ป.โท") || l.includes("ปโท") || l.includes("master")) return "ปริญญาโท";
  if (l.includes("ป.เอก") || l.includes("ปเอก") || l.includes("doctor") || l.includes("phd")) return "ปริญญาเอก";
  return level;
}

// ── แยกหน่วยกิตจาก credit string ─────────────────────────────────────────────
// รูปแบบ: "X (a-b-c)" → pos=0 คือบรรยาย, pos=1 คือปฏิบัติ/สัมมนา
// ถ้าเป็น "X (-)" หรือไม่มีวงเล็บ → คืน null
function extractCredit(credit: string | number, pos: 0 | 1): number | string {
  const str = String(credit).trim();
  const match = str.match(/\(([^)]+)\)/);
  if (!match) return str; // ไม่มีวงเล็บ คืนค่าเดิม
  const inner = match[1].trim();
  if (inner === "-") return "-";
  const parts = inner.split("-");
  const val = parts[pos]?.trim();
  if (val === undefined || val === "") return "-";
  const num = Number(val);
  return isNaN(num) ? val : num;
}

// ── คอลัมน์หัวตาราง ───────────────────────────────────────────────────────────
const COLUMNS = [
  "UPMAIL",
  "WORKLOAD_DETAIL",
  "SEMESTER",
  "LEVELNAME",
  "STUDENTCOUNT",
  "UNIT",
  "HOURS",
  "RESULT_HOURS",
  "REMARK",
];

// ── สร้าง rows ────────────────────────────────────────────────────────────────
// creditPos: 0 = บรรยาย (ตัวแรก), 1 = ปฏิบัติ/สัมมนา (ตัวที่สอง)
function buildRows(
  data: SemesterGroup[],
  filterFn: (course: CourseData) => boolean,
  hourKey: "lecture" | "lab",
  creditPos: 0 | 1
): any[][] {
  const rows: any[][] = [COLUMNS];

  data.forEach((term) => {
    const filtered = term.courses.filter(filterFn);
    filtered.forEach((course) => {
      const codeAndName = `${course.code} ${course.name}`.trim();
      const unit = extractCredit(course.credit, creditPos);

      // ✅ กรองเฉพาะ instructor ที่มีชั่วโมงในประเภทนั้น > 0
      const eligibleInstructors = course.instructors.filter(
        (inst) => (inst[hourKey] || 0) > 0
      );

      // ✅ ถ้าไม่มี instructor ที่มีชั่วโมงเลย ข้ามวิชานี้
      if (eligibleInstructors.length === 0) return;

      eligibleInstructors.forEach((inst) => {
        const hours = inst[hourKey];
        rows.push([
          inst.email,                          // UPMAIL
          codeAndName,                         // WORKLOAD_DETAIL
          shortenTerm(term.termTitle),         // SEMESTER
          normalizeLevel(course.degreeLevel),  // LEVELNAME
          "",                                  // STUDENTCOUNT
          unit,                                // UNIT (หน่วยกิตตามประเภท)
          hours,                               // HOURS
          hours,                               // RESULT_HOURS (= HOURS เผื่ออนาคต)
          course.isExternal ? "วิชานอกคณะ" : "", // REMARK
        ]);
      });
    });
  });

  return rows;
}

// ── สร้าง worksheet + column width ───────────────────────────────────────────
function makeSheet(rows: any[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 35 }, // UPMAIL
    { wch: 55 }, // WORKLOAD_DETAIL
    { wch: 14 }, // SEMESTER
    { wch: 16 }, // LEVELNAME
    { wch: 14 }, // STUDENTCOUNT
    { wch: 10 }, // UNIT
    { wch: 12 }, // HOURS
    { wch: 14 }, // RESULT_HOURS
    { wch: 20 }, // REMARK
  ];
  return ws;
}

// ── ชื่อไฟล์ ──────────────────────────────────────────────────────────────────
function makeFileName(type: string, year: string | number, label: string) {
  const safeYear = String(year).replace(/\//g, "-");
  const safeLabel = label.replace(/\s+/g, "_").replace(/[/\\]/g, "-");
  return `ภาระงานสอน_${type}_${safeLabel}_${safeYear}.xlsx`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 1: การสอนบรรยาย (1.1) → หน่วยกิตบรรยาย (ตัวแรก), ชั่วโมงบรรยาย
// ══════════════════════════════════════════════════════════════════════════════
export function exportLectureReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => !isExcluded(course.name), "lecture", 0);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("บรรยาย", year, curriculumLabel));
  return { empty: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 2: การสอนปฏิบัติการ (1.2) → หน่วยกิตปฏิบัติ (ตัวที่สอง), ชั่วโมงปฏิบัติ
// ══════════════════════════════════════════════════════════════════════════════
export function exportLabReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => !isExcluded(course.name), "lab", 1);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("ปฏิบัติการ", year, curriculumLabel));
  return { empty: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 3: การสอนสัมมนา (1.3) → หน่วยกิตปฏิบัติ (ตัวที่สอง), ชั่วโมงปฏิบัติ
// ══════════════════════════════════════════════════════════════════════════════
export function exportSeminarReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => isSeminar(course.name), "lab", 1);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("สัมมนา", year, curriculumLabel));
  return { empty: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 4: การสอนฝึกงาน/ปฏิบัติงาน (1.4) → หน่วยกิตปฏิบัติ (ตัวที่สอง), ชั่วโมงปฏิบัติ
// ══════════════════════════════════════════════════════════════════════════════
export function exportInternshipReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => isInternship(course.name), "lab", 1);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("ฝึกงาน_ปฏิบัติงาน", year, curriculumLabel));
  return { empty: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 5: การสอนโครงงาน (1.6.1) → หน่วยกิตปฏิบัติ (ตัวที่สอง), ชั่วโมงปฏิบัติ
// ══════════════════════════════════════════════════════════════════════════════
export function exportProjectReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => isProject(course.name), "lab", 1);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("โครงงาน", year, curriculumLabel));
  return { empty: false };
}

// ══════════════════════════════════════════════════════════════════════════════
// Export 6: การสอนวิทยานิพนธ์ (1.7) → หน่วยกิตปฏิบัติ (ตัวที่สอง), ชั่วโมงปฏิบัติ
// ══════════════════════════════════════════════════════════════════════════════
export function exportThesisReport(
  data: SemesterGroup[],
  year: string | number,
  curriculumLabel: string
) {
  const rows = buildRows(data, (course) => isThesis(course.name), "lab", 1);
  if (rows.length <= 1) return { empty: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(rows), "IMPORT");
  XLSX.writeFile(wb, makeFileName("วิทยานิพนธ์", year, curriculumLabel));
  return { empty: false };
}