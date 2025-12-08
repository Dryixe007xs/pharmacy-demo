"use client";

import React, { useState } from "react";
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
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";

// --- Mock Data ---
interface Staff {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

const staffList: Staff[] = [
  { id: "1", name: "รศ. ดร. ภญ. สุภางค์ คนดี", email: "supang.kh@up.ac.th", department: "การบริบาลทางเภสัชกรรม", role: "รองคณบดีฝ่ายวิชาการและบูรณาการพันธกิจสู่ความเป็นสากล" },
  { id: "2", name: "ผศ. ดร. ภญ. ณัฐ มาเอก", email: "nat.na@up.ac.th", department: "การบริบาลทางเภสัชกรรม", role: "ประธานหลักสูตร เภสัชศาสตรบัณฑิต" },
  { id: "3", name: "ผศ. ดร. ภญ. ปาจรีย์ มงคล", email: "pajaree.mo@up.ac.th", department: "การบริบาลทางเภสัชกรรม", role: "ประธานหลักสูตร วิทยาศาสตรมหาบัณฑิต" },
  { id: "4", name: "ผศ. ดร. ภญ. สุภาวดี บุญทา", email: "supavadee.bo@up.ac.th", department: "การบริบาลทางเภสัชกรรม", role: "ประธานหลักสูตร ปรัชญาดุษฎีบัณฑิต" },
  { id: "5", name: "ผศ. ดร. ธรรมนูญ รุ่งสิงห์", email: "tammanoon.ru@up.ac.th", department: "วิทยาศาสตร์เครื่องสำอาง", role: "ประธานหลักสูตร วิทยาศาสตรบัณฑิต" },
  { id: "6", name: "ดร. ภญ. คณิตา ดวงแจ่มกาญจน์", email: "khanita.du@up.ac.th", department: "การบริบาลทางเภสัชกรรม", role: "อาจารย์" },
  { id: "7", name: "ดร. เอกลักษณ์ วงแวด", email: "eakkaluk.wo@up.ac.th", department: "วิทยาศาสตร์เครื่องสำอาง", role: "อาจารย์" },
];

export default function StaffSummaryListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter Logic (Simple Mock)
  const filteredStaff = staffList.filter(staff => 
    staff.name.includes(searchTerm) || 
    staff.email.includes(searchTerm)
  );

  return (
    <div className="space-y-6 font-sarabun min-h-screen bg-slate-50/50 p-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl text-slate-500 mb-2">รายงานสรุป/รายงานสรุปของบุคลากรรายบุคคล</h1>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        <h3 className="font-bold text-lg text-slate-700">ค้นหารายวิชา (ค้นหาบุคลากร)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Row 1 */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">หลักสูตร</label>
                <Select>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">ทั้งหมด</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">ระดับ</label>
                <Select>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="เลือกระดับ" /></SelectTrigger>
                    <SelectContent><SelectItem value="bachelor">ปริญญาตรี</SelectItem></SelectContent>
                </Select>
              </div>
           </div>

           {/* Row 2 */}
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">หลักสูตร (สาขา)</label>
                <Select>
                    <SelectTrigger className="bg-slate-50"><SelectValue placeholder="เลือกหลักสูตร" /></SelectTrigger>
                    <SelectContent><SelectItem value="pharma">เภสัชศาสตร์</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">ชื่อ-สกุล</label>
                <div className="relative">
                    <Input 
                        placeholder="เลือกชื่อบุคลากร" 
                        className="bg-slate-50 pl-10" 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="font-bold text-lg text-slate-700 mb-4">ชื่อรายบุคลากรสายวิชาการ</h3>

        <div className="rounded-lg border overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="font-bold text-slate-700 w-[25%]">ชื่อ - สกุล</TableHead>
                        <TableHead className="font-bold text-slate-700 w-[20%]">E-Mail</TableHead>
                        <TableHead className="font-bold text-slate-700 w-[20%]">สาขาวิชา</TableHead>
                        <TableHead className="font-bold text-slate-700 w-[25%]">บทบาท</TableHead>
                        <TableHead className="font-bold text-slate-700 text-right">จัดการ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStaff.map((staff) => (
                        <TableRow key={staff.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-slate-800">{staff.name}</TableCell>
                            <TableCell className="text-slate-600">{staff.email}</TableCell>
                            <TableCell className="text-slate-600">{staff.department}</TableCell>
                            <TableCell className="text-slate-600 text-xs">{staff.role}</TableCell>
                            <TableCell className="text-right">
                                <Link 
                                    href={`/report/personal?id=${staff.id}`} 
                                    className="text-orange-500 hover:text-orange-600 hover:underline text-sm font-medium"
                                >
                                    รายละเอียด
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredStaff.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-slate-400">ไม่พบข้อมูล</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4 text-sm text-slate-600 mt-2">
            <div className="flex items-center gap-2 mr-4">
                <span>Rows per page:</span>
                <Select defaultValue="10">
                    <SelectTrigger className="h-8 w-[70px] border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem></SelectContent>
                </Select>
            </div>
            <span>1-{filteredStaff.length} of {filteredStaff.length}</span>
            <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled><ChevronRight className="w-4 h-4" /></Button>
            </div>
        </div>

      </div>

    </div>
  );
}