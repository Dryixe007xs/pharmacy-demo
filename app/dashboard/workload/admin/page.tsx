"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  CheckCircle,
  Clock,
  AlertOctagon,
  Loader2,
  FileText,
  ChevronRight,
  BookOpen,
  RefreshCw,
  ExternalLink,
  Settings2,
  Pencil,
  Check,
  X,
  RotateCcw,
  XCircle,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

// ===== CONSTANTS & THEMES =====
const SEMESTER_CONFIG = {
  1: { label: "ภาคการศึกษาต้น" },
  2: { label: "ภาคการศึกษาปลาย" },
  3: { label: "ภาคฤดูร้อน" },
} as const;

const STAGE_LABELS = [
  "รออาจารย์ยืนยันชั่วโมง",
  "รอผู้รับผิดชอบนำส่ง",
  "รอประธานหลักสูตรอนุมัติ",
  "รอรองวิชาการอนุมัติ",
  "อนุมัติครบทุกขั้นตอน",
];

// ✅ แก้ปัญหาที่ 1: กำหนด Tailwind Class แบบตายตัว ป้องกันการโดน Purge ตอน Build
const STAGE_THEMES = [
  { text: "text-slate-600", border: "border-slate-400", ring: "ring-slate-200" },
  { text: "text-amber-600", border: "border-amber-400", ring: "ring-amber-200" },
  { text: "text-blue-600", border: "border-blue-400", ring: "ring-blue-200" },
  { text: "text-violet-600", border: "border-violet-400", ring: "ring-violet-200" },
  { text: "text-emerald-600", border: "border-emerald-400", ring: "ring-emerald-200" },
];

// ===== TYPES =====
interface InstructorLoad {
  id: number;
  name: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  lecturerStatus: string | null;
  responsibleStatus: string | null;
  headStatus: string | null;
  academicStatus: string | null;
  lecturerFeedback?: string | null;
  isExternal: boolean;
  externalFaculty?: string | null;
  externalCourseCode?: string | null;
  externalCourseName?: string | null;
  externalCredit?: string | null;
  evidenceLink?: string | null;
  courseType?: string | null;
}

interface CourseWorkload {
  id: string;
  originalCourseId: number;
  code: string;
  name: string;
  nameEn: string;
  credit: string | number;
  programName: string;
  semester: number;
  instructors: InstructorLoad[];
}

interface CourseWorkloadWithStage extends CourseWorkload {
  courseStage: CourseLevelStage;
}

type CourseLevelStage = {
  allLecturerApproved: boolean;
  allResponsibleApproved: boolean;
  anyLecturerRejected: boolean;
};

// ===== LOGIC HELPERS =====
function getCourseLevelStage(instructors: InstructorLoad[]): CourseLevelStage {
  return {
    allLecturerApproved:
      instructors.length > 0 &&
      instructors.every((i) => i.lecturerStatus === "APPROVED"),
    allResponsibleApproved:
      instructors.length > 0 &&
      instructors.every((i) => i.responsibleStatus === "APPROVED"),
    anyLecturerRejected: instructors.some((i) => i.lecturerStatus === "REJECTED"),
  };
}

function getStage(
  inst: InstructorLoad,
  courseStage: CourseLevelStage
): { index: number; rejected: boolean } {
  const { allLecturerApproved, allResponsibleApproved, anyLecturerRejected } = courseStage;

  if (anyLecturerRejected) return { index: 0, rejected: true };
  if (inst.headStatus === "REJECTED") return { index: 1, rejected: true };
  if (!allLecturerApproved) return { index: 0, rejected: false };
  if (!allResponsibleApproved) return { index: 1, rejected: false };
  if (inst.academicStatus === "APPROVED") return { index: 4, rejected: false };
  if (inst.headStatus === "APPROVED") return { index: 3, rejected: false };
  return { index: 2, rejected: false };
}

// ===== COMPONENTS =====

// ✅ แก้ปัญหาที่ 4: Component สำหรับ Badge ท้ายตาราง
function CourseLevelBadge({ course }: { course: CourseWorkloadWithStage }) {
  const { courseStage, instructors: insts } = course;
  const headStatuses = insts.map((i) => i.headStatus);
  const academicStatuses = insts.map((i) => i.academicStatus);

  const allAcademic = academicStatuses.length > 0 && academicStatuses.every((s) => s === "APPROVED");
  const allHead = headStatuses.length > 0 && headStatuses.every((s) => s === "APPROVED");
  const anyHeadRejected = headStatuses.some((s) => s === "REJECTED");
  const anyLecturerRejected = courseStage.anyLecturerRejected;

  if (allAcademic) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
      <CheckCircle size={12} /> อนุมัติครบทุกขั้นตอน
    </span>
  );
  if (anyHeadRejected || anyLecturerRejected) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
      <XCircle size={12} /> ถูกตีกลับ
    </span>
  );
  if (allHead) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
      <Clock size={12} /> รอรองวิชาการอนุมัติ
    </span>
  );
  if (courseStage.allResponsibleApproved) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
      <Clock size={12} /> รอประธานหลักสูตรอนุมัติ
    </span>
  );
  if (courseStage.allLecturerApproved) return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <Clock size={12} /> รอผู้รับผิดชอบนำส่ง
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
      <Clock size={12} /> รออาจารย์ยืนยันชั่วโมง ({insts.filter((i) => i.lecturerStatus === "APPROVED").length}/{insts.length})
    </span>
  );
}

const StageBadge = ({
  inst,
}: {
  inst: InstructorLoad;
}) => {
  const isResponsible = inst.role === "ผู้รับผิดชอบรายวิชา";

  if (isResponsible) {
    if (inst.lecturerStatus === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <CheckCircle size={11} /> ยืนยันแล้ว
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
        <Clock size={11} /> ยังไม่ยืนยัน
      </span>
    );
  }

  if (inst.lecturerStatus === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <CheckCircle size={11} /> ยืนยันแล้ว
      </span>
    );
  }
  if (!inst.lecturerStatus || inst.lecturerStatus === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
        <Clock size={11} /> รอผู้รับผิดชอบส่งให้ตรวจสอบ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
      <Clock size={11} /> รอผู้สอนยืนยัน
    </span>
  );
};

// ===== TRANSFORM HELPERS =====
function transformInternalCourses(allCourses: any[]): CourseWorkload[] {
  const workloadData: CourseWorkload[] = [];
  allCourses.forEach((course: any) => {
    const assignments = course.teachingAssignments || [];
    if (assignments.length === 0) return;

    const bySemester: Record<number, any[]> = {};
    assignments.forEach((a: any) => {
      if (a.courseType === "EXTERNAL" || !!a.externalCourseCode) return;
      const sem = a.semester || 1;
      if (!bySemester[sem]) bySemester[sem] = [];
      bySemester[sem].push(a);
    });

    Object.entries(bySemester).forEach(([semKey, semAssignments]) => {
      const sem = Number(semKey);
      if (semAssignments.length === 0) return;

      const instructors: InstructorLoad[] = semAssignments.map((a: any) => ({
        id: a.id,
        name: a.lecturer
          ? `${a.lecturer.title || ""}${a.lecturer.firstName} ${a.lecturer.lastName}`.trim()
          : "ไม่ระบุชื่อ",
        role:
          String(a.lecturerId) === String(course.responsibleUserId)
            ? "ผู้รับผิดชอบรายวิชา"
            : "ผู้สอน",
        lecture: Number(a.lectureHours) || 0,
        lab: Number(a.labHours) || 0,
        exam: Number(a.examHours) || 0,
        critique: Number(a.examCritiqueHours) || 0,
        lecturerStatus: a.lecturerStatus ?? null,
        responsibleStatus: a.responsibleStatus ?? null,
        headStatus: a.headApprovalStatus ?? null,
        academicStatus: a.academicApprovalStatus ?? null,
        lecturerFeedback: a.lecturerFeedback ?? null,
        isExternal: false,
        externalFaculty: null,
        externalCourseCode: null,
        externalCourseName: null,
        externalCredit: null,
        evidenceLink: null,
        courseType: a.courseType ?? "INTERNAL",
      }));

      instructors.sort((a) => (a.role === "ผู้รับผิดชอบรายวิชา" ? -1 : 1));

      workloadData.push({
        id: `${course.id}-${sem}`,
        originalCourseId: course.id,
        code: course.code || "ไม่ระบุรหัส",
        name: course.name_th || course.name || "ไม่ระบุชื่อวิชา",
        nameEn: course.name_en || "",
        credit: course.credit || "-",
        programName: course.program?.name_th || "ไม่ระบุหลักสูตร",
        semester: sem,
        instructors,
      });
    });
  });
  return workloadData;
}

function transformExternalCourses(externalContainers: any[]): CourseWorkload[] {
  const workloadData: CourseWorkload[] = [];
  externalContainers.forEach((container: any) => {
    (container.teachingAssignments || []).forEach((a: any) => {
      workloadData.push({
        id: `ext-${a.id}`,
        originalCourseId: container.id,
        code: a.externalCourseCode || "ไม่ระบุรหัส",
        name: a.externalCourseName || "ไม่ระบุชื่อวิชา",
        nameEn: a.externalCourseNameEn || "",
        credit: a.externalCredit || "-",
        programName: a.externalFaculty || "ไม่ระบุคณะ",
        semester: a.semester,
        instructors: [
          {
            id: a.id,
            name: a.lecturer
              ? `${a.lecturer.title || ""}${a.lecturer.firstName} ${a.lecturer.lastName}`.trim()
              : "ไม่ระบุชื่อ",
            role: "ผู้สอน",
            lecture: Number(a.lectureHours) || 0,
            lab: Number(a.labHours) || 0,
            exam: Number(a.examHours) || 0,
            critique: Number(a.examCritiqueHours) || 0,
            lecturerStatus: a.lecturerStatus ?? null,
            responsibleStatus: a.responsibleStatus ?? null,
            headStatus: a.headApprovalStatus ?? null,
            academicStatus: a.academicApprovalStatus ?? null,
            lecturerFeedback: a.lecturerFeedback ?? null,
            isExternal: true,
            externalFaculty: a.externalFaculty ?? null,
            externalCourseCode: a.externalCourseCode ?? null,
            externalCourseName: a.externalCourseName ?? null,
            externalCredit: a.externalCredit ?? null,
            evidenceLink: a.evidenceLink ?? null,
            courseType: "EXTERNAL",
          },
        ],
      });
    });
  });
  return workloadData;
}

function mergeAndSort(
  internal: CourseWorkload[],
  external: CourseWorkload[]
): CourseWorkload[] {
  return [...internal, ...external].sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.code.localeCompare(b.code);
  });
}

// ===== CUSTOM HOOKS =====
function useWorkloadData() {
  const [courses, setCourses] = useState<CourseWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resInternal, resExternal] = await Promise.all([
        fetch("/api/courses?filter=active"),
        fetch("/api/assignments/external"),
      ]);
      if (!resInternal.ok) throw new Error(`Courses API Error: ${resInternal.status}`);
      if (!resExternal.ok) throw new Error(`External API Error: ${resExternal.status}`);
      const allCourses = await resInternal.json();
      const externalCourses = await resExternal.json();
      if (!Array.isArray(allCourses)) throw new Error("Invalid courses API response");
      if (!Array.isArray(externalCourses)) throw new Error("Invalid external API response");
      setCourses(mergeAndSort(transformInternalCourses(allCourses), transformExternalCourses(externalCourses)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { courses, loading, error, refetch: fetchData };
}

function useHourEditor(onSuccess: () => void) {
  const [savingId, setSavingId] = useState<number | null>(null);

  const saveHours = useCallback(async (
    instructorId: number,
    hours: { lecture: number; lab: number; exam: number; critique: number }
  ) => {
    setSavingId(instructorId);
    try {
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: instructorId,
          lectureHours: hours.lecture,
          labHours: hours.lab,
          examHours: hours.exam,
          examCritiqueHours: hours.critique,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "ไม่สามารถบันทึกชั่วโมงได้");
      }
      toast.success("บันทึกชั่วโมงเรียบร้อย — สถานะอนุมัติถูกรีเซ็ตให้เริ่มตรวจใหม่");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSavingId(null);
    }
  }, [onSuccess]);

  return { saveHours, savingId };
}

function useStatusManager(onSuccess: () => void) {
  const [pendingId, setPendingId] = useState<number | null>(null);

  const updateStatus = useCallback(async (
    assignmentId: number,
    patch: Record<string, any>,
    confirmMsg?: { title: string; text?: string }
  ) => {
    if (confirmMsg) {
      const result = await Swal.fire({
        title: confirmMsg.title,
        text: confirmMsg.text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4f46e5",
        cancelButtonColor: "#94a3b8",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        customClass: { container: "!z-[99999]" },
      });
      if (!result.isConfirmed) return false;
    }
    setPendingId(assignmentId);
    try {
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId, ...patch }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "ไม่สามารถอัปเดตสถานะได้");
      }
      toast.success("อัปเดตสถานะเรียบร้อย");
      onSuccess();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
      return false;
    } finally {
      setPendingId(null);
    }
  }, [onSuccess]);

  const updateStatusBatch = useCallback(async (
    assignmentIds: number[],
    patch: Record<string, any>,
    confirmMsg?: { title: string; text?: string }
  ) => {
    if (confirmMsg) {
      const result = await Swal.fire({
        title: confirmMsg.title,
        text: confirmMsg.text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#4f46e5",
        cancelButtonColor: "#94a3b8",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        customClass: { container: "!z-[99999]" },
      });
      if (!result.isConfirmed) return false;
    }

    setPendingId(assignmentIds[0]);
    try {
      const results = await Promise.allSettled(
        assignmentIds.map((id) =>
          fetch("/api/assignments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...patch }),
          }).then((r) => {
            if (!r.ok) throw new Error(`id ${id} failed`);
            return r.json();
          })
        )
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) throw new Error(`อัปเดตล้มเหลว ${failures.length} รายการ`);
      toast.success("อัปเดตสถานะทั้งวิชาเรียบร้อย");
      onSuccess();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
      return false;
    } finally {
      setPendingId(null);
    }
  }, [onSuccess]);

  return { updateStatus, updateStatusBatch, pendingId };
}

function HourCell({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      step={0.5}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
    />
  );
}

// ===== COURSE-LEVEL STATUS MODAL =====
function CourseStatusModal({
  open,
  onOpenChange,
  course,
  updateStatusBatch,
  pendingId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: CourseWorkloadWithStage | null;
  updateStatusBatch: (
    ids: number[],
    patch: Record<string, any>,
    confirm?: { title: string; text?: string }
  ) => Promise<boolean>;
  pendingId: number | null;
}) {
  if (!course) return null;

  const { instructors } = course;
  const allIds = instructors.map((i) => i.id);
  const isBusy = pendingId !== null;

  const headStatuses = instructors.map((i) => i.headStatus);
  const academicStatuses = instructors.map((i) => i.academicStatus);

  const headAllApproved = headStatuses.every((s) => s === "APPROVED");
  const headAnyApproved = headStatuses.some((s) => s === "APPROVED");
  const headAnyRejected = headStatuses.some((s) => s === "REJECTED");
  const academicAllApproved = academicStatuses.every((s) => s === "APPROVED");
  const academicAnyApproved = academicStatuses.some((s) => s === "APPROVED");

  const steps = [
    {
      label: "ประธานหลักสูตรอนุมัติ",
      sublabel: headAllApproved
        ? "อนุมัติทั้งหมดแล้ว"
        : headAnyApproved
        ? `${headStatuses.filter((s) => s === "APPROVED").length}/${instructors.length} อนุมัติแล้ว`
        : headAnyRejected
        ? "ถูกตีกลับ"
        : "รออนุมัติ",
      done: headAllApproved,
      rejected: headAnyRejected,
      forceIds: instructors.filter((i) => i.headStatus !== "APPROVED").map((i) => i.id),
      forcePatch: { headApprovalStatus: "APPROVED" },
      forceLabel: "บังคับอนุมัติแทนประธานหลักสูตร",
      resetIds: allIds,
      // ✅ แก้ปัญหาที่ 5: รีเซ็ต head ให้ล้าง academic ด้วย
      resetPatch: { headApprovalStatus: null, academicApprovalStatus: null },
      resetLabel: "รีเซ็ตสถานะประธานหลักสูตร (จะรีเซ็ตรองวิชาการด้วย)",
      canForce: !headAllApproved,
      canReset: headAnyApproved || headAnyRejected,
      stepNum: 3,
    },
    {
      label: "รองคณบดีฝ่ายวิชาการอนุมัติ",
      sublabel: academicAllApproved
        ? "อนุมัติทั้งหมดแล้ว"
        : academicAnyApproved
        ? `${academicStatuses.filter((s) => s === "APPROVED").length}/${instructors.length} อนุมัติแล้ว`
        : "รออนุมัติ",
      done: academicAllApproved,
      rejected: false,
      forceIds: instructors.filter((i) => i.academicStatus !== "APPROVED").map((i) => i.id),
      forcePatch: { academicApprovalStatus: "APPROVED" },
      forceLabel: "บังคับอนุมัติแทนรองคณบดีฝ่ายวิชาการ",
      resetIds: allIds,
      resetPatch: { academicApprovalStatus: null },
      resetLabel: "รีเซ็ตสถานะรองวิชาการ",
      canForce: !academicAllApproved,
      canReset: academicAnyApproved,
      stepNum: 4,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 text-base">
            <Settings2 className="w-5 h-5 text-indigo-600 shrink-0" />
            จัดการสถานะ — {course.code}
          </DialogTitle>
          <p className="text-xs text-slate-400 mt-0.5 leading-snug">
            {course.name}
            <span className="ml-2 text-slate-300">·</span>
            <span className="ml-2">{SEMESTER_CONFIG[course.semester as keyof typeof SEMESTER_CONFIG]?.label ?? `เทอม ${course.semester}`}</span>
            <span className="ml-2 text-slate-300">·</span>
            <span className="ml-2">{instructors.length} ผู้สอน</span>
          </p>
        </DialogHeader>

        <div className="mt-1 space-y-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                step.done
                  ? "bg-emerald-50/60 border-emerald-100"
                  : step.rejected
                  ? "bg-red-50/60 border-red-100"
                  : "bg-slate-50/60 border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.done
                      ? "bg-emerald-500 text-white"
                      : step.rejected
                      ? "bg-red-400 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                {step.done ? <Check size={14} /> : step.rejected ? <XCircle size={13} /> : step.stepNum}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{step.label}</p>
                  <p className={`text-[11px] mt-0.5 ${step.done ? "text-emerald-600" : step.rejected ? "text-red-500" : "text-slate-400"}`}>
                    {step.sublabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {step.canForce && step.forceIds.length > 0 && (
                  <button
                    disabled={isBusy}
                    title={step.forceLabel}
                    onClick={() =>
                      updateStatusBatch(step.forceIds, step.forcePatch, {
                        title: step.forceLabel + "?",
                        text: "การดำเนินการนี้ไม่สามารถย้อนกลับได้โดยอัตโนมัติ",
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {isBusy && pendingId === step.forceIds[0] ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    บังคับผ่าน
                  </button>
                )}
                {step.canReset && (
                  <button
                    disabled={isBusy}
                    title={step.resetLabel}
                    onClick={() =>
                      updateStatusBatch(step.resetIds, step.resetPatch, {
                        title: "รีเซ็ตขั้นตอนนี้?",
                        text: step.resetLabel,
                      })
                    }
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 transition-colors"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            การแก้ไขชั่วโมงสอนจะรีเซ็ตสถานะขั้น 3-4 โดยอัตโนมัติ
            การยืนยันชั่วโมง (ขั้น 1-2) จัดการได้ผ่านปุ่มในแถวของผู้สอนแต่ละท่าน
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== MAIN COMPONENT =====
export default function AdminWorkloadPage() {
  const { data: session } = useSession();
  // ✅ แก้ปัญหาที่ 6: นำ as any ออกให้ Type Safety ชัดเจน
  const currentUser = session?.user;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");

  const [hourDrafts, setHourDrafts] = useState<Record<number, any>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const [courseModal, setCourseModal] = useState<CourseWorkloadWithStage | null>(null);

  const { courses, loading, error, refetch } = useWorkloadData();
  
  // ✅ แก้ปัญหาที่ 7 & 2: ผูกการล้างสถานะ Draft/Edit ไว้กับตอน refetch ข้อมูลป้องกันบัค
  const handleRefetch = useCallback(() => {
    setHourDrafts({});
    setEditingId(null);
    refetch();
  }, [refetch]);

  const { saveHours, savingId } = useHourEditor(handleRefetch);
  const { updateStatus, updateStatusBatch, pendingId } = useStatusManager(handleRefetch);

  useEffect(() => {
    handleRefetch();
  }, [handleRefetch]);

  const uniquePrograms = useMemo(
    () => Array.from(new Set(courses.map((c) => c.programName).filter(Boolean))),
    [courses]
  );

  const coursesWithStage = useMemo<CourseWorkloadWithStage[]>(
    () => courses.map((c) => ({ ...c, courseStage: getCourseLevelStage(c.instructors) })),
    [courses]
  );

  const filteredCourses = useMemo(() => {
    return coursesWithStage
      .map((c) => ({
        ...c,
        instructors: c.instructors.filter((inst) => {
          if (selectedStage === "all") return true;
          const { index, rejected } = getStage(inst, c.courseStage);
          if (selectedStage === "rejected") return rejected;
          return String(index) === selectedStage && !rejected;
        }),
      }))
      .filter((c) => {
        const matchSearch =
          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProgram = selectedProgram === "all" || c.programName === selectedProgram;
        const matchSemester = selectedSemester === "all" || c.semester === Number(selectedSemester);
        return matchSearch && matchProgram && matchSemester && c.instructors.length > 0;
      });
  }, [coursesWithStage, searchTerm, selectedProgram, selectedSemester, selectedStage]);

  // ✅ แก้ปัญหาที่ 3: ใช้ getStage() เป็นศูนย์กลางคำนวณป้องกัน logic ซ้ำซ้อน
  const stageCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    let rejected = 0;

    coursesWithStage.forEach((c) => {
      let minIndex = 4;
      let hasRejected = false;

      c.instructors.forEach((inst) => {
        const { index, rejected: r } = getStage(inst, c.courseStage);
        if (r) { hasRejected = true; return; }
        if (index < minIndex) minIndex = index;
      });

      if (hasRejected) rejected++;
      else counts[minIndex]++;
    });

    return { counts, rejected };
  }, [coursesWithStage]);

  const startEdit = (inst: InstructorLoad) => {
    setEditingId(inst.id);
    setHourDrafts((prev) => ({
      ...prev,
      [inst.id]: { lecture: inst.lecture, lab: inst.lab, exam: inst.exam, critique: inst.critique },
    }));
  };

  const cancelEdit = (id: number) => {
    setEditingId(null);
    setHourDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const confirmSaveHours = async (inst: InstructorLoad) => {
    const draft = hourDrafts[inst.id];
    if (!draft) return;
    const changed = draft.lecture !== inst.lecture || draft.lab !== inst.lab ||
      draft.exam !== inst.exam || draft.critique !== inst.critique;
    if (!changed) { cancelEdit(inst.id); return; }

    const result = await Swal.fire({
      title: "บันทึกชั่วโมงสอนใหม่?",
      html: `<p style="font-size:0.875rem;color:#475569;">การแก้ไขชั่วโมงจะ<strong>รีเซ็ตสถานะการอนุมัติของประธานหลักสูตรและรองวิชาการ</strong>กลับไปเริ่มตรวจสอบใหม่</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    await saveHours(inst.id, draft);
    cancelEdit(inst.id);
  };

  const confirmLecturerApprove = async (inst: InstructorLoad) => {
    const result = await Swal.fire({
      title: "ยืนยันชั่วโมงแทนอาจารย์?",
      html: `<p style="font-size:0.875rem;color:#475569;">บังคับยืนยันชั่วโมงของ <strong>${inst.name}</strong> แทนอาจารย์ผู้สอน<br>ใช้เมื่ออาจารย์ไม่สามารถเข้าระบบยืนยันได้</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "ยืนยันแทน",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    await updateStatus(inst.id, { lecturerStatus: "APPROVED" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm font-medium">
          <span>จัดการชั่วโมงการสอน</span>
          <ChevronRight size={14} />
          <span className="text-indigo-600 font-semibold">ฝ่ายวิชาการ (แอดมิน)</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">
          ตรวจสอบและแก้ไขภาระงาน
        </h1>
        {currentUser && !loading && (
          <p className="text-slate-600 mt-2 font-light">
            ยินดีต้อนรับ,{" "}
            <span className="font-semibold text-indigo-600">{currentUser.name}</span>
          </p>
        )}

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
          {STAGE_LABELS.map((label, i) => {
            const active = selectedStage === String(i);
            const theme = STAGE_THEMES[i];
            return (
              <motion.button
                key={i}
                onClick={() => setSelectedStage(active ? "all" : String(i))}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`text-left bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border shadow-sm transition-all ${
                  active ? `${theme.border} ${theme.ring} ring-2` : "border-slate-100 hover:border-slate-200"
                }`}
              >
                <p className={`text-2xl font-bold ${theme.text}`}>{stageCounts.counts[i]}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">{label}</p>
              </motion.button>
            );
          })}
          <motion.button
            onClick={() => setSelectedStage(selectedStage === "rejected" ? "all" : "rejected")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`text-left bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border shadow-sm transition-all ${
              selectedStage === "rejected" ? "border-red-400 ring-2 ring-red-200" : "border-slate-100 hover:border-slate-200"
            }`}
          >
            <p className="text-2xl font-bold text-red-600">{stageCounts.rejected}</p>
            <p className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">ถูกตีกลับ</p>
          </motion.button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/60 shadow-lg mb-6 sticky top-4 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="w-full md:w-[200px] shrink-0">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">เทอม</label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกภาคการศึกษา</SelectItem>
                <SelectItem value="1">ภาคต้น (1)</SelectItem>
                <SelectItem value="2">ภาคปลาย (2)</SelectItem>
                <SelectItem value="3">ภาคฤดูร้อน (3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-[260px] shrink-0">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">หลักสูตร</label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 h-10 w-full text-sm">
                <SelectValue placeholder="เลือกหลักสูตร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                {uniquePrograms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">ค้นหา</label>
            <Input
              className="rounded-xl border-slate-200 bg-slate-50/50 pl-10 h-10 w-full text-sm"
              placeholder="รหัสวิชา หรือชื่อวิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 bottom-2.5 text-slate-400" size={16} />
          </div>

          <button
            onClick={handleRefetch}
            disabled={loading}
            className="md:mt-6 flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 font-medium text-sm shrink-0"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden md:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-12 h-12 mb-4 text-indigo-500 animate-spin" />
            <p className="text-lg animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center border-2 border-dashed border-red-200 rounded-3xl bg-red-50/50">
            <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-bold text-red-600">เกิดข้อผิดพลาด</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <button onClick={handleRefetch} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-500 font-semibold text-xs uppercase tracking-wide">
                        <tr>
                          <th className="py-3.5 px-5 text-left w-[17%]">รายวิชา</th>
                          <th className="py-3.5 px-3 text-center w-[8%]">ภาค</th>
                          <th className="py-3.5 px-5 text-left w-[14%]">อาจารย์ผู้สอน</th>
                          <th className="py-3.5 px-3 text-center w-[7%]">บรรยาย<br/>(ชม.)</th>
                          <th className="py-3.5 px-3 text-center w-[7%]">ปฏิบัติ<br/>(ชม.)</th>
                          <th className="py-3.5 px-3 text-center w-[7%]">คุมสอบ<br/>(ชม.)</th>
                          <th className="py-3.5 px-3 text-center w-[7%]">วิพากษ์<br/>(หัวข้อ)</th>
                          <th className="py-3.5 px-3 text-center w-[18%]">สถานะปัจจุบัน</th>
                          <th className="py-3.5 px-3 text-center w-[15%]">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {course.instructors.map((instructor, idx) => {
                          const isEditing = editingId === instructor.id;
                          const draft = hourDrafts[instructor.id];
                          const isSaving = savingId === instructor.id;
                          const isConfirming = pendingId === instructor.id;
                          const lecturerApproved = instructor.lecturerStatus === "APPROVED";

                          return (
                            <tr
                              key={instructor.id}
                              className={`transition-colors ${
                                instructor.isExternal
                                  ? "bg-orange-50/30 hover:bg-orange-50/60"
                                  : "hover:bg-indigo-50/20"
                              }`}
                            >
                              {idx === 0 ? (
                                <>
                                  <td
                                    rowSpan={course.instructors.length}
                                    className="py-5 px-5 align-top border-r border-slate-100 bg-white"
                                  >
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <span className="font-bold text-lg text-slate-800 tracking-tight leading-none">
                                          {course.code}
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                          <BookOpen size={11} /> {course.credit} หน่วยกิต
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-slate-700 font-medium text-sm leading-snug">{course.name}</p>
                                        {course.nameEn && (
                                          <p className="text-slate-400 text-xs mt-0.5 leading-snug">{course.nameEn}</p>
                                        )}
                                      </div>
                                      <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                        {course.programName}
                                      </span>
                                      {course.instructors.some((i) => i.isExternal) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200 w-fit">
                                          🏛️ นอกคณะ
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    rowSpan={course.instructors.length}
                                    className="py-5 px-3 align-top border-r border-slate-100 bg-white text-center"
                                  >
                                    <span
                                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full font-bold text-[11px] border whitespace-nowrap ${
                                        course.semester === 1
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : course.semester === 2
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}
                                    >
                                      {SEMESTER_CONFIG[course.semester as keyof typeof SEMESTER_CONFIG]?.label ?? `เทอม ${course.semester}`}
                                    </span>
                                  </td>
                                </>
                              ) : null}

                              <td className="py-3.5 px-5 align-middle">
                                <div className="flex flex-col gap-1">
                                  <span className="text-slate-700 font-medium text-sm">{instructor.name}</span>
                                  {instructor.role === "ผู้รับผิดชอบรายวิชา" && (
                                    <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                      ผู้รับผิดชอบ
                                    </span>
                                  )}
                                  {instructor.isExternal && instructor.evidenceLink && (
                                    <a href={instructor.evidenceLink} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline w-fit">
                                      <ExternalLink size={10} /> เอกสาร
                                    </a>
                                  )}
                                  {instructor.lecturerFeedback && (
                                    <div className="inline-flex items-start gap-1 text-[11px] bg-yellow-50 text-yellow-800 border border-yellow-200 rounded px-1.5 py-1 max-w-[140px]"
                                      title={instructor.lecturerFeedback}>
                                      <FileText size={10} className="mt-0.5 shrink-0" />
                                      <span className="line-clamp-2">{instructor.lecturerFeedback}</span>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {(["lecture", "lab", "exam", "critique"] as const).map((field) => (
                                <td key={field} className="py-3.5 px-3 text-center align-middle">
                                  {isEditing ? (
                                    <HourCell
                                      value={draft?.[field] ?? instructor[field]}
                                      disabled={isSaving}
                                      onChange={(v) =>
                                        setHourDrafts((prev) => ({
                                          ...prev,
                                          [instructor.id]: { ...prev[instructor.id], [field]: v },
                                        }))
                                      }
                                    />
                                  ) : (
                                    <span className="text-slate-700 font-semibold">{instructor[field]}</span>
                                  )}
                                </td>
                              ))}

                              <td className="py-3.5 px-3 text-center align-middle">
                                <StageBadge inst={instructor} />
                              </td>

                              <td className="py-3.5 px-3 text-center align-middle">
                                <div className="flex items-center justify-center gap-1.5">
                                  {isEditing ? (
                                    <>
                                      <button
                                        disabled={isSaving}
                                        onClick={() => confirmSaveHours(instructor)}
                                        title="บันทึกชั่วโมง"
                                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                                      >
                                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                      </button>
                                      <button
                                        disabled={isSaving}
                                        onClick={() => cancelEdit(instructor.id)}
                                        title="ยกเลิก"
                                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => startEdit(instructor)}
                                        title="แก้ไขชั่วโมง"
                                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                                      >
                                        <Pencil size={14} />
                                      </button>

                                      <button
                                        disabled={lecturerApproved || isConfirming}
                                        onClick={() => confirmLecturerApprove(instructor)}
                                        title={lecturerApproved ? "ยืนยันแล้ว" : "ยืนยันชั่วโมงแทนอาจารย์"}
                                        className={`p-1.5 rounded-lg border transition-colors ${
                                          lecturerApproved
                                            ? "bg-emerald-50 text-emerald-400 border-emerald-200 cursor-default opacity-60"
                                            : "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                                        }`}
                                      >
                                        {isConfirming
                                          ? <Loader2 size={14} className="animate-spin" />
                                          : lecturerApproved
                                          ? <CheckCircle size={14} />
                                          : <UserCheck size={14} />
                                        }
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{course.instructors.length} ผู้สอน</span>
                      <span>·</span>
                      <span>
                        ยืนยันแล้ว {course.instructors.filter((i) => i.lecturerStatus === "APPROVED").length}/{course.instructors.length} คน
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CourseLevelBadge course={course as CourseWorkloadWithStage} />
                      <button
                        onClick={() => setCourseModal(course as CourseWorkloadWithStage)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 hover:shadow-sm transition-all"
                      >
                        <Settings2 size={14} />
                        จัดการสถานะวิชานี้
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50"
          >
            <FileText className="w-20 h-20 mx-auto mb-5 text-slate-300" />
            <h3 className="text-xl font-bold text-slate-600 mb-2">ไม่พบรายวิชา</h3>
            <p className="text-slate-400 mb-4">ไม่พบรายวิชาที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรอง</p>
            <button
              onClick={() => { setSearchTerm(""); setSelectedProgram("all"); setSelectedSemester("all"); setSelectedStage("all"); }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              ล้างตัวกรอง
            </button>
          </motion.div>
        )}
      </main>

      <CourseStatusModal
        open={!!courseModal}
        onOpenChange={(v) => !v && setCourseModal(null)}
        course={courseModal}
        updateStatusBatch={updateStatusBatch}
        pendingId={pendingId}
      />
    </div>
  );
}