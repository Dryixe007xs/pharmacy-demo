"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, CheckCircle, AlertCircle } from "lucide-react";

// Mock Data (จำลองข้อมูลก่อนเชื่อม API จริง)
const mockInstructors = [
    { id: "1", name: "ดร. สมชาย ใจดี", department: "วิทยาการคอมพิวเตอร์", totalCourses: 3, status: "submitted", lastUpdated: "10 พ.ย. 67" },
    { id: "2", name: "ผศ. สมหญิง รักเรียน", department: "เทคโนโลยีสารสนเทศ", totalCourses: 2, status: "pending", lastUpdated: "-" },
    { id: "3", name: "อ. มานะ อดทน", department: "วิศวกรรมซอฟต์แวร์", totalCourses: 4, status: "approved", lastUpdated: "11 พ.ย. 67" },
];

export default function AdminDashboard({ session }: { session: any }) {
    const [searchTerm, setSearchTerm] = useState("");
    
    // กรองข้อมูลตามคำค้นหา
    const filteredData = mockInstructors.filter(i => 
        i.name.includes(searchTerm) || i.department.includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sarabun p-6 bg-slate-50/30 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">แผงควบคุมผู้บริหาร/วิชาการ</h1>
                    <p className="text-slate-500 text-sm">ติดตามสถานะการกรอกภาระงานสอนของคณาจารย์</p>
                </div>
                <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
                    <Users size={18} /> Admin Mode: {session?.user?.name}
                </div>
            </div>

            {/* Stats Cards (สรุปยอด) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">อาจารย์ทั้งหมด</p>
                        <h3 className="text-2xl font-bold text-slate-800">{mockInstructors.length} ท่าน</h3>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">ดำเนินการเสร็จสิ้น</p>
                        <h3 className="text-2xl font-bold text-green-600">
                            {mockInstructors.filter(i => i.status === 'approved').length} ท่าน
                        </h3>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-slate-500">ยังไม่ดำเนินการ</p>
                        <h3 className="text-2xl font-bold text-orange-600">
                            {mockInstructors.filter(i => i.status === 'pending').length} ท่าน
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Tracking Table (ตารางติดตาม) */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg text-slate-700">สถานะรายบุคคล</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input 
                                type="text" 
                                placeholder="ค้นหาชื่อ..." 
                                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">ชื่อ-สกุล</th>
                                <th className="px-4 py-3">สังกัด</th>
                                <th className="px-4 py-3 text-center">สถานะ</th>
                                <th className="px-4 py-3 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((instructor) => (
                                <tr key={instructor.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium">{instructor.name}</td>
                                    <td className="px-4 py-3 text-slate-500">{instructor.department}</td>
                                    <td className="px-4 py-3 text-center">
                                        {instructor.status === 'approved' && <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs border border-green-100">อนุมัติแล้ว</span>}
                                        {instructor.status === 'pending' && <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs border border-orange-100">รอส่ง</span>}
                                        {instructor.status === 'submitted' && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs border border-blue-100">ส่งแล้ว</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button size="sm" variant="ghost" className="text-purple-600 h-8">
                                            ดูรายละเอียด
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}