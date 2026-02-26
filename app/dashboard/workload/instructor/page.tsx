"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  CheckCircle,
  AlertCircle,
  Plus,
  Check,
  Loader2,
  Link as LinkIcon,
  Building2,
  ChevronRight,
  X,
  RefreshCw,
  FileText,
  AlertOctagon,
  Send,
  ChevronDown,
  Edit,
  Trash2,
  Clock,
  UserCheck,
  ThumbsUp,
  PenLine,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

// ===== CONSTANTS =====
const SEMESTER_CONFIG = {
  1: { label: "ภาคต้น", fullLabel: "ภาคการศึกษาต้น", color: "amber" },
  2: { label: "ภาคปลาย", fullLabel: "ภาคการศึกษาปลาย", color: "blue" },
  3: { label: "ภาคฤดูร้อน", fullLabel: "ภาคฤดูร้อน", color: "emerald" },
} as const;

// ===== TYPES =====
type LecturerStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";
type CourseType = "INTERNAL" | "EXTERNAL";

type Assignment = {
  id: number;
  subjectId: number;
  semester?: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  examCritiqueHours: number;
  lecturerStatus: LecturerStatus;
  lecturerFeedback?: string;
  responsibleStatus?: string;
  headApprovalStatus?: string;
  academicApprovalStatus?: string;
  courseType?: CourseType;
  externalFaculty?: string | null;
  externalCourseCode?: string | null;
  externalCourseName?: string | null;
  externalCourseNameEn?: string | null;
  externalCredit?: string | null;
  evidenceLink?: string | null;
  subject: {
    code: string;
    name_th: string;
    credit: string;
    program: { name_th: string; degree_level: string };
    responsibleUserId: string | null;
  };
};

type ExternalCourseForm = {
  faculty: string;
  code: string;
  nameTh: string;
  nameEn: string;
  credit: string;
  semester: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  examCritiqueHours: number;
  evidenceLink: string;
};

// ===== MODAL =====
const Modal = ({
  isOpen, onClose, title, icon: Icon, colorClass = "text-slate-800",
  children, maxWidth = "max-w-xl", zIndex = 9999,
}: {
  isOpen: boolean; onClose: () => void; title: string; icon?: any;
  colorClass?: string; children: React.ReactNode; maxWidth?: string; zIndex?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (isOpen) { setIsVisible(true); document.body.style.overflow = "hidden"; }
    else {
      const t = setTimeout(() => { setIsVisible(false); document.body.style.overflow = "unset"; }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!mounted || !isVisible) return null;
  return createPortal(
    <div className={`fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`} style={{ zIndex }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${maxWidth} ${isOpen ? "scale-100" : "scale-95"}`} style={{ maxHeight: "90vh" }}>
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0 z-20">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}>
            {Icon && <Icon size={22} />} {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white px-6 pt-6 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

// ===== CUSTOM SELECT =====
const CustomSelect = ({
  value, onChange, options, placeholder = "เลือก...", className = "",
}: {
  value: number; onChange: (v: number) => void;
  options: Array<{ value: number; label: string }>; placeholder?: string; className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className={`relative ${className}`}>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all">
        <span className={`font-medium ${selected ? "text-slate-700" : "text-slate-400"}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}
              className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              {options.map((opt) => (
                <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between group ${value === opt.value ? "bg-purple-50" : ""}`}>
                  <span className={`font-medium ${value === opt.value ? "text-purple-700" : "text-slate-700 group-hover:text-purple-600"}`}>{opt.label}</span>
                  {value === opt.value && <Check size={16} className="text-purple-600" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== UTILS =====
function filterValidAssignments(a: Assignment[]) {
  return a.filter((x) => x.lecturerStatus !== "DRAFT" && x.lecturerStatus !== null);
}
function calculateTotals(a: Assignment[]) {
  return {
    lecture: a.reduce((s, x) => s + x.lectureHours, 0),
    lab: a.reduce((s, x) => s + x.labHours, 0),
    exam: a.reduce((s, x) => s + (x.examHours || 0), 0),
    critique: a.reduce((s, x) => s + (x.examCritiqueHours || 0), 0),
  };
}
function validateExternalCourseForm(f: ExternalCourseForm): string | null {
  if (!f.faculty.trim()) return "กรุณากรอกชื่อคณะ/หน่วยงาน";
  if (!f.code.trim()) return "กรุณากรอกรหัสวิชา";
  if (!f.nameTh.trim()) return "กรุณากรอกชื่อรายวิชา (ไทย)";
  if (!f.credit.trim()) return "กรุณากรอกหน่วยกิต";
  if (!f.evidenceLink.trim()) return "กรุณาแนบลิงก์เอกสารอ้างอิง";
  return null;
}
function isExternalCourse(a: Assignment) {
  return a.courseType === "EXTERNAL" || !!a.externalCourseCode;
}

// ===== HOOKS =====
function useInstructorAssignments(userId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) { setAssignments([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/assignments?lecturerId=${userId}&scope=year`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [userId]);

  return { assignments, loading, error, refetch: fetchData };
}

function useAssignmentActions(onSuccess: () => void) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const verify = useCallback(async (assignment: Assignment) => {
    const isExt = isExternalCourse(assignment);
    const info = isExt
      ? `${assignment.externalCourseCode || "N/A"} ${assignment.externalCourseName || ""}`
      : `${assignment.subject.code} ${assignment.subject.name_th}`;

    const result = await Swal.fire({
      title: "ยืนยันข้อมูลชั่วโมงสอน?",
      html: `<div style="text-align:left;padding:1rem;">
        <p><strong>รายวิชา:</strong> ${info}</p>
        <p><strong>บรรยาย:</strong> ${assignment.lectureHours} ชม.</p>
        <p><strong>ปฏิบัติ:</strong> ${assignment.labHours} ชม.</p>
        <p><strong>คุมสอบ:</strong> ${assignment.examHours || 0} ชม.</p>
        <p><strong>วิพากษ์:</strong> ${assignment.examCritiqueHours || 0} หัวข้อ</p>
        <hr style="margin:1rem 0"><p style="color:#666;font-size:0.9rem;">การยืนยันหมายถึงท่านยอมรับว่าข้อมูลถูกต้อง</p>
      </div>`,
      icon: "question", showCancelButton: true,
      confirmButtonColor: "#16a34a", cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ยืนยัน", cancelButtonText: "ยกเลิก", focusCancel: true,
    });
    if (!result.isConfirmed) return;

    setProcessingId(assignment.id);
    try {
      const res = await fetch("/api/assignments", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignment.id, lecturerStatus: "APPROVED", lecturerFeedback: null }),
      });
      if (!res.ok) throw new Error("ไม่สามารถบันทึกได้");
      onSuccess();
      await Swal.fire({ title: "ยืนยันสำเร็จ!", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
    } finally { setProcessingId(null); }
  }, [onSuccess]);

  const dispute = useCallback(async (assignment: Assignment, existingFeedback?: string) => {
    const isExt = isExternalCourse(assignment);
    const info = isExt
      ? `${assignment.externalCourseCode || "N/A"} ${assignment.externalCourseName || ""}`
      : `${assignment.subject.code} ${assignment.subject.name_th}`;

    const { value: feedback } = await Swal.fire({
      title: "แจ้งขอแก้ไขข้อมูล",
      html: `<div style="text-align:left;margin-bottom:1rem;"><p><strong>รายวิชา:</strong> ${info}</p></div>`,
      input: "textarea", inputLabel: "ระบุสิ่งที่ต้องการแก้ไข",
      inputPlaceholder: "เช่น ชั่วโมงบรรยายจริงคือ 15 ชม.", inputValue: existingFeedback || "",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#64748b",
      confirmButtonText: "ส่งคำขอแก้ไข", cancelButtonText: "ยกเลิก",
      inputValidator: (v) => (!v || v.trim().length < 5) ? "กรุณาระบุอย่างน้อย 5 ตัวอักษร" : null,
    });
    if (!feedback) return;

    setProcessingId(assignment.id);
    try {
      const res = await fetch("/api/assignments", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignment.id, lecturerStatus: "REJECTED", lecturerFeedback: feedback }),
      });
      if (!res.ok) throw new Error("ไม่สามารถส่งคำขอได้");
      onSuccess();
      await Swal.fire({ title: "ส่งคำขอสำเร็จ!", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "ส่งไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
    } finally { setProcessingId(null); }
  }, [onSuccess]);

  const submitToChair = useCallback(async (assignmentId: number) => {
    const result = await Swal.fire({
      title: "ส่งข้อมูลให้ประธานหลักสูตร?",
      html: `<div style="text-align:left;padding:1rem;"><p style="color:#666;">ข้อมูลจะถูกส่งให้ประธานหลักสูตรตรวจสอบ</p><p style="color:#dc2626;margin-top:0.5rem;"><strong>⚠️</strong> ตรวจสอบข้อมูลให้ถูกต้องก่อนกดส่ง</p></div>`,
      icon: "question", showCancelButton: true,
      confirmButtonColor: "#7c3aed", cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยันการส่ง", cancelButtonText: "ยกเลิก", focusCancel: true,
    });
    if (!result.isConfirmed) return false;

    try {
      const res = await fetch("/api/assignments", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId, responsibleStatus: "APPROVED", headApprovalStatus: "PENDING" }),
      });
      if (!res.ok) throw new Error("ไม่สามารถส่งได้");
      onSuccess();
      await Swal.fire({ title: "ส่งสำเร็จ!", icon: "success", timer: 2000, showConfirmButton: false });
      return true;
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "ส่งไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
      return false;
    }
  }, [onSuccess]);

  return { verify, dispute, submitToChair, processingId };
}

function useExternalCourse(userId: string | undefined, onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = useCallback(async (form: ExternalCourseForm) => {
    const err = validateExternalCourseForm(form);
    if (err) { toast.error(err); return; }
    if (!userId) { toast.error("ไม่พบข้อมูลผู้ใช้"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments/external", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, lecturerId: userId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "บันทึกไม่สำเร็จ"); }
      onSuccess();
      await Swal.fire({ title: "บันทึกสำเร็จ!", icon: "success", timer: 2000, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
    } finally { setIsSubmitting(false); }
  }, [userId, onSuccess]);
  return { submit, isSubmitting };
}

// ===== ACTION CELL =====
function ActionCell({
  item, processingId, verify, dispute, submitToChair, onEdit,
}: {
  item: Assignment;
  processingId: number | null;
  verify: (a: Assignment) => void;
  dispute: (a: Assignment, feedback?: string) => void;
  submitToChair: (id: number) => void;
  onEdit: (a: Assignment) => void;
}) {
  const isExt = isExternalCourse(item);
  const isLoading = processingId === item.id;

  // ── วิชานอกคณะ ──
  if (isExt) {
    const isAcademicApproved = item.academicApprovalStatus === "APPROVED";
    const isHeadApproved = item.headApprovalStatus === "APPROVED";
    const isRejectedByChair = item.headApprovalStatus === "REJECTED";
    const isPendingHead = item.headApprovalStatus === "PENDING" && !isRejectedByChair;

    if (isAcademicApproved)
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" /> อนุมัติสมบูรณ์
          </span>
          <span className="text-[10px] text-emerald-500 mt-0.5">รองวิชาการอนุมัติแล้ว</span>
        </div>
      );

    if (isHeadApproved)
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-cyan-700 font-bold text-xs bg-cyan-50 py-1.5 px-3 rounded-full border border-cyan-200">
            <Clock className="w-3.5 h-3.5" /> รอรองวิชาการ
          </span>
          <span className="text-[10px] text-cyan-500 mt-0.5">ประธานอนุมัติแล้ว</span>
        </div>
      );

    if (isPendingHead)
      return (
        <div className="flex flex-col items-center gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 py-1.5 px-3 rounded-full border border-indigo-200">
            <Clock className="w-3.5 h-3.5" /> รอประธาน
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">ไม่สามารถแก้ไขได้</span>
        </div>
      );

    return (
      <div className="flex flex-col items-center gap-2">
        {isRejectedByChair && (
          <span className="inline-flex items-center gap-1 text-red-600 text-[10px] bg-red-50 px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
            <AlertCircle className="w-3 h-3" /> ประธานส่งกลับแก้ไข
          </span>
        )}
        <div className="flex gap-2 w-full">
          <button
            onClick={() => onEdit(item)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-sm font-medium transition-all active:scale-95"
          >
            <Edit className="w-3.5 h-3.5" /> แก้ไข
          </button>
          <button
            onClick={() => submitToChair(item.id)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" />{isRejectedByChair ? "ส่งใหม่" : "ส่ง"}</>}
          </button>
        </div>
      </div>
    );
  }

  // ── วิชาในคณะ ──
  if (item.lecturerStatus === "APPROVED") {
    const isAcademicApproved = item.academicApprovalStatus === "APPROVED";
    const isHeadApproved = item.headApprovalStatus === "APPROVED";
    const isPendingHead = item.headApprovalStatus === "PENDING";
    const isRejectedByHead = item.headApprovalStatus === "REJECTED";

    if (isAcademicApproved)
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-300">
          <CheckCircle className="w-3.5 h-3.5" /> อนุมัติสมบูรณ์
        </span>
      );

    if (isHeadApproved)
      return (
        <span className="inline-flex items-center gap-1.5 text-cyan-700 font-bold text-xs bg-cyan-50 py-1.5 px-3 rounded-full border border-cyan-200">
          <Clock className="w-3.5 h-3.5" /> รอรองวิชาการ
        </span>
      );

    if (isPendingHead)
      return (
        <span className="inline-flex items-center gap-1.5 text-indigo-600 font-bold text-xs bg-indigo-50 py-1.5 px-3 rounded-full border border-indigo-200">
          <Clock className="w-3.5 h-3.5" /> รอประธาน
        </span>
      );

    if (isRejectedByHead)
      return (
        <span className="inline-flex items-center gap-1.5 text-red-600 font-bold text-xs bg-red-50 py-1.5 px-3 rounded-full border border-red-200 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" /> ประธานส่งกลับ
        </span>
      );

    return (
      <span className="inline-flex items-center gap-1.5 text-violet-700 font-bold text-xs bg-violet-50 py-1.5 px-3 rounded-full border border-violet-200">
        <UserCheck className="w-3.5 h-3.5" /> รอผู้รับผิดชอบ
      </span>
    );
  }

  if (item.lecturerStatus === "REJECTED")
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-1 text-red-600 font-semibold text-xs bg-red-50 py-1 px-2.5 rounded-full border border-red-200">
          <AlertCircle className="w-3.5 h-3.5" /> แจ้งแก้ไขแล้ว
        </span>
        <button
          onClick={() => dispute(item, item.lecturerFeedback)}
          className="text-orange-500 underline decoration-dashed text-xs hover:text-orange-600 font-medium"
        >
          ดู / แก้ไขคำขอ
        </button>
      </div>
    );

  // ── PENDING: ปุ่มหลัก 2 ปุ่ม ──
  return (
    <div className="flex gap-2 w-full">
      {/* ✅ ยืนยันถูกต้อง */}
      <button
        onClick={() => verify(item)}
        disabled={isLoading}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white font-semibold transition-all shadow-sm shadow-green-200 disabled:opacity-60 min-w-0"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <ThumbsUp className="w-4 h-4" />
            <span className="text-[11px] leading-tight text-center">ยืนยัน<br/>ถูกต้อง</span>
          </>
        )}
      </button>

      {/* ✏️ แจ้งแก้ไข */}
      <button
        onClick={() => dispute(item)}
        disabled={isLoading}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-white hover:bg-red-50 active:scale-95 text-red-500 border border-red-200 hover:border-red-400 font-semibold transition-all shadow-sm disabled:opacity-60 min-w-0"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <PenLine className="w-4 h-4" />
            <span className="text-[11px] leading-tight text-center">แจ้ง<br/>แก้ไข</span>
          </>
        )}
      </button>
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function InstructorWorkloadPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Assignment | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  const defaultForm: ExternalCourseForm = {
    faculty: "", code: "", nameTh: "", nameEn: "", credit: "",
    semester: 1, lectureHours: 0, labHours: 0, examHours: 0, examCritiqueHours: 0, evidenceLink: "",
  };
  const [extForm, setExtForm] = useState<ExternalCourseForm>(defaultForm);

  const { assignments, loading, error, refetch } = useInstructorAssignments(currentUser?.id);
  const { verify, dispute, submitToChair, processingId } = useAssignmentActions(refetch);
  const { submit: submitExternal, isSubmitting } = useExternalCourse(currentUser?.id, () => {
    setIsAddOpen(false); setExtForm(defaultForm); refetch();
  });

  useEffect(() => {
    if (status === "authenticated" && currentUser?.id) refetch();
  }, [status, currentUser?.id, refetch]);

  useEffect(() => {
    fetch("/api/term-config/active").then((r) => r.ok ? r.json() : null).then((d) => d && setActiveYear(d.academicYear)).catch(() => {});
  }, []);

  const validAssignments = useMemo(() => filterValidAssignments(assignments), [assignments]);
  const filteredAssignments = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return validAssignments.filter((a) => isExternalCourse(a)
      ? (a.externalCourseCode?.toLowerCase().includes(s) || a.externalCourseName?.toLowerCase().includes(s) || a.externalFaculty?.toLowerCase().includes(s))
      : (a.subject?.code?.toLowerCase().includes(s) || a.subject?.name_th?.toLowerCase().includes(s)));
  }, [validAssignments, searchTerm]);

  const totals = useMemo(() => calculateTotals(filteredAssignments), [filteredAssignments]);
  const statusCounts = useMemo(() => ({
    pending: filteredAssignments.filter((a) => a.lecturerStatus === "PENDING").length,
    approved: filteredAssignments.filter((a) => a.lecturerStatus === "APPROVED").length,
    rejected: filteredAssignments.filter((a) => a.lecturerStatus === "REJECTED").length,
  }), [filteredAssignments]);

  const semOpts = [
    { value: 1, label: "ภาคการศึกษาต้น" },
    { value: 2, label: "ภาคการศึกษาปลาย" },
    { value: 3, label: "ภาคฤดูร้อน" },
  ];

  if (status === "loading")
    return <div className="flex h-screen items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mr-3" /> กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-pink-50/20 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm font-medium">
          <span>จัดการชั่วโมงการสอน</span><ChevronRight size={14} />
          <span className="text-purple-600 font-semibold">ผู้สอน</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">ตรวจสอบภาระงานสอน</h1>
        {currentUser && !loading && (
          <p className="text-slate-600 mt-2 font-light">ยินดีต้อนรับ, <span className="font-semibold text-purple-600">{currentUser.name}</span></p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { label: "รอยืนยัน", count: statusCounts.pending, color: "orange", Icon: AlertOctagon },
            { label: "ยืนยันแล้ว", count: statusCounts.approved, color: "green", Icon: CheckCircle },
            { label: "แจ้งแก้ไข", count: statusCounts.rejected, color: "red", Icon: AlertCircle },
          ].map(({ label, count, color, Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-${color}-100 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500 font-medium">{label}</p><p className={`text-3xl font-bold text-${color}-600`}>{count}</p></div>
                <Icon className={`text-${color}-400`} size={32} />
              </div>
            </motion.div>
          ))}
        </div>
      </header>

      {/* Filter bar */}
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-lg mb-6 sticky top-4 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:flex-1 max-w-2xl space-y-2">
            <Label className="text-sm font-medium text-slate-600">ค้นหารหัสวิชา / ชื่อวิชา / คณะ</Label>
            <div className="relative">
              <Input placeholder="พิมพ์เพื่อค้นหา..." className="w-full pl-11 h-11 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-2 focus:ring-purple-100"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>
          <button onClick={refetch} disabled={loading}
            className="md:mt-7 flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50 font-medium">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden md:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <main className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl text-slate-800">ตรวจสอบข้อมูลชั่วโมงปฏิบัติการ/บรรยาย ปีการศึกษา {activeYear || "..."}</h3>
          <p className="text-slate-600 mt-1">สถานะข้อมูล: <span className="text-purple-600 font-semibold">กำลังดำเนินการ</span></p>
        </div>

        <div className="rounded-xl border overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 mb-4 text-purple-500 animate-spin" />
              <p>กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <p className="text-red-600 font-bold">{error}</p>
              <button onClick={refetch} className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl">ลองใหม่</button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 w-[24%]">รหัสวิชา / ชื่อรายวิชา</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[9%]">ภาคการศึกษา</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">หน่วยกิต</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">บทบาท</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">บรรยาย</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">ปฏิบัติ</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[8%]">คุมสอบ</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[8%]">วิพากษ์</TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[23%]">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredAssignments.length > 0 ? (
                  <>
                    {filteredAssignments.map((item) => {
                      const isExt = isExternalCourse(item);
                      const sem = item.semester || 1;
                      const semCfg = SEMESTER_CONFIG[sem as keyof typeof SEMESTER_CONFIG];

                      return (
                        <TableRow key={item.id} className="hover:bg-purple-50/30 transition-colors">
                          <TableCell>
                            {isExt && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200 mb-1">
                                🏛️ นอกคณะ
                              </span>
                            )}
                            {isExt ? (
                              <>
                                <div className="font-semibold text-slate-800">{item.externalCourseCode || "N/A"}</div>
                                <div className="text-slate-600 text-sm">{item.externalCourseName || "ไม่ระบุ"}</div>
                                <div className="text-xs text-slate-400 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded">{item.externalFaculty || "ไม่ระบุคณะ"}</div>
                                {item.evidenceLink && (
                                  <a href={item.evidenceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1">
                                    <LinkIcon size={12} /> ดูเอกสารอ้างอิง
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="font-semibold text-slate-800">{item.subject?.code || "N/A"}</div>
                                <div className="text-slate-600 text-sm">{item.subject?.name_th || "ไม่ระบุ"}</div>
                                <div className="text-xs text-slate-400 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded">{item.subject?.program?.name_th || "ไม่ระบุ"}</div>
                              </>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs border whitespace-nowrap ${
                              sem === 1 ? "bg-amber-50 text-amber-700 border-amber-200"
                              : sem === 2 ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {semCfg?.label || `เทอม ${sem}`}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded text-xs font-semibold border border-purple-100">
                              {isExt ? item.externalCredit || "-" : item.subject?.credit || "-"}
                            </span>
                          </TableCell>

                          <TableCell className="text-center">
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-xs font-semibold">ผู้สอน</span>
                          </TableCell>

                          <TableCell className="text-center font-semibold text-slate-700">{item.lectureHours}</TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">{item.labHours}</TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">{item.examHours || 0}</TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">{item.examCritiqueHours || 0}</TableCell>

                          <TableCell className="text-center align-middle px-3 py-2">
                            <ActionCell
                              item={item}
                              processingId={processingId}
                              verify={verify}
                              dispute={dispute}
                              submitToChair={submitToChair}
                              onEdit={(a) => { setSelectedItem(a); setIsEditOpen(true); }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 font-bold border-t-2 border-purple-200">
                      <TableCell colSpan={4} className="text-right pr-6 text-slate-500">รวมชั่วโมงทั้งหมด</TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">{totals.lecture}</TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">{totals.lab}</TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">{totals.exam}</TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">{totals.critique}</TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center p-12 text-slate-400">
                      <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                      {currentUser ? (searchTerm ? "ไม่พบรายวิชาที่ตรงกับเงื่อนไข" : "ไม่พบรายวิชาที่ต้องยืนยัน") : "กรุณาเลือกผู้ใช้งานจาก Navbar"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
          <Button variant="outline" className="text-green-600 border-green-600 border-dashed hover:bg-green-50 rounded-xl font-semibold" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่มรายวิชาอื่นๆ (นอกคณะ/ภายใน ม.พะเยา)
          </Button>
        </div>

        {/* ADD MODAL */}
        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="เพิ่มวิชาอื่นๆ (นอกคณะ/ศึกษาทั่วไป)" icon={Building2} colorClass="text-green-700" maxWidth="max-w-2xl">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">คณะ/หน่วยงานที่สอน <span className="text-red-500">*</span></Label>
                <Input placeholder="เช่น คณะศิลปศาสตร์" value={extForm.faculty} onChange={(e) => setExtForm({ ...extForm, faculty: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">รหัสวิชา <span className="text-red-500">*</span></Label>
                <Input placeholder="เช่น 001101" value={extForm.code} onChange={(e) => setExtForm({ ...extForm, code: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span></Label>
              <Input placeholder="เช่น ภาษาอังกฤษเพื่อการสื่อสาร" value={extForm.nameTh} onChange={(e) => setExtForm({ ...extForm, nameTh: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาอังกฤษ)</Label>
              <Input placeholder="Optional" value={extForm.nameEn} onChange={(e) => setExtForm({ ...extForm, nameEn: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">หน่วยกิต <span className="text-red-500">*</span></Label>
                <Input placeholder="เช่น 3(3-0-6)" value={extForm.credit} onChange={(e) => setExtForm({ ...extForm, credit: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">ภาคการศึกษา <span className="text-red-500">*</span></Label>
                <CustomSelect value={extForm.semester} onChange={(v) => setExtForm({ ...extForm, semester: v })} options={semOpts} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              {([
                { key: "lectureHours", label: "ชั่วโมงบรรยาย", step: "0.5" },
                { key: "labHours", label: "ชั่วโมงปฏิบัติ", step: "0.5" },
                { key: "examHours", label: "ชั่วโมงคุมสอบนอกตาราง", step: "0.5" },
                { key: "examCritiqueHours", label: "วิพากษ์ข้อสอบ (หัวข้อ)", step: "1" },
              ] as const).map(({ key, label, step }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 text-center block">{label}</Label>
                  <Input type="number" min="0" step={step} className="text-center"
                    onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                    value={(extForm as any)[key]}
                    onChange={(e) => setExtForm({ ...extForm, [key]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <div className="space-y-2 pb-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><LinkIcon size={16} /> ลิงก์เอกสารอ้างอิง <span className="text-red-500">*</span></Label>
              <Input placeholder="https://..." value={extForm.evidenceLink} onChange={(e) => setExtForm({ ...extForm, evidenceLink: e.target.value })} />
            </div>
          </div>
          <div className="px-5 py-4 border-t bg-white flex justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="bg-white">ยกเลิก</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => submitExternal(extForm)} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} บันทึกข้อมูล
            </Button>
          </div>
        </Modal>

        {/* EDIT MODAL */}
        {selectedItem && isExternalCourse(selectedItem) && (
          <EditExternalCourseModal
            isOpen={isEditOpen}
            onClose={() => { setIsEditOpen(false); setSelectedItem(null); }}
            assignment={selectedItem}
            onSuccess={() => { setIsEditOpen(false); setSelectedItem(null); refetch(); }}
          />
        )}
      </main>
    </div>
  );
}

// ===== EDIT MODAL =====
function EditExternalCourseModal({ isOpen, onClose, assignment, onSuccess }: {
  isOpen: boolean; onClose: () => void; assignment: Assignment; onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    faculty: assignment.externalFaculty || "",
    code: assignment.externalCourseCode || "",
    nameTh: assignment.externalCourseName || "",
    nameEn: assignment.externalCourseNameEn || "",
    credit: assignment.externalCredit || "",
    semester: assignment.semester || 1,
    lectureHours: assignment.lectureHours,
    labHours: assignment.labHours,
    examHours: assignment.examHours || 0,
    examCritiqueHours: assignment.examCritiqueHours || 0,
    evidenceLink: assignment.evidenceLink || "",
  });

  const semOpts = [
    { value: 1, label: "ภาคการศึกษาต้น" },
    { value: 2, label: "ภาคการศึกษาปลาย" },
    { value: 3, label: "ภาคฤดูร้อน" },
  ];

  const handleDelete = async () => {
    const r = await Swal.fire({
      title: "ลบรายวิชานี้?",
      html: `<p>รายวิชา <strong>${assignment.externalCourseCode} — ${assignment.externalCourseName}</strong> จะถูกลบออก</p>`,
      icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#64748b",
      confirmButtonText: "ลบเลย", cancelButtonText: "ยกเลิก", focusCancel: true,
      customClass: { container: "!z-[99999]" },
    });
    if (!r.isConfirmed) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assignments?id=${assignment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      onSuccess();
      await Swal.fire({ title: "ลบสำเร็จ!", icon: "success", timer: 1500, showConfirmButton: false, customClass: { container: "!z-[99999]" } });
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "ลบไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง", customClass: { container: "!z-[99999]" } });
    } finally { setIsSubmitting(false); }
  };

  const handleSave = async () => {
    if (!form.faculty.trim()) { toast.error("กรุณากรอกคณะ/หน่วยงาน"); return; }
    if (!form.code.trim()) { toast.error("กรุณากรอกรหัสวิชา"); return; }
    if (!form.nameTh.trim()) { toast.error("กรุณากรอกชื่อรายวิชา"); return; }
    if (!form.evidenceLink.trim()) { toast.error("กรุณาแนบลิงก์เอกสารอ้างอิง"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments/external", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignment.id, ...form }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "บันทึกไม่สำเร็จ"); }
      onSuccess();
      await Swal.fire({ title: "บันทึกสำเร็จ!", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (e) {
      await Swal.fire({ title: "เกิดข้อผิดพลาด", text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ", icon: "error", confirmButtonText: "ตกลง" });
    } finally { setIsSubmitting(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขรายวิชานอกคณะ" icon={Edit} colorClass="text-blue-700" maxWidth="max-w-2xl" zIndex={10000}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">คณะ/หน่วยงานที่สอน <span className="text-red-500">*</span></Label>
            <Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">รหัสวิชา <span className="text-red-500">*</span></Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span></Label>
          <Input value={form.nameTh} onChange={(e) => setForm({ ...form, nameTh: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาอังกฤษ)</Label>
          <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="เช่น Introduction to Computer Science" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">หน่วยกิต <span className="text-red-500">*</span></Label>
            <Input value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">ภาคการศึกษา <span className="text-red-500">*</span></Label>
            <CustomSelect value={form.semester} onChange={(v) => setForm({ ...form, semester: v })} options={semOpts} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          {([
            { key: "lectureHours", label: "ชั่วโมงบรรยาย", step: "0.5" },
            { key: "labHours", label: "ชั่วโมงปฏิบัติ", step: "0.5" },
            { key: "examHours", label: "ชั่วโมงคุมสอบนอกตาราง", step: "0.5" },
            { key: "examCritiqueHours", label: "วิพากษ์ข้อสอบ (หัวข้อ)", step: "1" },
          ] as const).map(({ key, label, step }) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 text-center block">{label}</Label>
              <Input type="number" min="0" step={step} className="text-center"
                onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <div className="space-y-2 pb-2">
          <Label className="text-sm font-medium text-slate-700 flex items-center gap-2"><LinkIcon size={15} /> ลิงก์เอกสารอ้างอิง <span className="text-red-500">*</span></Label>
          <Input value={form.evidenceLink} onChange={(e) => setForm({ ...form, evidenceLink: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div className="px-6 py-4 border-t flex justify-between gap-3 bg-white shrink-0">
        <Button variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={handleDelete} disabled={isSubmitting}>
          <Trash2 className="w-4 h-4 mr-1" /> ลบรายวิชานี้
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-white">ยกเลิก</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} บันทึกการแก้ไข
          </Button>
        </div>
      </div>
    </Modal>
  );
}