"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, CheckCircle, Clock, AlertOctagon, Loader2, X } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Types ---
type WorkloadStatus = 'waiting_owner' | 'pending_approval' | 'approved' | 'rejected';

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
  programName: string;
  responsibleUser: string;
  instructors: InstructorLoad[];
  status: WorkloadStatus;
}

export default function ProgramChairPage() {
  const [coursesWorkload, setCoursesWorkload] = useState<CourseWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChairId, setCurrentChairId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ===== 1. SYNC USER =====
  useEffect(() => {
    const syncUser = () => {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentChairId(user.id);
            } catch (e) {
                console.error("User parse error");
                setCurrentChairId(null);
            }
        } else {
            setCurrentChairId(null);
        }
    };
    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, []);

  // ===== 2. FETCH DATA =====
  useEffect(() => {
    if (currentChairId) {
        fetchData(currentChairId);
    } else {
        setCoursesWorkload([]);
        setLoading(false);
    }
  }, [currentChairId]); 

  const fetchData = async (chairId: number) => {
    setLoading(true);
    try {
      const resCourses = await fetch("/api/courses");
      const allCourses = await resCourses.json();

      if (!Array.isArray(allCourses)) {
        setCoursesWorkload([]);
        return;
      }

      const myCourses = allCourses.filter((c: any) => 
         c.program?.programChairId === chairId || 
         (c.program?.programChairId === null && chairId === 1) 
      );

      const workloadData: CourseWorkload[] = [];

      for (const course of myCourses) {
        const resAssign = await fetch(`/api/assignments?subjectId=${course.id}`);
        const assignments = await resAssign.json();

        if (!Array.isArray(assignments) || assignments.length === 0) continue;

        const instructors: InstructorLoad[] = assignments.map((a: any) => ({
            id: a.id,
            name: `${a.lecturer.academicPosition || ''}${a.lecturer.firstName} ${a.lecturer.lastName}`,
            role: a.lecturerId === course.responsibleUserId ? 'ผู้รับผิดชอบรายวิชา' : 'ผู้สอน',
            lecture: a.lectureHours || 0,
            lab: a.labHours || 0,
            exam: a.examHours || 0,
            responsibleStatus: a.responsibleStatus,
            headApprovalStatus: a.headApprovalStatus
        }));

        let status: WorkloadStatus = 'waiting_owner';
        const allResponsibleApproved = instructors.every(i => i.responsibleStatus === 'APPROVED');
        const anyRejectedByHead = instructors.some(i => i.headApprovalStatus === 'REJECTED');
        const allHeadApproved = instructors.every(i => i.headApprovalStatus === 'APPROVED');

        if (allHeadApproved) status = 'approved';
        else if (anyRejectedByHead) status = 'rejected'; 
        else if (allResponsibleApproved) status = 'pending_approval'; 
        else status = 'waiting_owner';
        
        workloadData.push({
            id: course.id,
            code: course.code,
            name: course.name_th,
            nameEn: course.name_en || "",
            programName: course.program.name_th,
            responsibleUser: "", 
            instructors: instructors.sort((a, b) => (a.role === 'ผู้รับผิดชอบรายวิชา' ? -1 : 1)),
            status
        });
      }
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
    if (!confirm("ยืนยันการอนุมัติภาระงานสอนรายวิชานี้?")) return;
    try {
        const updatePromises = course.instructors.map(inst => 
            fetch("/api/assignments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: inst.id, headApprovalStatus: "APPROVED" })
            })
        );
        await Promise.all(updatePromises);
        toast.success("อนุมัติข้อมูลเรียบร้อยแล้ว");
        if (currentChairId) fetchData(currentChairId);
    } catch (error) { toast.error("เกิดข้อผิดพลาดในการบันทึก"); }
  };

  const handleReject = async (course: CourseWorkload) => {
    if (!confirm("ต้องการส่งกลับให้ผู้รับผิดชอบรายวิชาแก้ไขใหม่?")) return;
    try {
        const updatePromises = course.instructors.map(inst => 
            fetch("/api/assignments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: inst.id,
                    headApprovalStatus: "REJECTED",
                    responsibleStatus: "REJECTED" 
                })
            })
        );
        await Promise.all(updatePromises);
        toast.success("ส่งกลับแก้ไขเรียบร้อยแล้ว");
        if (currentChairId) fetchData(currentChairId);
    } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
  };

  const displayedCourses = coursesWorkload.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sarabun min-h-screen bg-slate-50/50 p-6">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div>
        <h1 className="text-xl text-slate-500 mb-2">การจัดการชั่วโมงการสอน/ประธานหลักสูตร</h1>
        <h2 className="text-2xl font-bold text-slate-800">สำหรับประธานหลักสูตร</h2>
        {currentChairId && !loading && (
             <p className="text-sm text-purple-600 mt-1 font-medium animate-in fade-in">
                กำลังแสดงข้อมูลของคุณ
             </p>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-bold text-lg text-slate-700">ค้นหารายวิชา</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <Select><SelectTrigger><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger><SelectContent><SelectItem value="1">ทุกหลักสูตร</SelectItem></SelectContent></Select>
           <Select><SelectTrigger><SelectValue placeholder="เลือกระดับ" /></SelectTrigger><SelectContent><SelectItem value="1">ปริญญาตรี</SelectItem></SelectContent></Select>
           <Select><SelectTrigger><SelectValue placeholder="เลือกสาขา" /></SelectTrigger><SelectContent><SelectItem value="1">การบริบาลทางเภสัชกรรม</SelectItem></SelectContent></Select>
           <div className="relative">
                <Input placeholder="ค้นหารหัสวิชา" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           </div>
        </div>
      </div>

      {/* Main Content: Course List */}
      <div className="space-y-6">
        {loading ? (
            <div className="text-center p-12 text-slate-400 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin mb-2"/> กำลังโหลดข้อมูล...</div>
        ) : displayedCourses.length > 0 ? (
            displayedCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
                
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700">
                    <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
                    <tr>
                        <th className="py-3 px-4 text-left w-[25%]">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-3 px-4 text-left w-[25%]">ชื่อผู้รับผิดชอบ/ผู้สอน</th>
                        <th className="py-3 px-4 text-center">ตำแหน่ง</th>
                        <th className="py-3 px-4 text-center">บรรยาย (ชม.)</th>
                        <th className="py-3 px-4 text-center">ปฏิบัติ (ชม.)</th>
                        <th className="py-3 px-4 text-center">คุมสอบ (ชม.)</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y">
                    {course.instructors.map((instructor, index) => (
                        <tr key={instructor.id} className="hover:bg-slate-50/50">
                        {index === 0 ? (
                            <td rowSpan={course.instructors.length + 1} className="py-4 px-4 align-top border-r bg-white font-medium text-slate-800">
                                <div className="text-base">{course.code}</div>
                                <div className="text-slate-600 mb-1">{course.name}</div>
                                <div className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 border border-slate-200">{course.programName}</div>
                            </td>
                        ) : null}
                        <td className="py-3 px-4">{instructor.name}</td>
                        <td className="py-3 px-4 text-center">
                            {instructor.role === 'ผู้รับผิดชอบรายวิชา' ? <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100">ผู้รับผิดชอบ</span> : <span className="text-xs text-slate-500">ผู้สอน</span>}
                        </td>
                        <td className="py-3 px-4 text-center">{instructor.lecture}</td>
                        <td className="py-3 px-4 text-center">{instructor.lab}</td>
                        <td className="py-3 px-4 text-center">{instructor.exam}</td>
                        </tr>
                    ))}
                    <tr className="bg-slate-50/50 font-bold border-t text-slate-800">
                        <td colSpan={2} className="py-3 px-4 text-right text-xs uppercase tracking-wide text-slate-500">รวมชั่วโมงสุทธิ</td>
                        <td className="py-3 px-4 text-center text-blue-700">{course.instructors.reduce((s, i) => s + i.lecture, 0)}</td>
                        <td className="py-3 px-4 text-center text-blue-700">{course.instructors.reduce((s, i) => s + i.lab, 0)}</td>
                        <td className="py-3 px-4 text-center text-blue-700">{course.instructors.reduce((s, i) => s + i.exam, 0)}</td>
                    </tr>
                    </tbody>
                </table>
                </div>

                <div className="p-4 border-t flex justify-center items-center bg-gray-50/50 min-h-[80px]">
                    {course.status === 'pending_approval' && (
                        <div className="flex gap-4 items-center animate-in zoom-in duration-300">
                            <span className="text-sm text-blue-600 font-medium flex items-center gap-2 mr-2"><AlertOctagon size={18} /> รอการพิจารณา</span>
                            <Button className="bg-lime-600 hover:bg-lime-700 text-white min-w-[140px] shadow-sm transition-all hover:-translate-y-0.5" onClick={() => handleApprove(course)}><CheckCircle className="mr-2 h-4 w-4" /> อนุมัติข้อมูล</Button>
                            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 min-w-[140px]" onClick={() => handleReject(course)}><X className="mr-2 h-4 w-4" /> ส่งกลับแก้ไข</Button>
                        </div>
                    )}
                    {course.status === 'approved' && (
                        <div className="text-lime-700 font-bold flex items-center gap-2 bg-lime-100 px-6 py-2 rounded-full border border-lime-200"><CheckCircle size={20} /> อนุมัติเรียบร้อยแล้ว</div>
                    )}
                    {course.status === 'rejected' && (
                        <div className="text-red-700 font-bold flex items-center gap-2 bg-red-100 px-6 py-2 rounded-full border border-red-200"><AlertOctagon size={20} /> ส่งกลับแก้ไขแล้ว</div>
                    )}
                    {course.status === 'waiting_owner' && (
                        <div className="text-slate-500 font-medium flex items-center gap-2 bg-white px-6 py-2 rounded-full border border-slate-200 shadow-sm"><Clock size={18} className="text-orange-400" /> <span>อยู่ระหว่างการดำเนินการของผู้รับผิดชอบรายวิชา</span></div>
                    )}
                </div>

            </div>
            ))
        ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                {currentChairId ? "ไม่พบรายวิชาที่ต้องพิจารณา" : "กรุณาเลือกผู้ใช้งานจาก Navbar เพื่อดูข้อมูล"}
            </div>
        )}
      </div>

    </div>
  );
}