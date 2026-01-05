"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckCircle, Clock, AlertOctagon, Loader2, FileText, FileCheck, ChevronRight } from "lucide-react";
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion"; // ✅ Import Motion

// --- Types ---
type WorkloadStatus = 'waiting_chair' | 'pending_approval' | 'approved' | 'rejected';

interface InstructorLoad {
  id: number;
  name: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  headStatus: string;
  deanStatus: string;
}

interface CourseWorkload {
  id: number;
  code: string;
  name: string;
  programName: string; 
  instructors: InstructorLoad[];
  status: WorkloadStatus;
}

export default function ViceDeanPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [courses, setCourses] = useState<CourseWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === 'authenticated') {
        fetchData();
    } else if (status === 'unauthenticated') {
        setCourses([]);
        setLoading(false);
    }
  }, [status]); 

  const fetchData = async () => {
    setLoading(true);
    try {
      const resCourses = await fetch("/api/courses");
      const allCourses = await resCourses.json();

      if (!Array.isArray(allCourses)) {
        setCourses([]);
        return;
      }

      const workloadData = allCourses
        .map((course: any) => {
             const assignments = course.teachingAssignments || [];
             if (assignments.length === 0) return null;

             const instructors: InstructorLoad[] = assignments.map((a: any) => ({
               id: a.id,
               name: a.lecturer ? `${a.lecturer.academicPosition || ''}${a.lecturer.firstName} ${a.lecturer.lastName}` : 'Unknown',
               role: String(a.lecturerId) === String(course.responsibleUserId) ? 'ผู้รับผิดชอบรายวิชา' : 'ผู้สอน',
               lecture: a.lectureHours || 0,
               lab: a.labHours || 0,
               exam: a.examHours || 0,
               headStatus: a.headApprovalStatus,
               deanStatus: a.deanApprovalStatus
             }));

             instructors.sort((a, b) => (a.role === 'ผู้รับผิดชอบรายวิชา' ? -1 : 1));

             let status: WorkloadStatus = 'waiting_chair';
             
             const isHeadApproved = instructors.every(i => i.headStatus === 'APPROVED');
             const isDeanApproved = instructors.every(i => i.deanStatus === 'APPROVED');
             
             if (isDeanApproved) {
                status = 'approved';
             } else if (isHeadApproved) {
                status = 'pending_approval'; 
             } else {
                status = 'waiting_chair';
             }

             return {
               id: course.id,
               code: course.code,
               name: course.name_th,
               programName: course.program?.name_th || "-",
               instructors,
               status
             };
        })
        .filter((item: any) => item !== null) as CourseWorkload[];

      setCourses(workloadData);

    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLERS =====

  const handleApprove = async (course: CourseWorkload) => {
    if (!confirm("ยืนยันการอนุมัติภาระงานสอนรายวิชานี้ เพื่อนำไปออกรายงาน?")) return;

    try {
        const updatePromises = course.instructors.map(inst => 
            fetch("/api/assignments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: inst.id,
                    deanApprovalStatus: "APPROVED"
                })
            })
        );

        await Promise.all(updatePromises);
        toast.success("อนุมัติข้อมูลเรียบร้อยแล้ว");
        fetchData(); 
    } catch (error) {
        toast.error("เกิดข้อผิดพลาด");
    }
  };

  // Filter
  const filteredCourses = courses.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
             <span>จัดการชั่วโมงการสอน</span>
             <ChevronRight size={14}/>
             <span>รองคณบดีฝ่ายวิชาการ</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">พิจารณาอนุมัติภาระงาน</h1>
        {currentUser && !loading && (
             <p className="text-slate-500 mt-2 font-light">
                ยินดีต้อนรับ, <span className="font-medium text-purple-600">{currentUser.name}</span>
             </p>
        )}
      </div>

      {/* Filter Section - Glassmorphism Style */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 mb-6 sticky top-4 z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <Select><SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-purple-100"><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger><SelectContent><SelectItem value="1">เภสัชศาสตรบัณฑิต</SelectItem></SelectContent></Select>
           <Select><SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-purple-100"><SelectValue placeholder="เลือกระดับ" /></SelectTrigger><SelectContent><SelectItem value="1">ปริญญาตรี</SelectItem></SelectContent></Select>
           <Select><SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50 focus:ring-purple-100"><SelectValue placeholder="เลือกสาขา" /></SelectTrigger><SelectContent><SelectItem value="1">การบริบาลทางเภสัชกรรม</SelectItem></SelectContent></Select>
           <div className="relative">
             <Input 
                className="rounded-xl border-slate-200 bg-slate-50/50 pl-10 focus:ring-purple-100 transition-all"
                placeholder="ค้นหารหัสวิชา..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           </div>
        </div>
      </div>

      {/* Main Content: Course List */}
      <div>
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 mb-4 text-purple-500 animate-spin"/>
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
                        <th className="py-4 px-6 text-left w-[30%]">รายวิชา</th>
                        <th className="py-4 px-6 text-left w-[25%]">อาจารย์ผู้สอน</th>
                        <th className="py-4 px-6 text-center">สถานะ</th>
                        <th className="py-4 px-6 text-center">บรรยาย</th>
                        <th className="py-4 px-6 text-center">ปฏิบัติ</th>
                        <th className="py-4 px-6 text-center">คุมสอบ</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {course.instructors.map((instructor, index) => (
                        <tr key={instructor.id} className="group hover:bg-slate-50/50 transition-colors">
                        {index === 0 ? (
                            <td rowSpan={course.instructors.length + 1} className="py-5 px-6 align-top border-r border-slate-100 bg-white group-hover:bg-white">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-lg text-slate-800 tracking-tight">{course.code}</span>
                                    <span className="text-slate-600">{course.name}</span>
                                    <span className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 mt-2">
                                        {course.programName}
                                    </span>
                                </div>
                            </td>
                        ) : null}
                        
                        <td className="py-4 px-6 text-slate-700 font-medium">{instructor.name}</td>
                        <td className="py-4 px-6 text-center">
                            {instructor.role === 'ผู้รับผิดชอบรายวิชา' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                    ผู้รับผิดชอบ
                                </span>
                            ) : (
                                <span className="text-xs text-slate-400">ผู้สอน</span>
                            )}
                        </td>
                        <td className="py-4 px-6 text-center text-slate-600">{instructor.lecture}</td>
                        <td className="py-4 px-6 text-center text-slate-600">{instructor.lab}</td>
                        <td className="py-4 px-6 text-center text-slate-600">{instructor.exam}</td>
                        </tr>
                    ))}

                    {/* Footer Row: Totals */}
                    <tr className="bg-slate-50/50 border-t border-slate-200">
                        <td colSpan={2} className="py-3 px-6 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">รวมชั่วโมงสุทธิ</td>
                        <td className="py-3 px-6 text-center font-bold text-blue-600 text-base">
                            {course.instructors.reduce((s, i) => s + i.lecture, 0)}
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
                    {course.status === 'pending_approval' && (
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
                                <FileCheck className="mr-2 h-5 w-5" /> อนุมัติข้อมูล (ขั้นตอนสุดท้าย)
                            </motion.button>
                        </motion.div>
                    )}

                    {/* 2. อนุมัติแล้ว (Approved) */}
                    {course.status === 'approved' && (
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
                    {course.status === 'waiting_chair' && (
                        <motion.div 
                            key="waiting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-slate-400 px-4 py-2 bg-slate-50 rounded-full border border-slate-100"
                        >
                            <Clock size={18} />
                            <span className="text-sm font-medium">อยู่ระหว่างการตรวจสอบของประธานหลักสูตร</span>
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