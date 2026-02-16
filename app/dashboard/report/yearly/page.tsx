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
import { Printer, FileText, Calendar, Filter, Loader2, Info, Layers, BookOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// --- Interfaces ---
interface InstructorData {
  id: string; 
  name: string; 
  role: string; 
  lecture: number; 
  lab: number; 
  exam: number; 
  critique: number;
}
interface CourseData {
  code: string; 
  name: string; 
  credit: string | number; 
  instructors: InstructorData[];
}
interface SemesterGroup {
  termId: number; 
  termTitle: string; 
  courses: CourseData[];
}

export default function YearlyReportPage() {
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [processedData, setProcessedData] = useState<SemesterGroup[]>([]);
  
  // State สำหรับ Filter
  const [selectedYear, setSelectedYear] = useState<string>(""); // เริ่มต้นเป็นค่าว่างก่อน รอโหลด
  const [availableYears, setAvailableYears] = useState<string[]>([]); // เก็บปีที่มีข้อมูล
  const [selectedCurriculum, setSelectedCurriculum] = useState("all");
  const [curriculumOptions, setCurriculumOptions] = useState<{ value: string; label: string; }[]>([]);
  
  // State สำหรับการพิมพ์
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN";
  const isViceDean = userRole === "VICE_DEAN";
  const isProgramChair = userRole === "PROGRAM_CHAIR";
  const canViewAll = isAdmin || isViceDean;

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedYear) params.append("year", selectedYear);
        if (!isProgramChair && selectedCurriculum) params.append("curriculum", selectedCurriculum);

        const res = await fetch(`/api/report/yearly?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const { assignments, programs, availableYears: fetchedYears } = await res.json();

        // 1. อัปเดตรายการปี (ถ้า API ส่งมา)
        if (fetchedYears && fetchedYears.length > 0) {
            const yearStrings = fetchedYears.map(String);
            setAvailableYears(yearStrings);
            // ถ้ายังไม่ได้เลือกปี หรือปีที่เลือกไม่อยู่ในรายการ ให้เลือกปีล่าสุด
            if (!selectedYear || !yearStrings.includes(selectedYear)) {
                setSelectedYear(yearStrings[0]); // เลือกปีล่าสุดที่มีข้อมูล
                return; // หยุดรอบนี้ เพื่อให้ useEffect รันใหม่ด้วยปีที่ถูกต้อง
            }
        } else if (availableYears.length === 0) {
            // Fallback ถ้า API ไม่ส่งปีมา หรือไม่มีข้อมูลเลย
            const currentYear = new Date().getFullYear() + 543;
            setAvailableYears([String(currentYear), String(currentYear + 1)]);
            if (!selectedYear) setSelectedYear(String(currentYear));
        }

        // 2. ตั้งค่าตัวเลือกหลักสูตร
        // Logic: ถ้า Admin อยากเห็น "เฉพาะที่มีรายงาน" เราอาจจะกรองจาก assignments ก็ได้
        // หรือใช้ programs ที่ API ส่งมา (ซึ่งควรจะแก้ API ให้ส่งเฉพาะที่มี Active Course ถ้าต้องการ)
        // แต่เบื้องต้นใช้ programs ทั้งหมดไปก่อนเพื่อให้เลือกดูได้ทุกอัน
        if (canViewAll && programs && programs.length > 0) {
          const options = programs.map((p: any) => ({
            value: String(p.id),
            label: p.name_th
          }));
          setCurriculumOptions(options);
        }

        // 3. Process Data
        const termsMap = new Map<number, Map<string, CourseData>>();
        [1, 2, 3].forEach(termId => termsMap.set(termId, new Map()));

        if (assignments) {
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
        }

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
      } catch (error) { 
        console.error('Failed to fetch yearly report:', error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally { 
        setLoading(false); 
      }
    };
    
    if (session) {
      fetchData();
    }
  }, [selectedYear, selectedCurriculum, session, canViewAll, isProgramChair]); // dependency อย่าลืมเช็คดีๆ

  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    toast.info("กำลังเตรียมเอกสาร...");
    
    const params = new URLSearchParams({
      year: selectedYear,
      curriculum: isProgramChair ? "" : selectedCurriculum,
      t: String(Date.now())
    });

    setPrintUrl(`/print/report/yearly?${params.toString()}`);

    setTimeout(() => {
      setIsPrinting(false);
    }, 3000);
  };

  if (!session) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-purple-600" /></div>;

  if (!canViewAll && !isProgramChair) {
    return (
      <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กรุณาติดต่อผู้ดูแลระบบ</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun text-slate-800">
      {printUrl && <iframe src={printUrl} className="fixed w-0 h-0 border-0" title="Print Frame" />}

      <div className="w-full max-w-[95%] xl:max-w-[90rem] mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-purple-600" /> รายงานสรุปภาระงานสอนรายปี
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-8">
              ภาพรวมการจัดการเรียนการสอน คณะเภสัชศาสตร์
            </p>
          </div>
          
          <Button 
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md rounded-full px-6 transition-all" 
            onClick={handlePrint}
            disabled={isPrinting || processedData.every(t => t.courses.length === 0)} // Disable ถ้าไม่มีข้อมูล
          >
            {isPrinting ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
            {isPrinting ? "กำลังเตรียมเอกสาร..." : "พิมพ์รายงาน (PDF)"}
          </Button>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-6 items-end">
          
          {/* ✅ Filter ปีการศึกษา: ใช้ข้อมูลจาก State availableYears */}
          <div className="space-y-1.5 w-40">
            <label className="text-xs font-semibold text-slate-500">
              <Calendar size={12} className="inline mr-1"/> ปีการศึกษา
            </label>
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                <SelectValue placeholder="เลือกปีการศึกษา" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length > 0 ? (
                    availableYears.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))
                ) : (
                    <SelectItem value="no-data" disabled>ไม่พบข้อมูลปีการศึกษา</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 min-w-[300px] max-w-lg flex-1">
             <label className="text-xs font-semibold text-slate-500">
               <Filter size={12} className="inline mr-1"/> หลักสูตร
             </label>
             
             {isProgramChair ? (
               <div className="h-10 px-3 flex items-center bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-600 cursor-not-allowed">
                 หลักสูตรที่คุณรับผิดชอบ
               </div>
             ) : (
               <Select value={selectedCurriculum} onValueChange={setSelectedCurriculum}>
                 <SelectTrigger className="bg-slate-50 border-slate-200 h-10">
                   <SelectValue placeholder="เลือกหลักสูตร" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">แสดงทั้งหมด</SelectItem>
                   {curriculumOptions.map((c) => (
                     <SelectItem key={c.value} value={c.value}>
                       {c.label}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             )}
           </div>
        </div>
      </div>

      {/* Web View Table */}
      <div className="w-full max-w-[95%] xl:max-w-[90rem] mx-auto bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200">
        <div className="px-10 py-8 text-center border-b border-slate-100 bg-gradient-to-r from-purple-50/30 via-white to-white">
          <h2 className="text-2xl font-bold text-slate-800">
            รายงานสรุปรายวิชาประจำปีการศึกษา {selectedYear}
          </h2>
          
          <h3 className="text-lg font-medium text-purple-700 mt-1">
            {isProgramChair 
              ? "หลักสูตรที่คุณรับผิดชอบ" 
              : (selectedCurriculum === 'all' 
                  ? 'รวมทุกหลักสูตร' 
                  : curriculumOptions.find(c => c.value === selectedCurriculum)?.label || 'ไม่ระบุหลักสูตร')
            }
          </h3>
          
          <p className="font-light text-slate-500 text-sm mt-2">
            คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
          </p>
        </div>
        
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="animate-spin w-8 h-8 mb-2"/>
              <p>กำลังประมวลผลข้อมูล...</p>
            </div>
          ) : processedData.every(term => term.courses.length === 0) ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <AlertCircle className="w-12 h-12 mb-3 text-slate-300" />
              <p className="text-lg font-medium">ไม่พบข้อมูลรายวิชา</p>
              <p className="text-sm mt-1">
                {availableYears.length > 0 
                    ? "กรุณาลองเลือกปีการศึกษาอื่น หรือตรวจสอบว่ามีการบันทึกภาระงานแล้ว"
                    : "ยังไม่มีข้อมูลภาระงานสอนในระบบ"}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-xs tracking-wider font-semibold">
                <tr>
                  <th className="py-4 pl-8 pr-4 text-left w-[30%]">รหัส / ชื่อรายวิชา</th>
                  <th className="py-4 px-4 text-left w-[25%]">ผู้สอน / บทบาท</th>
                  <th className="py-4 px-2 text-center w-[10%]">บรรยาย (ชม.)</th>
                  <th className="py-4 px-2 text-center w-[10%]">ปฏิบัติ (ชม.)</th>
                  <th className="py-4 px-2 text-center w-[10%]">คุมสอบนอกตาราง (ชม.)</th>
                  <th className="py-4 px-2 text-center w-[15%] text-purple-700 bg-purple-50/20">
                    วิพากษ์ข้อสอบ (หัวข้อ)*
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((term, tIndex) => (
                  <React.Fragment key={tIndex}>
                    {term.courses.length > 0 && (
                      <>
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="p-0 border-t-[3px] border-slate-200">
                            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-50/80 to-transparent border-l-[6px] border-indigo-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
                              <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                <Layers size={18} strokeWidth={2.5} />
                              </div>
                              <h3 className="font-bold text-indigo-900 text-base tracking-wide">
                                {term.termTitle}
                              </h3>
                              <span className="ml-2 bg-white px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 border border-indigo-100 shadow-sm">
                                {term.courses.length} รายวิชา
                              </span>
                            </div>
                          </td>
                        </tr>

                        {term.courses.map((course, cIndex) => (
                          <React.Fragment key={cIndex}>
                            {course.instructors.map((inst, iIndex) => (
                              <tr key={iIndex} className="hover:bg-slate-50 transition-colors">
                                {iIndex === 0 && (
                                  <td 
                                    rowSpan={course.instructors.length} 
                                    className="py-4 pl-8 pr-4 align-top border-r border-slate-50 bg-white"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-slate-800 text-base">
                                        {course.code}
                                      </span>
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <BookOpen size={10} /> {course.credit} หน่วยกิต
                                      </span>
                                    </div>
                                    <div className="text-slate-600 text-sm mb-1">{course.name}</div>
                                  </td>
                                )}
                                <td className="py-3 px-4 align-top text-slate-700 border-r border-slate-50">
                                  <div className="font-medium">{inst.name}</div>
                                  <span 
                                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                      inst.role.includes('รับผิดชอบ') 
                                        ? 'bg-orange-50 text-orange-700 border-orange-100' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}
                                  >
                                    {inst.role}
                                  </span>
                                </td>
                                <td className="py-3 px-2 align-top text-center text-slate-600">
                                  {inst.lecture || "-"}
                                </td>
                                <td className="py-3 px-2 align-top text-center text-slate-600">
                                  {inst.lab || "-"}
                                </td>
                                <td className="py-3 px-2 align-top text-center text-slate-600">
                                  {inst.exam || "-"}
                                </td>
                                <td className="py-3 px-2 align-top text-center text-purple-600 font-bold bg-purple-50/10">
                                  {inst.critique || "-"}
                                </td>
                              </tr>
                            ))}
                            <tr className="h-px bg-slate-100 w-full"></tr>
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-purple-500" />
            <span>
              หมายเหตุ: ข้อมูลนี้แสดงผลสำหรับหน้าจอ หากต้องการเอกสารฉบับจริงพร้อมลายเซ็น กรุณากดปุ่มพิมพ์รายงาน
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}