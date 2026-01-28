"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Search, ChevronDown, ChevronUp, 
  Clock, BookOpen, BarChart3, Loader2, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// Helper Status Badge
const getStatusBadge = (status: string) => {
    switch(status) {
        case 'APPROVED': return { text: "อนุมัติแล้ว", color: "text-green-600 bg-green-50 border-green-200" };
        case 'PENDING_HEAD': return { text: "รอประธานฯ", color: "text-blue-600 bg-blue-50 border-blue-200" };
        case 'IN_PROGRESS': return { text: "กำลังดำเนินการ", color: "text-orange-600 bg-orange-50 border-orange-200" };
        case 'REJECTED': return { text: "ถูกตีกลับ", color: "text-red-600 bg-red-50 border-red-200" };
        case 'WAITING': return { text: "ยังไม่เริ่ม", color: "text-slate-500 bg-slate-100 border-slate-200" }; // ✅ เพิ่มสถานะนี้
        default: return { text: "ไม่มีข้อมูล", color: "text-slate-400 bg-slate-50 border-slate-100" };
    }
};

export default function AdminDashboard({ session }: { session: any }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRows, setExpandedRows] = useState<string[]>([]);
    const [instructors, setInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Default Filter
    const [selectedYear, setSelectedYear] = useState<string>("2569"); 
    const [selectedSemester, setSelectedSemester] = useState<string>("1");

    const fetchData = async (year: string, semester: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/dashboard?year=${year}&semester=${semester}`);
            const json = await res.json();
            if (json.data) {
                setInstructors(json.data);
                if (json.meta) {
                    setSelectedYear(String(json.meta.year));
                    setSelectedSemester(String(json.meta.semester));
                }
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData("", ""); }, []);

    const handleFilterChange = (type: 'year' | 'semester', value: string) => {
        if (type === 'year') {
            setSelectedYear(value);
            fetchData(value, selectedSemester);
        } else {
            setSelectedSemester(value);
            fetchData(selectedYear, value);
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => 
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const filteredData = instructors.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Stats
    const totalInstructors = instructors.length;
    const totalCourses = instructors.reduce((acc, curr) => acc + curr.courses.length, 0);
    const completedCourses = instructors.reduce((acc, curr) => acc + curr.courses.filter((c: any) => c.status === 'APPROVED').length, 0);
    const percentComplete = totalCourses > 0 ? Math.round((completedCourses/totalCourses)*100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sarabun p-6 bg-slate-50/30 min-h-screen">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">แผงควบคุมผู้บริหาร</h1>
                    <p className="text-slate-500 text-sm">ติดตามความคืบหน้าการกรอกภาระงานสอน</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2 px-2 text-sm text-slate-500 font-medium">
                        <Calendar size={16} /> ปีการศึกษา:
                    </div>
                    <Select value={selectedSemester} onValueChange={(v) => handleFilterChange('semester', v)}>
                        <SelectTrigger className="w-[100px] h-9 text-sm bg-slate-50">
                            <SelectValue placeholder="เทอม" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">เทอม 1</SelectItem>
                            <SelectItem value="2">เทอม 2</SelectItem>
                            <SelectItem value="3">เทอม 3</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-slate-300">/</span>
                    <Select value={selectedYear} onValueChange={(v) => handleFilterChange('year', v)}>
                        <SelectTrigger className="w-[100px] h-9 text-sm bg-slate-50">
                            <SelectValue placeholder="ปี" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2567">2567</SelectItem>
                            <SelectItem value="2568">2568</SelectItem>
                            <SelectItem value="2569">2569</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">อาจารย์ที่มีภาระงาน</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalInstructors} <span className="text-sm font-normal text-slate-400">ท่าน</span></h3>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Users size={24}/></div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">รายวิชาทั้งหมด (เทอม {selectedSemester}/{selectedYear})</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">{totalCourses} <span className="text-sm font-normal text-slate-400">วิชา</span></h3>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-full text-orange-600"><BookOpen size={24}/></div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500 font-medium">อนุมัติแล้ว (ภาพรวม)</p>
                            <h3 className="text-3xl font-bold text-green-600 mt-1">{percentComplete}%</h3>
                        </div>
                        <div className="bg-green-50 p-3 rounded-full text-green-600"><BarChart3 size={24}/></div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm border border-slate-200 overflow-hidden">
                <CardHeader className="pb-4 bg-white border-b border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-600"/> สถานะความคืบหน้า
                        </CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="ค้นหาชื่ออาจารย์..." className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50 focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /><p>กำลังโหลดข้อมูล...</p></div>
                    ) : filteredData.length > 0 ? (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/70 text-slate-500 uppercase text-xs font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 w-[30%]">ชื่อ-สกุล</th>
                                    <th className="px-6 py-3 w-[25%]">สังกัด</th>
                                    <th className="px-6 py-3 w-[30%]">ความคืบหน้า (รายวิชา)</th>
                                    <th className="px-6 py-3 w-[15%] text-right">รายละเอียด</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredData.map((instructor) => {
                                    const total = instructor.courses.length;
                                    const finished = instructor.courses.filter((c:any) => c.status === 'APPROVED').length;
                                    const percent = total > 0 ? (finished / total) * 100 : 0;
                                    const isExpanded = expandedRows.includes(instructor.id);

                                    return (
                                        <React.Fragment key={instructor.id}>
                                            <tr className={cn("transition-colors cursor-pointer hover:bg-slate-50", isExpanded ? "bg-slate-50" : "")} onClick={() => toggleRow(instructor.id)}>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-700">{instructor.name}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{total} วิชาที่รับผิดชอบ</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{instructor.department}</td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                                            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-600 w-12 text-right">{finished}/{total}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-purple-600">
                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/50 animate-in fade-in duration-200">
                                                    <td colSpan={4} className="px-6 py-4 pb-6 shadow-inner">
                                                        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-slate-100/50 text-xs text-slate-500 font-semibold border-b">
                                                                    <tr>
                                                                        <th className="px-4 py-2 pl-6 text-left">รหัสวิชา</th>
                                                                        <th className="px-4 py-2 text-left">ชื่อวิชา</th>
                                                                        <th className="px-4 py-2 text-center">สถานะปัจจุบัน</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {instructor.courses.map((course: any, idx: number) => {
                                                                        const status = getStatusBadge(course.status);
                                                                        return (
                                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                                <td className="px-4 py-2.5 pl-6 font-mono text-slate-600">{course.code}</td>
                                                                                <td className="px-4 py-2.5 text-slate-800">{course.name}</td>
                                                                                <td className="px-4 py-2.5 text-center">
                                                                                    <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center", status.color)}>
                                                                                        {status.text}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                            <p>ไม่พบข้อมูลรายวิชาในเทอมนี้</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}