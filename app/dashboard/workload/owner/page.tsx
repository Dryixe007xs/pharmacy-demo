"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, PenLine, Plus, Trash2, Edit2, X, User, Check, Loader2, UserPlus, 
  AlertCircle, CheckCircle, Send, Clock, FileText, AlertTriangle, MessageSquare, 
  ChevronRight, BookOpen, ShieldCheck
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// ===== TYPES =====
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
  lecturerStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'; 
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
  credit: string; // ✅ มี field นี้อยู่แล้ว
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

// ===== HELPER: สร้าง Badge สถานะ =====
const getStatusBadge = (summary: Course['summary']) => {
    if (!summary || summary.total === 0) {
        return <span className="text-slate-400 text-xs flex items-center gap-1 justify-center"><FileText size={12}/> ยังไม่เพิ่มผู้สอน</span>;
    }
    if (summary.isHeadApproved) return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto"><CheckCircle size={12}/> อนุมัติแล้ว</span>;
    if (summary.isHeadRejected) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto animate-pulse"><AlertTriangle size={12}/> ประธานส่งกลับ</span>;
    if (summary.isSubmitted) return <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto"><Send size={12}/> ส่งแล้ว</span>;
    if (summary.lecturerRejected > 0) return <span className="bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto"><AlertCircle size={12}/> มีข้อโต้แย้ง ({summary.lecturerRejected})</span>;
    if (summary.lecturerPending > 0) return <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto"><Clock size={12}/> รอผู้สอน ({summary.lecturerPending})</span>;
    if (summary.isReady) return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 justify-center w-fit mx-auto animate-bounce"><Check size={12}/> พร้อมส่ง</span>;
    return <span className="text-slate-400">-</span>;
};

const getResponsibleName = (user: any) => {
  if (!user) return <span className="text-red-400 text-sm">ยังไม่ระบุ</span>;
  const prefix = user.academicPosition || user.title || "";
  return `${prefix} ${user.firstName || ""} ${user.lastName || ""}`.trim();
};

export default function CourseOwnerPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [courses, setCourses] = useState<Course[]>([]);
  const [staffs, setStaffs] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Data
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // States for Editing
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [tempHours, setTempHours] = useState({ lecture: 0, lab: 0, exam: 0 });
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [searchStaff, setSearchStaff] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // States for Dispute Resolution
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveReason, setResolveReason] = useState("");

  const initialize = async () => {
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
  };

  useEffect(() => {
    if (status === 'authenticated') {
        initialize();
    }
  }, [status, currentUser?.id]); 

  const fetchAssignments = async (subjectId: number) => {
    try {
      const res = await fetch(`/api/assignments?subjectId=${subjectId}`);
      if (!res.ok) {
        setAssignments([]);
        return;
      }
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      setAssignments([]);
    }
  };

  const handleOpenModal = (course: Course) => {
    setSelectedCourse(course);
    if (course.teachingAssignments) {
        setAssignments(course.teachingAssignments);
    }
    fetchAssignments(course.id);
    setIsModalOpen(true);
    setIsAddingLecturer(false);
    setSubmitStatus('idle'); 
    setResolvingId(null);
    setEditingAssignmentId(null);
  };

  const handleAddLecturer = async (staffId: string) => { 
    if (!selectedCourse) return;
    try {
      const isSelf = currentUser && String(staffId) === String(currentUser.id);
      
      const payload: any = { 
        subjectId: selectedCourse.id, 
        lecturerId: staffId 
      };
      
      if (isSelf) payload.lecturerStatus = "APPROVED"; 
      
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        await fetchAssignments(selectedCourse.id);
        setIsAddingLecturer(false);
        setSearchStaff("");
        toast.success(isSelf ? "เพิ่มคุณเป็นผู้สอนและยืนยันเรียบร้อย" : "เพิ่มอาจารย์เรียบร้อยแล้ว");
        initialize(); 
      } else {
        toast.error("ไม่สามารถเพิ่มอาจารย์ได้");
      }
    } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
  };

  const handleUpdateHours = async (id: number) => {
    const targetAssign = assignments.find(a => a.id === id);
    const isSelf = targetAssign && currentUser && String(targetAssign.lecturerId) === String(currentUser.id);
    const isFixingDispute = targetAssign?.lecturerStatus === 'REJECTED';

    try {
      const payload: any = {
        id,
        lectureHours: tempHours.lecture,
        labHours: tempHours.lab,
        examHours: tempHours.exam,
        lecturerStatus: (isSelf || isFixingDispute) ? "APPROVED" : "PENDING",
        responsibleStatus: isFixingDispute ? "APPROVED" : "PENDING", 
        lecturerFeedback: null 
      };

      const res = await fetch("/api/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setEditingAssignmentId(null);
        await fetchAssignments(selectedCourse!.id);
        if (isFixingDispute) {
            toast.success("แก้ไขข้อมูลเรียบร้อย (อนุมัติทันที)");
        } else {
            toast.info("บันทึกข้อมูลแล้ว (ส่งให้อาจารย์ตรวจสอบ)");
        }
        initialize(); 
      } else { toast.error("บันทึกไม่สำเร็จ"); }
    } catch (error) { toast.error("บันทึกไม่สำเร็จ"); }
  };

  const handleInsistOriginal = async (id: number) => {
    if(!resolveReason.trim()) {
        toast.error("กรุณาระบุเหตุผลที่ยืนยันข้อมูลเดิม");
        return;
    }

    try {
        const payload: any = {
            id,
            lecturerStatus: "APPROVED",
            responsibleStatus: "APPROVED", 
            lecturerFeedback: `[ยืนยันข้อมูลเดิม]: ${resolveReason}`
        };

        const res = await fetch("/api/assignments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setResolvingId(null);
            setResolveReason("");
            await fetchAssignments(selectedCourse!.id);
            toast.success("ยืนยันข้อมูลเดิมเรียบร้อย (อนุมัติทันที)");
            initialize();
        } else {
            toast.error("บันทึกไม่สำเร็จ");
        }
    } catch (e) { toast.error("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!confirm("ต้องการลบผู้สอนท่านนี้ออกจากรายวิชา?")) return;
    try {
      const res = await fetch(`/api/assignments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchAssignments(selectedCourse!.id);
        toast.success("ลบข้อมูลเรียบร้อย");
        initialize(); 
      } else { toast.error("ลบไม่สำเร็จ"); }
    } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
  };

  const handleSubmitToChair = async () => {
    if (!confirm("ยืนยันการส่งข้อมูลให้ประธานหลักสูตรตรวจสอบ?")) return;
    setSubmitStatus('submitting');
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
        
        setSubmitStatus('success');
        
        setTimeout(() => {
            setIsModalOpen(false);
            initialize(); 
            setTimeout(() => setSubmitStatus('idle'), 300);
        }, 2000);

    } catch (error) {
        setSubmitStatus('idle');
        toast.error("ส่งข้อมูลไม่สำเร็จ");
    }
  };

  const startEditing = (assign: Assignment) => {
    setEditingAssignmentId(assign.id);
    setTempHours({ lecture: assign.lectureHours || 0, lab: assign.labHours || 0, exam: assign.examHours || 0 });
    setResolvingId(null);
  };

  const filteredCourses = courses.filter(c => {
    if (!currentUser) return false; 
    const isOwner = String(c.responsibleUserId) === String(currentUser.id);
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = c.code.toLowerCase().includes(searchLower) || c.name_th.toLowerCase().includes(searchLower);
    return isOwner && matchSearch;
  });

  const SearchableStaffSelect = ({ onSelect }: { onSelect: (staffId: string) => void }) => {
    const filteredStaffs = staffs.filter(s => s.name.toLowerCase().includes(searchStaff.toLowerCase()));
    return (
      <div className="relative">
        <input autoFocus placeholder="พิมพ์ชื่ออาจารย์เพื่อค้นหา..." className="w-full p-2 pl-10 border rounded-md focus:ring-2 focus:ring-green-500 outline-none text-sm" value={searchStaff} onChange={(e) => setSearchStaff(e.target.value)} />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        {searchStaff && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
            {filteredStaffs.length > 0 ? (
              filteredStaffs.map(staff => (
                <div key={staff.id} className="p-2 hover:bg-green-50 cursor-pointer text-sm text-slate-700 border-b last:border-none" onClick={() => { onSelect(staff.id); setSearchStaff(""); }}>
                  {staff.name}
                </div>
              ))
            ) : <div className="p-3 text-center text-sm text-gray-400">ไม่พบรายชื่อ</div>}
          </div>
        )}
      </div>
    );
  };

  const isRejectedByChair = assignments.some(a => a.headApprovalStatus === 'REJECTED' || a.responsibleStatus === 'REJECTED');
  const isReadyToSubmit = assignments.length > 0 && assignments.every(a => a.lecturerStatus === 'APPROVED');
  const isSubmitted = assignments.length > 0 && assignments.every(a => a.responsibleStatus === 'APPROVED');
  const isLocked = isSubmitted && !isRejectedByChair; 

  if (status === 'loading' || (!currentUser && loading)) {
      return <div className="flex h-screen items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
             <span>จัดการชั่วโมงการสอน</span>
             <ChevronRight size={14}/>
             <span className="text-purple-600">ผู้รับผิดชอบรายวิชา</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">บันทึกผู้สอนและชั่วโมงสอน</h1>
        {currentUser && !loading && (
             <p className="text-slate-500 mt-2 font-light">
                ยินดีต้อนรับ, <span className="font-medium text-purple-600">{currentUser.name}</span>
             </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-8">
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
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
                {/* ✅ เพิ่มคอลัมน์หน่วยกิต */}
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
                    {/* ✅ แสดงหน่วยกิต */}
                    <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                            {course.credit}
                        </span>
                    </td>
                    <td className="p-4 text-slate-600">{course.program.name_th}</td>
                    <td className="p-4 text-center align-middle">{getStatusBadge(course.summary)}</td>
                    <td className="p-4 pr-6 text-center">
                      <button 
                        onClick={() => handleOpenModal(course)} 
                        className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 transition-all shadow-sm text-sm font-medium"
                      >
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
      </div>

      {/* Modal Content */}
      {isModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
            
            {/* Success Overlay */}
            {submitStatus === 'success' && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="flex flex-col items-center animate-in zoom-in-50 slide-in-from-bottom-10 duration-500">
                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-100">
                            <Send className="w-10 h-10 text-blue-600 animate-bounce" />
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-2">ส่งข้อมูลเรียบร้อย!</h3>
                        <p className="text-slate-500 text-lg">ระบบได้ส่งข้อมูลให้ประธานหลักสูตรแล้ว</p>
                    </div>
                </div>
            )}

            <div className="p-6 border-b flex justify-between items-start bg-white sticky top-0 z-20">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{selectedCourse.code} {selectedCourse.name_th}</h2>
                {/* ✅ เพิ่มหน่วยกิตใน Modal Header ด้วย */}
                <div className="flex items-center gap-2 mt-1">
                     <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded border border-purple-200 font-medium">
                        {selectedCourse.credit} หน่วยกิต
                     </span>
                     <p className="text-sm text-slate-500">{selectedCourse.program.name_th}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition"><X size={24} /></button>
            </div>

            {isRejectedByChair && (
                <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div><p className="font-bold text-sm">ถูกส่งกลับแก้ไขโดยประธานหลักสูตร</p><p className="text-xs">กรุณาตรวจสอบและแก้ไขข้อมูลที่มีปัญหา แล้วกดส่งอีกครั้ง</p></div>
                </div>
            )}

            <div className="p-6 overflow-y-auto bg-slate-50/50 custom-scrollbar">
              <div className="flex flex-col gap-6">
                
                {/* Responsible Person Card */}
                <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm"><User size={24} /></div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-0.5">ผู้รับผิดชอบรายวิชา</p>
                        <p className="text-base font-bold text-slate-800">{getResponsibleName(selectedCourse.responsibleUser)}</p>
                      </div>
                </div>

                {/* Lecturers Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><User size={18}/> รายชื่อผู้สอน</h3>
                    </div>
                    
                    {/* Table Header */}
                    <div className="bg-slate-100/50 p-3 grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 border-b uppercase tracking-wider">
                        <div className="col-span-4 pl-2">ชื่อ-สกุล</div>
                        <div className="col-span-2 text-center">บรรยาย (ชม.)</div>
                        <div className="col-span-2 text-center">ปฏิบัติ (ชม.)</div>
                        <div className="col-span-2 text-center">คุมสอบ (ชม.)</div>
                        <div className="col-span-2 text-center">จัดการ</div>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                        {assignments.map((assign) => (
                            <div key={assign.id} className={`grid grid-cols-12 gap-2 items-center text-sm ${assign.lecturerStatus === 'REJECTED' ? 'bg-red-50/60' : 'hover:bg-slate-50'} p-3 transition-colors`}>
                                
                                {/* Case: Rejected (Dispute) */}
                                {assign.lecturerStatus === 'REJECTED' && editingAssignmentId !== assign.id && resolvingId !== assign.id ? (
                                   <div className="col-span-12 flex flex-col gap-3 py-2 pl-2">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-red-600 flex items-center gap-2 text-base">
                                                <AlertCircle size={18} /> แจ้งขอแก้ไขข้อมูล
                                            </div>
                                            <span className="text-slate-700 font-semibold">โดย: {assign.lecturer.firstName} {assign.lecturer.lastName}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-white p-3 rounded-lg border border-red-200 text-red-800 text-sm flex gap-3 shadow-sm">
                                         <MessageSquare size={18} className="mt-0.5 shrink-0 opacity-60"/>
                                         <div>
                                            <span className="font-bold text-xs uppercase text-red-400 block mb-1">เหตุผลที่แจ้งมา:</span>
                                            <span>"{assign.lecturerFeedback || "ไม่ระบุเหตุผล"}"</span>
                                         </div>
                                      </div>

                                      <div className="flex items-center gap-3 mt-1">
                                          <button 
                                            onClick={() => startEditing(assign)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                          >
                                            <Edit2 size={14} /> แก้ไขข้อมูลให้ (จบ)
                                          </button>
                                          
                                          <button 
                                            onClick={() => { setResolvingId(assign.id); setResolveReason(""); }}
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
                                          >
                                            <ShieldCheck size={14} /> ยืนยันข้อมูลเดิม (จบ)
                                          </button>
                                      </div>
                                   </div>
                                ) : (
                                    <>
                                        {/* Name Column */}
                                        <div className="col-span-4 pl-2">
                                            <div className="font-medium text-slate-700">{assign.lecturer.firstName} {assign.lecturer.lastName}</div>
                                            <div className={`text-xs font-semibold mt-0.5 ${assign.lecturerStatus === 'APPROVED' ? 'text-green-600' : 'text-orange-400'}`}>
                                                {assign.lecturerStatus === 'APPROVED' ? '• ยืนยันแล้ว' : '• รอการตอบรับ'}
                                            </div>
                                        </div>
                                        
                                        {/* Editing Mode */}
                                        {editingAssignmentId === assign.id ? (
                                            <>
                                                <div className="col-span-2 px-1"><input type="number" min="0" className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1" value={tempHours.lecture} onChange={(e) => setTempHours({...tempHours, lecture: Number(e.target.value)})} /></div>
                                                <div className="col-span-2 px-1"><input type="number" min="0" className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1" value={tempHours.lab} onChange={(e) => setTempHours({...tempHours, lab: Number(e.target.value)})} /></div>
                                                <div className="col-span-2 px-1"><input type="number" min="0" className="w-full text-center border border-purple-300 rounded focus:ring-2 focus:ring-purple-200 outline-none py-1" value={tempHours.exam} onChange={(e) => setTempHours({...tempHours, exam: Number(e.target.value)})} /></div>
                                                
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    <button onClick={() => handleUpdateHours(assign.id)} className="text-green-600 bg-green-50 p-1.5 rounded hover:bg-green-100 transition" title="บันทึก"><Check size={16}/></button>
                                                    <button onClick={() => setEditingAssignmentId(null)} className="text-slate-400 bg-slate-50 p-1.5 rounded hover:bg-slate-100 transition" title="ยกเลิก"><X size={16}/></button>
                                                </div>
                                            </>
                                        ) : resolvingId === assign.id ? (
                                            <div className="col-span-8 flex flex-col gap-2 bg-white p-3 rounded-lg border border-orange-200 shadow-sm ml-2">
                                                <p className="text-xs font-bold text-orange-600 uppercase">ระบุเหตุผลที่ยืนยันข้อมูลเดิม:</p>
                                                <div className="flex gap-2">
                                                    <input 
                                                        autoFocus
                                                        className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 outline-none focus:border-orange-400" 
                                                        placeholder="เช่น ตรวจสอบตามตารางสอนแล้วถูกต้อง..."
                                                        value={resolveReason}
                                                        onChange={(e) => setResolveReason(e.target.value)}
                                                    />
                                                    <button onClick={() => handleInsistOriginal(assign.id)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap shadow-sm transition">ยืนยัน</button>
                                                    <button onClick={() => setResolvingId(null)} className="text-slate-400 hover:text-slate-600 px-2 text-xs font-medium">ยกเลิก</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="col-span-2 text-center text-slate-600 font-medium">{assign.lectureHours}</div>
                                                <div className="col-span-2 text-center text-slate-600 font-medium">{assign.labHours}</div>
                                                <div className="col-span-2 text-center text-slate-600 font-medium">{assign.examHours}</div>
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    {!isLocked && (
                                                        <>
                                                            <button onClick={() => startEditing(assign)} className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition"><Edit2 size={16}/></button>
                                                            <button onClick={() => handleDeleteAssignment(assign.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"><Trash2 size={16}/></button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-2 flex flex-col gap-3">
                    {!isLocked && (
                        <>
                            {currentUser && !assignments.some(a => String(a.lecturerId) === String(currentUser.id)) && (
                                <button onClick={() => handleAddLecturer(currentUser.id)} className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 font-bold hover:bg-purple-50 hover:border-purple-300 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"><UserPlus size={20} /> เพิ่มตนเองเป็นผู้สอน</button>
                            )}
                            {!isAddingLecturer ? (
                                <button onClick={() => setIsAddingLecturer(true)} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"><Plus size={20} /> เพิ่มผู้สอนท่านอื่น</button>
                            ) : (
                                <div className="p-4 border border-green-200 rounded-xl bg-green-50/50 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1"><SearchableStaffSelect onSelect={handleAddLecturer} /></div>
                                        <button onClick={() => setIsAddingLecturer(false)} className="px-4 py-2 text-sm text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-medium shadow-sm transition">ยกเลิก</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t bg-white flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 font-medium transition-all">ปิดหน้าต่าง</button>
                  <button 
                    onClick={handleSubmitToChair} 
                    disabled={(!isReadyToSubmit && !isLocked) || submitStatus === 'submitting' || isLocked} 
                    className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 text-sm shadow-md transition-all active:scale-95 ${isLocked || submitStatus === 'success' ? "bg-green-500 cursor-default hover:bg-green-500 shadow-none" : !isReadyToSubmit ? "bg-slate-300 cursor-not-allowed shadow-none" : "bg-purple-600 hover:bg-purple-700 shadow-purple-200 hover:shadow-lg"}`}
                  >
                    {submitStatus === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : isLocked ? <><CheckCircle size={18}/> ส่งแล้ว</> : <><Send size={18}/> ส่งข้อมูล</>}
                  </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}