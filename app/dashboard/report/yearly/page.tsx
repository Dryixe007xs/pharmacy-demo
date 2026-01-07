"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, FileText, Calendar, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";

// --- Interfaces ---
interface InstructorData {
  id: string;
  name: string;
  role: string;
  lecture: number;
  lab: number;
}

interface CourseData {
  code: string;
  name: string;
  credit: string;
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

export default function YearlyReportPage() {
  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<SemesterGroup[]>([]);
  
  // Signatures State
  const [viceDean, setViceDean] = useState<Signatory | null>(null);
  const [programChair, setProgramChair] = useState<Signatory | null>(null);

  // --- Filter States ---
  const [selectedYear, setSelectedYear] = useState("2567");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [curriculumOptions, setCurriculumOptions] = useState<string[]>([]);

  // --- 1. Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/report/yearly?year=${selectedYear}&curriculum=${selectedCurriculum}`);
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const { assignments, viceDean, programChair } = await res.json();

        setViceDean(viceDean);
        setProgramChair(programChair);

        // 1. Extract Unique Curriculums
        if (selectedCurriculum === 'all') {
            const currs = new Set<string>();
            assignments.forEach((a: any) => {
                if (a.subject?.program?.name_th) currs.add(a.subject.program.name_th);
            });
            setCurriculumOptions(Array.from(currs));
        }

        // 2. Filter Logic
        const filtered = selectedCurriculum === 'all' 
            ? assignments 
            : assignments.filter((a: any) => a.subject.program?.name_th === selectedCurriculum);

        // 3. Group Data by Semester & Course
        const termsMap = new Map<number, Map<string, CourseData>>();
        [1, 2, 3].forEach(termId => termsMap.set(termId, new Map()));

        filtered.forEach((assign: any) => {
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
            
            // ✅ แก้ไข Logic Role: เช็คว่าเป็นผู้รับผิดชอบรายวิชาหรือไม่
            const isResponsible = String(assign.lecturer.id) === String(assign.subject.responsibleUserId);
            const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";

            course.instructors.push({
                id: assign.lecturer.id,
                name: fullName,
                role: role,
                lecture: assign.lectureHours || 0,
                lab: assign.labHours || 0
            });
        });

        // 4. Convert Map to Array
        const results: SemesterGroup[] = [
            { termId: 1, termTitle: "ภาคการศึกษาต้น", courses: [] },
            { termId: 2, termTitle: "ภาคการศึกษาปลาย", courses: [] },
            { termId: 3, termTitle: "ภาคฤดูร้อน", courses: [] },
        ];

        results.forEach(group => {
            const courseMap = termsMap.get(group.termId);
            if (courseMap) {
                // Sort by course code
                group.courses = Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));
            }
        });

        setProcessedData(results);

      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedCurriculum]);

  const handlePrint = () => {
    window.print();
  };

  const formatName = (person: Signatory | null) => {
      if (!person) return "......................................................";
      return `${person.academicPosition || ''} ${person.firstName} ${person.lastName}`.trim();
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun text-slate-800 print:bg-white print:p-0">
      
      {/* --- Toolbar / Header (Screen Only) --- */}
      <div className="w-full max-w-[95%] xl:max-w-7xl mx-auto mb-8 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-purple-600" /> รายงานสรุปภาระงานสอนรายปี
                </h1>
                <p className="text-slate-500 text-sm mt-1 ml-8">ภาพรวมการจัดการเรียนการสอน คณะเภสัชศาสตร์</p>
            </div>
            <div className="flex gap-3">
                <Button variant="outline" className="gap-2 bg-white shadow-sm border-slate-200 hover:bg-slate-50 text-slate-600" onClick={handlePrint}>
                    <Printer size={18} /> พิมพ์รายงาน
                </Button>
            </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
             <div className="space-y-1.5 w-40">
                 <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Calendar size={12}/> ปีการศึกษา
                 </label>
                 <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="ปี" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="2567">2567</SelectItem>
                        <SelectItem value="2566">2566</SelectItem>
                    </SelectContent>
                 </Select>
            </div>

            <div className="space-y-1.5 w-96">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Filter size={12}/> หลักสูตร / สาขาวิชา
                </label>
                <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                        {curriculumOptions.map((curr, idx) => (
                            <SelectItem key={idx} value={curr}>{curr}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      {/* --- Main Report Card --- */}
      <div className="w-full max-w-[95%] xl:max-w-7xl mx-auto bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200 relative flex flex-col print:shadow-none print:border-none print:rounded-none print:w-full print:max-w-none">
        
        {/* 1. Header Section */}
        <div className="px-10 py-10 text-center space-y-2 border-b border-slate-100 bg-gradient-to-r from-purple-50/30 via-white to-white print:bg-none">
           <h2 className="text-2xl font-bold text-slate-800">รายงานสรุปรายวิชาประจำปีการศึกษา {selectedYear}</h2>
           <h3 className="text-lg font-medium text-purple-700 print:text-slate-700">
               {selectedCurriculum !== 'all' ? selectedCurriculum : 'รวมทุกหลักสูตร'}
           </h3>
           <p className="font-light text-slate-500 text-sm">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
        </div>

        {/* 2. Content Table */}
        <div className="p-0 flex-grow">
            {loading ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Loader2 className="animate-spin w-8 h-8 mb-2"/>
                    <p>กำลังประมวลผลข้อมูล...</p>
                 </div>
            ) : processedData.every(g => g.courses.length === 0) ? (
                 <div className="flex flex-col items-center justify-center h-64 text-slate-400 italic bg-slate-50/50">
                    - ไม่พบข้อมูลตามเงื่อนไขที่เลือก -
                 </div>
            ) : (
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                            <th className="py-4 pl-8 pr-4 text-left w-[30%]">รหัส / ชื่อรายวิชา</th>
                            <th className="py-4 px-4 text-left w-[35%]">ผู้สอน / บทบาท</th>
                            <th className="py-4 px-2 text-center w-[10%]">บรรยาย (ชม.)</th>
                            <th className="py-4 px-2 text-center w-[10%]">ปฏิบัติ (ชม.)</th>
                            <th className="py-4 px-2 text-center w-[15%]">รวม (ชม.)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedData.map((term, tIndex) => (
                        <React.Fragment key={tIndex}>
                            {/* Semester Header */}
                            {term.courses.length > 0 && (
                                <tr className="bg-purple-50/50 print:bg-slate-50 break-inside-avoid">
                                    <td colSpan={5} className="py-3 px-8 font-bold text-purple-800 print:text-slate-800 text-sm">
                                        {/* เอา icon 📌 ออกตามคำขอจากบริบทก่อนหน้า */}
                                        {term.termTitle}
                                    </td>
                                </tr>
                            )}

                            {term.courses.map((course, cIndex) => (
                                <React.Fragment key={`${tIndex}-${cIndex}`}>
                                    {/* Instructor Rows */}
                                    {course.instructors.map((inst, iIndex) => (
                                        <tr key={iIndex} className="hover:bg-slate-50 transition-colors group break-inside-avoid">
                                            {/* Course Info (Merged Cell) */}
                                            {iIndex === 0 && (
                                                <td rowSpan={course.instructors.length} className="py-4 pl-8 pr-4 align-top border-r border-slate-50 bg-white">
                                                    <div className="font-bold text-slate-800 text-base">{course.code}</div>
                                                    <div className="text-slate-600 text-sm mb-1">{course.name}</div>
                                                    <span className="inline-block bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full mt-1">
                                                        {course.credit} หน่วยกิต
                                                    </span>
                                                </td>
                                            )}
                                            
                                            <td className="py-3 px-4 align-top text-slate-700">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                        <span className="font-medium">{inst.name}</span>
                                                    </div>
                                                    {/* ✅ แสดง Role เป็น Badge เล็กๆ */}
                                                    <div className="ml-3.5">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-sm border ${
                                                            inst.role === 'ผู้รับผิดชอบรายวิชา' 
                                                            ? 'bg-orange-50 text-orange-700 border-orange-100'
                                                            : 'bg-slate-50 text-slate-500 border-slate-100'
                                                        }`}>
                                                            {inst.role}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 align-top text-center text-slate-500">{inst.lecture || "-"}</td>
                                            <td className="py-3 px-2 align-top text-center text-slate-500">{inst.lab || "-"}</td>
                                            <td className="py-3 px-2 align-top text-center font-bold text-slate-700 bg-slate-50/30">
                                                {inst.lecture + inst.lab}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Separator Line */}
                                    <tr className="h-px bg-slate-100 w-full"></tr>
                                </React.Fragment>
                            ))}
                        </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
        </div>

        {/* 3. Footer Signatures (ซ่อนเมื่อเลือก All Curriculums) */}
        {/* ✅ Logic: ถ้า selectedCurriculum !== 'all' ถึงจะแสดง */}
        {!loading && selectedCurriculum !== 'all' && (
            <div className="mt-20 px-10 pb-20 page-break-inside-avoid print:mt-10">
                <div className="flex justify-around items-start">
                    
                    {/* ประธานหลักสูตร */}
                    <div className="text-center w-1/3">
                        <div className="h-16 mb-2"></div> 
                        <div className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2 mx-auto w-4/5">
                            {formatName(programChair)}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                            ประธานหลักสูตร
                        </div>
                    </div>

                    {/* รองคณบดี */}
                    <div className="text-center w-1/3">
                        <div className="h-16 mb-2"></div>
                        <div className="text-sm font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2 mx-auto w-4/5">
                            {formatName(viceDean)}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                            {viceDean?.adminTitle || "รองคณบดีฝ่ายวิชาการฯ"}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="mt-16 text-[10px] text-slate-400 text-center border-t border-slate-100 pt-4 pb-4">
            ระบบบริหารจัดการภาระงานสอน | คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
        </div>
      </div>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
            @page { margin: 10mm; size: landscape; }
            body { background: white; -webkit-print-color-adjust: exact; }
            .print\:hidden { display: none !important; }
            .print\:shadow-none { box-shadow: none !important; }
            .print\:border-none { border: none !important; }
            .break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}