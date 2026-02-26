"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  isExternal: boolean;
  externalFaculty?: string;
}

interface SemesterData {
  title: string;
  courses: ReportCourse[];
}

interface LecturerProfile {
  firstName: string;
  lastName: string;
  academicPosition: string;
  curriculum: string;
  department: string;
}

function PersonalPrintContent() {
  const searchParams = useSearchParams();
  const lecturerId = searchParams.get("lecturerId");

  const [reportData, setReportData] = useState<SemesterData[]>([]);
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  const [academicYear, setAcademicYear] = useState<string | number>("-");
  const [loading, setLoading] = useState(true);
  const [printDate, setPrintDate] = useState("");

  const [viceDeanName, setViceDeanName] = useState("");
  const [viceDeanPosition, setViceDeanPosition] = useState("รองคณบดีฝ่ายวิชาการ");

  useEffect(() => {
    setPrintDate(
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    if (!lecturerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const termRes = await fetch("/api/term-config/active");
        const termData = await termRes.json();
        if (termData?.academicYear) setAcademicYear(termData.academicYear);

        const res = await fetch(`/api/report/personal?lecturerId=${lecturerId}`);
        if (!res.ok) throw new Error("Failed");

        const { lecturer, assignments, viceDean } = await res.json();
        setProfile(lecturer);
        if (viceDean) {
          setViceDeanName(viceDean.name);
          setViceDeanPosition(viceDean.position);
        }

        const term1: ReportCourse[] = [];
        const term2: ReportCourse[] = [];
        const term3: ReportCourse[] = [];

        (assignments || []).forEach((assign: any) => {
          const isExternal = assign.courseType === "EXTERNAL";
          const isResponsible =
            String(assign.lecturerId) === String(assign.subject.responsibleUserId);

          const code = isExternal ? assign.externalCourseCode || "-" : assign.subject.code;
          const name = isExternal ? assign.externalCourseName || "-" : assign.subject.name_th;
          const credit = isExternal ? assign.externalCredit || "-" : assign.subject.credit;
          const role = isExternal ? "ผู้สอน" : isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";

          const courseObj: ReportCourse = {
            code, name, credit, role,
            lecture: Number(assign.lectureHours) || 0,
            lab: Number(assign.labHours) || 0,
            exam: Number(assign.examHours) || 0,
            critique: Number(assign.examCritiqueHours) || 0,
            isExternal,
            externalFaculty: assign.externalFaculty || "",
          };

          const sem = Number(assign.semester);
          if (sem === 1) term1.push(courseObj);
          else if (sem === 2) term2.push(courseObj);
          else if (sem === 3) term3.push(courseObj);
        });

        setReportData([
          { title: "ภาคการศึกษาต้น", courses: term1 },
          { title: "ภาคการศึกษาปลาย", courses: term2 },
          { title: "ภาคฤดูร้อน", courses: term3 },
        ]);

        setTimeout(() => window.print(), 1000);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lecturerId]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center font-sarabun">
        <Loader2 className="animate-spin mr-2" /> กำลังเตรียมเอกสาร...
      </div>
    );
  if (!profile)
    return (
      <div className="h-screen flex items-center justify-center font-sarabun">
        ไม่พบข้อมูล
      </div>
    );

  const grandTotal = {
    lecture: reportData.reduce((s, t) => s + t.courses.reduce((a, b) => a + b.lecture, 0), 0),
    lab:     reportData.reduce((s, t) => s + t.courses.reduce((a, b) => a + b.lab, 0), 0),
    exam:    reportData.reduce((s, t) => s + t.courses.reduce((a, b) => a + b.exam, 0), 0),
    critique:reportData.reduce((s, t) => s + t.courses.reduce((a, b) => a + b.critique, 0), 0),
  };

  // กรอง: ภาคฤดูร้อนถ้าไม่มีรายวิชาไม่ต้องแสดง
  const visibleTerms = reportData.filter(
    (term) => !(term.title === "ภาคฤดูร้อน" && term.courses.length === 0)
  );

  return (
    <div className="bg-white text-black font-sarabun w-full min-h-screen p-6">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; margin-top: 0; margin-bottom: 0; }
          @page { -webkit-margin-before: 0; -webkit-margin-after: 0; }
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .break-inside-avoid { break-inside: avoid; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 4px 6px; font-size: 12px; }
        }
      `}</style>

      {/* ส่วนหัว — logo ซ้าย + ข้อความขวา */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-black">
        <div className="relative w-14 h-14 shrink-0">
          <Image src="/logo.png" alt="Logo" fill className="object-contain" priority />
        </div>
        <div>
          <h1 className="text-lg font-bold text-black leading-snug">
            รายงานสรุปภาระงานสอนรายบุคคล ประจำปีการศึกษา {academicYear}
          </h1>
          <h2 className="text-base font-bold text-gray-800 mt-0.5">
            {profile.academicPosition} {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            สังกัด: {profile.department} | หลักสูตร: {profile.curriculum}
          </p>
        </div>
      </div>

      {/* ตาราง — 6 คอลัมน์ (เอาคอลัมน์ "รับรองโดย" ออก) */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 text-black font-bold text-center">
            <th className="w-[38%] border border-black px-2 py-1 text-left">รหัสวิชา / ชื่อรายวิชา</th>
            <th className="w-[16%] border border-black px-2 py-1">บทบาท</th>
            <th className="w-[12%] border border-black px-2 py-1">ชั่วโมงบรรยาย</th>
            <th className="w-[12%] border border-black px-2 py-1">ชั่วโมงปฏิบัติ</th>
            <th className="w-[11%] border border-black px-2 py-1">คุมสอบนอกตาราง</th>
            <th className="w-[11%] border border-black px-2 py-1">
              วิพากษ์ข้อสอบ<br />
              <span className="text-[10px] font-normal">(หัวข้อ)*</span>
            </th>
          </tr>
        </thead>

        {visibleTerms.map((term, index) => (
          <tbody key={index} className="break-inside-avoid">
            <tr>
              <td colSpan={6} className="font-bold text-left px-3 py-1 bg-gray-100 border border-black">
                {term.title}
              </td>
            </tr>

            {term.courses.length > 0 ? (
              <>
                {term.courses.map((course, cIndex) => (
                  <tr key={cIndex}>
                    <td className="align-top text-left border border-black px-2 py-1">
                      <div className="font-bold text-black">
                        {course.code}
                        <span className="font-normal text-[10px] ml-2 text-gray-600">
                          ({course.credit} หน่วยกิต)
                        </span>
                        {course.isExternal && (
                          <span className="ml-2 text-[9px] bg-orange-100 text-orange-700 border border-orange-300 px-1 py-0.5 rounded">
                            นอกคณะ{course.externalFaculty ? `: ${course.externalFaculty}` : ""}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-black">{course.name}</div>
                    </td>
                    <td className="align-top text-center border border-black px-2 py-1">{course.role}</td>
                    <td className="text-center align-top border border-black px-2 py-1">{course.lecture || "-"}</td>
                    <td className="text-center align-top border border-black px-2 py-1">{course.lab || "-"}</td>
                    <td className="text-center align-top border border-black px-2 py-1">{course.exam || "-"}</td>
                    <td className="text-center align-top border border-black px-2 py-1">{course.critique || "-"}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={2} className="text-right px-4 border border-black py-1">รวมเฉพาะ{term.title}</td>
                  <td className="text-center border border-black py-1">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(2)}</td>
                  <td className="text-center border border-black py-1">{term.courses.reduce((a, b) => a + b.critique, 0).toFixed(2)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 italic py-3 border border-black">
                  - ไม่มีรายวิชา -
                </td>
              </tr>
            )}
          </tbody>
        ))}

      </table>

      {/* Grand Total + ลายเซ็น — อยู่นอกตารางและผูกรวมกัน ไม่มีทางแยกหน้า */}
      <div style={{breakInside: 'avoid', breakBefore: 'avoid'}}>
        {/* Grand Total แถวเดี่ยวนอกตาราง */}
        <table className="w-full text-sm border-collapse mt-0">
          <tbody>
            <tr className="font-bold">
              <td style={{width:'54%'}} colSpan={2} className="text-right px-4 border border-black py-1.5 bg-black text-white">
                รวมตลอดปีการศึกษา
              </td>
              <td style={{width:'12%'}} className="text-center border border-black py-1.5 bg-black text-white">{grandTotal.lecture.toFixed(2)}</td>
              <td style={{width:'12%'}} className="text-center border border-black py-1.5 bg-black text-white">{grandTotal.lab.toFixed(2)}</td>
              <td style={{width:'11%'}} className="text-center border border-black py-1.5 bg-black text-white">{grandTotal.exam.toFixed(2)}</td>
              <td style={{width:'11%'}} className="text-center border border-black py-1.5 bg-black text-white">{grandTotal.critique.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* ลายเซ็น */}
      <div className="flex justify-around mt-4 text-black">
        {/* ประธานหลักสูตร */}
        <div className="text-center w-1/3">

          <div className="pt-2">
            <div className="font-bold text-sm">ถูกรับรองโดยประธานหลักสูตร</div>
            <div className="mt-1 text-xs">วันที่ {printDate}</div>
          </div>
        </div>

        {/* รองคณบดี */}
        <div className="text-center w-1/3">

          <div className="pt-2">
            <div className="font-bold text-sm">({viceDeanName})</div>
            <div className="text-xs">รองคณะบดีฝ่ายวิชาการ</div>
            <div className="mt-1 text-xs">วันที่ {printDate}</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PersonalPrintContent />
    </Suspense>
  );
}