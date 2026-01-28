"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Save, Calendar, BookOpen, Search, Clock, PlusCircle, 
  Layers, CheckCircle2, AlertCircle, MoreVertical, Trash2, Power, History, LayoutDashboard, Loader2,
  Pencil, X, Check, User as UserIcon
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// ✅ IMPORT Server Actions
import { 
    getAcademicYearData, createAcademicYear, setActiveTerm, updateTimeline, toggleCourseOffering 
} from "@/app/action/academic-year"; 

// --- TYPES (อัปเดตเพิ่ม field) ---
type ProcessStep = { id: number; label: string; role: string; startDate: string; endDate: string; };
type Course = { 
    id: string; 
    code: string; 
    name: string; 
    isOpen: boolean;
    responsibleName: string; // ✅ เพิ่มชื่อผู้รับผิดชอบ
    programName: string;     // ✅ เพิ่มชื่อหลักสูตร (แก้ปัญหาวิชาซ้ำ)
};
type TermData = { 
    configId?: string; semester: 1 | 2 | 3; label: string; isActive: boolean; 
    timeline: ProcessStep[]; courses: Course[]; 
};
type AcademicYearData = { year: number; terms: { 1: TermData; 2: TermData; 3: TermData; }; };

const formatDate = (date: Date | null | undefined) => {
    if (!date) return "";
    return new Date(date).toISOString().split('T')[0];
};

export default function AcademicYearConfigPage() {
  const [db, setDb] = useState<Record<string, AcademicYearData>>({});
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeTab, setActiveTab] = useState("1");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState(new Date().getFullYear() + 543);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { termConfigs, allSubjects } = await getAcademicYearData();
            const newDb: Record<string, AcademicYearData> = {};
            
            termConfigs.forEach(config => {
                const yearStr = config.academicYear.toString();
                if (!newDb[yearStr]) newDb[yearStr] = { year: config.academicYear, terms: {} as any };

                const timeline: ProcessStep[] = [
                    { id: 1, label: "บันทึกภาระงานสอน", role: "ผู้รับผิดชอบรายวิชา", startDate: formatDate(config.step1Start), endDate: formatDate(config.step1End) },
                    { id: 2, label: "ตรวจสอบชั่วโมงสอนตนเอง", role: "อาจารย์ผู้สอน", startDate: formatDate(config.step2Start), endDate: formatDate(config.step2End) },
                    { id: 3, label: "พิจารณารับรองข้อมูล", role: "ประธานหลักสูตร", startDate: formatDate(config.step3Start), endDate: formatDate(config.step3End) },
                    { id: 4, label: "อนุมัติข้อมูลภาพรวม", role: "รองคณบดีฝ่ายวิชาการ", startDate: formatDate(config.step4Start), endDate: formatDate(config.step4End) }
                ];

                const courses: Course[] = allSubjects.map(sub => {
                    const offering = config.courseOfferings.find(o => o.subjectId === sub.id);
                    // สร้างชื่ออาจารย์
                    const resp = sub.responsibleUser;
                    const respName = resp ? `${resp.title || ''}${resp.firstName} ${resp.lastName}` : "-";
                    // สร้างชื่อหลักสูตร (ถ้ามี)
                    const progName = sub.program ? `${sub.program.name_th} (${sub.program.year})` : "วิชาแกน/เลือกเสรี";

                    return {
                        id: sub.id.toString(),
                        code: sub.code,
                        name: sub.name_th,
                        isOpen: offering ? offering.isOpen : false,
                        responsibleName: respName,
                        programName: progName
                    };
                });

                newDb[yearStr].terms[config.semester as 1|2|3] = {
                    configId: config.id, semester: config.semester as 1|2|3,
                    label: config.semester === 3 ? "ภาคฤดูร้อน" : `เทอม ${config.semester}`,
                    isActive: config.isActive, timeline: timeline, courses: courses
                };
            });
            setDb(newDb);
            if (!selectedYear) {
                const years = Object.keys(newDb).sort((a,b) => Number(b) - Number(a));
                if (years.length > 0) setSelectedYear(years[0]);
            }
        } catch (error) {
            console.error(error); toast.error("โหลดข้อมูลไม่สำเร็จ");
        } finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const currentYearData = db[selectedYear];
  const currentTermData = currentYearData?.terms[activeTab as unknown as 1 | 2 | 3];
  
  let globalActiveTerm = "ยังไม่มีการตั้งค่า";
  Object.values(db).forEach(y => {
      Object.values(y.terms || {}).forEach(t => { if (t && t.isActive) globalActiveTerm = `${t.semester}/${y.year}`; });
  });

  const handleCreateYear = async () => {
      setIsSaving(true);
      const res = await createAcademicYear(newYearInput);
      setIsSaving(false);
      if (res.success) { toast.success(res.message); setIsCreateModalOpen(false); window.location.reload(); } else { toast.error(res.message); }
  };

  const handleSetActiveTerm = async () => {
      if (!currentTermData?.configId) return;
      const res = await setActiveTerm(currentTermData.configId);
      if (res.success) { toast.success(`Active เทอม ${activeTab}/${selectedYear} แล้ว`); window.location.reload(); }
  };

  const handleSaveTimeline = async () => {
      if (!currentTermData?.configId) return;
      setIsSaving(true);
      const timeline = currentTermData.timeline;
      const data = {
          step1Start: timeline[0].startDate ? new Date(timeline[0].startDate) : undefined, step1End: timeline[0].endDate ? new Date(timeline[0].endDate) : undefined,
          step2Start: timeline[1].startDate ? new Date(timeline[1].startDate) : undefined, step2End: timeline[1].endDate ? new Date(timeline[1].endDate) : undefined,
          step3Start: timeline[2].startDate ? new Date(timeline[2].startDate) : undefined, step3End: timeline[2].endDate ? new Date(timeline[2].endDate) : undefined,
          step4Start: timeline[3].startDate ? new Date(timeline[3].startDate) : undefined, step4End: timeline[3].endDate ? new Date(timeline[3].endDate) : undefined,
      };
      const res = await updateTimeline(currentTermData.configId, data);
      setIsSaving(false);
      if (res.success) { setIsEditingTimeline(false); toast.success("บันทึกเรียบร้อย"); } else { toast.error("บันทึกไม่สำเร็จ"); }
  };

  const handleTimelineChange = (id: number, field: 'startDate' | 'endDate', value: string) => {
    const newDb = { ...db }; newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline = newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline.map(t => t.id === id ? { ...t, [field]: value } : t); setDb(newDb);
  };

  const toggleCourse = async (courseId: string, currentStatus: boolean) => {
      if (!currentTermData?.configId) return;
      const newDb = { ...db }; const term = newDb[selectedYear].terms[activeTab as unknown as 1|2|3];
      term.courses = term.courses.map(c => c.id === courseId ? { ...c, isOpen: !currentStatus } : c);
      setDb(newDb);
      const res = await toggleCourseOffering(currentTermData.configId, parseInt(courseId), !currentStatus);
      if (!res.success) { toast.error("บันทึกไม่สำเร็จ"); term.courses = term.courses.map(c => c.id === courseId ? { ...c, isOpen: currentStatus } : c); setDb({ ...newDb }); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-500 gap-2"><Loader2 className="animate-spin" /> กำลังโหลดข้อมูล...</div>;
  const hasData = Object.keys(db).length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sarabun space-y-6">
      <Toaster position="top-center" richColors />

      {/* SYSTEM STATUS */}
      <Alert className="bg-purple-900 border-none text-white shadow-md flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-800 rounded-full animate-pulse"><LayoutDashboard className="h-5 w-5 text-green-400" /></div>
              <div><AlertTitle className="text-sm font-bold text-purple-100">สถานะระบบ (Active)</AlertTitle><AlertDescription className="text-lg font-bold">เทอม {globalActiveTerm}</AlertDescription></div>
          </div>
      </Alert>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Layers className="text-purple-600" /> จัดการปีการศึกษา</h1><p className="text-slate-500 text-sm mt-1">ตั้งค่ากำหนดการและรายวิชา</p></div>
        <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!hasData}><SelectTrigger className="w-[140px] font-bold"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{Object.keys(db).sort().reverse().map(y => <SelectItem key={y} value={y}>พ.ศ. {y}</SelectItem>)}</SelectContent></Select>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}><DialogTrigger asChild><Button variant="outline" size="icon"><PlusCircle size={20} className="text-purple-600" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>เพิ่มปีการศึกษา</DialogTitle></DialogHeader><div className="py-4"><label>ปีพุทธศักราช:</label><Input type="number" value={newYearInput} onChange={e => setNewYearInput(+e.target.value)} /></div><DialogFooter><Button onClick={handleCreateYear}>สร้าง</Button></DialogFooter></DialogContent></Dialog>
        </div>
      </div>

      {!hasData ? <div className="text-center py-20 bg-white rounded-xl border-dashed border"><Button variant="link" onClick={() => setIsCreateModalOpen(true)}>+ สร้างปีการศึกษาแรก</Button></div> : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1.5 rounded-xl border shadow-sm">
            {[1, 2, 3].map(t => {
                const termInfo = db[selectedYear]?.terms[t as 1|2|3];
                if (!termInfo) return null;
                return <TabsTrigger key={t} value={t.toString()} className="px-6 py-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">{t === 3 ? "ภาคฤดูร้อน" : `เทอม ${t}`} {termInfo.isActive && <Badge className="ml-2 bg-green-500 text-[10px]">Active</Badge>}</TabsTrigger>
            })}
        </TabsList>

        <TabsContent value={activeTab} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: TIMELINE */}
            <div className="lg:col-span-4 space-y-6">
                <Card className={currentTermData?.isActive ? 'border-l-4 border-l-green-500' : ''}>
                    <CardHeader className="pb-2"><CardTitle className="text-base flex justify-between">สถานะ {currentTermData?.isActive ? <CheckCircle2 className="text-green-600"/> : <Power className="text-slate-400"/>}</CardTitle></CardHeader>
                    <CardContent>{currentTermData?.isActive ? <span className="text-green-700 font-bold">✅ เปิดใช้งานอยู่</span> : <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="w-full text-green-700 border-green-200">เปิดใช้งาน (Activate)</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>ยืนยันเปิดใช้งาน?</AlertDialogTitle><AlertDialogDescription>จะปิดเทอมเดิมและเปิดเทอมนี้แทน</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>ยกเลิก</AlertDialogCancel><AlertDialogAction onClick={handleSetActiveTerm} className="bg-green-600">ยืนยัน</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-4 border-b flex flex-row justify-between items-center"><CardTitle className="text-base flex gap-2"><Clock className="text-blue-500"/> ไทม์ไลน์</CardTitle>{!isEditingTimeline ? <Button onClick={() => setIsEditingTimeline(true)} variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5"/></Button> : <div className="flex gap-2"><Button onClick={() => setIsEditingTimeline(false)} variant="ghost" size="sm"><X/></Button><Button onClick={handleSaveTimeline} size="sm" className="bg-purple-600"><Check/></Button></div>}</CardHeader>
                    <CardContent className="pt-4 space-y-5">
                        {currentTermData?.timeline.map((step) => (
                            <div key={step.id} className="relative pl-4 border-l-2 border-slate-100 last:border-0 pb-1">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                                <div className="mb-1"><span className="text-sm font-bold">{step.label}</span></div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div><label className="text-[10px] text-slate-400">เริ่ม</label><Input type="date" className="h-8 text-xs" value={step.startDate || ''} onChange={(e) => handleTimelineChange(step.id, 'startDate', e.target.value)} disabled={!isEditingTimeline} /></div>
                                    <div><label className="text-[10px] text-slate-400">สิ้นสุด</label><Input type="date" className="h-8 text-xs" value={step.endDate || ''} onChange={(e) => handleTimelineChange(step.id, 'endDate', e.target.value)} disabled={!isEditingTimeline} /></div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT: COURSE TABLE (✅ แก้ไขความสูงให้ Fix ที่ 650px) */}
            <div className="lg:col-span-8">
                <Card className="shadow-sm border-t-4 border-t-purple-500 h-[650px] flex flex-col">
                    <CardHeader className="bg-slate-50/50 pb-4 border-b">
                        <div className="flex justify-between items-center">
                            <div><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-600"/> รายวิชา</CardTitle><CardDescription>ค้นหาเพื่อเปิด/ปิดรายวิชา (รวมตกแผน)</CardDescription></div>
                            <div className="relative w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><input type="text" placeholder="ค้นหารหัส/ชื่อวิชา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                        </div>
                    </CardHeader>
                    
                    {/* ✅ ส่วนตาราง: ยืดเต็มพื้นที่ (flex-1) และ Scroll ได้ (overflow-auto) */}
                    <CardContent className="p-0 flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 text-xs uppercase sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 w-[80px] text-center bg-slate-50">สถานะ</th>
                                        <th className="px-4 py-3 bg-slate-50 w-[15%]">รหัส</th>
                                        <th className="px-4 py-3 bg-slate-50 w-[45%]">ชื่อวิชา / หลักสูตร</th>
                                        <th className="px-4 py-3 bg-slate-50 w-[30%]">ผู้รับผิดชอบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentTermData?.courses
                                        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((course) => (
                                        <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-center">
                                                <Switch checked={course.isOpen} onCheckedChange={() => toggleCourse(course.id, course.isOpen)} className="data-[state=checked]:bg-purple-600 scale-90" />
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700 align-top pt-4">{course.code}</td>
                                            <td className="px-4 py-3 align-top pt-3">
                                                <div className="text-slate-800 font-medium">{course.name}</div>
                                                {/* ✅ Badge บอกชื่อหลักสูตร (แก้ปัญหาวิชาซ้ำ) */}
                                                <Badge variant="outline" className="mt-1 text-[10px] text-slate-500 bg-slate-50 border-slate-200 font-normal">
                                                    {course.programName}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs align-top pt-4">
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="w-3 h-3 text-slate-400" />
                                                    {course.responsibleName}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentTermData?.courses.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-slate-400">ไม่พบรายวิชา</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 py-2 border-t text-[10px] text-slate-500 flex justify-between">
                            <span>เปิดสอน: {currentTermData?.courses.filter(c => c.isOpen).length} วิชา</span>
                            <span>ทั้งหมด: {currentTermData?.courses.length} วิชา</span>
                    </CardFooter>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}