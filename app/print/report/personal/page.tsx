"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";

// --- Interfaces ---
interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
}

interface SemesterData {
  title: string;
  courses: ReportCourse[];
}

interface LecturerProfile {
    firstName: string;
    lastName: string;
    email: string;
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

  // Mockup ผู้เซ็น
  const approvers = {
      chairName: "ผศ.ดร.ณัฐ นาเอก",
      chairPosition: "ประธานหลักสูตร",
      viceDeanName: "รศ. ดร. ภญ. ศุภางค์ คนดี",
      viceDeanPosition: "รองคณบดีฝ่ายวิชาการ"
  };

  useEffect(() => {
    // เซ็ตวันที่ปัจจุบันแบบไทย
    setPrintDate(new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }));

    if (!lecturerId) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            const termRes = await fetch("/api/term-config/active");
            const termData = await termRes.json();
            if (termData?.academicYear) setAcademicYear(termData.academicYear);

            const res = await fetch(`/api/report/personal?lecturerId=${lecturerId}`);
            if (!res.ok) throw new Error("Failed");
            
            const { lecturer, assignments } = await res.json();
            setProfile(lecturer);

            const data = assignments || [];
            const term1: ReportCourse[] = [];
            const term2: ReportCourse[] = [];
            const term3: ReportCourse[] = [];

            data.forEach((assign: any) => {
                if (assign.academicApprovalStatus !== 'APPROVED') return;

                const isResponsible = String(assign.lecturerId) === String(assign.subject.responsibleUserId);
                const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";

                const courseObj = {
                    code: assign.subject.code,
                    name: assign.subject.name_th,
                    credit: assign.subject.credit || "-",
                    role: role,
                    lecture: Number(assign.lectureHours) || 0,
                    lab: Number(assign.labHours) || 0,
                    exam: Number(assign.examHours) || 0,
                    critique: Number(assign.examCritiqueHours) || 0,
                };

                const sem = Number(assign.semester);
                if (sem === 1) term1.push(courseObj);
                else if (sem === 2) term2.push(courseObj);
                else if (sem === 3) term3.push(courseObj);
            });

            setReportData([
                { title: "ภาคการศึกษาต้น", courses: term1 },
                { title: "ภาคการศึกษาปลาย", courses: term2 },
                { title: "ภาคฤดูร้อน", courses: term3 }
            ]);

            setTimeout(() => {
                window.print();
            }, 1000);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [lecturerId]);

  if (loading) return <div className="h-screen flex items-center justify-center font-sarabun"><Loader2 className="animate-spin mr-2"/> กำลังเตรียมเอกสาร...</div>;
  if (!profile) return <div className="h-screen flex items-center justify-center font-sarabun">ไม่พบข้อมูล</div>;

  return (
    <div className="bg-white text-black font-sarabun w-full min-h-screen">
        <style jsx global>{`
            @media print {
                @page { size: A4 landscape; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                .break-inside-avoid { break-inside: avoid; } 
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid black; padding: 6px; } /* ลด padding นิดหน่อยให้กระชับ */
            }
        `}</style>

        {/* ส่วนหัว */}
        <div className="text-center mb-6 pb-2 border-b border-black">
            <div className="flex justify-center mb-2">
                <div className="relative w-28 h-28"> 
                    <Image 
                        src="/logo.png" 
                        alt="Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            <h1 className="text-xl font-bold text-black mb-1">
                รายงานสรุปภาระงานสอนรายบุคคล ประจำปีการศึกษา {academicYear}
            </h1>
            <h2 className="text-base font-bold text-gray-800 mb-1">
                {profile.academicPosition || ""} {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-sm text-gray-500">
                สังกัด: {profile.department} | หลักสูตร: {profile.curriculum}
            </p>
            <p className="text-sm text-gray-500">
                คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
            </p>
        </div>

        {/* ตารางข้อมูล */}
        <table className="w-full text-sm">
            <thead>
                <tr className="bg-gray-100 text-black font-bold text-center">
                    <th className="w-[35%]">รหัสวิชา / ชื่อรายวิชา</th>
                    <th className="w-[15%]">บทบาท</th>
                    <th className="w-[12%]">ชั่วโมงบรรยาย</th>
                    <th className="w-[12%]">ชั่วโมงปฏิบัติ</th>
                    <th className="w-[13%]">คุมสอบนอกตาราง</th>
                    <th className="w-[13%]">วิพากษ์ข้อสอบ<br/><span className="text-[10px] font-normal">(หัวข้อ)*</span></th>
                </tr>
            </thead>
            
            {reportData.map((term, index) => (
                <tbody key={index} className="break-inside-avoid">
                    {/* Header ภาคการศึกษา */}
                    <tr className="bg-gray-50">
                        <td colSpan={6} className="font-bold text-left px-4 bg-gray-100">
                            {term.title}
                        </td>
                    </tr>

                    {term.courses.length > 0 ? (
                        <>
                            {term.courses.map((course, cIndex) => (
                                <tr key={cIndex}>
                                    <td className="align-top text-left">
                                        {/* ✅ ปรับหน่วยกิตมาไว้ข้างรหัสวิชา */}
                                        <div className="font-bold text-black">
                                            {course.code} 
                                            <span className="font-normal text-[10px] ml-2 text-gray-600">({course.credit} หน่วยกิต)</span>
                                        </div>
                                        <div className="text-[11px] text-black">{course.name}</div>
                                    </td>
                                    <td className="align-top text-center">
                                        {course.role}
                                    </td>
                                    <td className="text-center align-top">{course.lecture || "-"}</td>
                                    <td className="text-center align-top">{course.lab || "-"}</td>
                                    <td className="text-center align-top">{course.exam || "-"}</td>
                                    <td className="text-center align-top">{course.critique || "-"}</td>
                                </tr>
                            ))}
                            {/* รวมยอดเฉพาะเทอม */}
                            <tr className="bg-gray-50 font-semibold">
                                <td colSpan={2} className="text-right px-4">รวมเฉพาะ{term.title}</td>
                                <td className="text-center">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(2)}</td>
                                <td className="text-center">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(2)}</td>
                                <td className="text-center">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(2)}</td>
                                <td className="text-center">{term.courses.reduce((a, b) => a + b.critique, 0).toFixed(2)}</td>
                            </tr>
                        </>
                    ) : (
                        <tr>
                            <td colSpan={6} className="text-center text-gray-400 italic py-4">
                                - ไม่มีรายวิชา -
                            </td>
                        </tr>
                    )}
                </tbody>
            ))}

            {/* Grand Total Row */}
            <tbody className="break-inside-avoid">
                <tr className="bg-black text-white font-bold">
                    <td colSpan={2} className="text-right px-4 border-black">รวมตลอดปีการศึกษา</td>
                    <td className="text-center border-black border-r-white">{reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0).toFixed(2)}</td>
                    <td className="text-center border-black border-r-white">{reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0).toFixed(2)}</td>
                    <td className="text-center border-black border-r-white">{reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0).toFixed(2)}</td>
                    <td className="text-center border-black border-r-white">{reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.critique, 0), 0).toFixed(2)}</td>
                </tr>
            </tbody>
        </table>

        {/* ลายเซ็น */}
        <div className="flex justify-around mt-12 break-inside-avoid text-black">
            
            {/* ประธานหลักสูตร */}
            <div className="text-center w-1/3">
                <div className="h-12"></div> 
                <div className="font-bold text-sm">({approvers.chairName})</div>
                <div className="text-xs">{approvers.chairPosition}</div>
                {/* ✅ ใส่วันที่อัตโนมัติ */}
                <div className="mt-2 text-xs">วันที่ {printDate}</div>
            </div>
            
            {/* รองคณบดี */}
            <div className="text-center w-1/3">
                <div className="h-12"></div>
                <div className="font-bold text-sm">({approvers.viceDeanName})</div>
                <div className="text-xs">{approvers.viceDeanPosition}</div>
                {/* ✅ ใส่วันที่อัตโนมัติ */}
                <div className="mt-2 text-xs">วันที่ {printDate}</div>
            </div>
        </div>
    </div>
  );
}

export default function Page() {
    return <Suspense fallback={<div>Loading...</div>}><PersonalPrintContent /></Suspense>;
}