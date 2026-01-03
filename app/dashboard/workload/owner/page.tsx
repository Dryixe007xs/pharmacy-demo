"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Search, PenLine, Plus, Trash2, Edit2, X, User, Check, Loader2, UserPlus, 
  AlertCircle, CheckCircle, Send, Clock, FileText, AlertTriangle, MessageSquare, 
  RefreshCcw, ShieldCheck
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

  // ✅✅✅ 1. แก้ไข Logic: แยกกรณี "กรอกครั้งแรก" กับ "แก้ข้อโต้แย้ง"
  const handleUpdateHours = async (id: number) => {
    const targetAssign = assignments.find(a => a.id === id);
    const isSelf = targetAssign && currentUser && String(targetAssign.lecturerId) === String(currentUser.id);
    
    // เช็คว่าตอนนี้กำลังแก้จากสถานะ REJECTED หรือไม่?
    const isFixingDispute = targetAssign?.lecturerStatus === 'REJECTED';

    try {
      const payload: any = {
        id,
        lectureHours: tempHours.lecture,
        labHours: tempHours.lab,
        examHours: tempHours.exam,
        
        // 🔥 LOGIC ใหม่:
        // - ถ้าเป็นตัวเอง (isSelf) -> APPROVED
        // - ถ้าเป็นการแก้ข้อโต้แย้ง (isFixingDispute) -> APPROVED (จบเลย ไม่ต้องส่งกลับ)
        // - ถ้าเป็นการกรอกครั้งแรก/แก้ไขปกติ (ไม่ใช่แก้ Dispute) -> PENDING (ส่งไปให้อาจารย์ตรวจ)
        lecturerStatus: (isSelf || isFixingDispute) ? "APPROVED" : "PENDING",
        
        // ถ้าแก้ Dispute ถือว่าเรา Approved ในฝั่งผู้รับผิดชอบแล้ว (พร้อมส่งประธาน)
        responsibleStatus: isFixingDispute ? "APPROVED" : "PENDING", 

        // ล้าง Feedback เดิมออก
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
        
        // แจ้งเตือนข้อความให้ตรงกับสิ่งที่เกิดขึ้น
        if (isFixingDispute) {
            toast.success("แก้ไขข้อมูลเรียบร้อย (อนุมัติทันที)");
        } else {
            toast.info("บันทึกข้อมูลแล้ว (ส่งให้อาจารย์ตรวจสอบ)");
        }
        
        initialize(); 
      } else { toast.error("บันทึกไม่สำเร็จ"); }
    } catch (error) { toast.error("บันทึกไม่สำเร็จ"); }
  };

  // ✅ 2. ยืนยันข้อมูลเดิม (ไม่แก้ -> ตัดสินใจจบเลย)
  const handleInsistOriginal = async (id: number) => {
    if(!resolveReason.trim()) {
        toast.error("กรุณาระบุเหตุผลที่ยืนยันข้อมูลเดิม");
        return;
    }

    try {
        const payload: any = {
            id,
            // 🔥 เปลี่ยนสถานะเป็น APPROVED ทันที (ผู้รับผิดชอบยืนยันแล้ว ไม่ต้องส่งกลับไปมา)
            lecturerStatus: "APPROVED",
            responsibleStatus: "APPROVED", // พร้อมส่งประธาน

            // บันทึกเหตุผลเก็บไว้ใน feedback
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
        toast.success("ส่งข้อมูลให้ประธานหลักสูตรเรียบร้อยแล้ว");
        setTimeout(() => {
            setIsModalOpen(false);
            initialize(); 
            setTimeout(() => setSubmitStatus('idle'), 300);
        }, 1500);
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
    <div className="space-y-6 font-sarabun p-6 bg-gray-50 min-h-screen relative">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div>
        <h1 className="text-xl text-slate-500 mb-2">กรอกชั่วโมงการสอน/ผู้รับผิดชอบรายวิชา</h1>
        <h2 className="text-2xl font-bold text-slate-800">สำหรับผู้รับผิดชอบรายวิชา</h2>
        {currentUser && (
             <p className="text-sm text-purple-600 mt-1 font-medium">กำลังแสดงรายวิชาของ: {currentUser.name}</p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <h3 className="font-bold text-lg text-slate-700">ค้นหารายวิชา</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-600">รหัสวิชา/ชื่อวิชา</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold text-lg text-slate-700 mb-4">รายชื่อรายวิชาที่คุณรับผิดชอบ ({filteredCourses.length} รายการ)</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-bold text-slate-700 w-[10%]">รหัสวิชา</th>
                <th className="p-4 font-bold text-slate-700 w-[30%]">ชื่อรายวิชา</th>
                <th className="p-4 font-bold text-slate-700 w-[20%]">หลักสูตร</th>
                <th className="p-4 font-bold text-slate-700 w-[20%] text-center">สถานะปัจจุบัน</th>
                <th className="p-4 font-bold text-slate-700 w-[20%] text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400"><div className="flex justify-center items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...</div></td></tr>
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-700">{course.code}</td>
                    <td className="p-4 text-slate-700">
                      <div>{course.name_th}</div>
                      <div className="text-xs text-slate-500">{course.name_en}</div>
                    </td>
                    <td className="p-4 text-slate-600">{course.program.name_th}</td>
                    <td className="p-4 text-center align-middle">{getStatusBadge(course.summary)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleOpenModal(course)} className="h-9 px-3 flex items-center justify-center rounded-md bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors inline-flex ml-auto text-sm font-medium gap-2">
                        <PenLine className="w-4 h-4" /> จัดการ
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400">{currentUser ? "ไม่พบรายวิชาที่คุณรับผิดชอบ" : "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Content */}
      {isModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="p-6 border-b flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">{selectedCourse.code} {selectedCourse.name_th}</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedCourse.program.name_th}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {isRejectedByChair && (
                <div className="bg-red-50 border-b border-red-200 p-3 flex items-center gap-3 text-red-700">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div><p className="font-bold text-sm">ถูกส่งกลับแก้ไข</p><p className="text-xs">กรุณาแก้ไขข้อมูลและส่งใหม่</p></div>
                </div>
            )}

            <div className="p-6 overflow-y-auto bg-gray-50/50">
              <div className="flex flex-col gap-6">
                <div className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><User size={20} /></div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold">ผู้รับผิดชอบรายวิชา</p>
                        <p className="text-base font-bold text-slate-800">{getResponsibleName(selectedCourse.responsibleUser)}</p>
                      </div>
                </div>

                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">รายชื่อผู้สอน</h3>
                    </div>
                    <div className="bg-slate-100 p-2 grid grid-cols-12 gap-2 text-xs font-bold text-slate-600 border-b uppercase">
                        <div className="col-span-4 pl-2">ชื่อ-สกุล</div>
                        <div className="col-span-2 text-center">บรรยาย</div>
                        <div className="col-span-2 text-center">ปฏิบัติ</div>
                        <div className="col-span-2 text-center">คุมสอบ</div>
                        <div className="col-span-2 text-center">จัดการ</div>
                    </div>
                    <div className="divide-y">
                        {assignments.map((assign) => (
                            <div key={assign.id} className={`grid grid-cols-12 gap-2 items-center text-sm ${assign.lecturerStatus === 'REJECTED' ? 'bg-red-50 border-l-4 border-red-500' : 'hover:bg-slate-50'} p-3 transition-colors`}>
                                
                                {/* CASE: ถูก Reject */}
                                {assign.lecturerStatus === 'REJECTED' && editingAssignmentId !== assign.id && resolvingId !== assign.id ? (
                                   <div className="col-span-12 flex flex-col gap-3 py-2">
                                      <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-red-700 flex items-center gap-2 text-base">
                                                <AlertCircle size={18} /> แจ้งขอแก้ไขข้อมูล
                                            </div>
                                            <span className="text-slate-600 font-medium">({assign.lecturer.firstName} {assign.lecturer.lastName})</span>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-white p-3 rounded border border-red-100 text-red-800 text-sm flex gap-2">
                                         <MessageSquare size={16} className="mt-0.5 shrink-0 opacity-50"/>
                                         <span>"{assign.lecturerFeedback || "ไม่ระบุเหตุผล"}"</span>
                                      </div>

                                      <div className="flex items-center gap-3 mt-1">
                                          <button 
                                            onClick={() => startEditing(assign)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"
                                          >
                                            <Edit2 size={14} /> แก้ไขข้อมูลให้ (จบ)
                                          </button>
                                          
                                          <button 
                                            onClick={() => { setResolvingId(assign.id); setResolveReason(""); }}
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"
                                          >
                                            <ShieldCheck size={14} /> ยืนยันข้อมูลเดิม (จบ)
                                          </button>
                                      </div>
                                   </div>
                                ) : (
                                    // Default Row Display
                                    <>
                                        <div className="col-span-4">
                                            <div className="font-medium">{assign.lecturer.firstName} {assign.lecturer.lastName}</div>
                                            <div className={`text-xs ${assign.lecturerStatus === 'APPROVED' ? 'text-green-600' : 'text-slate-400'}`}>{assign.lecturerStatus}</div>
                                        </div>
                                        
                                        {/* Edit Mode */}
                                        {editingAssignmentId === assign.id ? (
                                            <>
                                                {/* ✅✅✅ จุดที่แก้ไข: เพิ่ม min="0" และ onKeyDown ป้องกันเลขติดลบ */}
                                                <div className="col-span-2 px-1"><input type="number" min="0" onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} className="w-full text-center border rounded" value={tempHours.lecture} onChange={(e) => setTempHours({...tempHours, lecture: Number(e.target.value)})} /></div>
                                                <div className="col-span-2 px-1"><input type="number" min="0" onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} className="w-full text-center border rounded" value={tempHours.lab} onChange={(e) => setTempHours({...tempHours, lab: Number(e.target.value)})} /></div>
                                                <div className="col-span-2 px-1"><input type="number" min="0" onKeyDown={(e) => { if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault(); }} className="w-full text-center border rounded" value={tempHours.exam} onChange={(e) => setTempHours({...tempHours, exam: Number(e.target.value)})} /></div>
                                                {/* ✅✅✅ สิ้นสุดจุดแก้ไข */}
                                                
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    <button onClick={() => handleUpdateHours(assign.id)} className="text-green-600 bg-green-50 p-1 rounded hover:bg-green-100" title="บันทึก"><Check size={18}/></button>
                                                    <button onClick={() => setEditingAssignmentId(null)} className="text-gray-500 bg-gray-50 p-1 rounded hover:bg-gray-100" title="ยกเลิก"><X size={18}/></button>
                                                </div>
                                            </>
                                        ) : resolvingId === assign.id ? (
                                            // Resolve Mode (Insist Original)
                                            <div className="col-span-8 flex flex-col gap-2 bg-orange-50 p-2 rounded border border-orange-200">
                                                <p className="text-xs font-bold text-orange-800">ระบุเหตุผลที่ยืนยันข้อมูลเดิม (บันทึก):</p>
                                                <div className="flex gap-2">
                                                    <input 
                                                        autoFocus
                                                        className="flex-1 text-sm border border-orange-200 rounded px-2 py-1" 
                                                        placeholder="เช่น ตรวจสอบตามตารางสอนแล้วถูกต้อง..."
                                                        value={resolveReason}
                                                        onChange={(e) => setResolveReason(e.target.value)}
                                                    />
                                                    <button onClick={() => handleInsistOriginal(assign.id)} className="bg-orange-600 text-white px-3 py-1 rounded text-xs whitespace-nowrap">ยืนยัน (จบ)</button>
                                                    <button onClick={() => setResolvingId(null)} className="text-slate-500 px-2 text-xs">ยกเลิก</button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div className="col-span-2 text-center">{assign.lectureHours}</div>
                                                <div className="col-span-2 text-center">{assign.labHours}</div>
                                                <div className="col-span-2 text-center">{assign.examHours}</div>
                                                <div className="col-span-2 flex justify-center gap-2">
                                                    {!isLocked && (
                                                        <>
                                                            <button onClick={() => startEditing(assign)} className="text-orange-500 hover:bg-orange-50 p-1 rounded"><Edit2 size={16}/></button>
                                                            <button onClick={() => handleDeleteAssignment(assign.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
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

                <div className="mt-4 flex flex-col gap-3">
                    {!isLocked && (
                        <>
                            {currentUser && !assignments.some(a => String(a.lecturerId) === String(currentUser.id)) && (
                                <button onClick={() => handleAddLecturer(currentUser.id)} className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-700 font-medium hover:bg-purple-50 flex items-center justify-center gap-2"><UserPlus size={20} /> เพิ่มตนเอง</button>
                            )}
                            {!isAddingLecturer ? (
                                <button onClick={() => setIsAddingLecturer(true)} className="w-full py-3 border-2 border-dashed border-green-300 rounded-lg text-green-700 font-medium hover:bg-green-50 flex items-center justify-center gap-2"><Plus size={20} /> เพิ่มท่านอื่น</button>
                            ) : (
                                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1"><SearchableStaffSelect onSelect={handleAddLecturer} /></div>
                                        <button onClick={() => setIsAddingLecturer(false)} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-300 rounded-md">ยกเลิก</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-between items-center shadow-lg z-10">
              <div className="text-sm text-slate-500">
                 {/* Status text logic */}
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg">ปิดหน้าต่าง</button>
                  <button onClick={handleSubmitToChair} disabled={(!isReadyToSubmit && !isLocked) || submitStatus === 'submitting' || isLocked} className={`px-6 py-2.5 rounded-lg text-white font-bold flex items-center gap-2 ${isLocked || submitStatus === 'success' ? "bg-green-500 cursor-default" : !isReadyToSubmit ? "bg-slate-300 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"}`}>
                    {submitStatus === 'submitting' ? <Loader2 size={18} className="animate-spin" /> : isLocked ? "ส่งแล้ว" : "ส่งข้อมูล"}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}