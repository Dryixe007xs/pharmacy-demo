"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, Users, BookOpen, Search, Calendar,
  ChevronRight, Workflow, HelpCircle, AlertTriangle, CheckCircle2, XCircle, Timer, Info, Layers, Loader2,
  FileText, TrendingUp, Sparkles, Edit, Trash2, UserCheck, ThumbsUp, PenLine, AlertCircle, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { th } from "date-fns/locale";
import Swal from "sweetalert2";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
  lecturerFeedback?: string;
  responsibleStatus: string;
  headApprovalStatus?: string;
  academicApprovalStatus?: string;
  courseType?: "INTERNAL" | "EXTERNAL";
  externalFaculty?: string | null;
  externalCourseCode?: string | null;
  externalCourseName?: string | null;
  externalCourseNameEn?: string | null;
  externalCredit?: string | null;
  evidenceLink?: string | null;
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

const STEP_LABELS = ["บันทึกภาระงานสอนในระบบ", "ตรวจสอบและติดตามการดำเนินงาน", "พิจารณาตรวจสอบข้อมูล (ระดับหลักสูตร)", "พิจารณาตรวจสอบและรับรองข้อมูล (ระดับคณะ)"];
const STEP_ROLES = ["ผู้รับผิดชอบรายวิชา", "อาจารย์ผู้สอน", "ประธานหลักสูตร", "รองคณบดีฝ่ายวิชาการ"];

// --- HELPER FUNCTIONS ---
const StatusBadge = ({ status }: { status?: string }) => {
  const base = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap gap-1";
  switch (status) {
    case 'APPROVED': return <span className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200`}><CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว</span>;
    case 'PENDING_DEAN': return <span className={`${base} bg-violet-50 text-violet-700 border-violet-200`}><FileText className="w-3 h-3" /> รอรองฯ วิชาการ</span>;
    case 'PENDING_HEAD': return <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}><Timer className="w-3 h-3" /> รอประธานฯ</span>;
    case 'REJECTED': return <span className={`${base} bg-red-50 text-red-700 border-red-200`}><XCircle className="w-3 h-3" /> ให้แก้ไข</span>;
    case 'PENDING':
    case 'IN_PROGRESS': return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><Timer className="w-3 h-3" /> กำลังดำเนินการ</span>;
    default: return <span className={`${base} bg-slate-100 text-slate-600 border-slate-200`}>รอดำเนินการ</span>;
  }
};

const formatThaiDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${format(date, "d MMM", { locale: th })} ${date.getFullYear() + 543}`;
};

const getResponsibleName = (user: any) => user ? `${user.title || ''}${user.firstName || ''} ${user.lastName || ''}`.trim() : "-";
const isExternalCourse = (a: Assignment) => a.courseType === "EXTERNAL" || !!a.externalCourseCode;

// --- TIMELINE ITEM ---
const TimelineItem = ({ stepNumber, label, role, start, end, isActive, colorTheme }: any) => {
  const themes = {
    purple: { activeBg: "bg-purple-50 border-purple-200", activeText: "text-purple-700", number: "bg-purple-600 text-white", badge: "bg-purple-100 text-purple-700" },
    blue: { activeBg: "bg-blue-50 border-blue-200", activeText: "text-blue-700", number: "bg-blue-600 text-white", badge: "bg-blue-100 text-blue-700" },
    amber: { activeBg: "bg-amber-50 border-amber-200", activeText: "text-amber-700", number: "bg-amber-500 text-white", badge: "bg-amber-100 text-amber-700" },
    emerald: { activeBg: "bg-emerald-50 border-emerald-200", activeText: "text-emerald-700", number: "bg-emerald-600 text-white", badge: "bg-emerald-100 text-emerald-700" },
  };
  const t = themes[colorTheme as keyof typeof themes];

  return (
    <div className={cn("flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300", isActive ? `${t.activeBg} shadow-sm` : "bg-white border-slate-100 opacity-60")}>
      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", isActive ? t.number : "bg-slate-200 text-slate-500")}>
        {stepNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-bold leading-snug", isActive ? t.activeText : "text-slate-600")}>{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{role}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5"><Calendar className="w-3 h-3 shrink-0" /><span>{formatThaiDate(start)} — {formatThaiDate(end)}</span></div>
      </div>
      {isActive && <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5", t.badge)}>ขณะนี้</span>}
    </div>
  );
};

// ==========================================
// 🌟 ACTION CELL (หัวใจสำคัญสำหรับการโชว์กล่องแดง!)
// ==========================================
function ActionCell({ item, processingId, verify, dispute, submitToChair, onEdit }: any) {
  const isExt = isExternalCourse(item);
  const isLoading = processingId === item.id;

  // สำหรับวิชานอกคณะ (EXTERNAL)
  if (isExt) {
    const isAcademicApproved = item.academicApprovalStatus === "APPROVED";
    const isHeadApproved = item.headApprovalStatus === "APPROVED";
    const isRejectedByChair = item.headApprovalStatus === "REJECTED";
    const isPendingHead = item.headApprovalStatus === "PENDING" && !isRejectedByChair;

    if (isAcademicApproved) return <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติสมบูรณ์</span>;
    if (isHeadApproved) return <span className="inline-flex items-center gap-1.5 text-cyan-700 font-bold text-xs bg-cyan-50 py-1.5 px-3 rounded-full border border-cyan-200"><Clock className="w-3.5 h-3.5" /> รอรองวิชาการ</span>;
    if (isPendingHead) return <span className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 py-1.5 px-3 rounded-full border border-indigo-200"><Clock className="w-3.5 h-3.5" /> รอประธาน</span>;

    // 🌟 แสดงกล่องแดงและปุ่มแก้ไข สำหรับวิชานอกคณะที่โดนตีกลับ
    return (
      <div className="flex flex-col items-center gap-2">
        {isRejectedByChair && (
          <div className="flex flex-col gap-1.5 w-full mt-1 mb-1">
            <span className="inline-flex items-center justify-center gap-1 text-red-600 text-[10px] bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold mx-auto w-fit">
              <AlertCircle className="w-3 h-3" /> ประธานส่งกลับแก้ไข
            </span>
            <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2 rounded-md text-left w-full shadow-sm leading-tight">
                <span className="font-bold block mb-0.5 text-red-800">หมายเหตุ:</span>
                {item.lecturerFeedback?.replace("[CHAIR_REJECT]:", "").trim() || "ไม่ระบุเหตุผล"}
            </div>
          </div>
        )}
        <div className="flex gap-2 w-full">
          <button onClick={() => onEdit(item)} className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-sm font-medium transition-all active:scale-95"> <Edit className="w-3.5 h-3.5" /> แก้ไข </button>
          <button onClick={() => submitToChair(item.id)} disabled={isLoading} className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-60">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" />{isRejectedByChair ? "ส่งใหม่" : "ส่ง"}</>}
          </button>
        </div>
      </div>
    );
  }

  // สำหรับวิชาในคณะ (INTERNAL)
  if (item.lecturerStatus === "APPROVED") {
    const isAcademicApproved = item.academicApprovalStatus === "APPROVED";
    const isHeadApproved = item.headApprovalStatus === "APPROVED";
    const isPendingHead = item.headApprovalStatus === "PENDING";
    const isRejectedByHead = item.headApprovalStatus === "REJECTED";

    if (isAcademicApproved) return <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> อนุมัติสมบูรณ์</span>;
    if (isHeadApproved) return <span className="inline-flex items-center gap-1.5 text-cyan-700 font-bold text-xs bg-cyan-50 py-1.5 px-3 rounded-full border border-cyan-200"><Clock className="w-3.5 h-3.5" /> รอรองวิชาการ</span>;
    if (isPendingHead) return <span className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 py-1.5 px-3 rounded-full border border-indigo-200"><Clock className="w-3.5 h-3.5" /> รอประธาน</span>;

    // 🌟 แสดงกล่องแดง กรณีประธานหลักสูตรส่งกลับ (วิชาในคณะ)
    if (isRejectedByHead)
      return (
        <div className="flex flex-col gap-1.5 items-center w-full mt-1">
            <span className="inline-flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 py-1 px-3 rounded-full border border-red-200 animate-pulse w-fit">
              <AlertCircle className="w-3.5 h-3.5" /> ประธานส่งกลับ
            </span>
            <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] p-2 rounded-md text-left w-full shadow-sm leading-tight mt-1">
                <span className="font-bold block mb-0.5 text-red-800">หมายเหตุ:</span>
                {item.lecturerFeedback?.replace("[CHAIR_REJECT]:", "").trim() || "ไม่ระบุเหตุผล"}
            </div>
        </div>
      );

    return <span className="inline-flex items-center gap-1.5 text-violet-700 font-bold text-xs bg-violet-50 py-1.5 px-3 rounded-full border border-violet-200"><UserCheck className="w-3.5 h-3.5" /> รอผู้รับผิดชอบ</span>;
  }

  if (item.lecturerStatus === "REJECTED")
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs bg-red-50 py-1 px-2.5 rounded-full border border-red-200"><AlertCircle className="w-3.5 h-3.5" /> แจ้งแก้ไขแล้ว</span>
        <button onClick={() => dispute(item, item.lecturerFeedback)} className="text-orange-500 underline decoration-dashed text-xs hover:text-orange-600 font-medium">ดู / แก้ไขคำขอ</button>
      </div>
    );

  // ปุ่มกดรับรองภาระงาน
  return (
    <div className="flex gap-2 w-full">
      <button onClick={() => verify(item)} disabled={isLoading} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold transition-all shadow-sm shadow-green-200 disabled:opacity-60 min-w-0">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ThumbsUp className="w-4 h-4" /><span className="text-[11px] leading-tight text-center">ยืนยัน<br/>ถูกต้อง</span></>}
      </button>
      <button onClick={() => dispute(item)} disabled={isLoading} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-white hover:bg-red-50 active:scale-95 text-red-500 border border-red-200 hover:border-red-400 font-semibold transition-all shadow-sm disabled:opacity-60 min-w-0">
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PenLine className="w-4 h-4" /><span className="text-[11px] leading-tight text-center">แจ้ง<br/>แก้ไข</span></>}
      </button>
    </div>
  );
}

// --- COURSE TABLE SECTION ---
const CourseTableSection = ({ title, courses, loading, currentUser, targetSemesters, type, refetchHelpers }: any) => {
  const filteredCourses = courses.filter((c:any) => targetSemesters.includes(Number(c.semester)));
  if (!loading && filteredCourses.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden mb-6 w-full">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5 bg-gradient-to-r from-slate-50 to-white">
        <div className="p-1.5 bg-violet-100 rounded-lg"><Layers className="text-violet-600" size={16} /></div>
        <h3 className="font-bold text-slate-800">{title}<span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredCourses.length} รายการ</span></h3>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left table-fixed min-w-[900px]">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 pl-6 w-[12%]">รหัสวิชา</th>
              <th className="p-4 w-[28%]">ชื่อรายวิชา</th>
              <th className="p-4 w-[15%] text-center">{type === 'responsible' ? 'หน่วยกิต' : 'ภาระงาน (ชม.)'}</th>
              <th className="p-4 w-[17%] text-center">ข้อมูลเพิ่มเติม</th>
              <th className="p-4 w-[18%] text-center">สถานะ</th>
              <th className="p-4 pr-6 w-[10%] text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /> กำลังโหลดข้อมูล...</div></td></tr>
            ) : (
              targetSemesters.map((termId: number) => {
                const termCourses = courses.filter((c:any) => Number(c.semester) === termId);
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
                    {termCourses.map((item: any) => {
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
                              <span className="bg-white border border-slate-200 shadow-sm rounded-lg px-2.5 py-1 inline-block text-slate-600 font-medium">{course.credit} หน่วยกิต</span>
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
                              {type === 'responsible' ? course.program?.name_th : <span>ผู้รับผิดชอบ:<br /><span className="font-semibold text-slate-700">{getResponsibleName(course.responsibleUser)}</span></span>}
                            </div>
                          </td>
                          <td className="p-4 text-center align-top">
                            {type === 'responsible' ? <StatusBadge status={showStatus} /> : (
                                <ActionCell item={assignment} processingId={refetchHelpers.processingId} verify={refetchHelpers.verify} dispute={refetchHelpers.dispute} />
                            )}
                          </td>
                          <td className="p-4 pr-6 text-center align-top">
                            {type === 'responsible' && (
                                <Button asChild size="sm" variant="outline" className="h-8 w-full text-xs font-semibold rounded-lg transition-all bg-white hover:bg-violet-600 hover:text-white text-violet-700 border-violet-200 hover:border-violet-600 hover:shadow-md">
                                  <Link href={`/dashboard/workload/owner?subjectId=${course.id}`}>จัดการ</Link>
                                </Button>
                            )}
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
// MAIN COMPONENT EXPORT
// ==========================================
export default function InstructorDashboard({ session }: { session: any }) {
  const currentUser = session?.user;

  const [activeTab, setActiveTab] = useState<"responsible" | "teaching" | "external">("responsible");
  const [activeTerm, setActiveTerm] = useState<TermConfig | null>(null);
  const [responsibleCourses, setResponsibleCourses] = useState<Course[]>([]);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<Assignment[]>([]);
  const [externalAssignments, setExternalAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statFilter, setStatFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
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
          ...a, semester: Number(a.semester || a.subject?.semester), examHours: Number(a.examHours ?? 0), examCritiqueHours: Number(a.examCritiqueHours ?? 0),
        }));
        setAllAssignments(mappedAssign);
        setTeachingAssignments(mappedAssign.filter((a: any) => a.courseType !== "EXTERNAL" && !a.externalCourseCode));
        setExternalAssignments(mappedAssign.filter((a: any) => a.courseType === "EXTERNAL" || !!a.externalCourseCode));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { if (status === "authenticated" && currentUser?.id) fetchData(); }, [status, currentUser?.id, fetchData]);

  // Actions
  const [processingId, setProcessingId] = useState<number | null>(null);
  const verify = async (assignment: Assignment) => {
      //... logic เหมือนเดิม 
      setProcessingId(assignment.id);
      await fetch("/api/assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: assignment.id, lecturerStatus: "APPROVED", lecturerFeedback: null }) });
      fetchData();
      setProcessingId(null);
  };
  const dispute = async (assignment: Assignment, existingFeedback?: string) => {
      //... logic เหมือนเดิม
      const { value: feedback } = await Swal.fire({ input: "textarea", inputValue: existingFeedback?.replace("[CHAIR_REJECT]:", "").trim() });
      if(!feedback) return;
      setProcessingId(assignment.id);
      await fetch("/api/assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: assignment.id, lecturerStatus: "REJECTED", lecturerFeedback: feedback }) });
      fetchData();
      setProcessingId(null);
  };
  const submitToChair = async (id: number) => {
      setProcessingId(id);
      await fetch("/api/assignments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, responsibleStatus: "APPROVED", headApprovalStatus: "PENDING" }) });
      fetchData();
      setProcessingId(null);
  };
  
  const refetchHelpers = { processingId, verify, dispute, submitToChair };

  // ... (ส่วนการค้นหาและคำนวณ hoursBreakdown เหมือนเดิมทุกประการ)
  const filteredRespCourses = responsibleCourses.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()) || c.name_th.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTeaching = teachingAssignments.filter(a => a.subject.code.toLowerCase().includes(searchTerm.toLowerCase()) || a.subject.name_th.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredExternal = externalAssignments.filter(a => (a.externalCourseCode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) || (a.externalCourseName ?? "").toLowerCase().includes(searchTerm.toLowerCase()));

  const hoursBreakdown = useMemo(() => {
    let filtered = allAssignments;
    if (statFilter !== "all") filtered = allAssignments.filter(a => a.semester === Number(statFilter));
    const lecture = filtered.reduce((s, a) => s + (Number(a.lectureHours) || 0) + (Number(a.labHours) || 0), 0);
    const exam    = filtered.reduce((s, a) => s + (Number(a.examHours) || 0), 0);
    const critique= filtered.reduce((s, a) => s + (Number(a.examCritiqueHours) || 0), 0);
    return { lecture, exam, critique, total: lecture + exam + critique };
  }, [allAssignments, statFilter]);


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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left: Course Table */}
        <div className="col-span-1 md:col-span-9 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm">
            {/* Tab + Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-3">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl self-start">
                <button onClick={() => setActiveTab("responsible")} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === "responsible" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>วิชาที่รับผิดชอบ</button>
                <button onClick={() => setActiveTab("teaching")} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === "teaching" ? "bg-white text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>วิชาที่สอน</button>
                <button onClick={() => setActiveTab("external")} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all", activeTab === "external" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>วิชานอกคณะ</button>
              </div>
            </div>

            {activeTab === "responsible" ? (
                <CourseTableSection title="รายวิชาที่รับผิดชอบ" courses={filteredRespCourses} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="responsible" refetchHelpers={refetchHelpers} />
            ) : activeTab === "teaching" ? (
                <CourseTableSection title="รายวิชาที่สอน" courses={filteredTeaching} loading={loading} currentUser={currentUser} targetSemesters={[1, 2, 3]} type="teaching" refetchHelpers={refetchHelpers} />
            ) : (
                <div className="w-full overflow-x-auto border rounded-xl">
                    <table className="w-full text-left table-fixed min-w-[900px]">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-4 pl-6 w-[12%]">รหัสวิชา</th>
                          <th className="p-4 w-[22%]">ชื่อรายวิชา</th>
                          <th className="p-4 w-[15%]">คณะ/หน่วยงาน</th>
                          <th className="p-4 w-[22%] text-center">ภาระงาน (ชม.)</th>
                          <th className="p-4 w-[18%] text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                          {filteredExternal.map(a => (
                              <tr key={a.id} className="hover:bg-orange-50/40 transition-colors bg-orange-50/10">
                                  <td className="p-4 pl-6 font-semibold text-slate-700">{a.externalCourseCode}</td>
                                  <td className="p-4 font-semibold text-slate-800">{a.externalCourseName}</td>
                                  <td className="p-4">{a.externalFaculty}</td>
                                  <td className="p-4 text-center">
                                      บรรยาย {a.lectureHours} | ปฏิบัติ {a.labHours}
                                  </td>
                                  <td className="p-4 text-center">
                                      <ActionCell item={a} processingId={processingId} verify={verify} dispute={dispute} submitToChair={submitToChair} onEdit={()=>{}} />
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                    </table>
                </div>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="col-span-1 md:col-span-3 space-y-4">
          <Card className="shadow-sm border-slate-200/70 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-bold text-slate-800 tabular-nums">{hoursBreakdown.total}</span>
                <span className="text-slate-400 text-base mb-1">ชม.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}