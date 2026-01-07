"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle,
  Clock,
  AlertOctagon,
  Loader2,
  X,
  FileText,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
type WorkloadStatus =
  | "waiting_owner"
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
  responsibleStatus: string;
  headApprovalStatus: string;
}

interface CourseWorkload {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  credit: string | number; // ✅ เพิ่ม field หน่วยกิต
  programName: string;
  responsibleUser: string;
  instructors: InstructorLoad[];
  status: WorkloadStatus;
}

export default function ProgramChairPage() {
  const { data: session, status } = useSession();
  const currentChair = session?.user;

  const [coursesWorkload, setCoursesWorkload] = useState<CourseWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === "authenticated" && currentChair?.id) {
      fetchData(currentChair.id);
    } else if (status === "unauthenticated") {
      setCoursesWorkload([]);
      setLoading(false);
    }
  }, [status, currentChair?.id]);

  const fetchData = async (chairId: string) => {
    setLoading(true);
    try {
      const resCourses = await fetch("/api/courses");
      const allCourses = await resCourses.json();

      if (!Array.isArray(allCourses)) {
        setCoursesWorkload([]);
        return;
      }

      // ✅ กรองเฉพาะหลักสูตรที่ตนเองเป็นประธาน
      const myCourses = allCourses.filter(
        (c: any) =>
          String(c.program?.programChairId) === String(chairId) ||
          (c.program?.programChairId === null && currentChair?.role === "ADMIN")
      );

      const workloadData = myCourses
        .map((course: any) => {
          const assignments = course.teachingAssignments || [];
          if (assignments.length === 0) return null;

          const instructors: InstructorLoad[] = assignments.map((a: any) => ({
            id: a.id,
            name: a.lecturer
              ? `${a.lecturer.title || ""}${a.lecturer.firstName} ${
                  a.lecturer.lastName
                }`
              : "Unknown",
            role:
              String(a.lecturerId) === String(course.responsibleUserId)
                ? "ผู้รับผิดชอบรายวิชา"
                : "ผู้สอน",
            lecture: a.lectureHours || 0,
            lab: a.labHours || 0,
            exam: a.examHours || 0,
            responsibleStatus: a.responsibleStatus,
            headApprovalStatus: a.headApprovalStatus,
          }));

          let status: WorkloadStatus = "waiting_owner";
          const allResponsibleApproved = instructors.every(
            (i) => i.responsibleStatus === "APPROVED"
          );
          const anyRejectedByHead = instructors.some(
            (i) => i.headApprovalStatus === "REJECTED"
          );
          const allHeadApproved = instructors.every(
            (i) => i.headApprovalStatus === "APPROVED"
          );

          if (allHeadApproved) status = "approved";
          else if (anyRejectedByHead) status = "rejected";
          else if (allResponsibleApproved) status = "pending_approval";
          else status = "waiting_owner";

          return {
            id: course.id,
            code: course.code,
            name: course.name_th,
            nameEn: course.name_en || "",
            // ✅ ดึงค่าหน่วยกิต (สมมติว่า API ส่งมาในชื่อ credit หรือ credits)
            credit: course.credit || course.credits || "-",
            programName: course.program?.name_th || "-",
            responsibleUser: "",
            instructors: instructors.sort((a, b) =>
              a.role === "ผู้รับผิดชอบรายวิชา" ? -1 : 1
            ),
            status,
          };
        })
        .filter((item): item is CourseWorkload => item !== null);

      setCoursesWorkload(workloadData);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLERS =====
  const handleApprove = async (course: CourseWorkload) => {
    if (!confirm("ยืนยันการรับรองข้อมูลภาระงานสอนรายวิชานี้?")) return;
    try {
      const updatePromises = course.instructors.map((inst) =>
        fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: inst.id, headApprovalStatus: "APPROVED" }),
        })
      );
      await Promise.all(updatePromises);
      toast.success("รับรองข้อมูลเรียบร้อยแล้ว");
      if (currentChair?.id) fetchData(currentChair.id);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleReject = async (course: CourseWorkload) => {
    if (!confirm("ต้องการส่งกลับให้ผู้รับผิดชอบรายวิชาแก้ไขใหม่?")) return;
    try {
      const updatePromises = course.instructors.map((inst) =>
        fetch("/api/assignments", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: inst.id,
            headApprovalStatus: "REJECTED",
            responsibleStatus: "REJECTED",
          }),
        })
      );
      await Promise.all(updatePromises);
      toast.success("ส่งกลับแก้ไขเรียบร้อยแล้ว");
      if (currentChair?.id) fetchData(currentChair.id);
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  // Filter Logic
  const displayedCourses = coursesWorkload.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
          <span>จัดการชั่วโมงสอน</span>
          <ChevronRight size={14} />
          <span className="text-purple-600">ประธานหลักสูตร</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          พิจารณาภาระงานสอน
        </h1>
        {currentChair && !loading && (
          <p className="text-slate-500 mt-2 font-light">
            ยินดีต้อนรับ,{" "}
            <span className="font-medium text-purple-600">
              {currentChair.name}
            </span>
          </p>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm mb-6 sticky top-4 z-10">
        <div className="w-full max-w-md relative">
          <Input
            className="rounded-xl border-slate-200 bg-slate-50/50 pl-10 focus:ring-purple-100 transition-all h-11"
            placeholder="ค้นหารหัสวิชา หรือ ชื่อวิชา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
        </div>
      </div>

      {/* Main Content: Course List */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 mb-4 text-purple-500 animate-spin" />
            <p className="animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : displayedCourses.length > 0 ? (
          <div className="space-y-6">
            {displayedCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
              >
                {/* Modern Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium">
                      <tr>
                        {/* ย้าย comment หรือลบออกเพื่อให้ไม่มี node แฝงใน tr */}
                        <th className="py-4 px-6 text-left w-[35%]">รายวิชา</th>
                        <th className="py-4 px-6 text-left w-[25%]">
                          อาจารย์ผู้สอน
                        </th>
                        <th className="py-4 px-6 text-center">สถานะ</th>
                        <th className="py-4 px-6 text-center whitespace-nowrap">
                          บรรยาย (ชม.)
                        </th>
                        <th className="py-4 px-6 text-center whitespace-nowrap">
                          ปฏิบัติ (ชม.)
                        </th>
                        <th className="py-4 px-6 text-center whitespace-nowrap">
                          คุมสอบ (ชม.)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {course.instructors.map((instructor, index) => (
                        <tr
                          key={instructor.id}
                          className="group hover:bg-slate-50/50 transition-colors"
                        >
                          {index === 0 ? (
                            <td
                              rowSpan={course.instructors.length + 1}
                              className="py-5 px-6 align-top border-r border-slate-100 bg-white group-hover:bg-white"
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-bold text-lg text-slate-800 tracking-tight">
                                    {course.code}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                                    <BookOpen size={12} />
                                    {course.credit} หน่วยกิต
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-700 font-medium">
                                    {course.name}
                                  </span>
                                  <span className="text-slate-400 text-xs mt-0.5">
                                    {course.nameEn}
                                  </span>
                                </div>
                                <span className="inline-flex w-fit items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 mt-1">
                                  {course.programName}
                                </span>
                              </div>
                            </td>
                          ) : null}
                          <td className="py-4 px-6 text-slate-700 font-medium">
                            {instructor.name}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {instructor.role === "ผู้รับผิดชอบรายวิชา" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
                                ผู้รับผิดชอบ
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                ผู้สอน
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600">
                            {instructor.lecture}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600">
                            {instructor.lab}
                          </td>
                          <td className="py-4 px-6 text-center text-slate-600">
                            {instructor.exam}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 border-t border-slate-200">
                        <td
                          colSpan={2}
                          className="py-3 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider"
                        >
                          รวมชั่วโมงสุทธิ
                        </td>
                        <td className="py-3 px-6 text-center font-bold text-blue-600 text-base">
                          {course.instructors.reduce(
                            (s, i) => s + i.lecture,
                            0
                          )}
                        </td>
                        <td className="py-3 px-6 text-center font-bold text-blue-600 text-base">
                          {course.instructors.reduce((s, i) => s + i.lab, 0)}
                        </td>
                        <td className="py-3 px-6 text-center font-bold text-blue-600 text-base">
                          {course.instructors.reduce((s, i) => s + i.exam, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Animated Action Footer */}
                <div className="p-4 border-t border-slate-100 bg-white min-h-[85px] flex justify-center items-center">
                  <AnimatePresence mode="wait">
                    {course.status === "pending_approval" && (
                      <motion.div
                        key="pending"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex gap-4 items-center flex-wrap justify-center"
                      >
                        <span className="text-sm text-slate-500 font-medium flex items-center gap-2 mr-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                          <AlertOctagon size={16} className="text-orange-500" />{" "}
                          รอการพิจารณา
                        </span>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(course)}
                          className="bg-lime-600 hover:bg-lime-700 text-white px-6 py-2.5 rounded-xl shadow-sm hover:shadow-lime-200/50 hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                        >
                          <CheckCircle size={18} /> รับรองข้อมูล
                        </motion.button>

                        <motion.button
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: "#FEF2F2",
                          }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReject(course)}
                          className="border border-red-200 text-red-600 bg-white hover:bg-red-50 px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-medium"
                        >
                          <X size={18} /> ส่งกลับแก้ไข
                        </motion.button>
                      </motion.div>
                    )}

                    {course.status === "approved" && (
                      <motion.div
                        key="approved"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-6 py-2 bg-lime-50 text-lime-700 rounded-full border border-lime-100"
                      >
                        <CheckCircle size={20} className="text-lime-600" />
                        <span className="font-bold">
                          รับรองข้อมูลเรียบร้อยแล้ว
                        </span>
                      </motion.div>
                    )}

                    {course.status === "rejected" && (
                      <motion.div
                        key="rejected"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-700 rounded-full border border-red-100"
                      >
                        <AlertOctagon size={20} className="text-red-600" />
                        <span className="font-bold">ส่งกลับแก้ไขแล้ว</span>
                      </motion.div>
                    )}

                    {course.status === "waiting_owner" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-slate-400 px-4 py-2 bg-slate-50 rounded-full border border-slate-100"
                      >
                        <Clock size={18} />
                        <span className="text-sm font-medium">
                          รอผู้รับผิดชอบรายวิชาดำเนินการ
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-600">ไม่พบรายวิชา</h3>
            <p className="text-slate-400">
              {currentChair
                ? "ขณะนี้ยังไม่มีรายวิชาที่ส่งมาให้ท่านพิจารณา"
                : "กรุณาเลือกผู้ใช้งานจาก Navbar เพื่อดูข้อมูล"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
