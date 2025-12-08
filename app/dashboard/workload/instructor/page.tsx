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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, CheckCircle, AlertCircle, Plus, Check, ExternalLink, Loader2 } from "lucide-react";
import { Toaster, toast } from 'sonner';

// Types
type Assignment = {
  id: number;
  subjectId: number;
  lectureHours: number;
  labHours: number;
  examHours: number;
  lecturerStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  lecturerFeedback?: string;
  subject: {
    code: string;
    name_th: string;
    program: {
        name_th: string;
        degree_level: string;
    };
    responsibleUserId: number;
  };
};

type Course = {
    id: number;
    code: string;
    name_th: string;
    program: {
        name_th: string;
        year: number;
    }
};

export default function InstructorWorkloadPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Auth State
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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
    evidenceLink: ""
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  // ===== 1. SYNC USER =====
  useEffect(() => {
    const syncUser = () => {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUserId(user.id);
            } catch (e) {
                console.error("User parse error");
                setCurrentUserId(null);
            }
        } else {
            setCurrentUserId(null);
        }
    };
    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => window.removeEventListener("auth-change", syncUser);
  }, []);

  // ===== 2. FETCH DATA =====
  useEffect(() => {
    if (currentUserId) {
        fetchData(currentUserId);
    } else {
        setAssignments([]);
        setLoading(false);
    }
  }, [currentUserId]); 

  const fetchData = async (userId: number) => {
    setLoading(true);
    try {
        const resAssign = await fetch(`/api/assignments?lecturerId=${userId}`);
        const dataAssign = await resAssign.json();
        
        const resCourses = await fetch("/api/courses");
        const dataCourses = await resCourses.json();

        setAssignments(Array.isArray(dataAssign) ? dataAssign : []);
        setAllCourses(Array.isArray(dataCourses) ? dataCourses : []);

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

        if (res.ok && currentUserId) {
            fetchData(currentUserId); 
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

        if (res.ok && currentUserId) {
            setIsDisputeOpen(false);
            setDisputeNote("");
            fetchData(currentUserId);
            toast.success("ส่งคำร้องแก้ไขเรียบร้อย");
        } else {
            toast.error("บันทึกไม่สำเร็จ");
        }
    } catch (e) {
        toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleAddExternalCourse = async () => {
    console.log("Saving External Course:", externalCourseForm);
    toast.success("บันทึกข้อมูลรายวิชานอกคณะเรียบร้อย (Mock)");
    setIsAddOpen(false);
    setExternalCourseForm({
        faculty: "", code: "", nameTh: "", nameEn: "", lectureHours: 0, labHours: 0, evidenceLink: ""
    });
  };

  // ===== FILTER LOGIC (Updated) =====
  const filteredAssignments = assignments.filter(a => {
    // 1. ค้นหา
    const matchSearch = a.subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.subject.name_th.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. กรองวิชาที่ตัวเองเป็นเจ้าของออก (เพราะจัดการหน้า Owner แล้ว)
    const isOwner = a.subject.responsibleUserId === currentUserId;

    // 3. ✅ กรองวิชาที่ชั่วโมงยังเป็น 0 ทั้งหมดออก (ยังไม่พร้อมให้ยืนยัน)
    const hasHours = (a.lectureHours || 0) + (a.labHours || 0) + (a.examHours || 0) > 0;

    return matchSearch && !isOwner && hasHours;
  });

  // Calculate totals
  const totalLab = filteredAssignments.reduce((sum, item) => sum + item.labHours, 0);
  const totalLecture = filteredAssignments.reduce((sum, item) => sum + item.lectureHours, 0);
  const totalExam = filteredAssignments.reduce((sum, item) => sum + (item.examHours || 0), 0);

  return (
    <div className="space-y-6 font-sarabun p-6 bg-gray-50 min-h-screen">
      
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div>
        <h1 className="text-xl text-slate-500 mb-2">กรอกชั่วโมงการสอน/ผู้สอน</h1>
        <h2 className="text-2xl font-bold text-slate-800">ตรวจสอบภาระงานสอน</h2>
        {currentUserId && !loading && (
             <p className="text-sm text-purple-600 mt-1 font-medium animate-in fade-in">
                กำลังแสดงข้อมูลของคุณ
             </p>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <h3 className="font-bold text-lg text-slate-700">ค้นหารายวิชา</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-slate-600">รหัสวิชา / ชื่อวิชา</label>
              <div className="relative">
                <input 
                    placeholder="พิมพ์คำค้นหา..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              </div>
           </div>
           <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">หลักสูตร</label>
              <Select><SelectTrigger><SelectValue placeholder="ทุกหลักสูตร"/></SelectTrigger><SelectContent/></Select>
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <div className="text-center mb-6">
            <h3 className="font-bold text-lg text-slate-800">ตรวจสอบข้อมูลชั่วโมงปฏิบัติการ/บรรยาย ปีการศึกษา 2567</h3>
            <p className="text-slate-600">สถานะข้อมูล: <span className="text-green-600 font-medium">กำลังดำเนินการ</span></p>
        </div>

        <div className="rounded-lg border overflow-hidden">
           <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700">รหัสวิชา / ชื่อรายวิชา</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">บทบาท</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">บรรยาย (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">ปฏิบัติ (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700">คุมสอบ (ชม.)</TableHead>
                    <TableHead className="text-center font-bold text-slate-700 min-w-[200px]">สถานะการยืนยัน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  
                  {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center p-8 text-slate-400">
                          <div className="flex justify-center items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
                          </div>
                      </TableCell></TableRow>
                  ) : filteredAssignments.length > 0 ? (
                      filteredAssignments.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                            <TableCell>
                                <div className="font-medium text-slate-800">{item.subject.code}</div>
                                <div className="text-slate-600">{item.subject.name_th}</div>
                                <div className="text-xs text-slate-400">{item.subject.program.name_th}</div>
                            </TableCell>
                            <TableCell className="text-center text-slate-600">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">ผู้สอน</span>
                            </TableCell>
                            <TableCell className="text-center text-base">{item.lectureHours}</TableCell>
                            <TableCell className="text-center text-base">{item.labHours}</TableCell>
                            <TableCell className="text-center text-base">{item.examHours || 0}</TableCell>
                            <TableCell className="text-center">
                                {item.lecturerStatus === 'APPROVED' ? (
                                    <div className="flex items-center justify-center gap-2 text-green-600 font-medium text-sm bg-green-50 py-1 px-3 rounded-full w-fit mx-auto border border-green-200">
                                        <CheckCircle className="w-4 h-4" /> ยืนยันแล้ว
                                    </div>
                                ) : item.lecturerStatus === 'REJECTED' ? (
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 text-red-600 font-medium text-sm mb-1">
                                            <AlertCircle className="w-4 h-4" /> แจ้งแก้ไขแล้ว
                                        </div>
                                        <Button 
                                            variant="link" 
                                            className="text-orange-500 underline decoration-dashed p-0 h-auto text-xs" 
                                            onClick={() => { setSelectedItem(item); setDisputeNote(item.lecturerFeedback || ""); setIsDisputeOpen(true); }}
                                        >
                                            ดูรายละเอียด / แก้ไข
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        <Button 
                                            size="sm" 
                                            className="bg-green-600 hover:bg-green-700 h-8 text-xs shadow-sm"
                                            onClick={() => handleVerify(item.id)}
                                        >
                                            <Check className="w-3 h-3 mr-1" /> ยืนยันถูกต้อง
                                        </Button>
                                        
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="h-8 text-xs bg-red-500 hover:bg-red-600 shadow-sm"
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
                      <TableRow><TableCell colSpan={6} className="text-center p-8 text-slate-400">
                          {currentUserId 
                            ? "ไม่พบรายวิชาที่ต้องยืนยัน (หรือยังไม่มีการกรอกชั่วโมงสอนเข้ามา)" 
                            : "กรุณาเลือกผู้ใช้งานจาก Navbar เพื่อดูข้อมูล"}
                      </TableCell></TableRow>
                  )}

                  <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <TableCell colSpan={2} className="text-right pr-6">รวมชั่วโมงทั้งหมด</TableCell>
                    <TableCell className="text-center text-blue-700">{totalLecture}</TableCell>
                    <TableCell className="text-center text-blue-700">{totalLab}</TableCell>
                    <TableCell className="text-center text-blue-700">{totalExam}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                </TableBody>
              </Table>
           </div>
        </div>

        {/* Action Buttons Area */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
            
            {/* External Course Button */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="text-green-600 border-green-600 border-dashed hover:bg-green-50">
                        <Plus className="w-4 h-4 mr-2" /> เพิ่มรายวิชาอื่นๆ (นอกคณะ/ภายใน ม.พะเยา)
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>เพิ่มวิชาอื่นๆ ใน มหาวิทยาลัยพะเยา (นอกคณะเภสัชศาสตร์)</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">คณะ / หน่วยงาน</label>
                            <Select onValueChange={(val) => setExternalCourseForm({...externalCourseForm, faculty: val})}>
                                <SelectTrigger><SelectValue placeholder="เลือกคณะ" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sci">คณะวิทยาศาสตร์</SelectItem>
                                    <SelectItem value="med">คณะแพทยศาสตร์</SelectItem>
                                    <SelectItem value="other">อื่นๆ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">รหัสวิชา</label>
                            <Input 
                                placeholder="เช่น 123xxx" 
                                value={externalCourseForm.code}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, code: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อวิชา (ภาษาไทย)</label>
                            <Input 
                                placeholder="ชื่อวิชาภาษาไทย" 
                                value={externalCourseForm.nameTh}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, nameTh: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชื่อวิชา (ภาษาอังกฤษ)</label>
                            <Input 
                                placeholder="Course Name (EN)" 
                                value={externalCourseForm.nameEn}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, nameEn: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชั่วโมงบรรยาย</label>
                            <Input 
                                type="number" 
                                placeholder="0" 
                                value={externalCourseForm.lectureHours}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, lectureHours: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">ชั่วโมงปฏิบัติการ</label>
                            <Input 
                                type="number" 
                                placeholder="0" 
                                value={externalCourseForm.labHours}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, labHours: Number(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                หลักฐานอ้างอิง (Link) <ExternalLink size={14} className="text-slate-400"/>
                            </label>
                            <Input 
                                placeholder="เช่น Google Drive Link คำสั่งแต่งตั้ง หรือ ตารางสอน" 
                                value={externalCourseForm.evidenceLink}
                                onChange={(e) => setExternalCourseForm({...externalCourseForm, evidenceLink: e.target.value})}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)}>ยกเลิก</Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddExternalCourse}>บันทึกข้อมูล</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex gap-3">
                <Button variant="outline" className="min-w-[100px]">พิมพ์รายงาน</Button>
            </div>
        </div>

        {/* Dispute Modal */}
        <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-red-600 flex flex-col items-center gap-2">
                        <AlertCircle size={32} />
                        แจ้งขอแก้ไขข้อมูล
                    </DialogTitle>
                    <div className="text-center text-sm text-slate-500">
                        {selectedItem?.subject.code} {selectedItem?.subject.name_th}
                    </div>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">ระบุสิ่งที่ต้องการแก้ไข</label>
                        <Input 
                            placeholder="เช่น ชั่วโมงบรรยายจริงคือ 15 ชม. หรือ ผมไม่ได้สอนวิชานี้..." 
                            value={disputeNote}
                            onChange={(e) => setDisputeNote(e.target.value)}
                        /> 
                    </div>
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                      <Button variant="outline" onClick={() => setIsDisputeOpen(false)} className="w-full sm:w-auto">ยกเลิก</Button>
                      <Button variant="destructive" className="w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={handleDisputeSubmit}>ยืนยันการแจ้ง</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}