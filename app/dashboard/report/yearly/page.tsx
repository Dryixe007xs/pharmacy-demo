"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

// --- Mock Data ---
interface Instructor {
  name: string;
  role: string;
  lecture: number;
  lab: number;
}

interface Course {
  code: string;
  name: string;
  instructors: Instructor[];
}

interface SemesterData {
  term: string;
  courses: Course[];
}

const yearlyData: SemesterData[] = [
  {
    term: "ภาคการศึกษาต้น",
    courses: [
      {
        code: "341221[2]",
        name: "เภสัชกรรม 1",
        instructors: [
          { name: "ผศ.ดร.ปฐมพงษ์ ริมแดง", role: "ผู้รับผิดชอบรายวิชา", lecture: 12, lab: 90 },
          { name: "ดร.นันทวรรณ วรุฒจิต", role: "ผู้สอน", lecture: 4, lab: 72 },
          { name: "ผศ.ดร.สุภาวดี บุญทา", role: "ผู้สอน", lecture: 8, lab: 42 },
          { name: "รศ.ดร.สุภางค์ คนดี", role: "ผู้สอน", lecture: 2, lab: 63 },
        ]
      },
      {
        code: "341401[1]",
        name: "เภสัชเคมี 2",
        instructors: [
          { name: "ดร.อาทิตย์ แก้วใจ", role: "ผู้สอน", lecture: 4, lab: 72 },
          { name: "ผศ.ดร.ปณิชาพัชร์ วสุภัทรธนศักดิ์", role: "ผู้สอน", lecture: 0, lab: 81 },
        ]
      }
    ]
  },
  {
    term: "ภาคการศึกษาปลาย",
    courses: [
        // ข้อมูลสมมติสำหรับเทอมปลาย
        {
            code: "341441[2]",
            name: "การสื่อสารเชิงวิชาชีพ",
            instructors: [
                { name: "ผศ.ดร.แสงระวี สุทธิปริญญาพงศ์", role: "ผู้รับผิดชอบรายวิชา", lecture: 4, lab: 72 }
            ]
        }
    ]
  },
  {
    term: "ภาคฤดูร้อน",
    courses: []
  }
];

export default function YearlyReportPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun text-slate-800">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl text-slate-500 mb-4">รายงานสรุป/รายงานสรุปรายปี</h1>
        
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="space-y-1 w-full md:w-64">
                <label className="text-sm font-bold">เลือกระดับ</label>
                <div className="flex gap-4">
                     <Select defaultValue="bachelor">
                        <SelectTrigger><SelectValue placeholder="ระดับ" /></SelectTrigger>
                        <SelectContent><SelectItem value="bachelor">ปริญญาตรี</SelectItem></SelectContent>
                     </Select>
                     <Select defaultValue="clinical">
                        <SelectTrigger><SelectValue placeholder="สาขาวิชา" /></SelectTrigger>
                        <SelectContent><SelectItem value="clinical">การบริบาลทางเภสัชกรรม</SelectItem></SelectContent>
                     </Select>
                </div>
            </div>
        </div>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-md p-10 min-h-[297mm] relative">
        
        {/* Report Titles */}
        <div className="text-center mb-8 space-y-2">
           <h2 className="text-lg font-bold">รายงานสรุปรายวิชาสาขาวิชาการบริบาลทางเภสัชกรรม ปีการศึกษา 2569</h2>
           <h3 className="text-lg font-bold">ระดับ ปริญญาตรี</h3>
           <p className="font-semibold text-slate-600">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
        </div>

        {/* Content Table */}
        <div className="border rounded-sm overflow-hidden mb-12">
            <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b text-slate-700">
                    <tr>
                        <th className="py-3 px-2 text-left w-[25%]">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-3 px-2 text-left w-[30%]">ชื่อผู้รับผิดชอบ/ผู้สอน</th>
                        <th className="py-3 px-2 text-center w-[20%]">ตำแหน่ง</th>
                        <th className="py-3 px-2 text-center w-[12%]">ชั่วโมงบรรยาย</th>
                        <th className="py-3 px-2 text-center w-[13%]">ชั่วโมงปฏิบัติการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {yearlyData.map((term, tIndex) => (
                        <React.Fragment key={tIndex}>
                            {/* Semester Header */}
                            <tr className="bg-slate-50/50">
                                <td colSpan={5} className="py-2 px-4 font-bold text-slate-800 border-b">{term.term}</td>
                            </tr>

                            {term.courses.length > 0 ? (
                                term.courses.map((course, cIndex) => (
                                    <React.Fragment key={cIndex}>
                                        {course.instructors.map((instructor, iIndex) => (
                                            <tr key={`${cIndex}-${iIndex}`} className="hover:bg-slate-50/20">
                                                {/* Course Info: Show only on first instructor row */}
                                                {iIndex === 0 && (
                                                    <td rowSpan={course.instructors.length + 1} className="py-3 px-4 align-top border-r font-medium text-slate-700">
                                                        <div>{course.code}</div>
                                                        <div className="text-slate-500">{course.name}</div>
                                                    </td>
                                                )}
                                                
                                                <td className="py-2 px-4 align-top">{instructor.name}</td>
                                                <td className="py-2 px-2 text-center align-top text-slate-500">{instructor.role}</td>
                                                <td className="py-2 px-2 text-center align-top">{instructor.lecture}</td>
                                                <td className="py-2 px-2 text-center align-top">{instructor.lab}</td>
                                            </tr>
                                        ))}
                                        {/* Subtotal for Course (Optional styling) */}
                                        <tr className="bg-slate-50/30 border-b border-dashed text-slate-500">
                                            <td colSpan={2} className="py-1 px-4 text-right text-[10px] font-bold">รวมวิชา</td>
                                            <td className="py-1 px-2 text-center text-[10px]">{course.instructors.reduce((a, b) => a + b.lecture, 0)}</td>
                                            <td className="py-1 px-2 text-center text-[10px]">{course.instructors.reduce((a, b) => a + b.lab, 0)}</td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-6 text-center text-slate-300 italic">ไม่มีข้อมูลรายวิชา</td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-2 gap-10 px-4">
            <div className="text-center space-y-12">
                <div className="space-y-1">
                    <div className="font-bold text-xs">(ผศ.ดร.ณัฐ มาเอก)</div>
                    <div className="text-[10px] font-semibold">ประธานหลักสูตรเภสัชศาสตรบัณฑิต</div>
                    <div className="text-[10px] text-slate-400 pt-1">___/___/___</div>
                </div>
            </div>
            <div className="text-center space-y-12">
                <div className="space-y-1">
                    <div className="font-bold text-xs">(รศ. ดร. ภญ. สุภางค์ คนดี)</div>
                    <div className="text-[10px] font-semibold">รองคณบดีฝ่ายวิชาการและบูรณาการพันธกิจสู่ความเป็นสากล</div>
                    <div className="text-[10px] text-slate-400 pt-1">___/___/___</div>
                </div>
            </div>
        </div>

        {/* Footer Info */}
        <div className="mt-20 text-[10px] text-slate-500 flex gap-4">
            <span>เจ้าหน้าที่ฝ่ายวิชาการผู้ปฏิบัติงาน</span>
            <span>1. นางสาวธนาธิป เครือวัลย์</span>
            <span>2. นางใจตรา อินสุริย</span>
        </div>

        {/* Download Buttons Area */}
        <div className="mt-10 flex justify-center gap-4">
             <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100 flex gap-2">
                <Download size={16} /> Download PDF
             </Button>
             <Button variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100 flex gap-2">
                <FileSpreadsheet size={16} /> Download EXCEL
             </Button>
        </div>

      </div>
    </div>
  );
}