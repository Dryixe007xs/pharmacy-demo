"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// --- Mock Data ---
interface Course {
  code: string;
  name: string;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  note: string;
}

interface SemesterData {
  title: string;
  courses: Course[];
}

const reportData: SemesterData[] = [
  {
    title: "ภาคการศึกษาต้น",
    courses: [
      { code: "341221[2]", name: "เภสัชกรรม 1", role: "ผู้รับผิดชอบรายวิชา", lecture: 12, lab: 90, exam: 0, note: "" },
      { code: "341401[1]", name: "เภสัชเคมี 2", role: "ผู้สอน", lecture: 4, lab: 72, exam: 0, note: "" },
      { code: "341353[2]", name: "เภสัชบำบัด 1", role: "ผู้รับผิดชอบรายวิชา", lecture: 2, lab: 39, exam: 0, note: "" },
    ]
  },
  {
    title: "ภาคการศึกษาปลาย",
    courses: [
      { code: "341441[2]", name: "การสื่อสารเชิงวิชาชีพ", role: "ผู้สอน", lecture: 4, lab: 72, exam: 0, note: "" },
      { code: "341433[2]", name: "เภสัชวิทยา 3", role: "ผู้สอน", lecture: 0, lab: 81, exam: 0, note: "" },
    ]
  },
  {
    title: "ภาคฤดูร้อน",
    courses: [] 
  }
];

export default function PersonalReportPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun text-slate-800">
      
      {/* Header Breadcrumb */}
      <div className="mb-6">
        <h1 className="text-xl text-slate-500">รายงานสรุป/รายงานสรุปรายบุคคล</h1>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-md p-10 min-h-[297mm] relative flex flex-col">
        
        {/* Report Header */}
        <div className="text-center mb-8 space-y-2">
           <h2 className="text-xl font-bold">รายงานสรุปชั่วโมงสอนประจำปีการศึกษา 2569</h2>
           <p className="font-bold text-lg">ผศ.ดร.ภก.สมัคร สมาน</p>
           <p className="font-semibold text-lg">สาขาวิชาการบริบาลทางเภสัชกรรม</p>
           <p className="font-semibold text-slate-600">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
        </div>

        {/* Content Table */}
        <div className="border rounded-lg overflow-hidden mb-12 flex-grow">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="py-3 px-4 text-left font-semibold">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-3 px-4 text-center font-semibold">ตำแหน่ง</th>
                        <th className="py-3 px-4 text-center font-semibold">ชั่วโมงบรรยาย</th>
                        <th className="py-3 px-4 text-center font-semibold">ชั่วโมงปฏิบัติการ</th>
                        <th className="py-3 px-4 text-center font-semibold">คุมสอบนอกตาราง</th>
                        <th className="py-3 px-4 text-center font-semibold">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {reportData.map((term, index) => (
                        <React.Fragment key={index}>
                            <tr className="bg-slate-50/50">
                                <td colSpan={6} className="py-3 px-4 font-bold text-slate-700">{term.title}</td>
                            </tr>
                            
                            {term.courses.length > 0 ? (
                                term.courses.map((course, cIndex) => (
                                    <tr key={cIndex} className="hover:bg-slate-50/30">
                                        <td className="py-3 px-4 align-top">
                                            <div className="font-medium">{course.code}</div>
                                            <div className="text-slate-500 text-xs">{course.name}</div>
                                        </td>
                                        <td className="py-3 px-4 text-center align-top">{course.role}</td>
                                        <td className="py-3 px-4 text-center align-top">{course.lecture}</td>
                                        <td className="py-3 px-4 text-center align-top">{course.lab}</td>
                                        <td className="py-3 px-4 text-center align-top">{course.exam || '-'}</td>
                                        <td className="py-3 px-4 text-center align-top text-slate-400">{course.note || ''}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-300 italic">ไม่มีรายวิชา</td>
                                </tr>
                            )}

                            {term.courses.length > 0 && (
                                <tr className="bg-slate-50/30 font-bold text-slate-700 border-t border-dashed">
                                    <td colSpan={2} className="py-2 px-4 text-right text-xs">รวม{term.title}</td>
                                    <td className="py-2 px-4 text-center text-xs">{term.courses.reduce((a, b) => a + b.lecture, 0)}</td>
                                    <td className="py-2 px-4 text-center text-xs">{term.courses.reduce((a, b) => a + b.lab, 0)}</td>
                                    <td className="py-2 px-4 text-center text-xs">{term.courses.reduce((a, b) => a + b.exam, 0)}</td>
                                    <td></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Signatures Section */}
        <div className="mt-8 grid grid-cols-2 gap-16 px-8">
            <div className="text-center space-y-12">
                <div className="space-y-2">
                    <div className="font-bold text-sm">(ผศ.ดร.ภก ณัฐ นาเอก)</div>
                    <div className="text-xs font-semibold">ประธานหลักสูตรเภสัชศาสตรบัณฑิต</div>
                    <div className="text-xs text-slate-400 pt-2">___/___/___</div>
                </div>
            </div>
            <div className="text-center space-y-12">
                <div className="space-y-2">
                    <div className="font-bold text-sm">(รศ. ดร. ภญ. สุภางค์ คนดี)</div>
                    <div className="text-xs font-semibold">รองคณบดีฝ่ายวิชาการ</div>
                    <div className="text-xs text-slate-400 pt-2">___/___/___</div>
                </div>
            </div>
        </div>

        {/* Bottom Small Text (Update Name) */}
        <div className="mt-16 text-[10px] text-slate-500 flex flex-col gap-1">
            <span>เจ้าหน้าที่ฝ่ายวิชาการผู้ปฏิบัติงาน</span>
            <div className="flex gap-4">
                 <span>1. นางสาว ธนารีย์ เครือวัลย์</span>
                 <span>2. นาง ไพจิตรา อินสุขขิน</span>
            </div>
        </div>

        {/* Download Button Section */}
        <div className="mt-8 flex flex-col items-center gap-2">
             <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 flex gap-2 w-fit">
                <Download size={16} /> Download PDF
             </Button>
             <p className="text-[10px] text-slate-400 font-light">
                * ข้อมูลดังกล่าวจะเปิดให้ดาวน์โหลดได้เมื่อสิ้นสุดปีการศึกษา
             </p>
        </div>

      </div>

    </div>
  );
}