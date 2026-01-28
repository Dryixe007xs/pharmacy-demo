"use client";

import { useState, useEffect } from "react";
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
import { Search, CheckCircle, AlertCircle, Plus, Check, Loader2, Link as LinkIcon, Building2, ChevronRight, X } from "lucide-react";
import { Toaster, toast } from 'sonner';

// Types
type Assignment = {
  id: number;
  subjectId: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  examCritiqueHours: number;
  lecturerStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT'; // เพิ่ม DRAFT ใน type
  lecturerFeedback?: string;
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

// ✅ Custom Modal Component
const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    icon: Icon, 
    colorClass = "text-slate-800",
    children,
    maxWidth = "max-w-xl",
    zIndex = 9999
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
            document.body.style.overflow = 'hidden'; 
        } else {
            const timer = setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = 'unset';
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted || !isVisible) return null;

    return createPortal(
        <div 
            className={`fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            style={{ zIndex: zIndex }}
        >
            <div 
                className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${maxWidth} ${isOpen ? 'scale-100' : 'scale-95'}`} 
                style={{ maxHeight: '90vh' }}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0 z-20">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}>
                        {Icon && <Icon size={22} />} {title}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="overflow-y-auto custom-scrollbar flex-1 relative bg-white p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default function InstructorWorkloadPage() {
  const { data: session, status } = useSession();
  const currentUser = session?.user;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Assignment | null>(null);
  const [disputeNote, setDisputeNote] = useState("");
  
  // State for external course form
  const [externalCourseForm, setExternalCourseForm] = useState({
    faculty: "",
    code: "",
    nameTh: "",
    nameEn: "",
    lectureHours: 0,
    labHours: 0,
    examHours: 0,
    evidenceLink: ""
  });

  const [isSubmittingExternal, setIsSubmittingExternal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === 'authenticated' && currentUser?.id) {
        fetchData(currentUser.id);
    } else if (status === 'unauthenticated') {
        setAssignments([]);
        setLoading(false);
    }
  }, [status, currentUser?.id]); 

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
        const resAssign = await fetch(`/api/assignments?lecturerId=${userId}`);
        const dataAssign = await resAssign.json();
        setAssignments(Array.isArray(dataAssign) ? dataAssign : []);
    } catch (err) {
        console.error("Error loading data:", err);
        toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
        setLoading(false);
    }
  };

  // --- Handlers ---
  const handleVerify = async (id: number) => {
    if(!confirm("ยืนยันว่าข้อมูลชั่วโมงสอนถูกต้อง?")) return;
    try {
        const res = await fetch("/api/assignments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                lecturerStatus: "APPROVED",
                lecturerFeedback: null 
            })
        });
        if (res.ok && currentUser?.id) {
            fetchData(currentUser.id); 
            toast.success("ยืนยันข้อมูลเรียบร้อย");
        } else {
            toast.error("บันทึกไม่สำเร็จ");
        }
    } catch (e) {
        toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleDisputeSubmit = async () => {
    if (!selectedItem) return;
    try {
        const res = await fetch("/api/assignments", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: selectedItem.id,
                lecturerStatus: "REJECTED",
                lecturerFeedback: disputeNote
            })
        });
        if (res.ok && currentUser?.id) {
            setIsDisputeOpen(false);
            setDisputeNote("");
            fetchData(currentUser.id);
            toast.success("ส่งคำร้องแก้ไขเรียบร้อย");
        } else {
            toast.error("บันทึกไม่สำเร็จ");
        }
    } catch (e) {
        toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleAddExternalCourse = async () => {
    if (!externalCourseForm.faculty || !externalCourseForm.code || !externalCourseForm.nameTh) {
        toast.error("กรุณากรอกข้อมูลสำคัญให้ครบ (คณะ, รหัสวิชา, ชื่อวิชา)");
        return;
    }
    setIsSubmittingExternal(true);
    try {
        const res = await fetch("/api/assignments/external", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...externalCourseForm,
                lecturerId: currentUser?.id 
            })
        });
        if (res.ok) {
            toast.success("บันทึกข้อมูลรายวิชานอกคณะเรียบร้อย");
            setIsAddOpen(false);
            setExternalCourseForm({
                faculty: "", code: "", nameTh: "", nameEn: "", lectureHours: 0, labHours: 0, examHours: 0, evidenceLink: ""
            });
            if (currentUser?.id) fetchData(currentUser.id);
        } else {
            const errorData = await res.json();
            toast.error(errorData.error || "บันทึกไม่สำเร็จ");
        }
    } catch (error) {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
        setIsSubmittingExternal(false);
    }
  };

  // ===== FILTER & CALCULATE =====
  const filteredAssignments = assignments.filter(a => {
    const matchSearch = a.subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.subject.name_th.toLowerCase().includes(searchTerm.toLowerCase());
    
    // ✅ จุดที่แก้ไข: กรอง DRAFT และ null ออก ไม่ให้แสดงผล
    const isSentToLecturer = a.lecturerStatus !== 'DRAFT' && a.lecturerStatus !== null;

    return matchSearch && isSentToLecturer; 
  });

  const totalLab = filteredAssignments.reduce((sum, item) => sum + item.labHours, 0);
  const totalLecture = filteredAssignments.reduce((sum, item) => sum + item.lectureHours, 0);
  const totalExam = filteredAssignments.reduce((sum, item) => sum + (item.examHours || 0), 0);
  const totalCritique = filteredAssignments.reduce((sum, item) => sum + (item.examCritiqueHours || 0), 0);

  if (status === 'loading') {
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
             <span className="text-purple-600">ผู้สอน</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">ตรวจสอบภาระงานสอน</h1>
        {currentUser && !loading && (
             <p className="text-slate-500 mt-2 font-light">
                ยินดีต้อนรับ, <span className="font-medium text-purple-600">{currentUser.name}</span>
             </p>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm mb-6 sticky top-4 z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="w-full md:max-w-md space-y-2">
              <Label className="text-sm font-medium text-slate-600">ค้นหารหัสวิชา / ชื่อวิชา</Label>
              <div className="relative">
                <input 
                    placeholder="พิมพ์เพื่อค้นหา..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-purple-100 transition-all" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              </div>
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="text-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">ตรวจสอบข้อมูลชั่วโมงปฏิบัติการ/บรรยาย ปีการศึกษา 2567</h3>
            <p className="text-slate-600">สถานะข้อมูล: <span className="text-green-600 font-medium">กำลังดำเนินการ</span></p>
        </div>

        <div className="rounded-xl border overflow-hidden">
           <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">รหัสวิชา / ชื่อรายวิชา</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">หน่วยกิต</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">บทบาท</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">บรรยาย (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">ปฏิบัติ (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">คุมสอบนอกตาราง (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">วิพากษ์ข้อสอบ (ชม.)</TableHead> 
                    <TableHead className="text-center font-bold text-slate-700 min-w-[200px]">สถานะการยืนยัน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center p-8 text-slate-400">
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
                          </div>
                      </TableCell></TableRow>
                  ) : filteredAssignments.length > 0 ? (
                      filteredAssignments.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                                <div className="font-medium text-slate-800">{item.subject.code}</div>
                                <div className="text-slate-600">{item.subject.name_th}</div>
                                <div className="text-xs text-slate-400 mt-1 inline-block bg-slate-100 px-2 py-0.5 rounded">{item.subject.program?.name_th}</div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                                    {item.subject.credit || '-'}
                                </span>
                            </TableCell>
                            <TableCell className="text-center text-slate-600">
                                <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-xs font-medium">ผู้สอน</span>
                            </TableCell>
                            <TableCell className="text-center text-base">{item.lectureHours}</TableCell>
                            <TableCell className="text-center text-base">{item.labHours}</TableCell>
                            <TableCell className="text-center text-base">{item.examHours || 0}</TableCell>
                            <TableCell className="text-center text-base font-medium text-slate-600">{item.examCritiqueHours || 0}</TableCell>
                            <TableCell className="text-center">
                                {item.lecturerStatus === 'APPROVED' ? (
                                    <div className="flex items-center justify-center gap-2 text-green-600 font-medium text-sm bg-green-50 py-1 px-3 rounded-full w-fit mx-auto border border-green-200">
                                        <CheckCircle className="w-4 h-4" /> ยืนยันแล้ว
                                    </div>
                                ) : item.lecturerStatus === 'REJECTED' ? (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 text-red-600 font-medium text-sm mb-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                            <AlertCircle className="w-4 h-4" /> แจ้งแก้ไขแล้ว
                                        </div>
                                        <Button 
                                            variant="link" 
                                            className="text-orange-500 underline decoration-dashed p-0 h-auto text-xs hover:text-orange-600" 
                                            onClick={() => { setSelectedItem(item); setDisputeNote(item.lecturerFeedback || ""); setIsDisputeOpen(true); }}
                                        >
                                            ดูรายละเอียด / แก้ไข
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700 h-8 text-xs shadow-sm rounded-lg"
                                            onClick={() => handleVerify(item.id)}
                                        >
                                            <Check className="w-3 h-3 mr-1" /> ยืนยันถูกต้อง
                                        </Button>
                                        
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="h-8 text-xs bg-red-500 hover:bg-red-600 shadow-sm rounded-lg"
                                            onClick={() => { setSelectedItem(item); setDisputeNote(""); setIsDisputeOpen(true); }}
                                        >
                                            แจ้งแก้ไข
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                      ))
                  ) : (
                      <TableRow><TableCell colSpan={8} className="text-center p-8 text-slate-400">
                          {currentUser 
                            ? "ไม่พบรายวิชาที่ต้องยืนยัน (หรือยังไม่มีการกรอกชั่วโมงสอนเข้ามา)" 
                            : "กรุณาเลือกผู้ใช้งานจาก Navbar เพื่อดูข้อมูล"}
                      </TableCell></TableRow>
                  )}

                  <TableRow className="bg-slate-50/50 font-bold border-t-2 border-slate-200">
                    <TableCell colSpan={3} className="text-right pr-6 text-slate-500">รวมชั่วโมงทั้งหมด</TableCell>
                    <TableCell className="text-center text-blue-700">{totalLecture}</TableCell>
                    <TableCell className="text-center text-blue-700">{totalLab}</TableCell>
                    <TableCell className="text-center text-blue-700">{totalExam}</TableCell>
                    <TableCell className="text-center text-blue-700">{totalCritique}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                </TableBody>
              </Table>
           </div>
        </div>

        {/* Action Buttons Area */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            
            <Button variant="outline" className="text-green-600 border-green-600 border-dashed hover:bg-green-50 rounded-xl" onClick={() => setIsAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> เพิ่มรายวิชาอื่นๆ (นอกคณะ/ภายใน ม.พะเยา)
            </Button>

            <div className="flex gap-3">
                <Button variant="outline" className="min-w-[100px] rounded-xl">พิมพ์รายงาน</Button>
            </div>
        </div>

        {/* ✅ ADD EXTERNAL COURSE MODAL */}
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
                            <Label className="text-sm font-medium text-slate-700">คณะ/หน่วยงานที่สอน <span className="text-red-500">*</span></Label>
                            <Input 
                                placeholder="เช่น คณะศิลปศาสตร์, สำนักวิชา..." 
                                value={externalCourseForm.faculty}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, faculty: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700">รหัสวิชา <span className="text-red-500">*</span></Label>
                            <Input 
                                placeholder="เช่น 001101" 
                                value={externalCourseForm.code}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, code: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาไทย) <span className="text-red-500">*</span></Label>
                        <Input 
                            placeholder="เช่น ภาษาอังกฤษเพื่อการสื่อสาร" 
                            value={externalCourseForm.nameTh}
                            onChange={(e) => setExternalCourseForm({...externalCourseForm, nameTh: e.target.value})}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">ชื่อรายวิชา (ภาษาอังกฤษ)</Label>
                        <Input 
                            placeholder="Optional" 
                            value={externalCourseForm.nameEn}
                            onChange={(e) => setExternalCourseForm({...externalCourseForm, nameEn: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 text-center block">ชั่วโมงบรรยาย</Label>
                            <Input 
                                type="number" min="0" className="text-center"
                                onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                                value={externalCourseForm.lectureHours}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, lectureHours: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 text-center block">ชั่วโมงปฏิบัติ</Label>
                            <Input 
                                type="number" min="0" className="text-center"
                                onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                                value={externalCourseForm.labHours}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, labHours: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-slate-700 text-center block">ชั่วโมงคุมสอบ</Label>
                            <Input 
                                type="number" min="0" className="text-center"
                                onKeyDown={(e) => ["-", "e", "E", "+"].includes(e.key) && e.preventDefault()}
                                value={externalCourseForm.examHours || 0}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, examHours: Number(e.target.value)})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <LinkIcon size={16} /> ลิงก์เอกสารอ้างอิง/คำสั่งแต่งตั้ง (ถ้ามี)
                        </Label>
                        <Input 
                            placeholder="https://..." 
                            value={externalCourseForm.evidenceLink}
                            onChange={(e) => setExternalCourseForm({...externalCourseForm, evidenceLink: e.target.value})}
                        />
                    </div>
                </div>
            </div>
            {/* Footer */}
            <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-20 mt-6 -mx-6 -mb-6 rounded-b-2xl">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmittingExternal} className="bg-white">ยกเลิก</Button>
                <Button 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    onClick={handleAddExternalCourse}
                    disabled={isSubmittingExternal}
                >
                    {isSubmittingExternal ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2" />}
                    บันทึกข้อมูล
                </Button>
            </div>
        </Modal>

        {/* ✅ Dispute Modal */}
        <Modal 
            isOpen={isDisputeOpen} 
            onClose={() => setIsDisputeOpen(false)}
            title="แจ้งขอแก้ไขข้อมูล"
            icon={AlertCircle}
            colorClass="text-red-600"
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="text-center text-sm text-slate-500 mb-4">
                    {selectedItem?.subject.code} {selectedItem?.subject.name_th}
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium">ระบุสิ่งที่ต้องการแก้ไข</Label>
                    <Input 
                        placeholder="เช่น ชั่วโมงบรรยายจริงคือ 15 ชม. หรือ ผมไม่ได้สอนวิชานี้..." 
                        value={disputeNote}
                        onChange={(e) => setDisputeNote(e.target.value)}
                    /> 
                </div>
            </div>
            <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-20 mt-6 -mx-6 -mb-6 rounded-b-2xl">
                <Button variant="outline" onClick={() => setIsDisputeOpen(false)} className="bg-white">ยกเลิก</Button>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={handleDisputeSubmit}>ยืนยันการแจ้ง</Button>
            </div>
        </Modal>

      </div>
    </div>
  );
}