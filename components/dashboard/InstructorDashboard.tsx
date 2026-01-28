"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, Users, BookOpen, Search, Calendar, FileText, 
  ChevronRight, Workflow, HelpCircle, AlertTriangle, CheckCircle2, XCircle, Timer, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { th } from "date-fns/locale";

// --- 1. TYPES DEFINITION (ประกาศ Type ให้ครบ) ---
type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  responsibleUserId: string; 
  teachingAssignments: any[]; 
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
    responsibleUser?: {
        firstName: string;
        lastName: string;
        title: string;
    };
  };
  lecturerStatus: string;
  responsibleStatus: string;
};

type TermConfig = {
    id: string;
    academicYear: number;
    semester: number;
    isActive: boolean;
    step1Start?: string;
    step1End?: string;
    step2Start?: string;
    step2End?: string;
    step3Start?: string;
    step3End?: string;
    step4Start?: string;
    step4End?: string;
};

// --- 2. HELPER COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'APPROVED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> อนุมัติแล้ว</span>;
        case 'REJECTED': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle className="w-3 h-3 mr-1"/> ให้แก้ไข</span>;
        case 'PENDING': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200"><Timer className="w-3 h-3 mr-1"/> รอตรวจสอบ</span>;
        default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">รอดำเนินการ</span>;
    }
};

const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const yearBE = date.getFullYear() + 543;
    return `${format(date, "d MMM", { locale: th })} ${yearBE}`;
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

// --- 3. MAIN COMPONENT ---

export default function InstructorDashboard({ session }: { session: any }) {
  // --- STATE DECLARATIONS (ประกาศตัวแปรให้ครบตรงนี้) ---
  const [activeTab, setActiveTab] = useState<"responsible" | "teaching">("responsible");
  const [activeTerm, setActiveTerm] = useState<TermConfig | null>(null);
  const [responsibleCourses, setResponsibleCourses] = useState<Course[]>([]);
  
  // ✅ จุดสำคัญ: ต้องใส่ [] เป็นค่าเริ่มต้น เพื่อกัน Error .length
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]); 
  const [teachingAssignments, setTeachingAssignments] = useState<Assignment[]>([]); // สำหรับแสดงผล (ถ้าแยกใช้)

  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState<string>("active");

  // --- DATA LOADING ---
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            const userId = session?.user?.id;
            if(!userId) return;

            // 1. Active Term
            const resTerm = await fetch("/api/term-config/active");
            const termData = await resTerm.json();
            setActiveTerm(termData); 

            if (termData) {
                // 2. Courses
                const resCourses = await fetch("/api/courses?filter=active");
                const allCourses = await resCourses.json();
                if (Array.isArray(allCourses)) {
                    const myCourses = allCourses.filter((c: any) => String(c.responsibleUserId) === String(userId));
                    setResponsibleCourses(myCourses);
                }

                // 3. Assignments
                const resAssignments = await fetch(`/api/assignments?lecturerId=${userId}&scope=year`);
                const myAssignments = await resAssignments.json();
                if (Array.isArray(myAssignments)) {
                    setAllAssignments(myAssignments); // เก็บข้อมูลดิบ
                    // กรองเฉพาะ Active Term ใส่ teachingAssignments ไว้แสดงผลใน Tab
                    const activeOnly = myAssignments.filter((a: any) => a.semester === termData.semester);
                    setTeachingAssignments(activeOnly);
                }
            }
        } catch (e) {
            console.error("Error loading dashboard data", e);
        } finally {
            setLoading(false);
        }
    };
    if (session?.user?.id) loadData();
  }, [session]); 

  // --- DERIVED DATA ---
  const totalHours = useMemo(() => {
      let filtered = allAssignments;
      if (statFilter === "active" && activeTerm) {
          filtered = allAssignments.filter(a => a.semester === activeTerm.semester);
      } else if (statFilter !== "all" && statFilter !== "active") {
          filtered = allAssignments.filter(a => a.semester === Number(statFilter));
      }
      return filtered.reduce((sum, a) => sum + (Number(a.lectureHours) || 0) + (Number(a.labHours) || 0), 0);
  }, [allAssignments, statFilter, activeTerm]);

  // --- HELPERS ---
  const getResponsibleName = (user: any) => user ? `${user.title || ''} ${user.firstName} ${user.lastName}`.trim() : "-";
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

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400 gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div> กำลังโหลดข้อมูล...</div>;

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
                <p className="text-xs text-slate-500">ภาคการศึกษาที่ {activeTerm?.semester}/{activeTerm?.academicYear}</p>
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
      
      {/* Header */}
      <div className="text-center pt-0 pb-4 space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">สวัสดี, <span className="text-purple-600">{session?.user?.name || "อาจารย์"}</span></h1>
        <p className="text-slate-500 text-sm">ยินดีต้อนรับสู่ระบบจัดการชั่วโมงภาระงานสอน</p>
      </div>

      {/* Banner */}
      {activeTerm && currentPhase ? (
        <div className={`bg-white rounded-xl border p-1 shadow-sm flex flex-col md:flex-row items-center justify-between pr-4 overflow-hidden relative group transition-colors cursor-pointer ${currentPhase.theme.border} ${currentPhase.theme.hover}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${currentPhase.theme.progress} ${currentPhase.status === 'ACTIVE' ? 'group-hover:opacity-80' : ''}`}></div>
            <div className="flex items-center gap-4 p-3 pl-4 w-full md:w-auto">
                <div className={`p-2.5 rounded-lg min-w-fit ${currentPhase.theme.bg} ${currentPhase.theme.color}`}>
                    {currentPhase.status === 'WAITING' || currentPhase.status === 'CLOSED' ? <Info className="w-5 h-5"/> : <Calendar className="w-5 h-5" />}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">{currentPhase.label} <span className="text-slate-400 font-normal ml-1">(ภาคเรียนที่ {activeTerm.semester}/{activeTerm.academicYear})</span></h3>
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
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 flex items-center gap-3 text-yellow-800 shadow-sm"><AlertTriangle className="w-5 h-5 text-yellow-600" /><div><h3 className="font-bold text-sm">ระบบยังไม่เปิดใช้งาน</h3><p className="text-xs opacity-80">ขณะนี้ยังไม่มีภาคการศึกษาที่เปิดใช้งาน</p></div></div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-1 md:col-span-8 space-y-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm min-h-[500px]">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg self-start">
                <button onClick={() => setActiveTab("responsible")} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === "responsible" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><Users className="w-4 h-4" /> วิชาที่รับผิดชอบ <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full">{responsibleCourses.length}</span></button>
                <button onClick={() => setActiveTab("teaching")} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2", activeTab === "teaching" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}><BookOpen className="w-4 h-4" /> วิชาที่สอน <span className="ml-1 bg-yellow-100 text-yellow-600 text-[10px] px-1.5 rounded-full">{teachingAssignments.length}</span></button>
              </div>
              <div className="relative w-full md:w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" /><input type="text" placeholder="ค้นหารหัสวิชา..." className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50" /></div>
            </div>

            {!activeTerm ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Clock className="w-10 h-10 mb-2 opacity-20" /><p>ไม่มีข้อมูลสำหรับแสดงผล</p></div>
            ) : activeTab === "responsible" ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-b text-slate-500 text-xs uppercase tracking-wider">
                      <tr><th className="px-5 py-3 font-medium">รหัส / ชื่อวิชา</th><th className="px-5 py-3 font-medium text-center">สถานะ</th><th className="px-5 py-3 font-medium text-right">จัดการ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {responsibleCourses.length > 0 ? responsibleCourses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-5 py-3.5"><div className="font-semibold text-slate-700">{course.code}</div><div className="text-xs text-slate-500">{course.name_th}</div></td>
                            <td className="px-5 py-3.5 text-center"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">รอดำเนินการ</span></td>
                            <td className="px-5 py-3.5 text-right"><Button asChild size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 shadow-sm"><Link href={`/workload/owner?subjectId=${course.id}`}><FileText className="w-3.5 h-3.5 mr-1.5" /> กรอกข้อมูล</Link></Button></td>
                          </tr>
                      )) : <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">คุณไม่มีรายวิชาที่รับผิดชอบในเทอมนี้</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">รายการที่รอการยืนยัน <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">เทอม {activeTerm.semester}/{activeTerm.academicYear}</span></h3>
                {teachingAssignments.length > 0 ? teachingAssignments.map((assign) => (
                    <div key={assign.id} className="border rounded-lg p-4 hover:border-blue-400 transition-all bg-white shadow-sm hover:shadow-md group">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-3 w-full">
                          <div><h4 className="text-base font-bold text-slate-800">{assign.subject.code} {assign.subject.name_th}</h4><p className="text-xs text-slate-500 mt-1">ผู้รับผิดชอบ : <span className="font-medium text-slate-700">{getResponsibleName(assign.subject.responsibleUser)}</span></p></div>
                          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 w-fit"><p className="text-xs font-semibold text-slate-600 mb-1">สรุปภาระงานที่ถูกกรอกมา:</p><p className="text-sm text-slate-800">บรรยาย {assign.lectureHours} / ปฏิบัติการ {assign.labHours} ชม.</p></div>
                        </div>
                        <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                            <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">สถานะ: <StatusBadge status={assign.lecturerStatus} /></div>
                            <Button asChild variant="ghost" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-8 text-sm font-medium w-full md:w-auto"><Link href={`/workload/instructor?subjectId=${assign.subject.id}`}>ตรวจสอบ <ChevronRight size={16} /></Link></Button>
                        </div>
                      </div>
                    </div>
                )) : <div className="p-8 text-center border rounded-lg bg-slate-50 text-slate-400">ยังไม่มีรายวิชาที่ถูกมอบหมายให้สอนในเทอมนี้</div>}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Menu */}
        <div className="col-span-1 md:col-span-4 space-y-4">
            
            <Card className="shadow-sm">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">ภาระงานรวม</p>
                            <Select value={statFilter} onValueChange={setStatFilter}>
                                <SelectTrigger className="h-7 text-xs w-[120px] bg-slate-50 border-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">เทอมปัจจุบัน</SelectItem>
                                    <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                                    <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
                                    <SelectItem value="3">ภาคเรียนที่ 3</SelectItem>
                                    <SelectItem value="all">ทั้งปีการศึกษา</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600 mt-1">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    
                    <h3 className="text-4xl font-bold text-slate-800 mt-3 mb-2">
                        {totalHours} <span className="text-lg font-normal text-slate-400">ชม.</span>
                    </h3>
                    
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 w-full opacity-20"></div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2"><Users className="w-5 h-5" /></div>
                        <p className="text-2xl font-bold text-slate-700">{responsibleCourses.length}</p><p className="text-xs text-slate-500">วิชาที่รับผิดชอบ</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="mx-auto w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2"><BookOpen className="w-5 h-5" /></div>
                        <p className="text-2xl font-bold text-slate-700">{teachingAssignments.length}</p><p className="text-xs text-slate-500">วิชาที่สอน</p>
                    </CardContent>
                </Card>
            </div>

            <Link href="/workflow" className="block">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 opacity-10"><Workflow className="w-24 h-24 -mr-4 -mt-4 transform rotate-12" /></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="bg-white/20 p-2.5 rounded-lg"><HelpCircle className="w-6 h-6 text-white" /></div><div><h3 className="font-bold text-base">กระบวนการทำงานระบบ</h3><p className="text-emerald-100 text-xs">ดูขั้นตอนการทำงานของระบบ</p></div></div>
                        <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </Link>
        </div>
      </div>
    </div>
  );
}