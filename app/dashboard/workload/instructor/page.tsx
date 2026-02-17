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

  // ฟิลด์สำหรับวิชานอกคณะ
  courseType?: CourseType;
  externalFaculty?: string | null;
  externalCourseCode?: string | null;
  externalCourseName?: string | null;
  externalCredit?: string | null;
  evidenceLink?: string | null;

  subject: {
    code: string;
    name_th: string;
    credit: string;
    program: {
      name_th: string;
      degree_level: string;
    };
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

// ===== CUSTOM MODAL COMPONENT =====
const Modal = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  colorClass = "text-slate-800",
  children,
  maxWidth = "max-w-xl",
  zIndex = 9999,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: any;
  colorClass?: string;
  children: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = "unset";
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted || !isVisible) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      style={{ zIndex: zIndex }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${maxWidth} ${
          isOpen ? "scale-100" : "scale-95"
        }`}
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0 z-20">
          <h3
            className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}
          >
            {Icon && <Icon size={22} />} {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — scroll เฉพาะส่วนนี้ */}
        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white px-6 pt-6 pb-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ===== CUSTOM SELECT COMPONENT =====
const CustomSelect = ({
  value,
  onChange,
  options,
  placeholder = "เลือก...",
  className = "",
}: {
  value: number;
  onChange: (value: number) => void;
  options: Array<{ value: number; label: string; color?: string }>;
  placeholder?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all"
      >
        <span
          className={`font-medium ${selectedOption ? "text-slate-700" : "text-slate-400"}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center justify-between group ${
                    value === option.value ? "bg-purple-50" : ""
                  }`}
                >
                  <span
                    className={`font-medium ${
                      value === option.value
                        ? "text-purple-700"
                        : "text-slate-700 group-hover:text-purple-600"
                    }`}
                  >
                    {option.label}
                  </span>
                  {value === option.value && (
                    <Check size={16} className="text-purple-600" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== UTILITY FUNCTIONS =====
/**
 * กรองเฉพาะ assignments ที่ส่งให้อาจารย์แล้ว (ไม่รวม DRAFT)
 */
function filterValidAssignments(assignments: Assignment[]): Assignment[] {
  return assignments.filter(
    (a) => a.lecturerStatus !== "DRAFT" && a.lecturerStatus !== null,
  );
}

/**
 * คำนวณยอดรวมชั่วโมง
 */
function calculateTotals(assignments: Assignment[]) {
  return {
    lecture: assignments.reduce((sum, a) => sum + a.lectureHours, 0),
    lab: assignments.reduce((sum, a) => sum + a.labHours, 0),
    exam: assignments.reduce((sum, a) => sum + (a.examHours || 0), 0),
    critique: assignments.reduce(
      (sum, a) => sum + (a.examCritiqueHours || 0),
      0,
    ),
  };
}

/**
 * ตรวจสอบความครบถ้วนของฟอร์ม
 */
function validateExternalCourseForm(form: ExternalCourseForm): string | null {
  if (!form.faculty.trim()) return "กรุณากรอกชื่อคณะ/หน่วยงาน";
  if (!form.code.trim()) return "กรุณากรอกรหัสวิชา";
  if (!form.nameTh.trim()) return "กรุณากรอกชื่อรายวิชา (ไทย)";
  if (!form.credit.trim()) return "กรุณากรอกหน่วยกิต";
  if (form.lectureHours < 0 || form.labHours < 0 || form.examHours < 0 || form.examCritiqueHours < 0) {
    return "ชั่วโมงต้องไม่ติดลบ";
  }
  return null;
}

/**
 * ตรวจสอบว่าเป็นวิชานอกคณะหรือไม่
 */
function isExternalCourse(assignment: Assignment): boolean {
  return (
    assignment.courseType === "EXTERNAL" || !!assignment.externalCourseCode
  );
}

// ===== CUSTOM HOOKS =====
/**
 * Hook สำหรับจัดการข้อมูล assignments
 */
function useInstructorAssignments(userId: string | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resAssign = await fetch(
        `/api/assignments?lecturerId=${userId}&scope=year`,
        { cache: 'no-store' }
      );

      if (!resAssign.ok) {
        throw new Error(`API Error: ${resAssign.status}`);
      }

      const dataAssign = await resAssign.json();
      setAssignments(Array.isArray(dataAssign) ? dataAssign : []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(errorMessage);
      console.error("Error loading data:", err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { assignments, loading, error, refetch: fetchData };
}

/**
 * Hook สำหรับจัดการการยืนยันและแจ้งแก้ไข
 */
function useAssignmentActions(onSuccess: () => void) {
  const [processingId, setProcessingId] = useState<number | null>(null);

  const verify = useCallback(
    async (assignment: Assignment) => {
      const isExternal = isExternalCourse(assignment);
      const courseInfo = isExternal
        ? `${assignment.externalCourseCode || "N/A"} ${assignment.externalCourseName || "ไม่ระบุชื่อวิชา"}`
        : `${assignment.subject.code} ${assignment.subject.name_th}`;

      const result = await Swal.fire({
        title: "ยืนยันข้อมูลชั่วโมงสอน?",
        html: `
          <div style="text-align: left; padding: 1rem;">
            <p><strong>รายวิชา:</strong> ${courseInfo}</p>
            ${isExternal ? `<p><strong>คณะ:</strong> ${assignment.externalFaculty || "ไม่ระบุ"}</p>` : ""}
            <p><strong>บรรยาย(ชม.):</strong> ${assignment.lectureHours} ชม.</p>
            <p><strong>ปฏิบัติ(ชม.):</strong> ${assignment.labHours} ชม.</p>
            <p><strong>คุมสอบนอกตาราง(ชม.):</strong> ${assignment.examHours || 0} ชม.</p>
            <p><strong>วิพากษ์ข้อสอบ(หัวข้อ):</strong> ${assignment.examCritiqueHours || 0} หัวข้อ</p>
            <hr style="margin: 1rem 0;">
            <p style="color: #666; font-size: 0.9rem;">
              การยืนยันหมายถึงท่านยอมรับว่าข้อมูลถูกต้อง
            </p>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#16a34a",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ใช่, ยืนยัน",
        cancelButtonText: "ยกเลิก",
        focusCancel: true,
      });

      if (!result.isConfirmed) return;

      setProcessingId(assignment.id);

      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: assignment.id,
            lecturerStatus: "APPROVED",
            lecturerFeedback: null,
          }),
        });

        if (!res.ok) {
          throw new Error("ไม่สามารถบันทึกข้อมูลได้");
        }

        onSuccess();

        await Swal.fire({
          title: "ยืนยันสำเร็จ!",
          text: "ข้อมูลของท่านได้รับการบันทึกแล้ว",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Verification error:", error);

        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text:
            error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [onSuccess],
  );

  const dispute = useCallback(
    async (assignment: Assignment, existingFeedback?: string) => {
      const isExternal = isExternalCourse(assignment);
      const courseInfo = isExternal
        ? `${assignment.externalCourseCode || "N/A"} ${assignment.externalCourseName || "ไม่ระบุชื่อวิชา"}`
        : `${assignment.subject.code} ${assignment.subject.name_th}`;

      const { value: feedback } = await Swal.fire({
        title: "แจ้งขอแก้ไขข้อมูล",
        html: `
          <div style="text-align: left; margin-bottom: 1rem;">
            <p><strong>รายวิชา:</strong> ${courseInfo}</p>
            ${isExternal ? `<p><strong>คณะ:</strong> ${assignment.externalFaculty || "ไม่ระบุ"}</p>` : ""}
          </div>
        `,
        input: "textarea",
        inputLabel: "ระบุสิ่งที่ต้องการแก้ไข",
        inputPlaceholder:
          "เช่น ชั่วโมงบรรยายจริงคือ 15 ชม. หรือ ผมไม่ได้สอนวิชานี้...",
        inputValue: existingFeedback || "",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ส่งคำขอแก้ไข",
        cancelButtonText: "ยกเลิก",
        inputValidator: (value) => {
          if (!value || value.trim().length < 5) {
            return "กรุณาระบุรายละเอียดอย่างน้อย 5 ตัวอักษร";
          }
          return null;
        },
      });

      if (!feedback) return;

      setProcessingId(assignment.id);

      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: assignment.id,
            lecturerStatus: "REJECTED",
            lecturerFeedback: feedback,
          }),
        });

        if (!res.ok) {
          throw new Error("ไม่สามารถส่งคำขอแก้ไขได้");
        }

        onSuccess();

        await Swal.fire({
          title: "ส่งคำขอสำเร็จ!",
          text: "คำขอแก้ไขของท่านได้รับการบันทึกแล้ว",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Dispute error:", error);

        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: error instanceof Error ? error.message : "ไม่สามารถส่งคำขอได้",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [onSuccess],
  );

  const submitToChair = useCallback(
    async (assignmentId: number) => {
      const result = await Swal.fire({
        title: "ส่งข้อมูลให้ประธานหลักสูตร?",
        html: `
          <div style="text-align: left; padding: 1rem;">
            <p style="color: #666; font-size: 0.95rem;">
              ข้อมูลรายวิชานอกคณะจะถูกส่งให้ประธานหลักสูตรตรวจสอบและอนุมัติ
            </p>
            <p style="color: #dc2626; font-size: 0.9rem; margin-top: 0.5rem;">
              <strong>⚠️ หมายเหตุ:</strong> กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนกดส่ง
            </p>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#7c3aed",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ยืนยันการส่ง",
        cancelButtonText: "ยกเลิก",
        focusCancel: true,
      });

      if (!result.isConfirmed) return false;

      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: assignmentId,
            responsibleStatus: "APPROVED",
            headApprovalStatus: "PENDING",
          }),
        });

        if (!res.ok) throw new Error("ไม่สามารถส่งข้อมูลได้");

        onSuccess();

        await Swal.fire({
          title: "ส่งข้อมูลสำเร็จ!",
          text: "ข้อมูลถูกส่งให้ประธานหลักสูตรตรวจสอบแล้ว",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } catch (error) {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: error instanceof Error ? error.message : "ไม่สามารถส่งข้อมูลได้",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
        return false;
      }
    },
    [onSuccess],
  );

  return { verify, dispute, submitToChair, processingId };
}

/**
 * Hook สำหรับจัดการการเพิ่มวิชานอกคณะ
 */
function useExternalCourse(userId: string | undefined, onSuccess: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitExternalCourse = useCallback(
    async (form: ExternalCourseForm) => {
      // Validation
      const validationError = validateExternalCourseForm(form);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      if (!userId) {
        toast.error("ไม่พบข้อมูลผู้ใช้");
        return;
      }

      setIsSubmitting(true);

      try {
        const res = await fetch("/api/assignments/external", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            lecturerId: userId,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "ไม่สามารถบันทึกข้อมูลได้");
        }

        onSuccess();

        await Swal.fire({
          title: "บันทึกสำเร็จ!",
          text: "ข้อมูลรายวิชานอกคณะได้รับการบันทึกแล้ว",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("External course error:", error);

        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text:
            error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, onSuccess],
  );

  return { submitExternalCourse, isSubmitting };
}

// ===== MAIN COMPONENT =====
export default function InstructorWorkloadPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  // State Management
  const [searchTerm, setSearchTerm] = useState("");
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Assignment | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);

  // External Course Form
  const [externalCourseForm, setExternalCourseForm] =
    useState<ExternalCourseForm>({
      faculty: "",
      code: "",
      nameTh: "",
      nameEn: "",
      credit: "",
      semester: 1,
      lectureHours: 0,
      labHours: 0,
      examHours: 0,
      examCritiqueHours: 0,
      evidenceLink: "",
    });

  // Custom Hooks
  const { assignments, loading, error, refetch } = useInstructorAssignments(
    currentUser?.id,
  );
  const { verify, dispute, submitToChair, processingId } = useAssignmentActions(refetch);
  const { submitExternalCourse, isSubmitting } = useExternalCourse(
    currentUser?.id,
    () => {
      setIsAddOpen(false);
      setExternalCourseForm({
        faculty: "",
        code: "",
        nameTh: "",
        nameEn: "",
        credit: "",
        semester: 1,
        lectureHours: 0,
        labHours: 0,
        examHours: 0,
        examCritiqueHours: 0,
        evidenceLink: "",
      });
      refetch();
    },
  );

  // Effects
  useEffect(() => {
    if (status === "authenticated" && currentUser?.id) {
      refetch();
    }
  }, [status, currentUser?.id, refetch]);

  // Fetch active academic year
  useEffect(() => {
    const fetchActiveYear = async () => {
      try {
        const res = await fetch("/api/term-config/active");
        if (res.ok) {
          const data = await res.json();
          setActiveYear(data.academicYear);
        }
      } catch (error) {
        console.error("Error fetching active year:", error);
      }
    };
    fetchActiveYear();
  }, []);

  // Memoized Values
  const validAssignments = useMemo(
    () => filterValidAssignments(assignments),
    [assignments],
  );

  const filteredAssignments = useMemo(() => {
    return validAssignments.filter((a) => {
      const searchLower = searchTerm.toLowerCase();

      if (isExternalCourse(a)) {
        return (
          (a.externalCourseCode?.toLowerCase().includes(searchLower) ??
            false) ||
          (a.externalCourseName?.toLowerCase().includes(searchLower) ??
            false) ||
          (a.externalFaculty?.toLowerCase().includes(searchLower) ?? false)
        );
      } else {
        return (
          a.subject?.code?.toLowerCase().includes(searchLower) ||
          a.subject?.name_th?.toLowerCase().includes(searchLower)
        );
      }
    });
  }, [validAssignments, searchTerm]);

  const totals = useMemo(
    () => calculateTotals(filteredAssignments),
    [filteredAssignments],
  );

  const statusCounts = useMemo(() => {
    return {
      pending: filteredAssignments.filter((a) => a.lecturerStatus === "PENDING")
        .length,
      approved: filteredAssignments.filter(
        (a) => a.lecturerStatus === "APPROVED",
      ).length,
      rejected: filteredAssignments.filter(
        (a) => a.lecturerStatus === "REJECTED",
      ).length,
    };
  }, [filteredAssignments]);

  // Handlers
  const handleAddExternalCourse = () => {
    submitExternalCourse(externalCourseForm);
  };

  // Semester options for dropdown
  const semesterOptions = [
    { value: 1, label: "ภาคการศึกษาต้น", color: "amber" },
    { value: 2, label: "ภาคการศึกษาปลาย", color: "blue" },
    { value: 3, label: "ภาคฤดูร้อน", color: "emerald" },
  ];

  // ===== RENDER =====
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/20 to-pink-50/20 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm font-medium">
          <span>จัดการชั่วโมงการสอน</span>
          <ChevronRight size={14} />
          <span className="text-purple-600 font-semibold">ผู้สอน</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">
          ตรวจสอบภาระงานสอน
        </h1>
        {currentUser && !loading && (
          <p className="text-slate-600 mt-2 font-light">
            ยินดีต้อนรับ,{" "}
            <span className="font-semibold text-purple-600">
              {currentUser.name}
            </span>
          </p>
        )}

        {/* Status Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-orange-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">รอยืนยัน</p>
                <p className="text-3xl font-bold text-orange-600">
                  {statusCounts.pending}
                </p>
              </div>
              <AlertOctagon className="text-orange-400" size={32} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-green-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">ยืนยันแล้ว</p>
                <p className="text-3xl font-bold text-green-600">
                  {statusCounts.approved}
                </p>
              </div>
              <CheckCircle className="text-green-400" size={32} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-100 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">แจ้งแก้ไข</p>
                <p className="text-3xl font-bold text-red-600">
                  {statusCounts.rejected}
                </p>
              </div>
              <AlertCircle className="text-red-400" size={32} />
            </div>
          </motion.div>
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-lg mb-6 sticky top-4 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:flex-1 max-w-2xl space-y-2">
            <Label className="text-sm font-medium text-slate-600">
              ค้นหารหัสวิชา / ชื่อวิชา / คณะ
            </Label>
            <div className="relative">
              <Input
                placeholder="พิมพ์เพื่อค้นหา..."
                className="w-full pl-11 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-purple-100 transition-all h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
            </div>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="md:mt-7 flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden md:inline">รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="bg-white rounded-2xl border border-slate-200 shadow-md p-6">
        <div className="text-center mb-6">
          <h3 className="font-bold text-xl text-slate-800">
            ตรวจสอบข้อมูลชั่วโมงปฏิบัติการ/บรรยาย ปีการศึกษา {activeYear || "..."}
          </h3>
          <p className="text-slate-600 mt-1">
            สถานะข้อมูล:{" "}
            <span className="text-purple-600 font-semibold">
              กำลังดำเนินการ
            </span>
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl border overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 mb-4 text-purple-500 animate-spin" />
              <p className="text-lg">กำลังโหลดข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-bold text-red-600">เกิดข้อผิดพลาด</h3>
              <p className="text-red-500 mt-2">{error}</p>
              <button
                onClick={refetch}
                className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 w-[28%]">
                    รหัสวิชา / ชื่อรายวิชา
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[8%]">
                    ภาคการศึกษา
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[6%]">
                    หน่วยกิต
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">
                    บทบาท
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">
                    บรรยาย (ชม.)
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">
                    ปฏิบัติการ (ชม.)
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">
                    คุมสอบนอกตาราง (ชม.)
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[7%]">
                    วิพากษ์ข้อสอบ (หัวข้อ)
                  </TableHead>
                  <TableHead className="text-center font-bold text-slate-700 w-[23%]">
                    สถานะการยืนยัน
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  <>
                    {filteredAssignments.map((item) => {
                      const isExternal = isExternalCourse(item);

                      return (
                        <TableRow
                          key={item.id}
                          className="hover:bg-purple-50/30 transition-colors"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2 mb-1">
                              {isExternal && (
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                                    🏛️ นอกคณะ
                                  </span>
                                </div>
                              )}
                            </div>

                            {isExternal ? (
                              <>
                                <div className="font-semibold text-slate-800">
                                  {item.externalCourseCode || "N/A"}
                                </div>
                                <div className="text-slate-600 text-sm">
                                  {item.externalCourseName || "ไม่ระบุชื่อวิชา"}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded">
                                  {item.externalFaculty || "ไม่ระบุคณะ"}
                                </div>
                                {item.evidenceLink && (
                                  <a
                                    href={item.evidenceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                                  >
                                    <LinkIcon size={12} />
                                    ดูเอกสารอ้างอิง
                                  </a>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="font-semibold text-slate-800">
                                  {item.subject?.code || "N/A"}
                                </div>
                                <div className="text-slate-600 text-sm">
                                  {item.subject?.name_th || "ไม่ระบุ"}
                                </div>
                                <div className="text-xs text-slate-400 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded">
                                  {item.subject?.program?.name_th || "ไม่ระบุ"}
                                </div>
                              </>
                            )}
                          </TableCell>

                          <TableCell className="text-center">
                            {(() => {
                              const sem = item.semester || 1;
                              const config =
                                SEMESTER_CONFIG[
                                  sem as keyof typeof SEMESTER_CONFIG
                                ];
                              return (
                                <div
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-xs border whitespace-nowrap ${
                                    sem === 1
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : sem === 2
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : sem === 3
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-gray-50 text-gray-700 border-gray-200"
                                  }`}
                                >
                                  {config?.label || `เทอม ${sem}`}
                                </div>
                              );
                            })()}
                          </TableCell>

                          <TableCell className="text-center">
                            {isExternal ? (
                              <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded text-xs font-semibold border border-purple-100">
                                {item.externalCredit || "-"}
                              </span>
                            ) : (
                              <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded text-xs font-semibold border border-purple-100">
                                {item.subject?.credit || "-"}
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-center text-slate-600">
                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-xs font-semibold">
                              ผู้สอน
                            </span>
                          </TableCell>

                          <TableCell className="text-center font-semibold text-slate-700">
                            {item.lectureHours}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">
                            {item.labHours}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">
                            {item.examHours || 0}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-slate-700">
                            {item.examCritiqueHours || 0}
                          </TableCell>

                          <TableCell className="text-center">
                            {isExternal
                              ? (() => {
                                  const isRejectedByChair = item.headApprovalStatus === "REJECTED";
                                  const isAcademicApproved = item.academicApprovalStatus === "APPROVED";
                                  const isHeadApproved = item.headApprovalStatus === "APPROVED";
                                  // ✅ "รอประธาน" = headApprovalStatus เป็น PENDING (ส่งแล้ว ยังไม่ตอบ)
                                  const isPendingHead = item.headApprovalStatus === "PENDING";
                                  // ✅ "รอส่ง" = headApprovalStatus ยังเป็น null (ยังไม่เคยส่ง) หรือถูก reject แล้วส่งใหม่
                                  const isSubmittedToChair = isPendingHead && !isRejectedByChair && !isHeadApproved && !isAcademicApproved;

                                  // ✅ 1) รองวิชาการอนุมัติแล้ว
                                  if (isAcademicApproved) return (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-50 py-1.5 px-3 rounded-full border border-emerald-300">
                                        <CheckCircle className="w-3.5 h-3.5" /> อนุมัติสมบูรณ์
                                      </div>
                                      <span className="text-[10px] text-emerald-500">รองวิชาการอนุมัติแล้ว</span>
                                    </div>
                                  );

                                  // ✅ 2) ประธานอนุมัติ รอรองวิชาการ
                                  if (isHeadApproved) return (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5 text-cyan-700 font-semibold text-xs bg-cyan-50 py-1.5 px-3 rounded-full border border-cyan-200">
                                        <CheckCircle className="w-3.5 h-3.5" /> ประธานอนุมัติแล้ว
                                      </div>
                                      <span className="text-[10px] text-cyan-500">รอรองวิชาการอนุมัติ</span>
                                    </div>
                                  );

                                  // 🔴 3) ประธานส่งกลับแก้ไข
                                  if (isRejectedByChair) return (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="flex items-center gap-1.5 text-red-600 font-semibold text-xs bg-red-50 py-1.5 px-3 rounded-full border border-red-200 animate-pulse">
                                        <AlertCircle className="w-3.5 h-3.5" /> ประธานส่งกลับแก้ไข
                                      </div>
                                      <div className="flex gap-1.5">
                                        <Button size="sm"
                                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg px-3"
                                          onClick={() => { setSelectedItem(item); setIsEditOpen(true); }}
                                        >
                                          <Edit className="w-3 h-3 mr-1" /> แก้ไข
                                        </Button>
                                        <Button size="sm"
                                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg px-3"
                                          onClick={() => submitToChair(item.id)}
                                          disabled={processingId === item.id}
                                        >
                                          {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                          ส่งใหม่
                                        </Button>
                                      </div>
                                    </div>
                                  );

                                  // 🔵 4) รอประธานตรวจสอบ (ส่งแล้ว ล็อก)
                                  if (isSubmittedToChair) return (
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-xs bg-indigo-50 py-1.5 px-3 rounded-full border border-indigo-200">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> รอประธานตรวจสอบ
                                      </div>
                                      <span className="text-[10px] text-slate-400">ไม่สามารถแก้ไขได้</span>
                                    </div>
                                  );

                                  // 🟡 5) รอส่ง (draft — ยังไม่ส่งประธาน)
                                  return (
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs bg-amber-50 py-1 px-3 rounded-full border border-amber-200">
                                        <FileText className="w-3.5 h-3.5" /> รอส่งข้อมูล
                                      </div>
                                      <div className="flex gap-1.5">
                                        <Button size="sm"
                                          className="h-7 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-3 shadow-none"
                                          onClick={() => { setSelectedItem(item); setIsEditOpen(true); }}
                                        >
                                          <Edit className="w-3 h-3 mr-1" /> แก้ไข
                                        </Button>
                                        <Button size="sm"
                                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg px-3"
                                          onClick={() => submitToChair(item.id)}
                                          disabled={processingId === item.id}
                                        >
                                          {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                          ส่งประธาน
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })()
                              : // ── วิชาในคณะ (logic เดิม) ──
                              item.lecturerStatus === "APPROVED" ? (
                                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold text-sm bg-green-50 py-1.5 px-3 rounded-full w-fit mx-auto border border-green-200">
                                  <CheckCircle className="w-4 h-4" /> ยืนยันแล้ว
                                </div>
                              ) : item.lecturerStatus === "REJECTED" ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="flex items-center gap-2 text-red-600 font-semibold text-sm bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                    <AlertCircle className="w-4 h-4" /> แจ้งแก้ไขแล้ว
                                  </div>
                                  <Button variant="link"
                                    className="text-orange-500 underline decoration-dashed p-0 h-auto text-xs hover:text-orange-600"
                                    onClick={() => { setSelectedItem(item); setIsDisputeOpen(true); }}
                                  >
                                    ดูรายละเอียด / แก้ไข
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-2">
                                  <Button size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-9 text-xs shadow-sm rounded-lg font-semibold"
                                    onClick={() => verify(item)}
                                    disabled={processingId === item.id}
                                  >
                                    {processingId === item.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                                    ยืนยันถูกต้อง
                                  </Button>
                                  <Button variant="destructive" size="sm"
                                    className="h-9 text-xs bg-red-500 hover:bg-red-600 shadow-sm rounded-lg font-semibold"
                                    onClick={() => { setSelectedItem(item); dispute(item); }}
                                    disabled={processingId === item.id}
                                  >
                                    แจ้งแก้ไข
                                  </Button>
                                </div>
                              )
                            }
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Total Row */}
                    <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 font-bold border-t-2 border-purple-200">
                      <TableCell
                        colSpan={4}
                        className="text-right pr-6 text-slate-500"
                      >
                        รวมชั่วโมงทั้งหมด
                      </TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">
                        {totals.lecture}
                      </TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">
                        {totals.lab}
                      </TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">
                        {totals.exam}
                      </TableCell>
                      <TableCell className="text-center text-purple-700 text-lg">
                        {totals.critique}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center p-12 text-slate-400"
                    >
                      <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                      {currentUser
                        ? searchTerm
                          ? "ไม่พบรายวิชาที่ตรงกับเงื่อนไขการค้นหา"
                          : "ไม่พบรายวิชาที่ต้องยืนยัน (หรือยังไม่มีการกรอกชั่วโมงสอนเข้ามา)"
                        : "กรุณาเลือกผู้ใช้งานจาก Navbar เพื่อดูข้อมูล"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Action Buttons Area */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
          <Button
            variant="outline"
            className="text-green-600 border-green-600 border-dashed hover:bg-green-50 rounded-xl font-semibold"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> เพิ่มรายวิชาอื่นๆ (นอกคณะ/ภายใน
            ม.พะเยา)
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="min-w-[120px] rounded-xl font-medium"
            >
              พิมพ์รายงาน
            </Button>
          </div>
        </div>

        {/* ADD EXTERNAL COURSE MODAL */}
        <Modal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          title="เพิ่มวิชาอื่นๆ (นอกคณะ/ศึกษาทั่วไป)"
          icon={Building2}
          colorClass="text-green-700"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    คณะ/หน่วยงานที่สอน <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="เช่น คณะศิลปศาสตร์, สำนักวิชา..."
                    value={externalCourseForm.faculty}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        faculty: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    รหัสวิชา <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="เช่น 001101"
                    value={externalCourseForm.code}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        code: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="เช่น ภาษาอังกฤษเพื่อการสื่อสาร"
                  value={externalCourseForm.nameTh}
                  onChange={(e) =>
                    setExternalCourseForm({
                      ...externalCourseForm,
                      nameTh: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  ชื่อรายวิชา (ภาษาอังกฤษ)
                </Label>
                <Input
                  placeholder="Optional"
                  value={externalCourseForm.nameEn}
                  onChange={(e) =>
                    setExternalCourseForm({
                      ...externalCourseForm,
                      nameEn: e.target.value,
                    })
                  }
                />
              </div>

              {/* เพิ่มช่องหน่วยกิตและภาคการศึกษา */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    หน่วยกิต <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="เช่น 3(3-0-6)"
                    value={externalCourseForm.credit}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        credit: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    ภาคการศึกษา <span className="text-red-500">*</span>
                  </Label>
                  <CustomSelect
                    value={externalCourseForm.semester}
                    onChange={(value) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        semester: value,
                      })
                    }
                    options={semesterOptions}
                    placeholder="เลือกภาคการศึกษา"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 text-center block">
                    ชั่วโมงบรรยาย
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="text-center"
                    onKeyDown={(e) =>
                      ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()
                    }
                    value={externalCourseForm.lectureHours}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        lectureHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 text-center block">
                    ชั่วโมงปฏิบัติ
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="text-center"
                    onKeyDown={(e) =>
                      ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()
                    }
                    value={externalCourseForm.labHours}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        labHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 text-center block">
                    ชั่วโมงคุมสอบนอกตาราง
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    className="text-center"
                    onKeyDown={(e) =>
                      ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()
                    }
                    value={externalCourseForm.examHours || 0}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        examHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 text-center block">
                    วิพากษ์ข้อสอบ (หัวข้อ)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="text-center"
                    onKeyDown={(e) =>
                      ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()
                    }
                    value={externalCourseForm.examCritiqueHours || 0}
                    onChange={(e) =>
                      setExternalCourseForm({
                        ...externalCourseForm,
                        examCritiqueHours: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2 pb-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <LinkIcon size={16} /> ลิงก์เอกสารอ้างอิง/คำสั่งแต่งตั้ง
                  (ถ้ามี)
                </Label>
                <Input
                  placeholder="https://..."
                  value={externalCourseForm.evidenceLink}
                  onChange={(e) =>
                    setExternalCourseForm({
                      ...externalCourseForm,
                      evidenceLink: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="px-5 py-4 border-t bg-white flex justify-end gap-3 shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSubmitting}
              className="bg-white"
            >
              ยกเลิก
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              onClick={handleAddExternalCourse}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              บันทึกข้อมูล
            </Button>
          </div>
        </Modal>
        {/* EDIT EXTERNAL COURSE MODAL */}
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

// ===== EDIT EXTERNAL COURSE MODAL =====
function EditExternalCourseModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment;
  onSuccess: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    faculty: assignment.externalFaculty || "",
    code: assignment.externalCourseCode || "",
    nameTh: assignment.externalCourseName || "",
    nameEn: (assignment as any).externalCourseNameEn || "",   // ✅ เพิ่ม
    credit: assignment.externalCredit || "",
    semester: assignment.semester || 1,
    lectureHours: assignment.lectureHours,
    labHours: assignment.labHours,
    examHours: assignment.examHours || 0,
    examCritiqueHours: assignment.examCritiqueHours || 0,
    evidenceLink: assignment.evidenceLink || "",
  });

  const semesterOptions = [
    { value: 1, label: "ภาคการศึกษาต้น" },
    { value: 2, label: "ภาคการศึกษาปลาย" },
    { value: 3, label: "ภาคฤดูร้อน" },
  ];

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "ลบรายวิชานี้?",
      html: `<p>รายวิชา <strong>${assignment.externalCourseCode} — ${assignment.externalCourseName}</strong> จะถูกลบออกจากระบบ</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบเลย",
      cancelButtonText: "ยกเลิก",
      focusCancel: true,
      customClass: { container: "!z-[99999]" },  // ✅ สูงกว่า modal
    });
    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/assignments?id=${assignment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      onSuccess();
      await Swal.fire({ title: "ลบสำเร็จ!", icon: "success", timer: 1500, showConfirmButton: false, customClass: { container: "!z-[99999]" } });
    } catch (error) {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "ลบไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { container: "!z-[99999]" },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!form.faculty.trim()) { toast.error("กรุณากรอกคณะ/หน่วยงาน"); return; }
    if (!form.code.trim()) { toast.error("กรุณากรอกรหัสวิชา"); return; }
    if (!form.nameTh.trim()) { toast.error("กรุณากรอกชื่อรายวิชา"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments/external", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignment.id, ...form }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "บันทึกไม่สำเร็จ");
      }

      onSuccess();
      await Swal.fire({ title: "บันทึกสำเร็จ!", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (error) {
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขรายวิชานอกคณะ" icon={Edit} colorClass="text-blue-700" maxWidth="max-w-2xl" zIndex={10000}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">คณะ/หน่วยงานที่สอน <span className="text-red-500">*</span></Label>
            <Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="เช่น คณะศิลปศาสตร์" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">รหัสวิชา <span className="text-red-500">*</span></Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="เช่น 001101" />
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
            <Input value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="เช่น 3(3-0-6)" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">ภาคการศึกษา <span className="text-red-500">*</span></Label>
            <CustomSelect value={form.semester} onChange={(v) => setForm({ ...form, semester: v })} options={semesterOptions} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
          {[
            { key: "lectureHours", label: "ชั่วโมงบรรยาย", step: "0.5" },
            { key: "labHours", label: "ชั่วโมงปฏิบัติ", step: "0.5" },
            { key: "examHours", label: "ชั่วโมงคุมสอบนอกตาราง", step: "0.5" },
            { key: "examCritiqueHours", label: "วิพากษ์ข้อสอบ (หัวข้อ)", step: "1" },
          ].map(({ key, label, step }) => (
            <div key={key} className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 text-center block">{label}</Label>
              <Input
                type="number" min="0" step={step} className="text-center"
                onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 pb-2">
          <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <LinkIcon size={15} /> ลิงก์เอกสารอ้างอิง (ถ้ามี)
          </Label>
          <Input value={form.evidenceLink} onChange={(e) => setForm({ ...form, evidenceLink: e.target.value })} placeholder="https://..." />
        </div>
      </div>

      {/* Footer — อยู่นอก scroll area โดยส่งเป็น sibling ผ่าน fragment */}
      <div className="px-6 py-4 border-t flex justify-between gap-3 bg-white shrink-0">
        <Button
          variant="outline"
          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          <Trash2 className="w-4 h-4 mr-1" /> ลบรายวิชานี้
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-white">ยกเลิก</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            บันทึกการแก้ไข
          </Button>
        </div>
      </div>
    </Modal>
  );
}