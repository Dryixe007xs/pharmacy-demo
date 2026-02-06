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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogAction, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { 
  Layers, Clock, PlusCircle, 
  BookOpen, Search, Loader2, Pencil, X, Check, User as UserIcon, ShieldCheck, Trash2
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// Import Server Actions
import { 
    getAcademicYearData, createAcademicYear, updateTimeline, toggleCourseOffering, setActiveYear, deleteAcademicYear
} from "@/app/action/academic-year"; 

// Types
type ProcessStep = { id: number; label: string; role: string; startDate: string; endDate: string; };
type Course = { id: string; code: string; name: string; isOpen: boolean; responsibleName: string; programName: string; };
type TermData = { configId?: string; semester: 1 | 2 | 3; label: string; timeline: ProcessStep[]; courses: Course[]; };
type AcademicYearData = { year: number; isActiveYear: boolean; terms: { 1: TermData; 2: TermData; 3: TermData; }; };

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
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);

  // UI States
  const [confirmActiveOpen, setConfirmActiveOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isCopyPrevious, setIsCopyPrevious] = useState(true);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { termConfigs, allSubjects, academicYears } = await getAcademicYearData();
            const newDb: Record<string, AcademicYearData> = {};
            
            termConfigs.forEach(config => {
                const yearStr = config.academicYear.toString();
                const yearMaster = academicYears?.find((y: any) => y.id === config.academicYear);
                
                if (!newDb[yearStr]) {
                  newDb[yearStr] = { 
                    year: config.academicYear, 
                    isActiveYear: yearMaster?.isActive || false, 
                    terms: {} as any 
                  };
                }

                const timeline: ProcessStep[] = [
                    { id: 1, label: "บันทึกภาระงานสอน", role: "ผู้รับผิดชอบรายวิชา", startDate: formatDate(config.step1Start), endDate: formatDate(config.step1End) },
                    { id: 2, label: "ตรวจสอบชั่วโมงสอนตนเอง", role: "อาจารย์ผู้สอน", startDate: formatDate(config.step2Start), endDate: formatDate(config.step2End) },
                    { id: 3, label: "พิจารณารับรองข้อมูล", role: "ประธานหลักสูตร", startDate: formatDate(config.step3Start), endDate: formatDate(config.step3End) },
                    { id: 4, label: "อนุมัติข้อมูลภาพรวม", role: "รองคณบดีฝ่ายวิชาการ", startDate: formatDate(config.step4Start), endDate: formatDate(config.step4End) }
                ];

                const courses: Course[] = allSubjects.map(sub => {
                    const offering = config.courseOfferings.find(o => o.subjectId === sub.id);
                    return {
                        id: sub.id.toString(),
                        code: sub.code,
                        name: sub.name_th,
                        isOpen: offering ? offering.isOpen : false,
                        responsibleName: sub.responsibleUser ? `${sub.responsibleUser.firstName} ${sub.responsibleUser.lastName}` : "-",
                        programName: sub.program ? `${sub.program.name_th}` : "วิชาแกน"
                    };
                });

                newDb[yearStr].terms[config.semester as 1|2|3] = {
                    configId: config.id, semester: config.semester as 1|2|3,
                    label: config.semester === 3 ? "ภาคฤดูร้อน" : `เทอม ${config.semester}`,
                    timeline: timeline, courses: courses
                };
            });
            setDb(newDb);
            if (!selectedYear) {
                const activeY = Object.keys(newDb).find(y => newDb[y].isActiveYear);
                setSelectedYear(activeY || Object.keys(newDb).sort().reverse()[0]);
            }
        } catch (error) { toast.error("โหลดข้อมูลไม่สำเร็จ"); } 
        finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const currentYearData = db[selectedYear];
  const currentTermData = currentYearData?.terms[activeTab as unknown as 1 | 2 | 3];
  
  // Handlers
  const handleSetActiveYear = async () => {
      setIsActivating(true);
      try {
        const res = await setActiveYear(parseInt(selectedYear));
        if (res.success) { 
            toast.success(`เปิดใช้งานปีการศึกษา ${selectedYear} เรียบร้อย`, { description: "กำลังรีโหลดระบบ..." });
            setTimeout(() => { window.location.reload(); }, 1000);
        } else {
            setIsActivating(false);
            toast.error(res.message);
        }
      } catch (e) { setIsActivating(false); toast.error("เกิดข้อผิดพลาด"); }
  };

  const handleDeleteYear = async () => {
    if(!selectedYear) return;
    const res = await deleteAcademicYear(parseInt(selectedYear));
    if(res.success) {
        toast.success(res.message);
        window.location.reload();
    } else {
        toast.error(res.message);
    }
  };

  const handleSaveTimeline = async () => {
      if (!currentTermData?.configId) return;
      const timeline = currentTermData.timeline;
      const data = {
          step1Start: timeline[0].startDate ? new Date(timeline[0].startDate) : undefined, step1End: timeline[0].endDate ? new Date(timeline[0].endDate) : undefined,
          step2Start: timeline[1].startDate ? new Date(timeline[1].startDate) : undefined, step2End: timeline[1].endDate ? new Date(timeline[1].endDate) : undefined,
          step3Start: timeline[2].startDate ? new Date(timeline[2].startDate) : undefined, step3End: timeline[2].endDate ? new Date(timeline[2].endDate) : undefined,
          step4Start: timeline[3].startDate ? new Date(timeline[3].startDate) : undefined, step4End: timeline[3].endDate ? new Date(timeline[3].endDate) : undefined,
      };
      const res = await updateTimeline(currentTermData.configId, data);
      if (res.success) { setIsEditingTimeline(false); toast.success("บันทึกกำหนดการเรียบร้อย"); }
  };

  const activeYearID = Object.keys(db).find(y => db[y].isActiveYear);
  const hasData = Object.keys(db).length > 0;

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-500 gap-2"><Loader2 className="animate-spin" /> กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sarabun space-y-6">
      <Toaster position="top-center" richColors />

      {/* SYSTEM STATUS */}
      <Alert className="bg-slate-900 border-none text-white shadow-md flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-600 rounded-lg animate-pulse"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <AlertTitle className="text-xs font-medium text-slate-400 tracking-widest uppercase">ปีการศึกษาปัจจุบัน (Active)</AlertTitle>
                <AlertDescription className="text-xl font-bold">พ.ศ. {activeYearID || "ยังไม่ได้ระบุ"}</AlertDescription>
              </div>
          </div>
          {currentYearData && !currentYearData.isActiveYear && (
            <>
              <Button onClick={() => setConfirmActiveOpen(true)} className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg">
                เปิดใช้งานปี {selectedYear}
              </Button>
              {/* ✅ แก้ Z-Index ของ Confirm Active Modal */}
              <AlertDialog open={confirmActiveOpen} onOpenChange={setConfirmActiveOpen}>
                <AlertDialogContent className="!z-[9999]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>ยืนยันเปิดใช้งานปี {selectedYear}?</AlertDialogTitle>
                    <AlertDialogDescription>ระบบจะตั้งค่าให้ปี {selectedYear} เป็นปีหลัก และปิดการใช้งานปีอื่นๆ ทั้งหมด</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isActivating}>ยกเลิก</AlertDialogCancel>
                    <Button disabled={isActivating} onClick={handleSetActiveYear} className="bg-green-600 hover:bg-green-700 min-w-[100px]">
                        {isActivating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเริ่ม...</> : "ยืนยัน"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
      </Alert>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="text-purple-600" /> จัดการปีการศึกษา
            </h1>
            <p className="text-slate-500 text-sm mt-1">ตั้งค่ากำหนดการและรายวิชา</p>
        </div>
        <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!hasData}>
              <SelectTrigger className="w-auto min-w-[200px] px-4 font-bold text-lg"><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {Object.keys(db).sort().reverse().map(y => (
                    <SelectItem key={y} value={y}>พ.ศ. {y} {db[y].isActiveYear ? "(Active)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* ✅ ปุ่มเพิ่มปี (Add) - แก้ Z-Index */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild><Button variant="outline" size="icon"><PlusCircle size={20} className="text-purple-600" /></Button></DialogTrigger>
                <DialogContent className="sm:max-w-[425px] !z-[9999]">
                    <DialogHeader>
                        <DialogTitle>เพิ่มปีการศึกษา</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold">ปีพุทธศักราช (พ.ศ.)</label>
                            <Input type="number" value={newYearInput} onChange={e => setNewYearInput(+e.target.value)} />
                        </div>
                        <div className="flex items-start space-x-3 p-3 border rounded-md bg-slate-50">
                            <Checkbox id="copy-data" checked={isCopyPrevious} onCheckedChange={(c) => setIsCopyPrevious(c as boolean)} />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="copy-data" className="text-sm font-medium leading-none cursor-pointer">คัดลอกรายวิชาที่เปิดสอนจากปี {newYearInput - 1}</Label>
                                <p className="text-[11px] text-slate-500">ระบบจะเปิดรายวิชาตามปีที่แล้วให้อัตโนมัติ (ไม่ต้องติ๊กใหม่)</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>ยกเลิก</Button>
                        <Button onClick={async () => { 
                            const res = await createAcademicYear(newYearInput, isCopyPrevious); 
                            if(res.success) window.location.reload(); else toast.error(res.message);
                        }} className="bg-purple-600">สร้าง</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ✅ ปุ่มลบปี (Delete) - แก้ Z-Index */}
            {hasData && (
                <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 size={20} />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="!z-[9999]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-red-600">ยืนยันการลบปีการศึกษา {selectedYear}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลกำหนดการและการเปิดรายวิชาทั้งหมดของปี {selectedYear} จะถูกลบออกจากระบบ
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteYear} className="bg-red-600 hover:bg-red-700">ลบข้อมูล</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>

      {!hasData ? <div className="text-center py-20 bg-white rounded-xl border-dashed border">ไม่พบข้อมูลปีการศึกษา</div> : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1.5 rounded-xl border shadow-sm">
            {[1, 2, 3].map(t => (
                <TabsTrigger key={t} value={t.toString()} className="px-6 py-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                    {t === 3 ? "ภาคฤดูร้อน" : `เทอม ${t}`}
                </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value={activeTab} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
                <Card>
                    <CardHeader className="pb-4 border-b flex flex-row justify-between items-center">
                        <CardTitle className="text-base flex gap-2"><Clock className="text-blue-500"/> ไทม์ไลน์</CardTitle>
                        {!isEditingTimeline ? <Button onClick={() => setIsEditingTimeline(true)} variant="ghost" size="sm"><Pencil className="w-3.5 h-3.5"/></Button> : <div className="flex gap-2"><Button onClick={() => setIsEditingTimeline(false)} variant="ghost" size="sm"><X/></Button><Button onClick={handleSaveTimeline} size="sm" className="bg-purple-600"><Check/></Button></div>}
                    </CardHeader>
                    <CardContent className="pt-4 space-y-5">
                        {currentTermData?.timeline.map((step) => (
                            <div key={step.id} className="relative pl-4 border-l-2 border-slate-100 last:border-0 pb-1">
                                <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                                <div className="mb-1"><span className="text-sm font-bold">{step.label}</span></div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div><label className="text-[10px] text-slate-400">เริ่ม</label><Input type="date" className="h-8 text-xs" value={step.startDate || ''} onChange={(e) => {
                                        const newDb = {...db}; newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline = newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline.map(t => t.id === step.id ? {...t, startDate: e.target.value} : t); setDb(newDb);
                                    }} disabled={!isEditingTimeline} /></div>
                                    <div><label className="text-[10px] text-slate-400">สิ้นสุด</label><Input type="date" className="h-8 text-xs" value={step.endDate || ''} onChange={(e) => {
                                        const newDb = {...db}; newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline = newDb[selectedYear].terms[activeTab as unknown as 1|2|3].timeline.map(t => t.id === step.id ? {...t, endDate: e.target.value} : t); setDb(newDb);
                                    }} disabled={!isEditingTimeline} /></div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-8">
                <Card className="shadow-sm border-t-4 border-t-purple-500 h-[650px] flex flex-col">
                    <CardHeader className="bg-slate-50/50 pb-4 border-b">
                        <div className="flex justify-between items-center">
                            <div><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-purple-600"/> รายวิชา</CardTitle><CardDescription>รายวิชาสำหรับ {activeTab === "3" ? "ภาคฤดูร้อน" : `เทอม ${activeTab}`}</CardDescription></div>
                            <div className="relative w-64"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" /><input type="text" placeholder="ค้นหา..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20" /></div>
                        </div>
                    </CardHeader>
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
                                                <Switch checked={course.isOpen} onCheckedChange={async () => {
                                                    const res = await toggleCourseOffering(currentTermData.configId!, parseInt(course.id), !course.isOpen);
                                                    if(res.success) {
                                                        const newDb = {...db}; const target = newDb[selectedYear].terms[activeTab as unknown as 1|2|3].courses.find(c => c.id === course.id);
                                                        if(target) target.isOpen = !course.isOpen; setDb(newDb);
                                                    }
                                                }} className="data-[state=checked]:bg-purple-600 scale-90" />
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-slate-700 align-top pt-4">{course.code}</td>
                                            <td className="px-4 py-3 align-top pt-3">
                                                <div className="text-slate-800 font-medium">{course.name}</div>
                                                <Badge variant="outline" className="mt-1 text-[10px] text-slate-500 bg-slate-50 border-slate-200 font-normal">{course.programName}</Badge>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs align-top pt-4">
                                                <div className="flex items-center gap-2"><UserIcon className="w-3 h-3 text-slate-400" /> {course.responsibleName}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentTermData?.courses.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-slate-400">ไม่พบรายวิชาในเทอมนี้</td></tr>}
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