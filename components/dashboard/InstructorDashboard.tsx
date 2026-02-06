"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, Users, BookOpen, Search, Calendar, 
  ChevronRight, Workflow, HelpCircle, AlertTriangle, CheckCircle2, XCircle, Timer, Info, Layers, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { th } from "date-fns/locale";

// --- TYPES ---
type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  credit: string;
  semester: number;
  responsibleUserId: string; 
  status?: string;
  program?: { name_th: string; };
  summary?: any;
};

type Assignment = {
  id: number;
  subjectId: number;
  semester: number; 
  lectureHours: number;
  labHours: number;
  subject: {
    id: number;
    code: string;
    name_th: string;
    name_en: string;
    semester?: number;
    responsibleUser?: { firstName: string; lastName: string; title: string; };
  };
  lecturerStatus: string;
  responsibleStatus: string;
};

type TermConfig = {
    id: string;
    academicYear: number;
    semester: number;
    isActive: boolean;
    step1Start?: string; step1End?: string;
    step2Start?: string; step2End?: string;
    step3Start?: string; step3End?: string;
    step4Start?: string; step4End?: string;
};

// --- HELPER CONSTANTS ---
const SEMESTER_INFO: Record<number, { label: string, color: string, iconColor: string, bgColor: string, border: string }> = {
    1: { label: "ภาคการศึกษาต้น", color: "text-blue-700", iconColor: "text-blue-500", bgColor: "bg-blue-50", border: "border-blue-100" },
    2: { label: "ภาคการศึกษาปลาย", color: "text-orange-700", iconColor: "text-orange-500", bgColor: "bg-orange-50", border: "border-orange-100" },
    3: { label: "ภาคฤดูร้อน", color: "text-yellow-700", iconColor: "text-yellow-500", bgColor: "bg-yellow-50", border: "border-yellow-100" }
};

const StatusBadge = ({ status }: { status?: string }) => {
    switch (status) {
        case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap"><CheckCircle2 className="w-3 h-3 mr-1"/> อนุมัติแล้ว</span>;
        case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap"><XCircle className="w-3 h-3 mr-1"/> ให้แก้ไข</span>;
        case 'PENDING': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap"><Timer className="w-3 h-3 mr-1"/> รอตรวจสอบ</span>;
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">รอดำเนินการ</span>;
    }
};

const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const yearBE = date.getFullYear() + 543;
    return `${format(date, "d MMM", { locale: th })} ${yearBE}`;
};

const getResponsibleName = (user: any) => {
    if (!user) return "-";
    return `${user.title || ''}${user.firstName || ''} ${user.lastName || ''}`.trim();
};

const TimelineItem = ({ label, start, end, isActive, colorTheme }: { label: string, start?: string, end?: string, isActive: boolean, colorTheme: 'purple' | 'blue' | 'orange' | 'green' }) => {
    const themeStyles = {
        purple: { activeBg: "bg-purple-50 border-purple-200", activeText: "text-purple-700", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-700" },
        blue: { activeBg: "bg-blue-50 border-blue-200", activeText: "text-blue-700", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-700" },
        orange: { activeBg: "bg-orange-50 border-orange-200", activeText: "text-orange-700", dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
        green: { activeBg: "bg-green-50 border-green-200", activeText: "text-green-700", dot: "bg-green-500", badge: "bg-green-100 text-green-700" }
    };
    const currentTheme = themeStyles[colorTheme];
    return (
        <div className={cn("flex items-start gap-4 p-3 rounded-lg border transition-all duration-300", isActive ? `${currentTheme.activeBg} shadow-sm scale-[1.02]` : "bg-white border-slate-100 opacity-70 hover:opacity-100")}>
            <div className={cn("mt-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2", isActive ? `${currentTheme.dot} ring-${colorTheme}-200 animate-pulse` : "bg-slate-300 ring-transparent")} />
            <div className="flex-1">
                <p className={cn("text-sm font-bold", isActive ? currentTheme.activeText : "text-slate-600")}>{label}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" /> <span>{formatThaiDate(start)} - {formatThaiDate(end)}</span>
                </div>
            </div>
            {isActive && <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", currentTheme.badge)}>ขณะนี้</span>}
        </div>
    );
};

// ==========================================
// COURSE TABLE SECTION
// ==========================================
const CourseTableSection = ({ 
  title, 
  courses, 
  loading, 
  targetSemesters,
  type 
}: { 
  title: string, 
  courses: any[], 
  loading: boolean, 
  currentUser: any,
  targetSemesters: number[],
  type: 'responsible' | 'teaching'
}) => {
  const filteredCourses = courses.filter(c => targetSemesters.includes(Number(c.semester)));
  
  if (!loading && filteredCourses.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mb-8 w-full">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
        <Layers className="text-purple-600" size={20} />
        <h3 className="font-bold text-lg text-slate-800">{title} <span className="text-sm font-normal text-slate-500">({filteredCourses.length} รายการ)</span></h3>
      </div>
      <div className="w-full">
        <table className="w-full text-left table-fixed"> 
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-sm font-semibold uppercase tracking-wider">
            <tr>
              {/* ✅ ปรับสัดส่วนความกว้างใหม่ */}
              <th className="p-4 pl-6 w-[12%]">รหัสวิชา</th>
              <th className="p-4 w-[33%]">ชื่อรายวิชา</th>
              <th className="p-4 w-[10%] text-center">{type === 'responsible' ? 'หน่วยกิต' : 'ภาระงาน'}</th>
              <th className="p-4 w-[20%] text-center">ข้อมูลเพิ่มเติม</th>
              <th className="p-4 w-[13%] text-center">สถานะ</th>
              {/* ✅ เพิ่มพื้นที่ปุ่มเป็น 12% */}
              <th className="p-4 pr-6 w-[12%] text-center"></th> 
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
               <tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...</div></td></tr>
            ) : (
              targetSemesters.map(termId => {
                const termCourses = courses.filter(c => Number(c.semester) === termId);
                if (termCourses.length === 0) return null;
                
                const conf = SEMESTER_INFO[termId]; 

                return (
                  <React.Fragment key={termId}>
                    <tr className={cn("border-y border-slate-200", conf.bgColor)}>
                        <td colSpan={6} className="px-6 py-2">
                            <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", conf.color)}>
                                <Calendar size={12} className={conf.iconColor} /> {conf.label}
                            </span>
                        </td>
                    </tr>

                    {termCourses.map((item) => {
                        const course = type === 'responsible' ? item : item.subject;
                        const assignment = type === 'teaching' ? item : null;
                        const key = type === 'responsible' ? course.id : assignment.id;

                        return (
                            <tr key={key} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-4 pl-6 font-medium text-slate-700 align-top truncate">{course.code}</td>
                                <td className="p-4 align-top">
                                    <div className="font-semibold text-slate-800 break-words whitespace-normal leading-snug">{course.name_th}</div>
                                    <div className="text-xs text-slate-500 font-light mt-1 break-words whitespace-normal leading-snug">{course.name_en}</div>
                                </td>
                                <td className="p-4 text-center align-top text-xs">
                                    {type === 'responsible' ? (
                                        <span className="bg-slate-50 border rounded px-2 py-1 inline-block text-slate-600 whitespace-nowrap">{course.credit}</span>
                                    ) : (
                                        <div className="bg-slate-50 border rounded px-2 py-1 inline-block text-slate-600 whitespace-nowrap">
                                            {assignment.lectureHours} บรรยาย / {assignment.labHours} ปฏิบัติ
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 align-top text-xs text-slate-600 text-center">
                                    <div className="break-words whitespace-normal leading-snug">
                                        {type === 'responsible' 
                                            ? course.program?.name_th 
                                            : <span>ผู้รับผิดชอบ:<br/><span className="font-medium text-slate-800">{getResponsibleName(course.responsibleUser)}</span></span>
                                        }
                                    </div>
                                </td>
                                <td className="p-4 text-center align-top">
                                    {type === 'responsible' 
                                        ? <StatusBadge status={course.status} />
                                        : <div className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 border whitespace-nowrap", 
                                            assignment.lecturerStatus === 'APPROVED' ? "bg-green-100 text-green-800 border-green-200" :
                                            assignment.lecturerStatus === 'PENDING' ? "bg-blue-100 text-blue-800 border-blue-200" :
                                            assignment.lecturerStatus === 'REJECTED' ? "bg-red-100 text-red-800 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                        )}>
                                            {assignment.lecturerStatus === 'APPROVED' ? 'อนุมัติแล้ว' : assignment.lecturerStatus === 'PENDING' ? 'รอตรวจสอบ' : assignment.lecturerStatus === 'REJECTED' ? 'แก้ไข' : 'รอดำเนินการ'}
                                        </div>
                                    }
                                </td>
                                {/* ✅ ปุ่มจัดการ: เต็มช่อง (w-full) */}
                                <td className="p-4 pr-6 text-center align-top">
                                    <Button asChild size="sm" variant={type === 'responsible' ? "outline" : "ghost"} 
                                        className={cn(
                                            "h-9 w-full shadow-sm transition-all text-xs font-semibold", // ใช้ w-full เพื่อให้เต็มช่องที่ขยายมา
                                            type === 'responsible' 
                                                ? "bg-white hover:bg-purple-600 hover:text-white text-purple-700 border-purple-200 hover:border-purple-600" 
                                                : "text-orange-600 hover:text-white hover:bg-orange-500 bg-orange-50"
                                        )}
                                    >
                                        <Link href={`/dashboard/workload/${type === 'responsible' ? 'owner' : 'instructor'}?subjectId=${course.id}`}>
                                            {type === 'responsible' ? 'จัดการ' : 'ตรวจสอบ'}
                                        </Link>
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================
export default function InstructorDashboard({ session }: { session: any }) {
  const currentUser = session?.user;
  
  const [activeTab, setActiveTab] = useState<"responsible" | "teaching">("responsible");
  const [activeTerm, setActiveTerm] = useState<TermConfig | null>(null);
  const [responsibleCourses, setResponsibleCourses] = useState<Course[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]); 
  const [teachingAssignments, setTeachingAssignments] = useState<Assignment[]>([]); 
  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
            if(!currentUser?.id) return;

            const resTerm = await fetch("/api/term-config/active");
            const termData = await resTerm.json();
            setActiveTerm(termData);

            const resCourses = await fetch("/api/courses?filter=year"); 
            const allCourses = await resCourses.json();
            if (Array.isArray(allCourses)) {
                let myCourses = allCourses.filter((c: any) => String(c.responsibleUserId) === String(currentUser.id));
                setResponsibleCourses(myCourses);
            }

            const resAssign = await fetch(`/api/assignments?lecturerId=${currentUser.id}&scope=year`);
            const myAssign = await resAssign.json();
            if (Array.isArray(myAssign)) {
                const mappedAssign = myAssign.map((a: any) => ({
                    ...a,
                    semester: Number(a.semester || a.subject?.semester)
                }));
                
                setAllAssignments(mappedAssign);
                const sorted = mappedAssign.sort((a: any, b: any) => a.semester - b.semester || a.subject.code.localeCompare(b.subject.code));
                setTeachingAssignments(sorted);
            }

        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };
    fetchData();
  }, [currentUser]);

  const filteredRespCourses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return responsibleCourses.filter(c => c.code.toLowerCase().includes(term) || c.name_th.toLowerCase().includes(term));
  }, [responsibleCourses, searchTerm]);

  const filteredTeaching = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return teachingAssignments.filter(a => a.subject.code.toLowerCase().includes(term) || a.subject.name_th.toLowerCase().includes(term));
  }, [teachingAssignments, searchTerm]);

  const totalHours = useMemo(() => {
      let filtered = allAssignments;
      if (statFilter !== "all") {
          filtered = allAssignments.filter(a => a.semester === Number(statFilter));
      }
      return filtered.reduce((sum, a) => sum + (Number(a.lectureHours) || 0) + (Number(a.labHours) || 0), 0);
  }, [allAssignments, statFilter]);

  const getDaysRemaining = (endDateStr?: string) => {
      if (!endDateStr) return null;
      const end = new Date(endDateStr); end.setHours(23, 59, 59, 999);
      const diffTime = end.getTime() - new Date().getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const isStepActive = (start?: string, end?: string) => {
      if (!start || !end) return false;
      const now = new Date();
      return isWithinInterval(now, { start: startOfDay(new Date(start)), end: endOfDay(new Date(end)) });
  };

  const getCurrentPhaseInfo = () => {
      if (!activeTerm) return null;
      const steps = [
          { id: 1, label: "บันทึกภาระงานสอน (ผู้รับผิดชอบ)", start: activeTerm.step1Start, end: activeTerm.step1End, color: "text-purple-600", bg: "bg-purple-100", border: "border-purple-100", hover: "hover:border-purple-300", progress: "bg-purple-500" },
          { id: 2, label: "ตรวจสอบชั่วโมงสอน (อาจารย์ผู้สอน)", start: activeTerm.step2Start, end: activeTerm.step2End, color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-100", hover: "hover:border-blue-300", progress: "bg-blue-500" },
          { id: 3, label: "พิจารณารับรอง (ประธานหลักสูตร)", start: activeTerm.step3Start, end: activeTerm.step3End, color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-100", hover: "hover:border-orange-300", progress: "bg-orange-500" },
          { id: 4, label: "อนุมัติภาพรวม (รองคณบดีฯ)", start: activeTerm.step4Start, end: activeTerm.step4End, color: "text-green-600", bg: "bg-green-100", border: "border-green-100", hover: "hover:border-green-300", progress: "bg-green-500" },
      ];
      
      const currentStep = steps.find(s => isStepActive(s.start, s.end));
      
      if (!currentStep) {
          const isFinished = activeTerm.step4End && new Date() > new Date(activeTerm.step4End);
          if (isFinished) return { label: "สิ้นสุดระยะเวลาดำเนินการ", status: "CLOSED", daysLeft: 0, theme: steps[3] };
          
          return { label: "อยู่นอกช่วงเวลากำหนดการ", status: "WAITING", daysLeft: 0, theme: { ...steps[0], color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", hover: "", progress: "bg-slate-300" } };
      }
      return { label: `กำลังดำเนินการ: ${currentStep.label}`, end: currentStep.end, status: "ACTIVE", daysLeft: getDaysRemaining(currentStep.end), theme: currentStep };
  };
  const currentPhase = getCurrentPhaseInfo();

  const TimelineDialog = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-xs h-8 bg-white hover:bg-slate-50 text-purple-700 border-purple-200 shadow-sm">
                กดดูกำหนดการ
            </Button>
        </DialogTrigger>
        <DialogContent className="fixed z-[9999] max-w-md sm:rounded-2xl top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
            <DialogHeader>
                <DialogTitle className="text-purple-900 flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5" /> กำหนดการดำเนินงาน
                </DialogTitle>
                <p className="text-xs text-slate-500">ปีการศึกษา {activeTerm?.academicYear}</p>
            </DialogHeader>
            <div className="space-y-3 mt-2">
                <TimelineItem label="1. บันทึกภาระงานสอน (ผู้รับผิดชอบ)" start={activeTerm?.step1Start} end={activeTerm?.step1End} isActive={isStepActive(activeTerm?.step1Start, activeTerm?.step1End)} colorTheme="purple"/>
                <TimelineItem label="2. ตรวจสอบชั่วโมงสอน (อาจารย์ผู้สอน)" start={activeTerm?.step2Start} end={activeTerm?.step2End} isActive={isStepActive(activeTerm?.step2Start, activeTerm?.step2End)} colorTheme="blue"/>
                <TimelineItem label="3. พิจารณารับรอง (ประธานหลักสูตร)" start={activeTerm?.step3Start} end={activeTerm?.step3End} isActive={isStepActive(activeTerm?.step3Start, activeTerm?.step3End)} colorTheme="orange"/>
                <TimelineItem label="4. อนุมัติภาพรวม (รองคณบดีฯ)" start={activeTerm?.step4Start} end={activeTerm?.step4End} isActive={isStepActive(activeTerm?.step4Start, activeTerm?.step4End)} colorTheme="green"/>
            </div>
        </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sarabun p-6 bg-slate-50/30 min-h-screen">
      <div className="text-center pt-0 pb-4 space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">สวัสดี, <span className="text-purple-600">{session?.user?.name || "อาจารย์"}</span></h1>
        <p className="text-slate-500 text-sm">ยินดีต้อนรับสู่ระบบจัดการชั่วโมงภาระงานสอน</p>
      </div>

      {activeTerm && currentPhase ? (
        <div className={`bg-white rounded-xl border p-1 shadow-sm flex flex-col md:flex-row items-center justify-between pr-4 overflow-hidden relative group transition-colors cursor-pointer ${currentPhase.theme.border} ${currentPhase.theme.hover}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${currentPhase.theme.progress} ${currentPhase.status === 'ACTIVE' ? 'group-hover:opacity-80' : ''}`}></div>
            <div className="flex items-center gap-4 p-3 pl-4 w-full md:w-auto">
                <div className={`p-2.5 rounded-lg min-w-fit ${currentPhase.theme.bg} ${currentPhase.theme.color}`}>
                    {currentPhase.status === 'WAITING' || currentPhase.status === 'CLOSED' ? <Info className="w-5 h-5"/> : <Calendar className="w-5 h-5" />}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">{currentPhase.label} <span className="text-slate-400 font-normal ml-1">(ปีการศึกษา {activeTerm.academicYear})</span></h3>
                    <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-2"><Clock className="w-3 h-3" /> {currentPhase.status === 'ACTIVE' ? `หมดเขต: ${formatThaiDate(currentPhase.end)}` : currentPhase.status === 'CLOSED' ? "สิ้นสุดการดำเนินการแล้ว" : "โปรดติดตามกำหนดการ"}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 p-2 md:p-0">
                {currentPhase.status === 'ACTIVE' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap ${currentPhase.daysLeft! <= 2 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                        {currentPhase.daysLeft! <= 2 && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                        {currentPhase.daysLeft === 0 ? "วันนี้วันสุดท้าย!" : currentPhase.daysLeft! < 0 ? "หมดเวลาส่งข้อมูล" : `เหลือเวลา ${currentPhase.daysLeft} วัน`}
                    </span>
                )}
                <TimelineDialog />
            </div>
        </div>
      ) : (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 flex items-center gap-3 text-yellow-800 shadow-sm"><AlertTriangle className="w-5 h-5 text-yellow-600" /><div><h3 className="font-bold text-sm">ระบบยังไม่เปิดใช้งาน</h3><p className="text-xs opacity-80">ขณะนี้ยังไม่มีปีการศึกษาที่เปิดใช้งาน</p></div></div>
      )}

      {/* ✅ Grid 9:3 (ขยายพื้นที่ส่วนรายวิชา) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-9 space-y-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg self-start">
                <button onClick={() => setActiveTab("responsible")} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === "responsible" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users className="w-4 h-4" /> วิชาที่รับผิดชอบ <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full">{responsibleCourses.length}</span></button>
                <button onClick={() => setActiveTab("teaching")} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === "teaching" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><BookOpen className="w-4 h-4" /> วิชาที่สอน <span className="ml-1 bg-yellow-100 text-yellow-600 text-[10px] px-1.5 rounded-full">{teachingAssignments.length}</span></button>
              </div>
              <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input type="text" placeholder="ค้นหารหัสวิชา..." className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>

            {!activeTerm ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Clock className="w-10 h-10 mb-2 opacity-20" /><p>ไม่มีข้อมูลสำหรับแสดงผล</p></div>
            ) : activeTab === "responsible" ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <CourseTableSection title="รายวิชา" courses={filteredRespCourses} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="responsible" />
                {filteredRespCourses.length === 0 && (
                    <div className="p-10 text-center border rounded-xl bg-slate-50/50 text-slate-400 flex flex-col items-center gap-2"><BookOpen className="w-8 h-8 opacity-20" /><p>คุณไม่มีรายวิชาที่รับผิดชอบ</p></div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                <CourseTableSection title="รายวิชา" courses={filteredTeaching} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="teaching" />
                {filteredTeaching.length === 0 && (
                    <div className="p-10 text-center border rounded-xl bg-slate-50/50 text-slate-400 flex flex-col items-center gap-2"><BookOpen className="w-8 h-8 opacity-20" /><p>ยังไม่มีรายวิชาที่ถูกมอบหมายให้สอน</p></div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ✅ Right Column Reduced */}
        <div className="col-span-1 md:col-span-3 space-y-4">
            <Card className="shadow-sm">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">ภาระงานรวม</p>
                            <Select value={statFilter} onValueChange={setStatFilter}>
                                <SelectTrigger className="h-7 text-xs w-[120px] bg-slate-50 border-slate-200 font-bold text-slate-700"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">ทั้งปีการศึกษา</SelectItem>
                                    <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                                    <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
                                    <SelectItem value="3">ภาคเรียนที่ 3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1"><Clock className="w-5 h-5" /></div>
                    </div>
                    <h3 className="text-4xl font-bold text-slate-800 mt-3 mb-2">{totalHours} <span className="text-lg font-normal text-slate-400">ชม.</span></h3>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4"><div className="bg-blue-500 h-full rounded-full transition-all duration-1000 w-full opacity-20"></div></div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
                <Card className="shadow-sm"><CardContent className="p-4 text-center"><div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2"><Users className="w-5 h-5" /></div><p className="text-2xl font-bold text-slate-700">{responsibleCourses.length}</p><p className="text-xs text-slate-500">วิชาที่รับผิดชอบ</p></CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-4 text-center"><div className="mx-auto w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2"><BookOpen className="w-5 h-5" /></div><p className="text-2xl font-bold text-slate-700">{teachingAssignments.length}</p><p className="text-xs text-slate-500">วิชาที่สอน</p></CardContent></Card>
            </div>

            <Link href="/workflow" className="block">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10"><Workflow className="w-24 h-24 -mr-4 -mt-4 transform rotate-12" /></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="bg-white/20 p-2.5 rounded-lg"><HelpCircle className="w-6 h-6 text-white" /></div><div><h3 className="font-bold text-base">กระบวนการ</h3><p className="text-emerald-100 text-xs">ขั้นตอนการทำงาน</p></div></div>
                        <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
}