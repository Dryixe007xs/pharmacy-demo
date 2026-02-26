"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface InstructorData {
  id: string;
  name: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  isExternal: boolean;
  externalFaculty?: string;
}

interface CourseData {
  code: string;
  name: string;
  nameEn: string;
  credit: string | number;
  isExternal: boolean;
  externalFaculty?: string;
  instructors: InstructorData[];
}

interface SemesterGroup {
  termId: number;
  termTitle: string;
  courses: CourseData[];
}

interface Signatory {
  firstName: string;
  lastName: string;
  academicPosition: string;
  adminTitle?: string;
}

interface ProgramChair {
  firstName: string;
  lastName: string;
  academicPosition?: string;
  title?: string;
}

function YearlyPrintContent() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") || "2569";
  const curriculum = searchParams.get("curriculum") || "all";
  const curriculumLabel = searchParams.get("curriculumLabel") || "รวมทุกหลักสูตร";

  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<SemesterGroup[]>([]);
  const [viceDean, setViceDean] = useState<Signatory | null>(null);
  const [programChair, setProgramChair] = useState<ProgramChair | null>(null);
  const [printDate, setPrintDate] = useState("");

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/report/yearly?year=${year}&curriculum=${curriculum}`);
        if (!res.ok) throw new Error("Failed");

        const { assignments, viceDean, programChair } = await res.json();
        setViceDean(viceDean);
        if (programChair) setProgramChair(programChair);

        const termsMap = new Map<number, Map<string, CourseData>>();
        [1, 2, 3].forEach((termId) => termsMap.set(termId, new Map()));

        assignments.forEach((assign: any) => {
          const termId = assign.semester;
          const termCourses = termsMap.get(termId);
          if (!termCourses) return;

          const isExternal = assign.courseType === "EXTERNAL";

          const code = isExternal
            ? assign.externalCourseCode || assign.subject.code
            : assign.subject.code;
          const name = isExternal
            ? assign.externalCourseName || assign.subject.name_th
            : assign.subject.name_th;
          const nameEn = isExternal
            ? assign.externalCourseNameEn || assign.subject?.name_en || ""
            : assign.subject.name_en || "";
          const credit = isExternal
            ? assign.externalCredit || assign.subject.credit
            : assign.subject.credit;

          const groupKey = `${isExternal ? "EXT" : "INT"}_${code}`;

          if (!termCourses.has(groupKey)) {
            termCourses.set(groupKey, {
              code,
              name,
              nameEn,
              credit,
              isExternal,
              externalFaculty: assign.externalFaculty || "",
              instructors: [],
            });
          }

          const course = termCourses.get(groupKey)!;
          const title = assign.lecturer.title || "";
          const fullName = `${title} ${assign.lecturer.firstName} ${assign.lecturer.lastName}`.trim();
          const isResponsible =
            !isExternal &&
            String(assign.lecturer.id) === String(assign.subject.responsibleUserId);

          const alreadyAdded = course.instructors.some((i) => i.id === assign.lecturer.id);
          if (!alreadyAdded) {
            course.instructors.push({
              id: assign.lecturer.id,
              name: fullName,
              role: isExternal ? "ผู้สอน" : isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน",
              lecture: assign.lectureHours || 0,
              lab: assign.labHours || 0,
              exam: assign.examHours || 0,
              critique: assign.examCritiqueHours || 0,
              isExternal,
              externalFaculty: assign.externalFaculty || "",
            });
          }
        });

        const results: SemesterGroup[] = [
          { termId: 1, termTitle: "ภาคการศึกษาต้น", courses: [] },
          { termId: 2, termTitle: "ภาคการศึกษาปลาย", courses: [] },
          { termId: 3, termTitle: "ภาคฤดูร้อน", courses: [] },
        ];
        results.forEach((g) => {
          const m = termsMap.get(g.termId);
          if (m)
            g.courses = Array.from(m.values()).sort((a, b) =>
              a.code.localeCompare(b.code)
            );
        });

        setProcessedData(
          results.filter(
            (t) => !(t.termTitle === "ภาคฤดูร้อน" && t.courses.length === 0)
          )
        );

        setLoading(false);
        setTimeout(() => window.print(), 1000);
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };
    fetchData();
  }, [year, curriculum]);

  const formatName = (p: Signatory | null) =>
    p ? `${p.academicPosition || ""} ${p.firstName} ${p.lastName}`.trim() : "-";

  // ชื่อประธานหลักสูตร — ใช้จาก API ก่อน ถ้าไม่มีให้ parse จาก curriculumLabel
  const getChairDisplayName = () => {
    if (programChair) {
      const prefix = programChair.academicPosition || programChair.title || "";
      return `${prefix} ${programChair.firstName} ${programChair.lastName}`.trim();
    }
    // fallback: ถ้า API ไม่ส่ง programChair มา ให้แสดงเส้นว่างไว้เซ็น
    return null;
  };

  const termTotal = (term: SemesterGroup) => {
    let lecture = 0, lab = 0, exam = 0, critique = 0;
    term.courses.forEach((c) =>
      c.instructors.forEach((i) => {
        lecture += i.lecture;
        lab += i.lab;
        exam += i.exam;
        critique += i.critique;
      })
    );
    return { lecture, lab, exam, critique };
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center font-sarabun">
        <Loader2 className="animate-spin mr-2" /> กำลังเตรียมเอกสาร...
      </div>
    );

  const colWidths = ["18%", "22%", "22%", "9.5%", "9.5%", "9.5%", "9.5%"];
  const chairName = getChairDisplayName();

  return (
    <div className="bg-white text-black font-sarabun w-full min-h-screen p-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
            margin-top: 0;
            margin-bottom: 0;
          }
          @page { -webkit-margin-before: 0; -webkit-margin-after: 0; }
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 4px 6px; font-size: 12px; }
          thead { display: table-header-group; }
          tbody { display: table-row-group; }
          .term-block { break-inside: avoid; }
          .no-break { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-black">
        <div className="relative w-14 h-14 shrink-0">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black leading-snug">
            รายงานสรุปภาระงานสอนรายปี ประจำปีการศึกษา {year}
          </h1>
          <h2 className="text-base font-bold text-gray-800 mt-0.5">{curriculumLabel}</h2>
          <p className="text-sm text-gray-500 mt-0.5">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
        </div>
      </div>

      {/* col header */}
      <table className="w-full text-sm border-collapse">
        <colgroup>
          {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
        <thead>
          <tr className="bg-gray-100 text-black font-bold text-center">
            <th className="border border-black px-2 py-1 text-left">รหัสวิชา</th>
            <th className="border border-black px-2 py-1 text-left">ชื่อรายวิชา</th>
            <th className="border border-black px-2 py-1">ผู้สอน</th>
            <th className="border border-black px-1 py-1">บรรยาย(ชม.)</th>
            <th className="border border-black px-1 py-1">ปฏิบัติ(ชม.)</th>
            <th className="border border-black px-1 py-1">คุมสอบนอกตาราง(ชม.)</th>
            <th className="border border-black px-1 py-1">วิพากษ์(หัวข้อ)</th>
          </tr>
        </thead>
      </table>

      {processedData.map((term, tIdx) => {
        const total = termTotal(term);
        return (
          <div key={tIdx} className="term-block">
            <table className="w-full text-sm border-collapse">
              <colgroup>
                {colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
              </colgroup>
              <tbody>
                {/* term header */}
                <tr>
                  <td
                    colSpan={7}
                    className="py-1.5 px-3 font-bold border border-black bg-gray-100"
                  >
                    {term.termTitle}
                  </td>
                </tr>

                {term.courses.map((course, cIndex) =>
                  course.instructors.map((inst, iIndex) => {
                    const isFirst = iIndex === 0;
                    const rowSpanCount = course.instructors.length;

                    return (
                      <tr key={`${cIndex}-${iIndex}`} className="no-break">
                        {isFirst && (
                          <td
                            rowSpan={rowSpanCount}
                            className="align-top border border-black px-2 py-1 bg-white"
                          >
                            <div className="font-bold text-black">{course.code}</div>
                            {course.isExternal && (
                              <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-300 px-1 py-0.5 rounded">
                                นอกคณะ{course.externalFaculty ? `: ${course.externalFaculty}` : ""}
                              </span>
                            )}
                            <div className="text-[10px] mt-0.5 text-gray-500">
                              {course.credit} หน่วยกิต
                            </div>
                          </td>
                        )}

                        {isFirst && (
                          <td
                            rowSpan={rowSpanCount}
                            className="align-top border border-black px-2 py-1 bg-white"
                          >
                            <div className="text-[11px] text-black font-medium">{course.name}</div>
                            {course.nameEn && (
                              <div className="text-[10px] text-gray-500 mt-0.5 italic">
                                {course.nameEn}
                              </div>
                            )}
                          </td>
                        )}

                        {/* ผู้สอน */}
                        <td className="align-top border border-black px-2 py-1">
                          <div className="font-medium text-black text-[11px]">{inst.name}</div>
                          <div className="text-[10px] text-gray-600">({inst.role})</div>
                        </td>

                        <td className="text-center border border-black py-1">{inst.lecture || "-"}</td>
                        <td className="text-center border border-black py-1">{inst.lab || "-"}</td>
                        <td className="text-center border border-black py-1">{inst.exam || "-"}</td>
                        <td className="text-center border border-black py-1">{inst.critique || "-"}</td>
                      </tr>
                    );
                  })
                )}

                {/* แถวรวมทีละภาคการศึกษา */}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="text-right px-4 border border-black py-1">
                    รวม{term.termTitle}
                  </td>
                  <td className="text-center border border-black py-1">{total.lecture.toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{total.lab.toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{total.exam.toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{total.critique.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ลายเซ็น */}
      {curriculum !== "all" && (
        <div style={{ breakInside: "avoid", breakBefore: "avoid" }}>
          <div className="flex justify-around mt-8 text-black">

            {/* ฝั่งซ้าย: ประธานหลักสูตร */}
            <div className="text-center w-1/3">
              <div className="mb-10 text-sm text-gray-400">(ลงนาม)</div>
              {chairName ? (
                <>
                  <div className="font-bold text-sm">({chairName})</div>
                  <div className="text-xs text-gray-600 mt-0.5">ประธานหลักสูตร</div>
                </>
              ) : (
                <>
                  <div className="font-bold text-sm">
                    ({curriculumLabel.replace(/^หลักสูตรที่\s*/, "").replace(/\s*รับผิดชอบ$/, "")})
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">ประธานหลักสูตร</div>
                </>
              )}
              <div className="mt-1 text-xs text-gray-500">วันที่ {printDate}</div>
            </div>

            {/* ฝั่งขวา: รองคณบดี */}
            <div className="text-center w-1/3">
              <div className="mb-10 text-sm text-gray-400">(ลงนาม)</div>
              <div className="font-bold text-sm">({formatName(viceDean)})</div>
              <div className="text-xs text-gray-600 mt-0.5">
                {viceDean?.adminTitle || "รองคณบดีฝ่ายวิชาการ"}
              </div>
              <div className="mt-1 text-xs text-gray-500">วันที่ {printDate}</div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <YearlyPrintContent />
    </Suspense>
  );
}