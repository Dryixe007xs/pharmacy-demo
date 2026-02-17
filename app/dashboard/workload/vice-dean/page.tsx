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
  Search,
  CheckCircle,
  Clock,
  AlertOctagon,
  Loader2,
  FileText,
  FileCheck,
  ChevronRight,
  BookOpen,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

// ===== CONSTANTS =====
const STATUS_PRIORITY = {
  pending_approval: 1,
  waiting_chair: 2,
  approved: 3,
  rejected: 4,
} as const;

const SEMESTER_CONFIG = {
  1: { label: "ภาคการศึกษาต้น", color: "amber" },
  2: { label: "ภาคการศึกษาปลาย", color: "blue" },
  3: { label: "ภาคฤดูร้อน", color: "emerald" },
} as const;

// ===== TYPES =====
type WorkloadStatus =
  | "waiting_chair"
  | "pending_approval"
  | "approved"
  | "rejected";

interface InstructorLoad {
  id: number;
  name: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  headStatus: string;
  academicStatus: string;
  lecturerFeedback?: string | null;
  isExternal: boolean;
  externalFaculty?: string | null;
  externalCourseCode?: string | null;
  externalCourseName?: string | null;
  externalCredit?: string | null;
  evidenceLink?: string | null;
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
  status: WorkloadStatus;
}

// ===== UTILITY FUNCTIONS =====
function determineWorkloadStatus(
  instructors: InstructorLoad[]
): WorkloadStatus {
  if (instructors.length === 0) return "waiting_chair";

  const isAllAcademicApproved = instructors.every(
    (i) => i.academicStatus === "APPROVED"
  );
  const isAllHeadApproved = instructors.every(
    (i) => i.headStatus === "APPROVED"
  );

  if (isAllAcademicApproved) return "approved";
  if (isAllHeadApproved) return "pending_approval";
  return "waiting_chair";
}

function getStatusWeight(status: WorkloadStatus): number {
  return STATUS_PRIORITY[status] ?? 999;
}

function transformCourseData(allCourses: any[]): CourseWorkload[] {
  const workloadData: CourseWorkload[] = [];

  allCourses.forEach((course: any) => {
    const assignments = course.teachingAssignments || [];
    if (assignments.length === 0) return;

    const assignmentsBySemester: Record<number, any[]> = {};
    assignments.forEach((a: any) => {
      const sem = a.semester || 1;
      if (!assignmentsBySemester[sem]) assignmentsBySemester[sem] = [];
      assignmentsBySemester[sem].push(a);
    });

    Object.entries(assignmentsBySemester).forEach(([semKey, semAssignments]) => {
      const sem = Number(semKey);

      // แยก external/internal
      const internalAssignments = semAssignments.filter(
        (a: any) => a.courseType !== "EXTERNAL" && !a.externalCourseCode
      );
      const externalAssignments = semAssignments.filter(
        (a: any) => a.courseType === "EXTERNAL" || !!a.externalCourseCode
      );

      // ── วิชาในคณะ ──
      if (internalAssignments.length > 0) {
        const instructors: InstructorLoad[] = internalAssignments.map((a: any) => ({
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
          headStatus: a.headApprovalStatus || "PENDING",
          academicStatus: a.academicApprovalStatus || "PENDING",
          lecturerFeedback: a.lecturerFeedback ?? null,
          isExternal: false,
          externalFaculty: null,
          externalCourseCode: null,
          externalCourseName: null,
          externalCredit: null,
          evidenceLink: null,
        }));

        instructors.sort((a, b) =>
          a.role === "ผู้รับผิดชอบรายวิชา" ? -1 : 1
        );

        workloadData.push({
          id: `${course.id}-${sem}`,
          originalCourseId: course.id,
          code: course.code || "ไม่ระบุรหัส",
          name: course.name_th || course.name || "ไม่ระบุชื่อวิชา",
          nameEn: course.name_en || "",
          credit: course.credit || course.credits || "-",
          programName: course.program?.name_th || "ไม่ระบุหลักสูตร",
          semester: sem,
          instructors,
          status: determineWorkloadStatus(instructors),
        });
      }

      // ── วิชานอกคณะ: แต่ละ assignment = 1 card ──
      externalAssignments.forEach((a: any) => {
        const instructor: InstructorLoad = {
          id: a.id,
          name: a.lecturer
            ? `${a.lecturer.title || ""}${a.lecturer.firstName} ${a.lecturer.lastName}`.trim()
            : "ไม่ระบุชื่อ",
          role: "ผู้สอน",
          lecture: Number(a.lectureHours) || 0,
          lab: Number(a.labHours) || 0,
          exam: Number(a.examHours) || 0,
          critique: Number(a.examCritiqueHours) || 0,
          headStatus: a.headApprovalStatus || "PENDING",
          academicStatus: a.academicApprovalStatus || "PENDING",
          lecturerFeedback: a.lecturerFeedback ?? null,
          isExternal: true,
          externalFaculty: a.externalFaculty ?? null,
          externalCourseCode: a.externalCourseCode ?? null,
          externalCourseName: a.externalCourseName ?? null,
          externalCredit: a.externalCredit ?? null,
          evidenceLink: a.evidenceLink ?? null,
        };

        workloadData.push({
          id: `ext-${a.id}`,
          originalCourseId: course.id,
          code: a.externalCourseCode || "ไม่ระบุรหัส",
          name: a.externalCourseName || "ไม่ระบุชื่อวิชา",
          nameEn: a.externalCourseNameEn || "",
          credit: a.externalCredit || "-",
          programName: a.externalFaculty || "ไม่ระบุคณะ",
          semester: sem,
          instructors: [instructor],
          status: determineWorkloadStatus([instructor]),
        });
      });
    });
  });

  workloadData.sort((a, b) => {
    const weightA = getStatusWeight(a.status);
    const weightB = getStatusWeight(b.status);
    if (weightA !== weightB) return weightA - weightB;
    if (a.code === b.code) return a.semester - b.semester;
    return a.code.localeCompare(b.code);
  });

  return workloadData;
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
      const resCourses = await fetch("/api/courses");

      if (!resCourses.ok) {
        throw new Error(`API Error: ${resCourses.status}`);
      }

      const allCourses = await resCourses.json();

      if (!Array.isArray(allCourses)) {
        throw new Error("Invalid API response format");
      }

      const workloadData = transformCourseData(allCourses);
      setCourses(workloadData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { courses, loading, error, refetch: fetchData };
}

function useWorkloadApproval(onSuccess: () => void, viceDeanId?: string) {
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const approve = useCallback(
    async (course: CourseWorkload) => {
      if (!course.instructors || course.instructors.length === 0) {
        await Swal.fire({
          title: "ไม่สามารถอนุมัติได้",
          text: "ไม่พบรายชื่อผู้สอนในรายวิชานี้",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
        return;
      }

      const totalHours = course.instructors.reduce(
        (sum, inst) => sum + inst.lecture + inst.lab + inst.exam + inst.critique,
        0
      );

      const result = await Swal.fire({
        title: "ยืนยันการอนุมัติภาระงาน?",
        html: `
          <div style="text-align: left; padding: 1rem;">
            <p><strong>รายวิชา:</strong> ${course.code} ${course.name}</p>
            <p><strong>จำนวนผู้สอน:</strong> ${course.instructors.length} ท่าน</p>
            <p><strong>ชั่วโมงรวม:</strong> ${totalHours} ชั่วโมง</p>
            <hr style="margin: 1rem 0;">
            <p style="color: #666; font-size: 0.9rem;">
              การอนุมัติจะมีผลทันที และไม่สามารถยกเลิกได้
            </p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#16a34a",
        cancelButtonColor: "#dc2626",
        confirmButtonText: "ใช่, อนุมัติเลย!",
        cancelButtonText: "ยกเลิก",
        focusCancel: true,
      });

      if (!result.isConfirmed) return;

      setApprovingId(course.id);

      try {
        const results = await Promise.allSettled(
          course.instructors.map((inst) =>
            fetch("/api/assignments", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: inst.id,
                academicApprovalStatus: "APPROVED",
                approverId: viceDeanId, // 👈 ส่ง approverId
              }),
            }).then((res) => {
              if (!res.ok)
                throw new Error(`ไม่สามารถอัปเดตข้อมูลของ ${inst.name}`);
              return res.json();
            })
          )
        );

        const failures = results.filter((r) => r.status === "rejected");

        if (failures.length > 0) {
          const failedReasons = failures
            .map((f) => (f as PromiseRejectedResult).reason.message)
            .join("\n");
          throw new Error(
            `อัปเดตล้มเหลว ${failures.length} จาก ${course.instructors.length} คน:\n${failedReasons}`
          );
        }

        onSuccess();

        await Swal.fire({
          title: "อนุมัติสำเร็จ!",
          html: `
            <p>รายวิชา <strong>${course.code}</strong> ได้รับการอนุมัติแล้ว</p>
            <p style="color: #16a34a; margin-top: 0.5rem;">✓ อัปเดต ${course.instructors.length} รายการ</p>
          `,
          icon: "success",
          timer: 3000,
          showConfirmButton: false,
        });
      } catch (error) {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text:
            error instanceof Error
              ? error.message
              : "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
        onSuccess();
      } finally {
        setApprovingId(null);
      }
    },
    [onSuccess, viceDeanId]
  );

  return { approve, approvingId };
}

// ===== MAIN COMPONENT =====
export default function ViceDeanPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");

  const { courses, loading, error, refetch } = useWorkloadData();
  const { approve, approvingId } = useWorkloadApproval(refetch, currentUser?.id);

  useEffect(() => {
    if (status === "authenticated") {
      refetch();
    }
  }, [status, refetch]);

  const uniquePrograms = useMemo(
    () =>
      Array.from(new Set(courses.map((c) => c.programName).filter(Boolean))),
    [courses]
  );

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProgram =
        selectedProgram === "all" || c.programName === selectedProgram;
      return matchSearch && matchProgram;
    });
  }, [courses, searchTerm, selectedProgram]);

  const statusCounts = useMemo(
    () => ({
      pending: filteredCourses.filter((c) => c.status === "pending_approval").length,
      waiting: filteredCourses.filter((c) => c.status === "waiting_chair").length,
      approved: filteredCourses.filter((c) => c.status === "approved").length,
    }),
    [filteredCourses]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 mb-2 text-sm font-medium">
          <span>จัดการชั่วโมงการสอน</span>
          <ChevronRight size={14} />
          <span className="text-indigo-600 font-semibold">รองคณบดีฝ่ายวิชาการ</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-2">
          พิจารณาอนุมัติภาระงาน
        </h1>
        {currentUser && !loading && (
          <p className="text-slate-600 mt-2 font-light">
            ยินดีต้อนรับ,{" "}
            <span className="font-semibold text-indigo-600">{currentUser.name}</span>
          </p>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { label: "รอการอนุมัติ", value: statusCounts.pending, color: "orange", Icon: AlertOctagon },
            { label: "กำลังตรวจสอบ", value: statusCounts.waiting, color: "slate", Icon: Clock },
            { label: "อนุมัติแล้ว", value: statusCounts.approved, color: "green", Icon: CheckCircle },
          ].map(({ label, value, color, Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-${color}-100 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{label}</p>
                  <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
                </div>
                <Icon className={`text-${color}-400`} size={32} />
              </div>
            </motion.div>
          ))}
        </div>
      </header>

      {/* Filter */}
      <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-lg mb-6 sticky top-4 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-center w-full">
          <div className="w-full md:w-[320px] shrink-0">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              กรองตามหลักสูตร
            </label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-indigo-100 h-11 w-full">
                <SelectValue placeholder="เลือกหลักสูตร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-medium">ทุกหลักสูตร</span>
                </SelectItem>
                {uniquePrograms.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              ค้นหารายวิชา
            </label>
            <Input
              className="rounded-xl border-slate-200 bg-slate-50/50 pl-11 focus:ring-indigo-100 transition-all h-11 w-full"
              placeholder="ค้นหาด้วยรหัสวิชา หรือชื่อวิชา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3.5 bottom-3 text-slate-400" size={18} />
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="md:mt-7 flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
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
            <button
              onClick={refetch}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
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
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-600 font-semibold">
                        <tr>
                          <th className="py-4 px-6 text-left w-[20%]">รายวิชา</th>
                          <th className="py-4 px-4 text-center w-[10%]">ภาคการศึกษา</th>
                          <th className="py-4 px-6 text-left w-[18%]">อาจารย์ผู้สอน</th>
                          <th className="py-4 px-4 text-center w-[8%]">สถานะ</th>
                          <th className="py-4 px-3 text-center w-[9%]">บรรยาย<br />(ชม.)</th>
                          <th className="py-4 px-3 text-center w-[9%]">ปฏิบัติการ<br />(ชม.)</th>
                          <th className="py-4 px-3 text-center w-[9%]">คุมสอบนอกตาราง<br />(ชม.)</th>
                          <th className="py-4 px-3 text-center w-[9%]">วิพากษ์ข้อสอบ<br />(หัวข้อ)</th>
                          <th className="py-4 px-3 text-center w-[10%]">เอกสาร / หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {course.instructors.map((instructor, idx) => (
                          <tr
                            key={instructor.id}
                            className={`group transition-colors ${
                              instructor.isExternal
                                ? "bg-orange-50/30 hover:bg-orange-50/60"
                                : "hover:bg-indigo-50/30"
                            }`}
                          >
                            {idx === 0 ? (
                              <>
                                {/* คอลัมน์รายวิชา */}
                                <td
                                  rowSpan={course.instructors.length + 1}
                                  className="py-6 px-6 align-top border-r border-slate-100 bg-white"
                                >
                                  <div className="flex flex-col gap-2.5">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                      <span className="font-bold text-xl text-slate-800 tracking-tight">
                                        {course.code}
                                      </span>
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 whitespace-nowrap">
                                        <BookOpen size={13} />
                                        {course.credit} หน่วยกิต
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-slate-700 font-medium leading-snug">
                                        {course.name}
                                      </span>
                                      <span className="text-slate-400 text-xs mt-1">
                                        {course.nameEn}
                                      </span>
                                    </div>
                                    <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 mt-1">
                                      {course.programName}
                                    </span>
                                    {/* badge นอกคณะ */}
                                    {course.instructors.some((i) => i.isExternal) && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200 w-fit mt-1">
                                        🏛️ รายวิชานอกคณะ
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* คอลัมน์ภาคการศึกษา */}
                                <td
                                  rowSpan={course.instructors.length + 1}
                                  className="py-6 px-4 align-top border-r border-slate-100 bg-white text-center"
                                >
                                  {(() => {
                                    const config =
                                      SEMESTER_CONFIG[
                                        course.semester as keyof typeof SEMESTER_CONFIG
                                      ];
                                    return (
                                      <div
                                        className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-xs border whitespace-nowrap ${
                                          course.semester === 1
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : course.semester === 2
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : course.semester === 3
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-gray-50 text-gray-700 border-gray-200"
                                        }`}
                                      >
                                        {config?.label || `เทอม ${course.semester}`}
                                      </div>
                                    );
                                  })()}
                                </td>
                              </>
                            ) : null}

                            {/* ชื่ออาจารย์ */}
                            <td className="py-4 px-6 align-middle">
                              <span className="text-slate-700 font-medium">
                                {instructor.name}
                              </span>
                            </td>

                            {/* สถานะ */}
                            <td className="py-4 px-4 text-center">
                              {instructor.role === "ผู้รับผิดชอบรายวิชา" ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
                                  ผู้รับผิดชอบ
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">
                                  ผู้สอน
                                </span>
                              )}
                            </td>

                            {/* ชั่วโมง */}
                            <td className="py-4 px-3 text-center text-slate-700 font-semibold">
                              {instructor.lecture}
                            </td>
                            <td className="py-4 px-3 text-center text-slate-700 font-semibold">
                              {instructor.lab}
                            </td>
                            <td className="py-4 px-3 text-center text-slate-700 font-semibold">
                              {instructor.exam}
                            </td>
                            <td className="py-4 px-3 text-center text-slate-700 font-semibold">
                              {instructor.critique}
                            </td>

                            {/* เอกสาร / หมายเหตุ */}
                            <td className="py-4 px-3 text-center">
                              {instructor.isExternal ? (
                                instructor.evidenceLink ? (
                                  <a
                                    href={instructor.evidenceLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:text-blue-700 transition-colors whitespace-nowrap"
                                    title={instructor.evidenceLink}
                                  >
                                    <ExternalLink size={12} />
                                    ดูเอกสาร
                                  </a>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )
                              ) : instructor.lecturerFeedback ? (
                                <div
                                  className="inline-flex items-start gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 text-left max-w-[180px]"
                                  title={instructor.lecturerFeedback}
                                >
                                  <FileText size={11} className="mt-0.5 shrink-0 text-yellow-500" />
                                  <span className="line-clamp-2">
                                    {instructor.lecturerFeedback}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* Summary Row */}
                        <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-t-2 border-indigo-200">
                          <td
                            colSpan={2}
                            className="py-3.5 px-6 text-right text-xs font-bold text-slate-500 uppercase tracking-wide"
                          >
                            รวมทั้งหมด
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 text-lg">
                            {course.instructors.reduce((s, i) => s + i.lecture, 0)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 text-lg">
                            {course.instructors.reduce((s, i) => s + i.lab, 0)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 text-lg">
                            {course.instructors.reduce((s, i) => s + i.exam, 0)}
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-indigo-600 text-lg">
                            {course.instructors.reduce((s, i) => s + i.critique, 0)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Action Footer */}
                  <div className="p-5 border-t border-slate-100 bg-gradient-to-r from-slate-50/50 to-white min-h-[90px] flex justify-center items-center">
                    <AnimatePresence mode="wait">
                      {course.status === "pending_approval" && (
                        <motion.div
                          key="pending"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex flex-col sm:flex-row gap-4 items-center w-full justify-center"
                        >
                          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50 text-orange-700 rounded-xl border border-orange-200">
                            <AlertOctagon size={18} className="text-orange-500" />
                            <span className="text-sm font-semibold">
                              รอการอนุมัติจากท่าน
                            </span>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={approvingId === course.id}
                            onClick={() => approve(course)}
                            className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 rounded-xl shadow-md hover:shadow-green-200/50 hover:shadow-xl transition-all flex items-center gap-2.5 font-semibold ${
                              approvingId === course.id ? "opacity-80 cursor-wait" : ""
                            }`}
                          >
                            {approvingId === course.id ? (
                              <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                              <FileCheck className="h-5 w-5" />
                            )}
                            {approvingId === course.id ? "กำลังบันทึก..." : "อนุมัติข้อมูล"}
                          </motion.button>
                        </motion.div>
                      )}

                      {course.status === "approved" && (
                        <motion.div
                          key="approved"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full border border-green-200 shadow-sm"
                        >
                          <CheckCircle size={22} className="text-green-600" />
                          <span className="font-bold text-sm">อนุมัติเรียบร้อยแล้ว</span>
                        </motion.div>
                      )}

                      {course.status === "waiting_chair" && (
                        <motion.div
                          key="waiting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2.5 text-slate-500 px-5 py-2.5 bg-slate-100 rounded-full border border-slate-200"
                        >
                          <Clock size={19} />
                          <span className="text-sm font-semibold">
                            รอการตรวจสอบจากประธานหลักสูตร
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
            <p className="text-slate-400 mb-4">
              {searchTerm || selectedProgram !== "all"
                ? "ไม่พบรายวิชาที่ตรงกับเงื่อนไขการค้นหา"
                : "ไม่พบข้อมูลรายวิชาที่ต้องพิจารณา"}
            </p>
            {(searchTerm || selectedProgram !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedProgram("all");
                }}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                ล้างตัวกรอง
              </button>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}