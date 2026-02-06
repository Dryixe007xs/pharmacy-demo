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
import { Printer, FileText, Calendar, Filter, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

// --- Interfaces ---
interface InstructorData {
  id: string; name: string; role: string; lecture: number; lab: number; exam: number; critique: number;
}
interface CourseData {
  code: string; name: string; credit: string | number; instructors: InstructorData[];
}
interface SemesterGroup {
  termId: number; termTitle: string; courses: CourseData[];
}

export default function YearlyReportPage() {
  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<SemesterGroup[]>([]);
  const [selectedYear, setSelectedYear] = useState("2569");
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [curriculumOptions, setCurriculumOptions] = useState<string[]>([]);
  
  // State สำหรับ Iframe Print
  const [printUrl, setPrintUrl] = useState<string | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/report/yearly?year=${selectedYear}&curriculum=${selectedCurriculum}`);
        if (!res.ok) throw new Error("Failed");
        const { assignments } = await res.json();

        if (selectedCurriculum === 'all' && assignments.length > 0) {
            const currs = new Set<string>();
            assignments.forEach((a: any) => { if (a.subject?.program?.name_th) currs.add(a.subject.program.name_th); });
            setCurriculumOptions(Array.from(currs));
        }

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
      } catch (error) { console.error(error); toast.error("เกิดข้อผิดพลาด"); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [selectedYear, selectedCurriculum]);

  // ✅ สั่ง Print ผ่าน Iframe (อยู่ในหน้าเดิม ไม่เด้ง Tab ใหม่)
  const handlePrint = () => {
    toast.info("กำลังเตรียมเอกสาร...");
    // ใส่ timestamp เพื่อบังคับโหลดใหม่ทุกครั้ง
    setPrintUrl(`/print/report/yearly?year=${selectedYear}&curriculum=${selectedCurriculum}&t=${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun text-slate-800">
        
        {/* Hidden Iframe สำหรับโหลดหน้าปริ้น */}
        {printUrl && (
            <iframe 
                src={printUrl} 
                className="fixed w-0 h-0 border-0"
                title="Print Frame"
            />
        )}

        <div className="w-full max-w-[95%] xl:max-w-[90rem] mx-auto mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-purple-600" /> รายงานสรุปภาระงานสอนรายปี
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 ml-8">ภาพรวมการจัดการเรียนการสอน คณะเภสัชศาสตร์</p>
                </div>
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md rounded-full px-6" onClick={handlePrint}>
                    <Printer size={18} /> พิมพ์รายงาน (PDF)
                </Button>
            </div>

            {/* Filter */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
                <div className="space-y-1.5 w-40">
                    <label className="text-xs font-semibold text-slate-500"><Calendar size={12} className="inline mr-1"/> ปีการศึกษา</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="2569">2569</SelectItem><SelectItem value="2570">2570</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 w-96">
                    <label className="text-xs font-semibold text-slate-500"><Filter size={12} className="inline mr-1"/> หลักสูตร</label>
                    <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-10"><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                            {curriculumOptions.map((c, i) => <SelectItem key={i} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        {/* Web View Table */}
        <div className="w-full max-w-[95%] xl:max-w-[90rem] mx-auto bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200">
            <div className="px-10 py-8 text-center border-b border-slate-100 bg-gradient-to-r from-purple-50/30 via-white to-white">
                <h2 className="text-2xl font-bold text-slate-800">รายงานสรุปรายวิชาประจำปีการศึกษา {selectedYear}</h2>
                <h3 className="text-lg font-medium text-purple-700 mt-1">{selectedCurriculum !== 'all' ? selectedCurriculum : 'รวมทุกหลักสูตร'}</h3>
                <p className="font-light text-slate-500 text-sm mt-2">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
            </div>
            
            <div className="p-0 overflow-x-auto">
                {loading ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin w-8 h-8 mb-2"/>
                        <p>กำลังประมวลผลข้อมูล...</p>
                    </div>
                ) : (
                    <table className="w-full text-sm border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                            <tr>
                                <th className="py-4 pl-8 pr-4 text-left w-[25%]">รหัส / ชื่อรายวิชา</th>
                                <th className="py-4 px-4 text-left w-[20%]">ผู้สอน / บทบาท</th>
                                <th className="py-4 px-2 text-center w-[8%]">บรรยาย (ชม.)</th>
                                <th className="py-4 px-2 text-center w-[8%]">ปฏิบัติ (ชม.)</th>
                                <th className="py-4 px-2 text-center w-[8%]">คุมสอบนอกตาราง (ชม.)</th>
                                <th className="py-4 px-2 text-center w-[12%] text-purple-700 bg-purple-50/20">วิพากษ์ข้อสอบ (หัวข้อ)*</th>
                                <th className="py-4 px-2 text-center w-[12%] font-bold bg-slate-100/50">รวม (ชม.)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedData.map((term, tIndex) => (
                            <React.Fragment key={tIndex}>
                                <tr className="bg-purple-50/30">
                                    <td colSpan={7} className="py-3 px-8 font-bold text-purple-800 text-sm border-t border-purple-100">{term.termTitle}</td>
                                </tr>
                                {term.courses.map((course, cIndex) => (
                                    <React.Fragment key={cIndex}>
                                        {course.instructors.map((inst, iIndex) => (
                                            <tr key={iIndex} className="hover:bg-slate-50 transition-colors">
                                                {iIndex === 0 && (
                                                    <td rowSpan={course.instructors.length} className="py-4 pl-8 pr-4 align-top border-r border-slate-50 bg-white">
                                                        <div className="font-bold text-slate-800 text-base">{course.code}</div>
                                                        <div className="text-slate-600 text-sm mb-1">{course.name}</div>
                                                        <span className="inline-block bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full mt-1 border border-slate-200">
                                                            {course.credit} หน่วยกิต
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="py-3 px-4 align-top text-slate-700">
                                                    <div className="font-medium">{inst.name}</div>
                                                    <span className="text-[10px] bg-slate-100 px-1 rounded">{inst.role}</span>
                                                </td>
                                                <td className="py-3 px-2 align-top text-center text-slate-600">{inst.lecture || "-"}</td>
                                                <td className="py-3 px-2 align-top text-center text-slate-600">{inst.lab || "-"}</td>
                                                <td className="py-3 px-2 align-top text-center text-slate-600">{inst.exam || "-"}</td>
                                                <td className="py-3 px-2 align-top text-center text-purple-600 font-bold bg-purple-50/10">
                                                    {inst.critique || "-"}
                                                </td>
                                                <td className="py-3 px-2 align-top text-center font-bold text-slate-800 bg-slate-50/30">
                                                    {(inst.lecture + inst.lab + inst.exam + inst.critique).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="h-px bg-slate-100 w-full"></tr>
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-purple-500" />
                    <span>หมายเหตุ: ข้อมูลนี้แสดงผลสำหรับหน้าจอ หากต้องการเอกสารฉบับจริงพร้อมลายเซ็น กรุณากดปุ่มพิมพ์รายงาน</span>
                </div>
            </div>
        </div>
    </div>
  );
}