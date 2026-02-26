"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter, usePathname } from "next/navigation"; 
import { 
  Search, PenLine, Plus, Trash2, Edit2, X, User, Check, Loader2, UserPlus, 
  AlertCircle, CheckCircle, Send, Clock, FileText, AlertTriangle, MessageSquare, 
  ChevronRight, Layers, ShieldCheck, RefreshCw, GraduationCap
} from "lucide-react";
import { Toaster, toast } from 'sonner';
import Swal from 'sweetalert2';

type LecturerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null;
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED';

type Assignment = {
  id: number;
  subjectId: number;
  lecturerId: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  examCritiqueHours: number;
  semester?: number;
  lecturer: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    email: string;
  };
  lecturerStatus?: LecturerStatus;
  lecturerFeedback?: string;
  responsibleStatus?: ApprovalStatus;
  headApprovalStatus?: ApprovalStatus;
  academicApprovalStatus?: ApprovalStatus;
};

type CourseSummary = {
  total: number;
  lecturerPending: number;
  lecturerRejected: number;
  isReady: boolean;
  isSubmitted: boolean;
  isHeadApproved: boolean;
  isHeadRejected: boolean;
  isPendingHead: boolean; 
  isPendingAcademic: boolean;
  isFullyApproved: boolean;   
};

type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string | null;
  credit: string;
  semester?: number; 
  program: {
    id: number;
    name_th: string;
    year: number;
    degree_level: string;
  };
  responsibleUserId: string | null;
  responsibleUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    title: string | null;
  } | null;
  teachingAssignments?: Assignment[]; 
  summary?: CourseSummary; 
};

type UserData = {
  id: string;
  name: string;
  email: string;
};

const SEMESTER_CONFIG = {
  1: { label: "ภาคต้น", fullLabel: "ภาคการศึกษาต้น" },
  2: { label: "ภาคปลาย", fullLabel: "ภาคการศึกษาปลาย" },
  3: { label: "ภาคฤดูร้อน", fullLabel: "ภาคฤดูร้อน" },
} as const;

const getLecturerName = (lecturer: Assignment['lecturer']) => {
  return `${lecturer.firstName || ''} ${lecturer.lastName || ''}`.trim() || 'ไม่ระบุชื่อ';
};

const getSemesterLabel = (semester?: number) => {
  if (!semester) return "ภาคต้น";
  return SEMESTER_CONFIG[semester as keyof typeof SEMESTER_CONFIG]?.label || `เทอม ${semester}`;
};

const calculateTotalHours = (assignment: Assignment) => {
  return Number(assignment.lectureHours) + 
         Number(assignment.labHours) + 
         Number(assignment.examHours) + 
         Number(assignment.examCritiqueHours || 0);
};

const calculateSummary = (assignments: Assignment[]): CourseSummary => {
  const allApprovedByLecturer = assignments.length > 0 && 
    assignments.every(a => a.lecturerStatus === 'APPROVED');
  
  const allApprovedByResponsible = assignments.length > 0 && 
    assignments.every(a => a.responsibleStatus === 'APPROVED');
  
  const allPendingHead = assignments.length > 0 && 
    assignments.every(a => a.responsibleStatus === 'APPROVED' && a.headApprovalStatus === 'PENDING');
  
  const allPendingAcademic = assignments.length > 0 && 
    assignments.every(a => a.headApprovalStatus === 'APPROVED' && 
      (a.academicApprovalStatus === 'PENDING' || !a.academicApprovalStatus));
  
  const fullyApproved = assignments.length > 0 && 
    assignments.every(a => a.academicApprovalStatus === 'APPROVED');

  return {
    total: assignments.length,
    lecturerPending: assignments.filter(a => a.lecturerStatus === 'PENDING').length,
    lecturerRejected: assignments.filter(a => a.lecturerStatus === 'REJECTED').length,
    isReady: allApprovedByLecturer,
    isSubmitted: allApprovedByResponsible,
    isPendingHead: allPendingHead,
    isPendingAcademic: allPendingAcademic && !fullyApproved,
    isFullyApproved: fullyApproved,
    isHeadApproved: assignments.length > 0 && 
      assignments.every(a => a.headApprovalStatus === 'APPROVED'),
    isHeadRejected: assignments.some(a => a.headApprovalStatus === 'REJECTED')
  };
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type BadgeProps = {
  color: 'slate' | 'green' | 'red' | 'blue' | 'orange' | 'indigo' | 'emerald' | 'cyan';
  icon: any;
  text: string;
  className?: string;
};

const Badge = ({ color, icon: Icon, text, className = "" }: BadgeProps) => {
  const colors = {
    slate: "bg-slate-100 text-slate-500 border-slate-200",
    green: "bg-green-100 text-green-700 border-green-200",
    red: "bg-red-100 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
  };

  return (
    <span className={`${colors[color]} border px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 justify-center w-fit mx-auto whitespace-nowrap ${className}`}>
      <Icon size={12} strokeWidth={2.5} /> {text}
    </span>
  );
};

const StatusBadge = ({ summary }: { summary?: CourseSummary }) => {
  if (!summary || summary.total === 0) {
    return <Badge color="slate" icon={FileText} text="ยังไม่เพิ่มผู้สอน" />;
  }
  
  if (summary.isFullyApproved) {
    return <Badge color="emerald" icon={ShieldCheck} text="อนุมัติสมบูรณ์" className="shadow-sm border-emerald-300" />;
  }
  
  if (summary.isPendingAcademic) {
    return <Badge color="cyan" icon={GraduationCap} text="รอรองวิชาการอนุมัติ" className="animate-pulse" />;
  }
  
  if (summary.isHeadApproved) {
    return <Badge color="green" icon={CheckCircle} text="ประธานอนุมัติแล้ว" />;
  }
  
  if (summary.isHeadRejected) {
    return <Badge color="red" icon={AlertTriangle} text="ประธานส่งกลับ" className="animate-pulse" />;
  }
  
  if (summary.isPendingHead) {
    return <Badge color="indigo" icon={Clock} text="รอประธานตรวจสอบ" />;
  }
  
  if (summary.isSubmitted) {
    return <Badge color="blue" icon={Send} text="ส่งแล้ว" />;
  }
  
  if (summary.lecturerRejected > 0) {
    return <Badge color="red" icon={AlertCircle} text={`มีข้อโต้แย้ง (${summary.lecturerRejected})`} />;
  }
  
  if (summary.lecturerPending > 0) {
    return <Badge color="orange" icon={Clock} text={`รอผู้สอน (${summary.lecturerPending})`} />;
  }
  
  if (summary.isReady) {
    return <Badge color="emerald" icon={Check} text="พร้อมส่งข้อมูล" className="animate-bounce" />;
  }
  
  return <span className="text-slate-400">-</span>;
};

function useCourseLogic(currentUser: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [staffs, setStaffs] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const router = useRouter();

  const fetchInitialData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [resCourses, resStaff] = await Promise.all([
        fetch("/api/courses?filter=active", { cache: 'no-store' }),
        fetch("/api/staff")
      ]);

      const dataCourses = await resCourses.json();
      const dataStaff = await resStaff.json();

      if (Array.isArray(dataCourses)) {
        const coursesWithSummary = dataCourses.map((c: Course) => ({
          ...c,
          summary: calculateSummary(c.teachingAssignments || [])
        }));
        setCourses(coursesWithSummary);
      }

      setStaffs(Array.isArray(dataStaff) ? dataStaff : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const refreshAssignments = useCallback(async (subjectId: number, semester?: number) => {
    try {
      const query = semester ? `&semester=${semester}` : '';
      const res = await fetch(`/api/assignments?subjectId=${subjectId}${query}`, { cache: 'no-store' });
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setAssignments([]);
    }
  }, []);

  const handleActions = {
    addLecturer: async (staffId: string, courseId: number, semester?: number) => {
      try {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: courseId,
            lecturerId: staffId,
            lecturerStatus: null,
            semester
          }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'ไม่สามารถเพิ่มอาจารย์ได้');
        }
        
        await refreshAssignments(courseId, semester);
        await fetchInitialData();
        toast.success("เพิ่มผู้สอนเรียบร้อย");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถเพิ่มอาจารย์ได้";
        toast.error(message);
        return false;
      }
    },

    saveHoursDraft: async (id: number, hours: { lecture: number, lab: number, exam: number, critique: number }) => {
      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            lectureHours: hours.lecture,
            labHours: hours.lab,
            examHours: hours.exam,
            examCritiqueHours: hours.critique,
            lecturerStatus: null
          })
        });
        
        if (!res.ok) throw new Error('บันทึกไม่สำเร็จ');
        
        if (selectedCourse) {
          await refreshAssignments(selectedCourse.id, selectedCourse.semester);
        }
        toast.success("บันทึกจำนวนชั่วโมงแล้ว");
        return true;
      } catch (err) {
        toast.error("บันทึกไม่สำเร็จ");
        return false;
      }
    },

    confirmAssignment: async (id: number, isSelf: boolean) => {
      const result = await Swal.fire({
        title: isSelf ? "ยืนยันชั่วโมงสอนของคุณ?" : "ส่งข้อมูลให้อาจารย์ตรวจสอบ?",
        text: isSelf 
          ? "กรุณาตรวจสอบจำนวนชั่วโมงให้ถูกต้องก่อนยืนยัน" 
          : "ข้อมูลจะถูกส่งให้อาจารย์ผู้สอนตรวจสอบ",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ยืนยัน",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
        customClass: { container: 'swal-high-z-index' }
      });

      if (!result.isConfirmed) return false;

      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            lecturerStatus: isSelf ? "APPROVED" : "PENDING",
            responsibleStatus: "PENDING"
          })
        });
        
        if (!res.ok) throw new Error('ทำรายการไม่สำเร็จ');
        
        if (selectedCourse) {
          await refreshAssignments(selectedCourse.id, selectedCourse.semester);
        }
        await fetchInitialData();
        
        await Swal.fire({
          title: "สำเร็จ!",
          text: isSelf ? "ยืนยันชั่วโมงของคุณเรียบร้อย" : "ส่งข้อมูลให้อาจารย์ตรวจสอบเรียบร้อย",
          icon: "success",
          confirmButtonColor: "#10b981",
          timer: 2000,
          timerProgressBar: true,
          customClass: { container: 'swal-high-z-index' }
        });
        
        return true;
      } catch (err) {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด!",
          text: "ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonColor: "#ef4444",
          customClass: { container: 'swal-high-z-index' }
        });
        return false;
      }
    },

    resolveDispute: async (id: number, hours: { lecture: number, lab: number, exam: number, critique: number }) => {
      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            lectureHours: hours.lecture,
            labHours: hours.lab,
            examHours: hours.exam,
            examCritiqueHours: hours.critique,
            lecturerStatus: "PENDING",
            lecturerFeedback: null
          })
        });
        
        if (!res.ok) throw new Error('เกิดข้อผิดพลาด');
        
        if (selectedCourse) {
          await refreshAssignments(selectedCourse.id, selectedCourse.semester);
        }
        await fetchInitialData();
        toast.success("แก้ไขและส่งข้อมูลใหม่เรียบร้อย");
        return true;
      } catch (err) {
        toast.error("เกิดข้อผิดพลาด");
        return false;
      }
    },

    insistOriginal: async (id: number, reason: string) => {
      try {
        const res = await fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            lecturerStatus: "APPROVED",
            responsibleStatus: "APPROVED",
            lecturerFeedback: `[ยืนยันข้อมูลเดิม]: ${reason}`
          })
        });
        
        if (!res.ok) throw new Error('เกิดข้อผิดพลาด');
        
        if (selectedCourse) {
          await refreshAssignments(selectedCourse.id, selectedCourse.semester);
        }
        await fetchInitialData();
        toast.success("ยืนยันข้อมูลเดิมเรียบร้อย");
        return true;
      } catch (err) {
        toast.error("เกิดข้อผิดพลาด");
        return false;
      }
    },

    deleteAssignment: async (id: number) => {
      const result = await Swal.fire({
        title: "ต้องการลบผู้สอนท่านนี้?",
        text: "การลบจะไม่สามารถกู้คืนข้อมูลได้!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ใช่, ลบเลย!",
        cancelButtonText: "ยกเลิก",
        reverseButtons: true,
        customClass: { container: 'swal-high-z-index' }
      });

      if (!result.isConfirmed) return;
      
      try {
        const res = await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error('ลบไม่สำเร็จ');
        
        if (selectedCourse) {
          await refreshAssignments(selectedCourse.id, selectedCourse.semester);
        }
        await fetchInitialData();
        
        await Swal.fire({
          title: "ลบเรียบร้อย!",
          text: "ข้อมูลถูกลบออกจากระบบแล้ว",
          icon: "success",
          confirmButtonColor: "#10b981",
          timer: 2000,
          timerProgressBar: true,
          customClass: { container: 'swal-high-z-index' }
        });
      } catch (err) {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด!",
          text: "ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonColor: "#ef4444",
          customClass: { container: 'swal-high-z-index' }
        });
      }
    },

    submitToChair: async () => {
      try {
        const updatePromises = assignments.map(a =>
          fetch("/api/assignments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: a.id,
              responsibleStatus: "APPROVED",
              headApprovalStatus: "PENDING",
              academicApprovalStatus: "PENDING"
            })
          })
        );
        
        await Promise.all(updatePromises);
        await fetchInitialData();
        router.refresh();
        return true;
      } catch (err) {
        toast.error("ส่งข้อมูลไม่สำเร็จ");
        return false;
      }
    }
  };

  return {
    courses,
    staffs,
    loading,
    assignments,
    selectedCourse,
    fetchInitialData,
    refreshAssignments,
    setSelectedCourse,
    setAssignments,
    actions: handleActions
  };
}

type CourseTableSectionProps = {
  title: string;
  courses: Course[];
  loading: boolean;
  onOpenModal: (c: Course) => void;
};

const CourseTableSection = ({ title, courses, loading, onOpenModal }: CourseTableSectionProps) => {
  if (!loading && courses.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/30">
        <Layers className="text-purple-600" size={20} />
        <h3 className="font-bold text-lg text-slate-800">
          {title} <span className="text-sm font-normal text-slate-500">({courses.length} รายการ)</span>
        </h3>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-sm font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-4 pl-6 w-[12%]">รหัสวิชา</th>
              <th className="p-4 w-[28%]">ชื่อรายวิชา</th>
              <th className="p-4 w-[10%] text-center">หน่วยกิต</th>
              <th className="p-4 w-[22%]">หลักสูตร</th>
              <th className="p-4 w-[15%] text-center">สถานะปัจจุบัน</th>
              <th className="p-4 pr-6 w-[13%] text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-400">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
                  </div>
                </td>
              </tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 pl-6 font-medium text-slate-700">{course.code}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800 truncate" title={course.name_th}>
                      {course.name_th}
                    </div>
                    {course.name_en && (
                      <div className="text-xs text-slate-500 font-light mt-0.5 truncate" title={course.name_en}>
                        {course.name_en}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                      {course.credit}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 truncate" title={course.program.name_th}>
                    {course.program.name_th}
                  </td>
                  <td className="p-4 text-center align-middle">
                    <StatusBadge summary={course.summary} />
                  </td>
                  <td className="p-4 pr-6 text-center">
                    <button
                      onClick={() => onOpenModal(course)}
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm text-sm font-medium"
                    >
                      <PenLine size={16} /> จัดการ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

function CourseOwnerPageContent() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;
  
  const searchParams = useSearchParams();
  const subjectIdFromUrl = searchParams.get('subjectId');
  const router = useRouter();
  const pathname = usePathname(); 

  const {
    courses,
    staffs,
    loading,
    assignments,
    selectedCourse,
    fetchInitialData,
    refreshAssignments,
    setSelectedCourse,
    setAssignments,
    actions
  } = useCourseLogic(currentUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInitialData();
    }
  }, [status, fetchInitialData]);

  const handleOpenModal = useCallback((course: Course) => {
    setSelectedCourse(course);
    setAssignments(course.teachingAssignments || []);
    setIsModalOpen(true);
    refreshAssignments(course.id, course.semester);
  }, [refreshAssignments, setSelectedCourse, setAssignments]);

  useEffect(() => {
    if (!loading && subjectIdFromUrl && courses.length > 0) {
      const targetCourse = courses.find(c => String(c.id) === String(subjectIdFromUrl));
      if (targetCourse && !isModalOpen) {
        setSelectedCourse(targetCourse);
        setAssignments(targetCourse.teachingAssignments || []);
        setIsModalOpen(true);
        refreshAssignments(targetCourse.id, targetCourse.semester);
      }
    }
  }, [loading, subjectIdFromUrl, courses, refreshAssignments, isModalOpen, setSelectedCourse, setAssignments]);

  const filteredCourses = useMemo(() => {
    if (!currentUser) return [];
    
    return courses.filter(c => {
      const isOwner = String(c.responsibleUserId) === String(currentUser.id);
      if (!isOwner) return false;
      
      if (!debouncedSearchTerm) return true;
      
      const searchLower = debouncedSearchTerm.toLowerCase();
      return c.code.toLowerCase().includes(searchLower) || 
             c.name_th.toLowerCase().includes(searchLower);
    });
  }, [courses, currentUser, debouncedSearchTerm]);

  const groupedCourses = useMemo(() => ({
    semester1: filteredCourses.filter(c => c.semester === 1 || !c.semester),
    semester2: filteredCourses.filter(c => c.semester === 2),
    summer: filteredCourses.filter(c => c.semester === 3),
  }), [filteredCourses]);

  if (status === 'loading' || (!currentUser && loading)) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <style jsx global>{`
        .swal-high-z-index {
          z-index: 99999 !important;
        }
        .swal2-container.swal-high-z-index {
          z-index: 99999 !important;
        }
      `}</style>
      
      <Toaster position="top-center" richColors />

      <header className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
            <span>จัดการชั่วโมงการสอน</span>
            <ChevronRight size={14} />
            <span className="text-purple-600">ผู้รับผิดชอบรายวิชา</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            บันทึกผู้สอนและชั่วโมงสอน
          </h1>
          {currentUser && !loading && (
            <p className="text-slate-500 mt-2 font-light">
              ยินดีต้อนรับ, <span className="font-medium text-purple-600">{currentUser.name}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => fetchInitialData()}
          disabled={loading}
          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all disabled:opacity-50"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-600" /> ค้นหาและเลือกรายวิชา
        </h2>
        <div className="relative max-w-md">
          <input
            className="w-full pl-10 pr-4 h-11 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm bg-slate-50/30 focus:bg-white"
            placeholder="พิมพ์รหัสวิชา หรือ ชื่อวิชาเพื่อค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </section>

      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin" /> กำลังโหลดรายวิชา...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl">
          <Search size={32} className="opacity-20" />
          {currentUser ? "ไม่พบรายวิชาที่คุณรับผิดชอบ" : "ไม่พบข้อมูลผู้ใช้งาน"}
        </div>
      ) : (
        <>
          <CourseTableSection
            title="ภาคการศึกษาต้น"
            courses={groupedCourses.semester1}
            loading={false}
            onOpenModal={handleOpenModal}
          />
          <CourseTableSection
            title="ภาคการศึกษาปลาย"
            courses={groupedCourses.semester2}
            loading={false}
            onOpenModal={handleOpenModal}
          />
          <CourseTableSection
            title="ภาคฤดูร้อน"
            courses={groupedCourses.summer}
            loading={false}
            onOpenModal={handleOpenModal}
          />
        </>
      )}

      {isModalOpen && selectedCourse && (
        <CourseModal 
            course={selectedCourse}
            assignments={assignments}
            currentUser={currentUser}
            staffs={staffs}
            onClose={() => {
                setIsModalOpen(false);
                router.replace(pathname); 
            }}
            actions={actions}
        />
      )}
    </div>
  );
}

export default function CourseOwnerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        กำลังโหลดข้อมูล...
      </div>
    }>
      <CourseOwnerPageContent />
    </Suspense>
  );
}

function CourseModal({ course, assignments, currentUser, staffs, onClose, actions }: any) {
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [searchStaff, setSearchStaff] = useState("");
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const isRejectedByChair = assignments.some((a: Assignment) => a.headApprovalStatus === 'REJECTED');

  const isReadyToSubmit = assignments.length > 0 && assignments.every((a: Assignment) => {
    const totalH = calculateTotalHours(a);
    return a.lecturerStatus === 'APPROVED' && totalH > 0;
  });

  const isSubmitted = assignments.length > 0 && assignments.every((a: Assignment) => a.responsibleStatus === 'APPROVED');
  const isHeadApproved = assignments.length > 0 && assignments.every((a: Assignment) => a.headApprovalStatus === 'APPROVED');
  const isAcademicApproved = assignments.length > 0 && assignments.every((a: Assignment) => a.academicApprovalStatus === 'APPROVED');
  const isLocked = isSubmitted && !isRejectedByChair;

  // ✅ เหลือแค่ Swal confirm + SuccessOverlay (ลบ Swal success ออกแล้ว)
  const handleSubmit = async () => {
    const result = await Swal.fire({
      title: "ยืนยันการส่งข้อมูล?",
      html: `
        <div class="text-left">
          <p class="mb-2">ข้อมูลจะถูกส่งให้ <strong>ประธานหลักสูตร</strong> ตรวจสอบ</p>
          <p class="text-sm text-gray-600">กรุณาตรวจสอบความถูกต้องก่อนกดยืนยัน</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการส่ง",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      customClass: { container: 'swal-high-z-index' }
    });

    if (!result.isConfirmed) return;

    setSubmitStatus('submitting');
    const success = await actions.submitToChair();

    if (success) {
      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        setTimeout(() => setSubmitStatus('idle'), 300);
      }, 3000);
    } else {
      setSubmitStatus('idle');
    }
  };

  const handleAddLecturer = async (staffId: string) => {
    const success = await actions.addLecturer(staffId, course.id, course.semester);
    if (success) {
      setIsAddingLecturer(false);
      setSearchStaff("");
    }
  };

  const filteredStaffs = useMemo(() => 
    staffs.filter((s: UserData) => 
      s.name.toLowerCase().includes(searchStaff.toLowerCase())
    ),
    [staffs, searchStaff]
  );

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden relative">
        
        {submitStatus === 'success' && <SuccessOverlay />}

        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {course.code} {course.name_th}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded border border-purple-200 font-medium">
                {course.credit} หน่วยกิต
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200 font-medium">
                {getSemesterLabel(course.semester)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1">
          {isRejectedByChair && (
            <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 text-red-700 mb-4 rounded-lg">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold text-sm">ถูกส่งกลับแก้ไขโดยประธานหลักสูตร</p>
                <p className="text-xs">กรุณาตรวจสอบและแก้ไขข้อมูลที่มีปัญหา แล้วกดส่งอีกครั้ง</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <User size={18} /> รายชื่อผู้สอน
                </h3>
              </div>

              <div className="bg-slate-100/50 p-3 grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 border-b uppercase tracking-wider">
                <div className="col-span-3 pl-2">ชื่อ-สกุล</div>
                <div className="col-span-1 text-center">บรรยาย (ชม.)</div>
                <div className="col-span-1 text-center">ปฏิบัติ (ชม.)</div>
                <div className="col-span-2 text-center">คุมสอบนอกตาราง (ชม.)</div>
                <div className="col-span-2 text-center">วิพากษ์ข้อสอบ (หัวข้อ)</div>
                <div className="col-span-3 text-center">จัดการ</div>
              </div>

              <div className="divide-y divide-slate-100">
                {assignments.map((assign: Assignment) => (
                  <AssignmentRow
                    key={assign.id}
                    assignment={assign}
                    actions={actions}
                    isLocked={isLocked}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            </div>

            {!isLocked && (
              <div className="mt-2 flex flex-col gap-3">
                {currentUser && !assignments.some((a: Assignment) => String(a.lecturerId) === String(currentUser.id)) && (
                  <button
                    onClick={() => handleAddLecturer(currentUser.id)}
                    className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 font-bold hover:bg-purple-50 flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus size={20} /> เพิ่มตนเองเป็นผู้สอน
                  </button>
                )}

                {!isAddingLecturer ? (
                  <button
                    onClick={() => setIsAddingLecturer(true)}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={20} /> เพิ่มผู้สอนท่านอื่น
                  </button>
                ) : (
                  <div className="p-4 border border-green-200 rounded-xl bg-green-50/50 animate-in fade-in">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 relative">
                        <input
                          autoFocus
                          placeholder="พิมพ์ชื่ออาจารย์เพื่อค้นหา..."
                          className="w-full p-2 pl-10 border rounded-md focus:ring-2 focus:ring-green-500 outline-none text-sm"
                          value={searchStaff}
                          onChange={(e) => setSearchStaff(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        {searchStaff && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                            {filteredStaffs.length > 0 ? (
                              filteredStaffs.map((s: UserData) => (
                                <div
                                  key={s.id}
                                  className="p-2 hover:bg-green-50 cursor-pointer text-sm text-slate-700 border-b last:border-none"
                                  onClick={() => handleAddLecturer(s.id)}
                                >
                                  {s.name}
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-sm text-gray-400">ไม่พบรายชื่อ</div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setIsAddingLecturer(false)}
                        className="px-4 py-2 text-sm text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium shadow-sm transition"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 font-medium transition-all"
          >
            ปิดหน้าต่าง
          </button>
          <button
            onClick={handleSubmit}
            disabled={(!isReadyToSubmit && !isLocked) || submitStatus === 'submitting' || isLocked}
            className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 ${
              isAcademicApproved ? "bg-emerald-500 cursor-default shadow-none" :
              (isLocked || submitStatus === 'success') ? "bg-cyan-600 cursor-default shadow-none" :
              !isReadyToSubmit ? "bg-slate-300 cursor-not-allowed shadow-none" :
              "bg-purple-600 hover:bg-purple-700 shadow-purple-200 hover:shadow-lg"
            }`}
          >
            {submitStatus === 'submitting' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isAcademicApproved ? (
              <><ShieldCheck size={18} /> อนุมัติสมบูรณ์</>
            ) : isHeadApproved ? (
              <><GraduationCap size={18} /> ประธานอนุมัติแล้ว (รอรองวิชาการ)</>
            ) : isLocked ? (
              <><Clock size={18} /> ส่งแล้ว (รอประธานพิจารณา)</>
            ) : (
              <><Send size={18} /> ส่งข้อมูลให้ประธานหลักสูตรพิจารณา</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignmentRow({ assignment: a, actions, isLocked, currentUser }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveReason, setResolveReason] = useState("");

  const [hours, setHours] = useState({
    lecture: a.lectureHours,
    lab: a.labHours,
    exam: a.examHours,
    critique: a.examCritiqueHours || 0
  });

  const isRejected = a.lecturerStatus === 'REJECTED';
  const isSelf = String(currentUser?.id) === String(a.lecturerId);
  const isSent = a.lecturerStatus === 'PENDING' || a.lecturerStatus === 'APPROVED';
  const totalHours = calculateTotalHours(a);

  const handleInputChange = (field: keyof typeof hours, value: string) => {
    if (value === "") {
      setHours(prev => ({ ...prev, [field]: "" as any }));
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setHours(prev => ({ ...prev, [field]: numValue }));
      }
    }
  };

  const getPayload = () => ({
    lecture: Number(hours.lecture) || 0,
    lab: Number(hours.lab) || 0,
    exam: Number(hours.exam) || 0,
    critique: Number(hours.critique) || 0,
  });

  const handleSaveDraft = async () => {
    const success = await actions.saveHoursDraft(a.id, getPayload());
    if (success) setIsEditing(false);
  };

  const handleConfirmSend = async () => {
    await actions.confirmAssignment(a.id, isSelf);
  };

  const handleResolveDispute = async () => {
    const success = await actions.resolveDispute(a.id, getPayload());
    if (success) setIsEditing(false);
  };

  const handleInsist = async () => {
    if (!resolveReason.trim()) {
      toast.error("ระบุเหตุผล");
      return;
    }
    const success = await actions.insistOriginal(a.id, resolveReason);
    if (success) setIsResolving(false);
  };

  const getStatusInfo = () => {
    if (a.academicApprovalStatus === 'APPROVED') return { text: '• อนุมัติสมบูรณ์', color: 'text-emerald-600 font-bold' };
    if (a.headApprovalStatus === 'APPROVED') return { text: '• ประธานอนุมัติแล้ว', color: 'text-cyan-600' };
    if (a.lecturerStatus === 'APPROVED') return { text: '• ผู้สอนยืนยันแล้ว', color: 'text-green-600' };
    if (a.lecturerStatus === 'PENDING') return { text: '• รอผู้สอนตรวจสอบ', color: 'text-blue-600' };
    if (a.lecturerStatus === 'REJECTED') return { text: '• ต้องแก้ไขข้อมูล', color: 'text-red-500' };
    return { text: '• แบบร่าง', color: 'text-slate-400' };
  };

  const statusInfo = getStatusInfo();

  if (isRejected && !isEditing && !isResolving) {
    return (
      <div className="bg-red-50/60 p-3 grid grid-cols-12 gap-2 items-center text-sm border-b">
        <div className="col-span-12 flex flex-col gap-3 py-2 pl-2">
          <div className="flex items-center gap-2 text-red-600 font-bold">
            <AlertCircle size={18} /> แจ้งขอแก้ไขข้อมูล
            <span className="text-slate-700 font-semibold ml-auto">
              โดย: {getLecturerName(a.lecturer)}
            </span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 text-red-800 text-sm flex gap-3 shadow-sm">
            <MessageSquare size={18} className="mt-0.5 shrink-0 opacity-60" />
            <div>
              <span className="font-bold text-xs uppercase text-red-400 block mb-1">เหตุผล:</span>
              "{a.lecturerFeedback || "ไม่ระบุ"}"
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Edit2 size={14} /> แก้ไขข้อมูลให้
            </button>
            <button
              onClick={() => setIsResolving(true)}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <ShieldCheck size={14} /> ยืนยันข้อมูลเดิม
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isResolving) {
    return (
      <div className="bg-red-50/60 p-3 grid grid-cols-12 gap-2 items-center text-sm border-b">
        <div className="col-span-12 flex flex-col gap-2 bg-white p-3 rounded-lg border border-orange-200 shadow-sm ml-2">
          <p className="text-xs font-bold text-orange-600 uppercase">ระบุเหตุผลที่ยืนยันข้อมูลเดิม:</p>
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-orange-400"
              placeholder="เช่น ตรวจสอบตามตารางสอนแล้วถูกต้อง..."
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
            />
            <button
              onClick={handleInsist}
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap shadow-sm"
            >
              ยืนยัน
            </button>
            <button
              onClick={() => setIsResolving(false)}
              className="text-slate-400 hover:text-slate-600 px-2 text-xs font-medium"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-12 gap-2 items-center text-sm p-3 transition-colors ${isEditing ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
      <div className="col-span-3 pl-2">
        <div className="font-medium text-slate-700">{getLecturerName(a.lecturer)}</div>
        <div className={`text-xs mt-0.5 ${statusInfo.color}`}>
          {statusInfo.text}
        </div>
      </div>

      {isEditing ? (
        <>
          <div className="col-span-1 px-1">
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1"
              value={hours.lecture}
              onChange={(e) => handleInputChange('lecture', e.target.value)}
            />
          </div>
          <div className="col-span-1 px-1">
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1"
              value={hours.lab}
              onChange={(e) => handleInputChange('lab', e.target.value)}
            />
          </div>
          <div className="col-span-2 px-1">
            <input
              type="number"
              min="0"
              step="0.5"
              className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1"
              value={hours.exam}
              onChange={(e) => handleInputChange('exam', e.target.value)}
            />
          </div>
          <div className="col-span-2 px-1">
            <input
              type="number"
              min="0"
              step="1"
              className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1"
              value={hours.critique}
              onChange={(e) => handleInputChange('critique', e.target.value)}
            />
          </div>

          <div className="col-span-3 flex justify-center gap-2">
            <button
              onClick={isRejected ? handleResolveDispute : handleSaveDraft}
              className="text-white bg-green-500 p-1.5 rounded hover:bg-green-600 transition shadow-sm"
              title="บันทึกข้อมูล"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-slate-500 bg-white border border-slate-200 p-1.5 rounded hover:bg-slate-50 transition shadow-sm"
              title="ยกเลิก"
            >
              <X size={16} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="col-span-1 text-center text-slate-600 font-medium">{a.lectureHours}</div>
          <div className="col-span-1 text-center text-slate-600 font-medium">{a.labHours}</div>
          <div className="col-span-2 text-center text-slate-600 font-medium">{a.examHours}</div>
          <div className="col-span-2 text-center text-slate-600 font-medium">{a.examCritiqueHours || 0}</div>
          <div className="col-span-3 flex justify-center gap-1.5">
            {!isLocked && (
              <>
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setHours({
                      lecture: a.lectureHours,
                      lab: a.labHours,
                      exam: a.examHours,
                      critique: a.examCritiqueHours || 0
                    });
                  }}
                  className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition border border-transparent hover:border-purple-100"
                  title="แก้ไขจำนวนชั่วโมง"
                >
                  <Edit2 size={16} />
                </button>

                {!isSent && (
                  isSelf ? (
                    <button
                      onClick={handleConfirmSend}
                      disabled={totalHours === 0}
                      className={`p-1.5 rounded transition border flex items-center gap-1 ${
                        totalHours === 0
                          ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'
                      }`}
                      title={totalHours === 0 ? "กรุณาระบุชั่วโมงสอนก่อนยืนยัน" : "ยืนยันชั่วโมงตนเอง"}
                    >
                      <CheckCircle size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmSend}
                      disabled={totalHours === 0}
                      className={`p-1.5 rounded transition border flex items-center gap-1 ${
                        totalHours === 0
                          ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
                      }`}
                      title={totalHours === 0 ? "กรุณาระบุชั่วโมงสอนก่อนส่ง" : "ส่งข้อมูลให้ผู้สอนตรวจสอบ"}
                    >
                      <Send size={16} />
                    </button>
                  )
                )}

                <button
                  onClick={() => actions.deleteAssignment(a.id)}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"
                  title="ลบ"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const SuccessOverlay = () => (
  <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300">
    <div className="flex flex-col items-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
      <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100 border-4 border-white ring-4 ring-green-50">
        <CheckCircle className="w-14 h-14 text-green-600 animate-bounce" />
      </div>

      <h3 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">ส่งข้อมูลเรียบร้อย!</h3>

      <p className="text-slate-500 text-lg font-light text-center max-w-sm leading-relaxed">
        ระบบได้ส่งข้อมูลภาระงานสอนให้ <br />
        <span className="font-semibold text-purple-600">ประธานหลักสูตร</span> พิจารณาแล้ว
      </p>

      <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
        กำลังปิดหน้าต่างอัตโนมัติ...
      </div>
    </div>
  </div>
);