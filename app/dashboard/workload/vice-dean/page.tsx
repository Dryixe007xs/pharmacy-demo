"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
// ✅ จัดระเบียบ Type ให้ชัดเจน
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
  // field headStatus, deanStatus เก็บไว้ใช้คำนวณ Logic รวม แต่ไม่ได้ show ใน UI (ถูกต้องแล้วสำหรับการสรุปผล)
  headStatus: string;
  deanStatus: string;
}

interface CourseWorkload {
  id: number;
  code: string;
  name: string;
  credit: string | number;
  programName: string;
  instructors: InstructorLoad[];
  status: WorkloadStatus;
}

export default function ViceDeanPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [courses, setCourses] = useState<CourseWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    } else if (status === "unauthenticated") {
      setCourses([]);
      setLoading(false);
    }
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resCourses = await fetch("/api/courses");
      if (!resCourses.ok) throw new Error("API Fetch Error");
      
      const allCourses = await resCourses.json();

      if (!Array.isArray(allCourses)) {
        setCourses([]);
        return;
      }

      const workloadData = allCourses
        .map((course: any) => {
          const assignments = course.teachingAssignments || [];
          if (assignments.length === 0) return null;

          // แปลงข้อมูลผู้สอน
          const instructors: InstructorLoad[] = assignments.map((a: any) => ({
            id: a.id,
            name: a.lecturer
              ? `${a.lecturer.title || ""}${a.lecturer.firstName} ${a.lecturer.lastName}`
              : "Unknown",
            role: String(a.lecturerId) === String(course.responsibleUserId)
                ? "ผู้รับผิดชอบรายวิชา"
                : "ผู้สอน",
            lecture: a.lectureHours || 0,
            lab: a.labHours || 0,
            exam: a.examHours || 0,
            headStatus: a.headApprovalStatus,
            deanStatus: a.deanApprovalStatus,
          }));

          // เรียงลำดับ: ผู้รับผิดชอบขึ้นก่อน
          instructors.sort((a, b) =>
            a.role === "ผู้รับผิดชอบรายวิชา" ? -1 : 1
          );

          // ✅ Logic คำนวณสถานะ (Cleaned)
          let status: WorkloadStatus = "waiting_chair";
          
          // เช็คว่าทุกคนอนุมัติครบหรือยัง
          const isAllHeadApproved = instructors.every((i) => i.headStatus === "APPROVED");
          const isAllDeanApproved = instructors.every((i) => i.deanStatus === "APPROVED");

          if (isAllDeanApproved) {
            status = "approved";
          } else if (isAllHeadApproved) {
            status = "pending_approval";
          } else {
            status = "waiting_chair";
          }

          return {
            id: course.id,
            code: course.code,
            name: course.name_th,
            credit: course.credit || course.credits || "-",
            programName: course.program?.name_th || "ไม่ระบุหลักสูตร",
            instructors,
            status,
          };
        })
        .filter(Boolean) as CourseWorkload[]; // ✅ ใช้ filter(Boolean) แทนการเช็ค null เอง

      setCourses(workloadData);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLERS (จุดที่แก้ไขหลัก) =====
  const handleApprove = async (course: CourseWorkload) => {
    if (!confirm(`ยืนยันการอนุมัติรายวิชา ${course.code} ?`)) return;

    // Loading State เฉพาะหน้าจอ (Optional: อาจจะเพิ่ม state localLoading ถ้าต้องการ)
    const toastId = toast.loading("กำลังบันทึกข้อมูล...");

    try {
      // ✅ เปลี่ยน Logic: ยิง Request ทีละรายการ และตรวจสอบผลลัพธ์
      // หมายเหตุ: ใช้ PATCH แทน PUT มักจะปลอดภัยกว่าสำหรับการอัปเดตบางฟิลด์
      // และลองเปลี่ยน URL เป็นแบบระบุ ID ถ้า API รองรับ หรือใช้แบบเดิมแต่เช็ค res.ok
      
      const updatePromises = course.instructors.map(async (inst) => {
        // 🔥 เปลี่ยน URL: ลองเดาว่า API น่าจะรองรับ Dynamic Route หรือ Query Param
        // ถ้า Backend เป็นแบบเดิม ให้ใช้ /api/assignments เหมือนเดิม แต่เช็ค Method ดีๆ
        const response = await fetch("/api/assignments", { 
          method: "PATCH", // หรือ PUT ตาม Backend ของคุณ
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: inst.id,
            deanApprovalStatus: "APPROVED",
          }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update instructor ID: ${inst.id}`);
        }
        return response.json();
      });

      await Promise.all(updatePromises);
      
      toast.dismiss(toastId);
      toast.success("อนุมัติเรียบร้อยแล้ว");
      
      // ✅ เรียก fetchData เพื่อดึงข้อมูลสถานะล่าสุดทันที
      await fetchData();

    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่");
    }
  };

  // ===== FILTER LOGIC =====
  const uniquePrograms = Array.from(
    new Set(courses.map((c) => c.programName).filter(Boolean))
  );

  const filteredCourses = courses.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProgram =
      selectedProgram === "all" || c.programName === selectedProgram;
    return matchSearch && matchProgram;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
          <span>จัดการชั่วโมงการสอน</span>
          <ChevronRight size={14} />
          <span className="text-purple-600">รองคณบดีฝ่ายวิชาการ</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          พิจารณาอนุมัติภาระงาน
        </h1>
        {currentUser && !loading && (
          <p className="text-slate-500 mt-2 font-light">
            ยินดีต้อนรับ,{" "}
            <span className="font-medium text-purple-600">
              {currentUser.name}
            </span>
          </p>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 mb-6 sticky top-4 z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-[350px]">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-purple-100 h-11">
                <SelectValue placeholder="เลือกหลักสูตร" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                {uniquePrograms.map((program) => (
                  <SelectItem key={program} value={program}>
                    {program}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full md:w-[350px]">
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
      </div>

      {/* Main Content */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 mb-4 text-purple-500 animate-spin" />
            <p className="animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="space-y-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
              >
                {/* Modern Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 text-slate-500 font-medium">
                      <tr>
                        <th className="py-4 px-6 text-left w-[35%]">รายวิชา</th>
                        <th className="py-4 px-6 text-left w-[25%]">
                          อาจารย์ผู้สอน
                        </th>
                        <th className="py-4 px-6 text-center">สถานะ</th>
                        <th className="py-4 px-6 text-center">บรรยาย</th>
                        <th className="py-4 px-6 text-center">ปฏิบัติ</th>
                        <th className="py-4 px-6 text-center">คุมสอบ</th>
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
                                  <span className="text-slate-600">
                                    {course.name}
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
                    {/* 1. รอการอนุมัติ (Pending Approval) */}
                    {course.status === "pending_approval" && (
                      <motion.div
                        key="pending"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col sm:flex-row gap-4 items-center w-full justify-center"
                      >
                        <span className="text-sm text-slate-500 font-medium flex items-center gap-2 mr-4 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                          <AlertOctagon size={16} className="text-orange-500" />
                          ข้อมูลผ่านการตรวจสอบแล้ว รอการอนุมัติจากท่าน
                        </span>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleApprove(course)}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl shadow-sm hover:shadow-green-200/50 hover:shadow-lg transition-all flex items-center gap-2 font-medium"
                        >
                          <FileCheck className="mr-2 h-5 w-5" /> อนุมัติข้อมูล
                          (ขั้นตอนสุดท้าย)
                        </motion.button>
                      </motion.div>
                    )}

                    {/* 2. อนุมัติแล้ว (Approved) */}
                    {course.status === "approved" && (
                      <motion.div
                        key="approved"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-6 py-2 bg-green-50 text-green-700 rounded-full border border-green-100"
                      >
                        <CheckCircle size={20} className="text-green-600" />
                        <span className="font-bold">อนุมัติเรียบร้อยแล้ว</span>
                      </motion.div>
                    )}

                    {/* 3. รอประธานหลักสูตร (Waiting Chair) */}
                    {course.status === "waiting_chair" && (
                      <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-slate-400 px-4 py-2 bg-slate-50 rounded-full border border-slate-100"
                      >
                        <Clock size={18} />
                        <span className="text-sm font-medium">
                          อยู่ระหว่างการตรวจสอบของประธานหลักสูตร
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
            <p className="text-slate-400">ไม่พบข้อมูลรายวิชาที่ต้องพิจารณา</p>
          </div>
        )}
      </div>
    </div>
  );
}