"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Calendar, 
  BookOpen, 
  Search, 
  Clock, 
  UserCog, 
  Users, 
  FileCheck, 
  ShieldCheck,
  Loader2
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Types ---
type ProcessStep = {
  id: number;
  label: string;
  role: string;
  icon: React.ReactNode;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed';
};

type Course = {
  id: string;
  code: string;
  name: string;
  program: string;
  isOpen: boolean; 
};

// --- MOCK DATA DATABASE (จำลองข้อมูลของแต่ละเทอม) ---
const MOCK_DB: Record<string, { timeline: ProcessStep[], courses: Course[] }> = {
    "1/2568": {
        timeline: [
            { id: 1, label: "บันทึกภาระงานสอน", role: "ผู้รับผิดชอบรายวิชา", icon: <UserCog className="w-5 h-5"/>, startDate: "2025-06-01", endDate: "2025-06-15", status: 'active' },
            { id: 2, label: "ตรวจสอบชั่วโมงสอนตนเอง", role: "อาจารย์ผู้สอน", icon: <Users className="w-5 h-5"/>, startDate: "2025-06-16", endDate: "2025-06-20", status: 'pending' },
            { id: 3, label: "พิจารณารับรองข้อมูล", role: "ประธานหลักสูตร", icon: <FileCheck className="w-5 h-5"/>, startDate: "2025-06-21", endDate: "2025-06-25", status: 'pending' },
            { id: 4, label: "อนุมัติข้อมูลภาพรวม", role: "รองคณบดีฝ่ายวิชาการ", icon: <ShieldCheck className="w-5 h-5"/>, startDate: "2025-06-26", endDate: "2025-06-30", status: 'pending' }
        ],
        courses: [
            { id: "1", code: "001101", name: "Fundamental English 1", program: "ศึกษาทั่วไป", isOpen: true },
            { id: "2", code: "204101", name: "Introduction to Computer", program: "วิทยาการคอมพิวเตอร์", isOpen: true },
            { id: "3", code: "204202", name: "Data Structures", program: "วิทยาการคอมพิวเตอร์", isOpen: false },
            { id: "4", code: "261405", name: "Software Engineering", program: "วิศวกรรมซอฟต์แวร์", isOpen: true },
        ]
    },
    "2/2568": {
        timeline: [
            { id: 1, label: "บันทึกภาระงานสอน", role: "ผู้รับผิดชอบรายวิชา", icon: <UserCog className="w-5 h-5"/>, startDate: "2025-11-01", endDate: "2025-11-15", status: 'pending' },
            { id: 2, label: "ตรวจสอบชั่วโมงสอนตนเอง", role: "อาจารย์ผู้สอน", icon: <Users className="w-5 h-5"/>, startDate: "2025-11-16", endDate: "2025-11-20", status: 'pending' },
            { id: 3, label: "พิจารณารับรองข้อมูล", role: "ประธานหลักสูตร", icon: <FileCheck className="w-5 h-5"/>, startDate: "2025-11-21", endDate: "2025-11-25", status: 'pending' },
            { id: 4, label: "อนุมัติข้อมูลภาพรวม", role: "รองคณบดีฝ่ายวิชาการ", icon: <ShieldCheck className="w-5 h-5"/>, startDate: "2025-11-26", endDate: "2025-11-30", status: 'pending' }
        ],
        courses: [
            { id: "1", code: "001102", name: "Fundamental English 2", program: "ศึกษาทั่วไป", isOpen: true }, // เปลี่ยนวิชาตามเทอม
            { id: "2", code: "204102", name: "Computer Programming", program: "วิทยาการคอมพิวเตอร์", isOpen: true },
            { id: "3", code: "204301", name: "Algorithm Design", program: "วิทยาการคอมพิวเตอร์", isOpen: true },
            { id: "4", code: "261406", name: "Software Testing", program: "วิศวกรรมซอฟต์แวร์", isOpen: true },
        ]
    },
    "3/2568": { // ภาคฤดูร้อน
        timeline: [
            { id: 1, label: "บันทึกภาระงานสอน", role: "ผู้รับผิดชอบรายวิชา", icon: <UserCog className="w-5 h-5"/>, startDate: "2026-04-01", endDate: "2026-04-07", status: 'pending' },
            { id: 2, label: "ตรวจสอบชั่วโมงสอนตนเอง", role: "อาจารย์ผู้สอน", icon: <Users className="w-5 h-5"/>, startDate: "2026-04-08", endDate: "2026-04-10", status: 'pending' },
            { id: 3, label: "พิจารณารับรองข้อมูล", role: "ประธานหลักสูตร", icon: <FileCheck className="w-5 h-5"/>, startDate: "2026-04-11", endDate: "2026-04-12", status: 'pending' },
            { id: 4, label: "อนุมัติข้อมูลภาพรวม", role: "รองคณบดีฝ่ายวิชาการ", icon: <ShieldCheck className="w-5 h-5"/>, startDate: "2026-04-13", endDate: "2026-04-15", status: 'pending' }
        ],
        courses: [
            { id: "99", code: "001201", name: "Thai for Communication", program: "ศึกษาทั่วไป", isOpen: true },
            // ซัมเมอร์มักเปิดน้อย
        ]
    }
};

export default function TermConfigurationPage() {
  const [selectedTerm, setSelectedTerm] = useState("1/2568");
  const [timeline, setTimeline] = useState<ProcessStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // เมื่อเปลี่ยนเทอม ให้โหลดข้อมูลใหม่
  useEffect(() => {
    // จำลองการ Fetch Data
    const data = MOCK_DB[selectedTerm];
    if (data) {
        setTimeline(data.timeline);
        setCourses(data.courses);
    }
  }, [selectedTerm]);

  // --- Handlers ---
  const handleTimelineChange = (id: number, field: 'startDate' | 'endDate', value: string) => {
    setTimeline(prev => prev.map(step => 
      step.id === id ? { ...step, [field]: value } : step
    ));
  };

  const toggleCourseStatus = (id: string) => {
    setCourses(prev => prev.map(c => 
      c.id === id ? { ...c, isOpen: !c.isOpen } : c
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // จำลองการยิง API บันทึกข้อมูล
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // อัปเดต Mock DB (เพื่อให้เปลี่ยนไปมาแล้วค่าไม่หาย ใน Demo นี้)
    MOCK_DB[selectedTerm] = { timeline, courses };
    
    toast.success(`บันทึกการตั้งค่าเทอม ${selectedTerm} เรียบร้อยแล้ว`);
    setIsSaving(false);
  };

  const filteredCourses = courses.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun space-y-6">
      <Toaster position="top-center" richColors />
      
      {/* Header & Term Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" /> ตั้งค่าภาคการศึกษา
          </h1>
          <p className="text-slate-500 mt-1 text-sm">จัดการ Timeline และเลือกรายวิชาที่จะเปิดสอน</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] uppercase text-slate-400 font-bold">กำลังแก้ไข:</span>
                <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                    ภาคการศึกษา {selectedTerm}
                </Badge>
            </div>

            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="w-[180px] h-10 border-slate-200 bg-white">
                <SelectValue placeholder="เลือกเทอม" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1/2568">1/2568 (เทอมต้น)</SelectItem>
                <SelectItem value="2/2568">2/2568 (เทอมปลาย)</SelectItem>
                <SelectItem value="3/2568">3/2568 (ภาคฤดูร้อน)</SelectItem>
              </SelectContent>
            </Select>

            <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700 gap-2 min-w-[100px]"
            >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
                {isSaving ? "กำลังบันทึก" : "บันทึก"}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Timeline Management */}
        <div className="lg:col-span-5 space-y-6">
            <Card className="border-slate-200 shadow-sm h-full">
                <CardHeader className="pb-4 bg-slate-50/30 border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" /> กำหนดช่วงเวลา (Timeline)
                    </CardTitle>
                    <CardDescription>
                        กำหนดวันเริ่มต้น-สิ้นสุด ของเทอม <span className="font-bold text-slate-700">{selectedTerm}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                        {timeline.map((step, index) => (
                            <div key={step.id} className="relative pl-8">
                                {/* Dot Indicator */}
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                                    step.status === 'active' ? 'bg-blue-500 border-blue-100 ring-4 ring-blue-50' :
                                    step.status === 'completed' ? 'bg-green-500 border-green-100' : 
                                    'bg-slate-300 border-slate-100'
                                }`}></div>

                                <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                <span className={`p-1.5 rounded-md ${step.status === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {step.icon}
                                                </span>
                                                {index + 1}. {step.label}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 ml-9">ผู้รับผิดชอบ: <span className="font-medium text-slate-700">{step.role}</span></p>
                                        </div>
                                    </div>

                                    {/* Date Inputs */}
                                    <div className="grid grid-cols-2 gap-3 pl-9">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 uppercase font-semibold">วันเริ่มต้น</label>
                                            <Input 
                                                type="date" 
                                                value={step.startDate}
                                                onChange={(e) => handleTimelineChange(step.id, 'startDate', e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-400 uppercase font-semibold">วันสิ้นสุด</label>
                                            <Input 
                                                type="date" 
                                                value={step.endDate}
                                                onChange={(e) => handleTimelineChange(step.id, 'endDate', e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: Course Management */}
        <div className="lg:col-span-7 space-y-6">
            <Card className="border-slate-200 shadow-sm h-full flex flex-col">
                <CardHeader className="pb-4 bg-slate-50/30 border-b border-slate-100">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-emerald-500" /> จัดการรายวิชาที่เปิดสอน
                            </CardTitle>
                            <CardDescription>
                                เลือกรายวิชาที่จะเปิดสอนในเทอม <span className="font-bold text-slate-700">{selectedTerm}</span>
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="ค้นหารหัส หรือ ชื่อวิชา..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>
                    </div>
                </CardHeader>
                
                <CardContent className="flex-grow overflow-auto pt-4">
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                                <tr>
                                    <th className="px-4 py-3 font-medium w-[15%] text-center">สถานะ</th>
                                    <th className="px-4 py-3 font-medium w-[20%]">รหัสวิชา</th>
                                    <th className="px-4 py-3 font-medium w-[40%]">ชื่อวิชา</th>
                                    <th className="px-4 py-3 font-medium w-[25%]">หลักสูตร</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCourses.map((course) => (
                                    <tr key={course.id} className={`hover:bg-slate-50 transition-colors ${course.isOpen ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="px-4 py-3 text-center">
                                            <Switch 
                                                checked={course.isOpen}
                                                onCheckedChange={() => toggleCourseStatus(course.id)}
                                                className="data-[state=checked]:bg-emerald-500"
                                            />
                                        </td>
                                        <td className={`px-4 py-3 font-semibold ${course.isOpen ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {course.code}
                                        </td>
                                        <td className={`px-4 py-3 ${course.isOpen ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {course.name}
                                        </td>
                                        <td className={`px-4 py-3 text-xs ${course.isOpen ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {course.program}
                                        </td>
                                    </tr>
                                ))}
                                {filteredCourses.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                            ไม่พบรายวิชาที่ค้นหา
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
                        <p>เปิดสอนในเทอมนี้: <span className="font-bold text-emerald-600 text-sm">{courses.filter(c => c.isOpen).length}</span> วิชา</p>
                        <p>จากฐานข้อมูลทั้งหมด: {courses.length} วิชา</p>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>
    </div>
  );
}