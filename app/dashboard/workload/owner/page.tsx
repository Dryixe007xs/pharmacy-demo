"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, PenLine, Plus, Trash2, Edit2, X, User, Check, Loader2, UserPlus, 
  AlertCircle, CheckCircle, Send, Clock, FileText, AlertTriangle, MessageSquare, 
  ChevronRight, BookOpen, ShieldCheck
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// ==========================================
// 1. TYPES
// ==========================================
type Assignment = {
  id: number;
  subjectId: number;
  lecturerId: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  lecturer: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    academicPosition: string | null;
    email: string;
  };
  lecturerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT' | null; 
  lecturerFeedback?: string;
  responsibleStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUBMITTED'; 
  headApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

type CourseSummary = {
  total: number;
  lecturerPending: number;
  lecturerRejected: number;
  isReady: boolean;
  isSubmitted: boolean;
  isHeadApproved: boolean;
  isHeadRejected: boolean;
};

type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string | null;
  credit: string;
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
    academicPosition: string | null;
    title: string | null;
  } | null;
  teachingAssignments?: Assignment[]; 
  summary?: CourseSummary; 
};

type UserData = {
  id: string;
  name: string;
  email: string;
  position: string;
};

// ==========================================
// 2. HELPER COMPONENTS
// ==========================================

const StatusBadge = ({ summary }: { summary?: Course['summary'] }) => {
  if (!summary || summary.total === 0) return <Badge color="slate" icon={FileText} text="ยังไม่เพิ่มผู้สอน" />;
  if (summary.isHeadApproved) return <Badge color="green" icon={CheckCircle} text="อนุมัติแล้ว" />;
  if (summary.isHeadRejected) return <Badge color="red" icon={AlertTriangle} text="ประธานส่งกลับ" className="animate-pulse" />;
  if (summary.isSubmitted) return <Badge color="blue" icon={Send} text="ส่งแล้ว" />;
  if (summary.lecturerRejected > 0) return <Badge color="red" icon={AlertCircle} text={`มีข้อโต้แย้ง (${summary.lecturerRejected})`} />;
  if (summary.lecturerPending > 0) return <Badge color="orange" icon={Clock} text={`รอผู้สอน (${summary.lecturerPending})`} />;
  if (summary.isReady) return <Badge color="indigo" icon={Check} text="พร้อมส่ง" className="animate-bounce" />;
  return <span className="text-slate-400">-</span>;
};

const Badge = ({ color, icon: Icon, text, className = "" }: any) => {
  const colors: any = {
    slate: "bg-slate-100 text-slate-500",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span className={`${colors[color]} px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto ${className}`}>
      <Icon size={12}/> {text}
    </span>
  );
};

const getResponsibleName = (user: any) => {
  if (!user) return <span className="text-red-400 text-sm">ยังไม่ระบุ</span>;
  const prefix = user.academicPosition || user.title || "";
  return `${prefix} ${user.firstName || ""} ${user.lastName || ""}`.trim();
};

// ==========================================
// 3. CUSTOM HOOK (Business Logic)
// ==========================================
function useCourseLogic(currentUser: any) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [staffs, setStaffs] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const fetchInitialData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [resCourses, resStaff] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/staff")
      ]);
      
      const dataCourses = await resCourses.json();
      const dataStaff = await resStaff.json();

      if (Array.isArray(dataCourses)) {
        const coursesWithSummary = dataCourses.map((c: Course) => {
          const assigns = c.teachingAssignments || [];
          const summary: CourseSummary = {
            total: assigns.length,
            lecturerPending: assigns.filter(a => a.lecturerStatus === 'PENDING').length,
            lecturerRejected: assigns.filter(a => a.lecturerStatus === 'REJECTED').length,
            isReady: assigns.length > 0 && assigns.every(a => a.lecturerStatus === 'APPROVED'),
            isSubmitted: assigns.length > 0 && assigns.every(a => a.responsibleStatus === 'APPROVED'),
            isHeadApproved: assigns.length > 0 && assigns.every(a => a.headApprovalStatus === 'APPROVED'),
            isHeadRejected: assigns.some(a => a.headApprovalStatus === 'REJECTED')
          };
          return { ...c, summary };
        });
        setCourses(coursesWithSummary);
      }
      setStaffs(Array.isArray(dataStaff) ? dataStaff : []);
    } catch (err) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchAssignments = async (subjectId: number) => {
    try {
      const res = await fetch(`/api/assignments?subjectId=${subjectId}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssignments([]);
    }
  };

  const handleActions = {
    addLecturer: async (staffId: string, courseId: number) => {
      try {
        const payload: any = { 
            subjectId: courseId, 
            lecturerId: staffId,
            lecturerStatus: null 
        };
        
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (res.ok) {
          await fetchAssignments(courseId);
          fetchInitialData();
          const isSelf = currentUser && String(staffId) === String(currentUser.id);
          toast.success(isSelf ? "เพิ่มคุณในรายวิชาแล้ว" : "เพิ่มอาจารย์เรียบร้อยแล้ว");
          return true;
        }
        throw new Error();
      } catch (e) { toast.error("ไม่สามารถเพิ่มอาจารย์ได้"); return false; }
    },

    saveHoursDraft: async (id: number, hours: { lecture: number, lab: number, exam: number }) => {
        try {
            const payload = {
                id,
                lectureHours: hours.lecture,
                labHours: hours.lab,
                examHours: hours.exam,
                lecturerStatus: null 
            };
    
            const res = await fetch("/api/assignments", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            
            if (res.ok) {
              await fetchAssignments(selectedCourse!.id);
              toast.success("บันทึกจำนวนชั่วโมงแล้ว (อย่าลืมกดยืนยัน/ส่งข้อมูล)");
              return true;
            }
            throw new Error();
        } catch (e) { toast.error("บันทึกไม่สำเร็จ"); return false; }
    },

    confirmAssignment: async (id: number, isSelf: boolean) => {
        try {
            const payload = {
                id,
                lecturerStatus: isSelf ? "APPROVED" : "PENDING",
                responsibleStatus: "PENDING" 
            };
            
            const res = await fetch("/api/assignments", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            
            if (res.ok) {
              await fetchAssignments(selectedCourse!.id);
              fetchInitialData();
              toast.success(isSelf ? "ยืนยันชั่วโมงของคุณเรียบร้อย" : "ส่งข้อมูลให้อาจารย์ตรวจสอบเรียบร้อย");
              return true;
            }
            throw new Error();
          } catch (e) { toast.error("ทำรายการไม่สำเร็จ"); return false; }
    },

    resolveDispute: async (id: number, hours: { lecture: number, lab: number, exam: number }) => {
        try {
            const payload = {
                id,
                ...hours,
                lecturerStatus: "PENDING", 
                lecturerFeedback: null 
            };
            const res = await fetch("/api/assignments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if(res.ok) {
                await fetchAssignments(selectedCourse!.id);
                fetchInitialData();
                toast.success("แก้ไขและส่งข้อมูลใหม่เรียบร้อย");
                return true;
            }
            throw new Error();
        } catch (e) { toast.error("เกิดข้อผิดพลาด"); return false; }
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
        if (res.ok) {
          await fetchAssignments(selectedCourse!.id);
          fetchInitialData();
          toast.success("ยืนยันข้อมูลเดิมเรียบร้อย");
          return true;
        }
        throw new Error();
      } catch (e) { toast.error("เกิดข้อผิดพลาด"); return false; }
    },

    deleteAssignment: async (id: number) => {
      if (!confirm("ต้องการลบผู้สอนท่านนี้?")) return;
      try {
        const res = await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
        if (res.ok) {
          await fetchAssignments(selectedCourse!.id);
          fetchInitialData();
          toast.success("ลบข้อมูลเรียบร้อย");
        }
      } catch (e) { toast.error("ลบไม่สำเร็จ"); }
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
                    headApprovalStatus: "PENDING"
                })
            })
        );
        await Promise.all(updatePromises);
        fetchInitialData();
        return true;
      } catch (e) { toast.error("ส่งข้อมูลไม่สำเร็จ"); return false; }
    }
  };

  return {
    courses, staffs, loading, assignments, selectedCourse,
    fetchInitialData, fetchAssignments, setSelectedCourse,
    setAssignments, 
    actions: handleActions
  };
}

// ==========================================
// 4. MAIN PAGE COMPONENT
// ==========================================
export default function CourseOwnerPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const { 
    courses, staffs, loading, assignments, selectedCourse, 
    fetchInitialData, fetchAssignments, setSelectedCourse, 
    setAssignments,
    actions 
  } = useCourseLogic(currentUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === 'authenticated') fetchInitialData();
  }, [status, fetchInitialData]);

  const handleOpenModal = (course: Course) => {
    setSelectedCourse(course);
    setAssignments(course.teachingAssignments || []); 
    fetchAssignments(course.id); 
    setIsModalOpen(true);
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
        if (!currentUser) return false;
        const isOwner = String(c.responsibleUserId) === String(currentUser.id);
        const searchLower = searchTerm.toLowerCase();
        return isOwner && (c.code.toLowerCase().includes(searchLower) || c.name_th.toLowerCase().includes(searchLower));
    });
  }, [courses, currentUser, searchTerm]);

  if (status === 'loading' || (!currentUser && loading)) {
      return <div className="flex h-screen items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
             <span>จัดการชั่วโมงการสอน</span><ChevronRight size={14}/><span className="text-purple-600">ผู้รับผิดชอบรายวิชา</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">บันทึกผู้สอนและชั่วโมงสอน</h1>
        {currentUser && !loading && (
             <p className="text-slate-500 mt-2 font-light">ยินดีต้อนรับ, <span className="font-medium text-purple-600">{currentUser.name}</span></p>
        )}
      </header>

      {/* Filter & Search */}
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

      {/* Course Table */}
      <section className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
             <BookOpen className="text-slate-700" size={20} />
             <h3 className="font-bold text-lg text-slate-800">รายวิชาที่รับผิดชอบ ({filteredCourses.length} รายการ)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-sm font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 pl-6 w-[10%]">รหัสวิชา</th>
                <th className="p-4 w-[25%]">ชื่อรายวิชา</th>
                <th className="p-4 w-[10%] text-center">หน่วยกิต</th>
                <th className="p-4 w-[20%]">หลักสูตร</th>
                <th className="p-4 w-[15%] text-center">สถานะปัจจุบัน</th>
                <th className="p-4 pr-6 w-[20%] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex justify-center items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...</div></td></tr>
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4 pl-6 font-medium text-slate-700">{course.code}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{course.name_th}</div>
                      <div className="text-xs text-slate-500 font-light mt-0.5">{course.name_en}</div>
                    </td>
                    <td className="p-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">{course.credit}</span></td>
                    <td className="p-4 text-slate-600">{course.program.name_th}</td>
                    <td className="p-4 text-center align-middle"><StatusBadge summary={course.summary} /></td>
                    <td className="p-4 pr-6 text-center">
                      <button onClick={() => handleOpenModal(course)} className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm text-sm font-medium">
                        <PenLine size={16} /> จัดการ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2"><Search size={32} className="opacity-20"/>{currentUser ? "ไม่พบรายวิชาที่คุณรับผิดชอบ" : "ไม่พบข้อมูลผู้ใช้งาน"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {isModalOpen && selectedCourse && (
        <CourseModal 
            course={selectedCourse}
            assignments={assignments}
            currentUser={currentUser}
            staffs={staffs}
            onClose={() => setIsModalOpen(false)}
            actions={actions}
        />
      )}
    </div>
  );
}

// ==========================================
// 5. MODAL SUB-COMPONENTS
// ==========================================

function CourseModal({ course, assignments, currentUser, staffs, onClose, actions }: any) {
    const [isAddingLecturer, setIsAddingLecturer] = useState(false);
    const [searchStaff, setSearchStaff] = useState("");
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    const isRejectedByChair = assignments.some((a: Assignment) => a.headApprovalStatus === 'REJECTED' || a.responsibleStatus === 'REJECTED');
    const isReadyToSubmit = assignments.length > 0 && assignments.every((a: Assignment) => a.lecturerStatus === 'APPROVED');
    const isSubmitted = assignments.length > 0 && assignments.every((a: Assignment) => a.responsibleStatus === 'APPROVED');
    const isLocked = isSubmitted && !isRejectedByChair;

    const handleSubmit = async () => {
        if (!confirm("ยืนยันการส่งข้อมูลให้ประธานหลักสูตรตรวจสอบ?")) return;
        setSubmitStatus('submitting');
        const success = await actions.submitToChair();
        if (success) {
            setSubmitStatus('success');
            // Delay closing to show popup
            setTimeout(() => { 
                onClose(); 
                setTimeout(() => setSubmitStatus('idle'), 300); 
            }, 3000); // 3 seconds delay
        } else {
            setSubmitStatus('idle');
        }
    };

    const handleAddLecturer = async (staffId: string) => {
        const success = await actions.addLecturer(staffId, course.id);
        if (success) {
            setIsAddingLecturer(false);
            setSearchStaff("");
        }
    };

    const filteredStaffs = staffs.filter((s: UserData) => s.name.toLowerCase().includes(searchStaff.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
                
                {/* ✅ SUCCESS POPUP OVERLAY */}
                {submitStatus === 'success' && <SuccessOverlay />}

                {/* Header */}
                <div className="p-6 border-b flex justify-between items-start bg-white sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{course.code} {course.name_th}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded border border-purple-200 font-medium">{course.credit} หน่วยกิต</span>
                            <p className="text-sm text-slate-500">{course.program.name_th}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={24} /></button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar flex-1">
                    {isRejectedByChair && (
                        <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 text-red-700 mb-4 rounded-lg">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div><p className="font-bold text-sm">ถูกส่งกลับแก้ไขโดยประธานหลักสูตร</p><p className="text-xs">กรุณาตรวจสอบและแก้ไขข้อมูลที่มีปัญหา แล้วกดส่งอีกครั้ง</p></div>
                        </div>
                    )}

                    <div className="flex flex-col gap-6">
                        {/* Responsible Person */}
                        <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm"><User size={24} /></div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">ผู้รับผิดชอบรายวิชา</p>
                                <p className="text-base font-bold text-slate-800">{getResponsibleName(course.responsibleUser)}</p>
                            </div>
                        </div>

                        {/* Assignments Table */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center"><h3 className="font-bold text-slate-700 flex items-center gap-2"><User size={18}/> รายชื่อผู้สอน</h3></div>
                            <div className="bg-slate-100/50 p-3 grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 border-b uppercase tracking-wider">
                                <div className="col-span-4 pl-2">ชื่อ-สกุล</div>
                                <div className="col-span-2 text-center">บรรยาย (ชม.)</div>
                                <div className="col-span-2 text-center">ปฏิบัติ (ชม.)</div>
                                <div className="col-span-2 text-center">คุมสอบ (ชม.)</div>
                                <div className="col-span-2 text-center">จัดการ</div>
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

                        {/* Add Lecturer Section */}
                        {!isLocked && (
                            <div className="mt-2 flex flex-col gap-3">
                                {currentUser && !assignments.some((a: Assignment) => String(a.lecturerId) === String(currentUser.id)) && (
                                    <button onClick={() => handleAddLecturer(currentUser.id)} className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 font-bold hover:bg-purple-50 flex items-center justify-center gap-2 transition-all"><UserPlus size={20} /> เพิ่มตนเองเป็นผู้สอน</button>
                                )}
                                {!isAddingLecturer ? (
                                    <button onClick={() => setIsAddingLecturer(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 flex items-center justify-center gap-2 transition-all"><Plus size={20} /> เพิ่มผู้สอนท่านอื่น</button>
                                ) : (
                                    <div className="p-4 border border-green-200 rounded-xl bg-green-50/50 animate-in fade-in">
                                        <div className="flex gap-2 items-start">
                                            <div className="flex-1 relative">
                                                <input autoFocus placeholder="พิมพ์ชื่ออาจารย์เพื่อค้นหา..." className="w-full p-2 pl-10 border rounded-md focus:ring-2 focus:ring-green-500 outline-none text-sm" value={searchStaff} onChange={(e) => setSearchStaff(e.target.value)} />
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                {searchStaff && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                                                        {filteredStaffs.length > 0 ? filteredStaffs.map((s: UserData) => (
                                                            <div key={s.id} className="p-2 hover:bg-green-50 cursor-pointer text-sm text-slate-700 border-b last:border-none" onClick={() => handleAddLecturer(s.id)}>{s.name}</div>
                                                        )) : <div className="p-3 text-center text-sm text-gray-400">ไม่พบรายชื่อ</div>}
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => setIsAddingLecturer(false)} className="px-4 py-2 text-sm text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium shadow-sm transition">ยกเลิก</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    <button onClick={onClose} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 font-medium transition-all">ปิดหน้าต่าง</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={(!isReadyToSubmit && !isLocked) || submitStatus === 'submitting' || isLocked} 
                        className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 ${isLocked || submitStatus === 'success' ? "bg-green-500 cursor-default hover:bg-green-500 shadow-none" : !isReadyToSubmit ? "bg-slate-300 cursor-not-allowed shadow-none" : "bg-purple-600 hover:bg-purple-700 shadow-purple-200 hover:shadow-lg"}`}
                    >
                        {submitStatus === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : isLocked ? <><CheckCircle size={18}/> ส่งแล้ว</> : <><Send size={18}/> ส่งข้อมูลให้ประธานหลักสูตรพิจารณา</>}
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
    const [hours, setHours] = useState({ lecture: a.lectureHours, lab: a.labHours, exam: a.examHours });

    const isRejected = a.lecturerStatus === 'REJECTED';
    const isSelf = String(currentUser?.id) === String(a.lecturerId); 
    const totalHours = a.lectureHours + a.labHours + a.examHours;
    
    // Logic: ปุ่มหายเมื่อเป็น PENDING (ส่งแล้ว) หรือ APPROVED (ตอบรับแล้ว)
    // ถ้าสถานะเป็น null (Draft/DRAFT) ปุ่มจะแสดง
    const isSent = a.lecturerStatus === 'PENDING' || a.lecturerStatus === 'APPROVED';

    const getStatusText = () => {
        if (a.lecturerStatus === 'APPROVED') return '• ยืนยันแล้ว';
        if (a.lecturerStatus === 'PENDING') return '• ส่งให้ตรวจสอบแล้ว';
        if (a.lecturerStatus === 'REJECTED') return '• ต้องแก้ไขข้อมูล';
        return '• แบบร่าง';
    };

    const getStatusColor = () => {
        if (a.lecturerStatus === 'APPROVED') return 'text-green-600';
        if (a.lecturerStatus === 'PENDING') return 'text-blue-600';
        if (a.lecturerStatus === 'REJECTED') return 'text-red-500';
        return 'text-slate-400';
    };

    const handleSaveDraft = async () => {
        const success = await actions.saveHoursDraft(a.id, hours);
        if (success) setIsEditing(false);
    };

    const handleConfirmSend = async () => {
        if (!confirm(isSelf ? "ยืนยันข้อมูลชั่วโมงสอนของคุณ?" : "ยืนยันส่งข้อมูลให้อาจารย์ตรวจสอบ?")) return;
        await actions.confirmAssignment(a.id, isSelf);
    };

    const handleResolveDispute = async () => {
        const success = await actions.resolveDispute(a.id, hours);
        if (success) setIsEditing(false);
    };

    const handleInsist = async () => {
        if (!resolveReason.trim()) { toast.error("ระบุเหตุผล"); return; }
        const success = await actions.insistOriginal(a.id, resolveReason);
        if (success) setIsResolving(false);
    };

    if (isRejected && !isEditing && !isResolving) {
        return (
            <div className="bg-red-50/60 p-3 grid grid-cols-12 gap-2 items-center text-sm border-b">
                 <div className="col-span-12 flex flex-col gap-3 py-2 pl-2">
                    <div className="flex items-center gap-2 text-red-600 font-bold"><AlertCircle size={18} /> แจ้งขอแก้ไขข้อมูล <span className="text-slate-700 font-semibold ml-auto">โดย: {a.lecturer.firstName} {a.lecturer.lastName}</span></div>
                    <div className="bg-white p-3 rounded-lg border border-red-200 text-red-800 text-sm flex gap-3 shadow-sm">
                        <MessageSquare size={18} className="mt-0.5 shrink-0 opacity-60"/>
                        <div><span className="font-bold text-xs uppercase text-red-400 block mb-1">เหตุผล:</span>"{a.lecturerFeedback || "ไม่ระบุ"}"</div>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"><Edit2 size={14} /> แก้ไขข้อมูลให้</button>
                        <button onClick={() => setIsResolving(true)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"><ShieldCheck size={14} /> ยืนยันข้อมูลเดิม</button>
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
                        <input autoFocus className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-orange-400" placeholder="เช่น ตรวจสอบตามตารางสอนแล้วถูกต้อง..." value={resolveReason} onChange={(e) => setResolveReason(e.target.value)} />
                        <button onClick={handleInsist} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap shadow-sm">ยืนยัน</button>
                        <button onClick={() => setIsResolving(false)} className="text-slate-400 hover:text-slate-600 px-2 text-xs font-medium">ยกเลิก</button>
                    </div>
                 </div>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-12 gap-2 items-center text-sm p-3 transition-colors ${isEditing ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
            <div className="col-span-4 pl-2">
                <div className="font-medium text-slate-700">{a.lecturer.firstName} {a.lecturer.lastName}</div>
                <div className={`text-xs font-semibold mt-0.5 ${getStatusColor()}`}>
                    {getStatusText()}
                </div>
            </div>
            
            {isEditing ? (
                <>
                    {['lecture', 'lab', 'exam'].map((type) => (
                        <div key={type} className="col-span-2 px-1">
                            <input type="number" min="0" className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1" value={(hours as any)[type]} onChange={(e) => setHours({...hours, [type]: Number(e.target.value)})} />
                        </div>
                    ))}
                    <div className="col-span-2 flex justify-center gap-2">
                        <button onClick={isRejected ? handleResolveDispute : handleSaveDraft} className="text-white bg-green-500 p-1.5 rounded hover:bg-green-600 transition shadow-sm" title="บันทึกข้อมูล"><Check size={16}/></button>
                        <button onClick={() => setIsEditing(false)} className="text-slate-500 bg-white border border-slate-200 p-1.5 rounded hover:bg-slate-50 transition shadow-sm" title="ยกเลิก"><X size={16}/></button>
                    </div>
                </>
            ) : (
                <>
                    <div className="col-span-2 text-center text-slate-600 font-medium">{a.lectureHours}</div>
                    <div className="col-span-2 text-center text-slate-600 font-medium">{a.labHours}</div>
                    <div className="col-span-2 text-center text-slate-600 font-medium">{a.examHours}</div>
                    <div className="col-span-2 flex justify-center gap-1.5">
                        {!isLocked && (
                            <>
                                <button 
                                    onClick={() => { setIsEditing(true); setHours({ lecture: a.lectureHours, lab: a.labHours, exam: a.examHours }); }} 
                                    className="text-slate-500 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition border border-transparent hover:border-purple-100" 
                                    title="แก้ไขจำนวนชั่วโมง"
                                >
                                    <Edit2 size={16}/>
                                </button>
                                
                                {!isSent && (
                                    isSelf ? (
                                        <button 
                                            onClick={handleConfirmSend} 
                                            disabled={totalHours === 0} 
                                            className={`p-1.5 rounded transition border flex items-center gap-1 ${totalHours === 0 ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-green-600 border-green-200 bg-green-50 hover:bg-green-100'}`}
                                            title={totalHours === 0 ? "กรุณากรอกชั่วโมงก่อนยืนยัน" : "ยืนยันชั่วโมงตนเอง"}
                                        >
                                            <CheckCircle size={16}/>
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleConfirmSend} 
                                            disabled={totalHours === 0}
                                            className={`p-1.5 rounded transition border flex items-center gap-1 ${totalHours === 0 ? 'text-slate-300 border-slate-100 cursor-not-allowed' : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'}`}
                                            title={totalHours === 0 ? "กรุณากรอกชั่วโมงก่อนส่ง" : "ส่งข้อมูลให้ผู้สอนตรวจสอบ"}
                                        >
                                            <Send size={16}/>
                                        </button>
                                    )
                                )}

                                <button onClick={() => actions.deleteAssignment(a.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="ลบ"><Trash2 size={16}/></button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ==========================================
// 6. SUCCESS OVERLAY COMPONENT (POPUP)
// ==========================================
const SuccessOverlay = () => (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300">
        <div className="flex flex-col items-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
            {/* Circle with Check Icon */}
            <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-100 border-4 border-white ring-4 ring-green-50">
                <CheckCircle className="w-14 h-14 text-green-600 animate-bounce" />
            </div>
            
            {/* Title */}
            <h3 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">ส่งข้อมูลเรียบร้อย!</h3>
            
            {/* Description */}
            <p className="text-slate-500 text-lg font-light text-center max-w-sm leading-relaxed">
                ระบบได้ส่งข้อมูลภาระงานสอนให้ <br/>
                <span className="font-semibold text-purple-600">ประธานหลักสูตร</span> พิจารณาแล้ว
            </p>

            {/* Loading Indicator (Auto Close) */}
            <div className="mt-8 flex items-center gap-2 text-slate-400 text-sm bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                กำลังปิดหน้าต่างอัตโนมัติ...
            </div>
        </div>
    </div>
);