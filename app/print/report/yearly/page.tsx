"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image"; 

// --- Interfaces ---
interface InstructorData { id: string; name: string; role: string; lecture: number; lab: number; exam: number; critique: number; }
interface CourseData { code: string; name: string; credit: string | number; instructors: InstructorData[]; }
interface SemesterGroup { termId: number; termTitle: string; courses: CourseData[]; }
interface Signatory { firstName: string; lastName: string; academicPosition: string; adminTitle?: string; }

function YearlyPrintContent() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") || "2569";
  const curriculum = searchParams.get("curriculum") || "all";

  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<SemesterGroup[]>([]);
  const [viceDean, setViceDean] = useState<Signatory | null>(null);
  const [programChair, setProgramChair] = useState<Signatory | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/report/yearly?year=${year}&curriculum=${curriculum}`);
        if (!res.ok) throw new Error("Failed");
        
        const { assignments, viceDean, programChair } = await res.json();
        setViceDean(viceDean);
        setProgramChair(programChair);

        const termsMap = new Map<number, Map<string, CourseData>>();
        [1, 2, 3].forEach(termId => termsMap.set(termId, new Map()));

        assignments.forEach((assign: any) => {
            const termId = assign.semester;
            const termCourses = termsMap.get(termId);
            if (!termCourses) return;
            const subjectKey = assign.subject.code;

            if (!termCourses.has(subjectKey)) {
                termCourses.set(subjectKey, {
                    code: assign.subject.code,
                    name: assign.subject.name_th,
                    credit: assign.subject.credit || "-",
                    instructors: []
                });
            }
            const course = termCourses.get(subjectKey)!;
            const title = assign.lecturer.title || "";
            const fullName = `${title} ${assign.lecturer.firstName} ${assign.lecturer.lastName}`.trim();
            const isResponsible = String(assign.lecturer.id) === String(assign.subject.responsibleUserId);
            
            course.instructors.push({
                id: assign.lecturer.id,
                name: fullName,
                role: isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน",
                lecture: assign.lectureHours || 0,
                lab: assign.labHours || 0,
                exam: assign.examHours || 0,
                critique: assign.examCritiqueHours || 0
            });
        });

        const results: SemesterGroup[] = [
            { termId: 1, termTitle: "ภาคการศึกษาต้น", courses: [] },
            { termId: 2, termTitle: "ภาคการศึกษาปลาย", courses: [] },
            { termId: 3, termTitle: "ภาคฤดูร้อน", courses: [] },
        ];
        results.forEach(g => {
            const m = termsMap.get(g.termId);
            if (m) g.courses = Array.from(m.values()).sort((a, b) => a.code.localeCompare(b.code));
        });

        setProcessedData(results);
        setLoading(false);

        // Auto Print
        setTimeout(() => window.print(), 1000);

      } catch (error) { console.error(error); setLoading(false); }
    };
    fetchData();
  }, [year, curriculum]);

  const formatName = (p: Signatory | null) => p ? `${p.academicPosition || ''} ${p.firstName} ${p.lastName}`.trim() : "......................................................";

  if (loading) return <div className="h-screen flex items-center justify-center font-sarabun"><Loader2 className="animate-spin mr-2"/> กำลังเตรียมเอกสาร...</div>;

  return (
    <div className="bg-white text-black font-sarabun w-full min-h-screen">
        <style jsx global>{`
            @media print {
                @page { size: A4 landscape; margin: 10mm; }
                body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            }
        `}</style>

        {/* ✅ ปรับปรุงส่วนหัว: โลโก้ชัด + ขนาดสมเหตุสมผล */}
        <div className="text-center mb-6 pb-2 border-b border-black">
            
            <div className="flex justify-center mb-2">
                {/* ปรับขนาดเป็น w-32 h-32 (ประมาณ 3 นิ้วกว่าๆ ในหน้าจอ หรือ 3-4 cm บนกระดาษ) 
                   เพื่อให้เห็นตัวหนังสือใต้โลโก้ชัดเจน 
                */}
                <div className="relative w-32 h-32"> 
                    <Image 
                        src="/logo.png"  // ⚠️ ต้องวางไฟล์ logo.png ไว้ที่โฟลเดอร์ public โดยตรง
                        alt="Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
            </div>

            <h1 className="text-xl font-bold text-black mb-1">
                รายงานสรุปภาระงานสอนรายปี ประจำปีการศึกษา {year}
            </h1>
            <h2 className="text-base font-medium text-gray-700 mb-1">
                {curriculum !== 'all' ? curriculum : 'รวมทุกหลักสูตร'}
            </h2>
            <p className="text-sm text-gray-500">
                คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
            </p>
        </div>

        {/* ตารางข้อมูล */}
        <table className="w-full text-sm border-collapse border border-black">
            <thead>
                <tr className="bg-gray-100 text-black font-bold text-center">
                    <th className="py-2 px-2 border border-black w-[25%]">รหัส / ชื่อรายวิชา</th>
                    <th className="py-2 px-2 border border-black w-[25%]">ผู้สอน</th>
                    <th className="py-2 px-1 border border-black w-[8%]">บรรยาย</th>
                    <th className="py-2 px-1 border border-black w-[8%]">ปฏิบัติ</th>
                    <th className="py-2 px-1 border border-black w-[8%]">คุมสอบ</th>
                    <th className="py-2 px-1 border border-black w-[10%]">วิพากษ์(ข้อ)</th>
                    <th className="py-2 px-1 border border-black w-[10%]">รวม(ชม.)</th>
                </tr>
            </thead>
            <tbody>
                {processedData.map((term, tIdx) => (
                    <React.Fragment key={tIdx}>
                        {term.courses.length > 0 && (
                            <tr className="bg-gray-50 break-inside-avoid">
                                <td colSpan={7} className="py-1.5 px-4 font-bold border border-black text-black">
                                    {term.termTitle}
                                </td>
                            </tr>
                        )}
                        {term.courses.map((course, cIndex) => (
                            <React.Fragment key={`${tIdx}-${cIndex}`}>
                                {course.instructors.map((inst, iIndex) => (
                                    <tr key={iIndex} className="break-inside-avoid">
                                        {iIndex === 0 && (
                                            <td rowSpan={course.instructors.length} className="py-2 px-2 align-top border border-black bg-white">
                                                <div className="font-bold text-black">{course.code}</div>
                                                <div className="text-[11px] text-black">{course.name}</div>
                                                <div className="text-[10px] mt-1 text-gray-600">{course.credit} หน่วยกิต</div>
                                            </td>
                                        )}
                                        <td className="py-2 px-2 align-top border border-black">
                                            <div className="font-medium text-black">{inst.name}</div>
                                            <div className="text-[10px] text-gray-600">({inst.role})</div>
                                        </td>
                                        <td className="text-center py-2 border border-black text-black">{inst.lecture || "-"}</td>
                                        <td className="text-center py-2 border border-black text-black">{inst.lab || "-"}</td>
                                        <td className="text-center py-2 border border-black text-black">{inst.exam || "-"}</td>
                                        <td className="text-center py-2 border border-black text-black">{inst.critique || "-"}</td>
                                        <td className="text-center py-2 font-bold border border-black text-black">
                                            {(inst.lecture + inst.lab + inst.exam + inst.critique).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                ))}
            </tbody>
        </table>

        {/* ลายเซ็น */}
        {curriculum !== 'all' && (
            <div className="flex justify-around mt-8 break-inside-avoid text-black">
                <div className="text-center w-1/3">
                    <div className="h-10"></div> 
                    <div className="border-b border-black pb-1 mb-1 font-bold">{formatName(programChair)}</div>
                    <div className="text-xs">ประธานหลักสูตร</div>
                </div>
                <div className="text-center w-1/3">
                    <div className="h-10"></div>
                    <div className="border-b border-black pb-1 mb-1 font-bold">{formatName(viceDean)}</div>
                    <div className="text-xs">{viceDean?.adminTitle || "รองคณบดีฝ่ายวิชาการฯ"}</div>
                </div>
            </div>
        )}

        <div className="mt-4 pt-2 border-t border-gray-300 text-[9px] text-center text-gray-500">
            * หมายเหตุ: การคำนวณภาระงาน 1 หัวข้อวิพากษ์ = 1 ชั่วโมงทำการ
        </div>
    </div>
  );
}

export default function Page() {
    return <Suspense fallback={<div>Loading...</div>}><YearlyPrintContent /></Suspense>;
}