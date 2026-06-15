"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Users, BookOpen, Search, Calendar,
  ChevronRight, Workflow, HelpCircle, AlertTriangle, CheckCircle2, XCircle, Timer, Info, Layers, Loader2,
  FileText, TrendingUp, Sparkles
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
  teachingAssignments?: any[];
  summary?: any;
};

type Assignment = {
  id: number;
  subjectId: number;
  semester: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  examCritiqueHours: number;
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
  headApprovalStatus?: string;
  academicApprovalStatus?: string;
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
  1: { label: "ภาคการศึกษาต้น", color: "text-blue-700", iconColor: "text-blue-500", bgColor: "bg-blue-50/60", border: "border-blue-100" },
  2: { label: "ภาคการศึกษาปลาย", color: "text-amber-700", iconColor: "text-amber-500", bgColor: "bg-amber-50/60", border: "border-amber-100" },
  3: { label: "ภาคฤดูร้อน", color: "text-emerald-700", iconColor: "text-emerald-500", bgColor: "bg-emerald-50/60", border: "border-emerald-100" }
};

// Updated timeline step labels
const STEP_LABELS = [
  "บันทึกภาระงานสอนในระบบ",
  "ตรวจสอบและติดตามการดำเนินงาน",
  "พิจารณาตรวจสอบข้อมูล (ระดับหลักสูตร)",
  "พิจารณาตรวจสอบและรับรองข้อมูล (ระดับคณะ)",
];

const STEP_ROLES = [
  "ผู้รับผิดชอบรายวิชา",
  "อาจารย์ผู้สอน",
  "ประธานหลักสูตร",
  "รองคณบดีฝ่ายวิชาการ",
];

// --- HELPER FUNCTIONS ---
const StatusBadge = ({ status }: { status?: string }) => {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap gap-1";
  switch (status) {
    case 'APPROVED':
      return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว</span>;
    case 'PENDING_DEAN':
      return <span className={`${base} bg-violet-50 text-violet-700 border-violet-200`}><FileText className="w-3 h-3" /> รอรองฯ วิชาการ</span>;
    case 'PENDING_HEAD':
      return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}><Timer className="w-3 h-3" /> รอประธานฯ</span>;
    case 'REJECTED':
      return <span className={`${base} bg-red-50 text-red-700 border-red-200`}><XCircle className="w-3 h-3" /> ให้แก้ไข</span>;
    case 'PENDING':
    case 'IN_PROGRESS':
      return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><Timer className="w-3 h-3" /> กำลังดำเนินการ</span>;
    default:
      return <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>รอดำเนินการ</span>;
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

// --- TIMELINE ITEM ---
const TimelineItem = ({
  stepNumber, label, role, start, end, isActive, colorTheme
}: {
  stepNumber: number;
  label: string;
  role: string;
  start?: string;
  end?: string;
  isActive: boolean;
  colorTheme: 'purple' | 'blue' | 'amber' | 'emerald';
}) => {
  const themes = {
    purple: {
      activeBg: "bg-purple-50 border-purple-200",
      activeText: "text-purple-700",
      dot: "bg-purple-500 ring-purple-200",
      badge: "bg-purple-100 text-purple-700",
      number: "bg-purple-600 text-white",
    },
    blue: {
      activeBg: "bg-blue-50 border-blue-200",
      activeText: "text-blue-700",
      dot: "bg-blue-500 ring-blue-200",
      badge: "bg-blue-100 text-blue-700",
      number: "bg-blue-600 text-white",
    },
    amber: {
      activeBg: "bg-amber-50 border-amber-200",
      activeText: "text-amber-700",
      dot: "bg-amber-500 ring-amber-200",
      badge: "bg-amber-100 text-amber-700",
      number: "bg-amber-500 text-white",
    },
    emerald: {
      activeBg: "bg-emerald-50 border-emerald-200",
      activeText: "text-emerald-700",
      dot: "bg-emerald-500 ring-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      number: "bg-emerald-600 text-white",
    },
  };
  const t = themes[colorTheme];

  return (
    <div className={cn(
      "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300",
      isActive ? `${t.activeBg} shadow-sm` : "bg-white border-slate-100 opacity-60 hover:opacity-90"
    )}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5",
        isActive ? t.number : "bg-slate-200 text-slate-500"
      )}>
        {stepNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-bold leading-snug", isActive ? t.activeText : "text-slate-600")}>
          {label}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">{role}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formatThaiDate(start)} — {formatThaiDate(end)}</span>
        </div>
      </div>
      {isActive && (
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5", t.badge)}>
          ขณะนี้
        </span>
      )}
    </div>
  );
};

// --- COURSE TABLE SECTION ---
const CourseTableSection = ({
  title, courses, loading, currentUser, targetSemesters, type
}: {
  title: string;
  courses: any[];
  loading: boolean;
  currentUser: any;
  targetSemesters: number[];
  type: 'responsible' | 'teaching';
}) => {
  const filteredCourses = courses.filter(c => targetSemesters.includes(Number(c.semester)));
  if (!loading && filteredCourses.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden mb-6 w-full">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5 bg-gradient-to-r from-slate-50 to-white">
        <div className="p-1.5 bg-violet-100 rounded-lg">
          <Layers className="text-violet-600" size={16} />
        </div>
        <h3 className="font-bold text-slate-800">
          {title}
          <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {filteredCourses.length} รายการ
          </span>
        </h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 pl-6 w-[12%]">รหัสวิชา</th>
              <th className="p-4 w-[30%]">ชื่อรายวิชา</th>
              <th className="p-4 w-[18%] text-center">{type === 'responsible' ? 'หน่วยกิต' : 'ภาระงาน (ชม.)'}</th>
              <th className="p-4 w-[17%] text-center">ข้อมูลเพิ่มเติม</th>
              <th className="p-4 w-[13%] text-center">สถานะ</th>
              <th className="p-4 pr-6 w-[10%] text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" /> กำลังโหลดข้อมูล...
                  </div>
                </td>
              </tr>
            ) : (
              targetSemesters.map(termId => {
                const termCourses = courses.filter(c => Number(c.semester) === termId);
                if (termCourses.length === 0) return null;
                const conf = SEMESTER_INFO[termId];

                return (
                  <React.Fragment key={termId}>
                    <tr className={cn("border-y border-slate-100", conf.bgColor)}>
                      <td colSpan={6} className="px-6 py-2">
                        <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", conf.color)}>
                          <Calendar size={11} className={conf.iconColor} /> {conf.label}
                        </span>
                      </td>
                    </tr>
                    {termCourses.map((item) => {
                      const course = type === 'responsible' ? item : item.subject;
                      const assignment = type === 'teaching' ? item : null;
                      const key = type === 'responsible' ? course.id : assignment.id;
                      const showStatus = type === 'responsible' ? course.status : assignment.lecturerStatus;

                      return (
                        <tr key={key} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="p-4 pl-6 font-semibold text-slate-700 align-top truncate text-sm">{course.code}</td>
                          <td className="p-4 align-top">
                            <div className="font-semibold text-slate-800 break-words whitespace-normal leading-snug text-sm">{course.name_th}</div>
                            <div className="text-xs text-slate-400 font-light mt-0.5 break-words whitespace-normal leading-snug">{course.name_en}</div>
                          </td>
                          <td className="p-4 text-center align-top text-xs">
                            {type === 'responsible' ? (
                              <span className="bg-white border border-slate-200 shadow-sm rounded-lg px-2.5 py-1 inline-block text-slate-600 font-medium">
                                {course.credit} หน่วยกิต
                              </span>
                            ) : (
                              <div className="space-y-1.5 text-left inline-block">
                                {[
                                  { color: "bg-blue-400", label: "บรรยาย", value: assignment.lectureHours },
                                  { color: "bg-amber-400", label: "ปฏิบัติ", value: assignment.labHours },
                                  { color: "bg-rose-400", label: "คุมสอบ", value: assignment.examHours },
                                  { color: "bg-violet-400", label: "วิพากษ์", value: assignment.examCritiqueHours },
                                ].map(({ color, label, value }) => (
                                  <div key={label} className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`}></span>
                                    <span className="text-slate-400 w-16">{label}</span>
                                    <span className="font-semibold text-slate-700 tabular-nums">{value ?? 0} ชม.</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 align-top text-xs text-slate-500 text-center">
                            <div className="break-words whitespace-normal leading-snug">
                              {type === 'responsible'
                                ? course.program?.name_th
                                : <span>ผู้รับผิดชอบ:<br /><span className="font-semibold text-slate-700">{getResponsibleName(course.responsibleUser)}</span></span>
                              }
                            </div>
                          </td>
                          <td className="p-4 text-center align-top">
                            <StatusBadge status={showStatus} />
                          </td>
                          <td className="p-4 pr-6 text-center align-top">
                            <Button asChild size="sm" variant="outline"
                              className={cn(
                                "h-8 w-full text-xs font-semibold rounded-lg transition-all",
                                type === 'responsible'
                                  ? "bg-white hover:bg-violet-600 hover:text-white text-violet-700 border-violet-200 hover:border-violet-600 hover:shadow-md"
                                  : "text-amber-600 hover:text-white hover:bg-amber-500 bg-amber-50 border-amber-200"
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
};

// ==========================================
// MAIN COMPONENT
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
        if (!currentUser?.id) return;

        const resTerm = await fetch("/api/term-config/active", { cache: 'no-store' });
        const termData = await resTerm.json();
        setActiveTerm(termData);

        const resCourses = await fetch("/api/courses?filter=year", { cache: 'no-store' });
        const allCourses = await resCourses.json();

        if (Array.isArray(allCourses)) {
          let myCourses = allCourses.filter((c: any) => String(c.responsibleUserId) === String(currentUser.id));
          myCourses = myCourses.map((course: any) => {
            const assigns = course.teachingAssignments || [];
            if (assigns.length > 0) {
              const allHeadApproved = assigns.every((a: any) => a.headApprovalStatus === 'APPROVED');
              const allDeanApproved = assigns.every((a: any) => a.academicApprovalStatus === 'APPROVED');
              const anyRejected = assigns.some((a: any) => a.headApprovalStatus === 'REJECTED' || a.responsibleStatus === 'REJECTED');
              const allSubmitted = assigns.every((a: any) => a.responsibleStatus === 'APPROVED');
              if (allDeanApproved) course.status = 'APPROVED';
              else if (allHeadApproved) course.status = 'PENDING_DEAN';
              else if (anyRejected) course.status = 'REJECTED';
              else if (allSubmitted) course.status = 'PENDING_HEAD';
              else course.status = 'IN_PROGRESS';
            }
            return course;
          });
          setResponsibleCourses(myCourses);
        }

        const resAssign = await fetch(`/api/assignments?lecturerId=${currentUser.id}&scope=year`, { cache: 'no-store' });
        const myAssign = await resAssign.json();
        if (Array.isArray(myAssign)) {
          const mappedAssign = myAssign.map((a: any) => ({
            ...a,
            semester: Number(a.semester || a.subject?.semester),
            examHours: Number(a.examHours ?? 0),
            examCritiqueHours: Number(a.examCritiqueHours ?? 0),
          }));
          setAllAssignments(mappedAssign);
          const sorted = mappedAssign.sort((a: any, b: any) => a.semester - b.semester || a.subject.code.localeCompare(b.subject.code));
          setTeachingAssignments(sorted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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
    return filtered.reduce((sum, a) =>
      sum + (Number(a.lectureHours) || 0) + (Number(a.labHours) || 0) + (Number(a.examHours) || 0) + (Number(a.examCritiqueHours) || 0), 0);
  }, [allAssignments, statFilter]);

  const getDaysRemaining = (endDateStr?: string) => {
    if (!endDateStr) return null;
    const end = new Date(endDateStr); end.setHours(23, 59, 59, 999);
    return Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const isStepActive = (start?: string, end?: string) => {
    if (!start || !end) return false;
    return isWithinInterval(new Date(), { start: startOfDay(new Date(start)), end: endOfDay(new Date(end)) });
  };

  const stepConfigs = [
    { color: "text-violet-600", bg: "bg-violet-100", border: "border-violet-100", hover: "hover:border-violet-200", progress: "bg-violet-500", theme: "purple" as const },
    { color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-100", hover: "hover:border-blue-200", progress: "bg-blue-500", theme: "blue" as const },
    { color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-100", hover: "hover:border-amber-200", progress: "bg-amber-500", theme: "amber" as const },
    { color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-100", hover: "hover:border-emerald-200", progress: "bg-emerald-500", theme: "emerald" as const },
  ];

  const getCurrentPhaseInfo = () => {
    if (!activeTerm) return null;
    const stepDates = [
      { start: activeTerm.step1Start, end: activeTerm.step1End },
      { start: activeTerm.step2Start, end: activeTerm.step2End },
      { start: activeTerm.step3Start, end: activeTerm.step3End },
      { start: activeTerm.step4Start, end: activeTerm.step4End },
    ];

    const currentIdx = stepDates.findIndex(s => isStepActive(s.start, s.end));

    if (currentIdx === -1) {
      const isFinished = activeTerm.step4End && new Date() > new Date(activeTerm.step4End);
      const fallbackTheme = { ...stepConfigs[0], color: "text-slate-500", bg: "bg-slate-100", border: "border-slate-200", progress: "bg-slate-300" };
      return {
        label: isFinished ? "สิ้นสุดระยะเวลาดำเนินการ" : "อยู่นอกช่วงเวลากำหนดการ",
        status: isFinished ? "CLOSED" : "WAITING",
        daysLeft: 0,
        theme: fallbackTheme,
        stepIndex: -1,
      };
    }

    return {
      label: `ขั้นตอนที่ ${currentIdx + 1}: ${STEP_LABELS[currentIdx]}`,
      end: stepDates[currentIdx].end,
      status: "ACTIVE",
      daysLeft: getDaysRemaining(stepDates[currentIdx].end),
      theme: stepConfigs[currentIdx],
      stepIndex: currentIdx,
    };
  };

  const currentPhase = getCurrentPhaseInfo();

  const TimelineDialog = () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-8 bg-white hover:bg-violet-50 text-violet-700 border-violet-200 shadow-sm font-medium">
          ดูกำหนดการ
        </Button>
      </DialogTrigger>
      <DialogContent className="fixed z-[9999] max-w-md sm:rounded-2xl top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="text-slate-800 flex items-center gap-2 text-lg font-bold">
            <Calendar className="w-5 h-5 text-violet-600" /> กำหนดการดำเนินงาน
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5">ปีการศึกษา {activeTerm?.academicYear}</p>
        </DialogHeader>
        <div className="space-y-2.5 mt-3">
          {[
            { start: activeTerm?.step1Start, end: activeTerm?.step1End, theme: "purple" as const },
            { start: activeTerm?.step2Start, end: activeTerm?.step2End, theme: "blue" as const },
            { start: activeTerm?.step3Start, end: activeTerm?.step3End, theme: "amber" as const },
            { start: activeTerm?.step4Start, end: activeTerm?.step4End, theme: "emerald" as const },
          ].map((step, i) => (
            <TimelineItem
              key={i}
              stepNumber={i + 1}
              label={STEP_LABELS[i]}
              role={STEP_ROLES[i]}
              start={step.start}
              end={step.end}
              isActive={isStepActive(step.start, step.end)}
              colorTheme={step.theme}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5 font-sarabun p-6 bg-slate-50/50 min-h-screen">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            สวัสดี, <span className="text-violet-600">{session?.user?.name || "อาจารย์"}</span>
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">ยินดีต้อนรับสู่ระบบจัดการชั่วโมงภาระงานสอน</p>
        </div>
        <div className="flex items-center gap-1.5 bg-violet-50 border border-violet-100 rounded-full px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs text-violet-600 font-medium">ปีการศึกษา {activeTerm?.academicYear || "—"}</span>
        </div>
      </div>

      {/* Phase Banner */}
      {activeTerm && currentPhase ? (
        <div className={cn(
          "bg-white rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden",
          currentPhase.theme.border
        )}>
          {/* left accent */}
          <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl", currentPhase.theme.progress)} />

          <div className="flex items-center gap-4 pl-3 w-full md:w-auto">
            <div className={cn("p-2.5 rounded-xl shrink-0", currentPhase.theme.bg)}>
              {currentPhase.status === 'WAITING' || currentPhase.status === 'CLOSED'
                ? <Info className={cn("w-5 h-5", currentPhase.theme.color)} />
                : <Calendar className={cn("w-5 h-5", currentPhase.theme.color)} />
              }
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{currentPhase.label}</p>
              <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {currentPhase.status === 'ACTIVE'
                  ? `หมดเขต ${formatThaiDate(currentPhase.end)}`
                  : currentPhase.status === 'CLOSED'
                  ? "สิ้นสุดการดำเนินการแล้ว"
                  : "โปรดติดตามกำหนดการ"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {currentPhase.status === 'ACTIVE' && currentPhase.daysLeft !== null && (
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5",
                currentPhase.daysLeft! <= 2
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              )}>
                {currentPhase.daysLeft! <= 2 && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                {currentPhase.daysLeft === 0 ? "วันนี้วันสุดท้าย!" : currentPhase.daysLeft! < 0 ? "หมดเวลาส่งข้อมูล" : `เหลือ ${currentPhase.daysLeft} วัน`}
              </span>
            )}
            <TimelineDialog />
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-center gap-3 text-amber-800 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <h3 className="font-bold text-sm">ระบบยังไม่เปิดใช้งาน</h3>
            <p className="text-xs opacity-70 mt-0.5">ขณะนี้ยังไม่มีปีการศึกษาที่เปิดใช้งาน</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* Left: Course Table */}
        <div className="col-span-1 md:col-span-9 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">

            {/* Tab + Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl self-start">
                <button
                  onClick={() => setActiveTab("responsible")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    activeTab === "responsible" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Users className="w-4 h-4" />
                  วิชาที่รับผิดชอบ
                  <span className="ml-0.5 bg-violet-100 text-violet-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {responsibleCourses.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("teaching")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                    activeTab === "teaching" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  วิชาที่สอน
                  <span className="ml-0.5 bg-amber-100 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {teachingAssignments.length}
                  </span>
                </button>
              </div>

              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ค้นหารหัส / ชื่อวิชา..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-slate-50/50 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {!activeTerm ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                <Clock className="w-10 h-10 opacity-20" />
                <p className="text-sm">ไม่มีข้อมูลสำหรับแสดงผล</p>
              </div>
            ) : activeTab === "responsible" ? (
              <div className="animate-in fade-in duration-200">
                <CourseTableSection title="รายวิชาที่รับผิดชอบ" courses={filteredRespCourses} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="responsible" />
                {!loading && filteredRespCourses.length === 0 && (
                  <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 flex flex-col items-center gap-2">
                    <BookOpen className="w-8 h-8 opacity-20" />
                    <p className="text-sm">ไม่มีรายวิชาที่รับผิดชอบ</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in duration-200">
                <CourseTableSection title="รายวิชาที่สอน" courses={filteredTeaching} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="teaching" />
                {!loading && filteredTeaching.length === 0 && (
                  <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 flex flex-col items-center gap-2">
                    <BookOpen className="w-8 h-8 opacity-20" />
                    <p className="text-sm">ยังไม่มีรายวิชาที่ถูกมอบหมาย</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="col-span-1 md:col-span-3 space-y-4">

          {/* Total Hours */}
          <Card className="shadow-sm border-slate-200/70 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium mb-2">ภาระงานรวม</p>
                  <Select value={statFilter} onValueChange={setStatFilter}>
                    <SelectTrigger className="h-7 text-xs w-[140px] bg-slate-50 border-slate-200 font-semibold text-slate-700 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทั้งปีการศึกษา</SelectItem>
                      <SelectItem value="1">ภาคเรียนที่ 1</SelectItem>
                      <SelectItem value="2">ภาคเรียนที่ 2</SelectItem>
                      <SelectItem value="3">ภาคเรียนที่ 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 p-2 rounded-xl text-blue-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-4xl font-bold text-slate-800 tabular-nums">{totalHours}</span>
                <span className="text-slate-400 text-base mb-1">ชม.</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-violet-400 h-full rounded-full w-3/4 opacity-60" />
              </div>
            </CardContent>
          </Card>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="shadow-sm border-slate-200/70 rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-slate-700">{responsibleCourses.length}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">วิชาที่รับผิดชอบ</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-200/70 rounded-2xl">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-2">
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-slate-700">{teachingAssignments.length}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">วิชาที่สอน</p>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Link */}
          <Link href="/workflow" className="block">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10">
                <Workflow className="w-24 h-24 -mr-4 -mt-4 transform rotate-12" />
              </div>
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-xl">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">กระบวนการ</h3>
                    <p className="text-emerald-100 text-xs">ขั้นตอนการทำงาน</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}