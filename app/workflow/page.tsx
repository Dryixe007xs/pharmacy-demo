"use client";

import React from "react";
import { 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Stamp, 
  ArrowDown 
} from "lucide-react";

export default function SystemWorkflowPage() {
  const steps = [
    {
      title: "1. เตรียมข้อมูลรายวิชา",
      role: "ฝ่ายวิชาการ / เจ้าหน้าที่",
      icon: <FileSpreadsheet className="w-6 h-6 text-blue-600" />,
      description: "เจ้าหน้าที่นำเข้าข้อมูลรายวิชา เปิดรายวิชา และกำหนดผู้รับผิดชอบรายวิชาเบื้องต้นลงในระบบ",
      color: "bg-blue-100",
    },
    {
      title: "2. จัดสรรภาระงานสอน",
      role: "ผู้รับผิดชอบรายวิชา",
      icon: <Users className="w-6 h-6 text-orange-600" />,
      description: "ผู้รับผิดชอบรายวิชาทำการระบุตัวผู้สอน และกำหนดชั่วโมงสอน (บรรยาย/ปฏิบัติ) ให้แก่อาจารย์แต่ละท่าน",
      color: "bg-orange-100",
    },
    {
      title: "3. ยืนยันความถูกต้อง",
      role: "อาจารย์ผู้สอน",
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      description: "อาจารย์ผู้สอนแต่ละท่านล็อกอินเข้าสู่ระบบ เพื่อตรวจสอบภาระงานของตนเอง และกด 'ยืนยัน' (Confirm)",
      color: "bg-green-100",
    },
    {
      title: "4. ตรวจสอบและอนุมัติหลักสูตร",
      role: "ประธานหลักสูตร",
      icon: <UserCheck className="w-6 h-6 text-purple-600" />,
      description: "เมื่อผู้สอนยืนยันครบถ้วน ประธานหลักสูตรตรวจสอบภาพรวม และทำการอนุมัติเพื่อส่งต่อให้คณะ",
      color: "bg-purple-100",
    },
    {
      title: "5. อนุมัติขั้นสุดท้าย",
      role: "คณบดี / รองคณบดี",
      icon: <Stamp className="w-6 h-6 text-red-600" />,
      description: "ผู้บริหารทำการอนุมัติขั้นสุดท้าย ระบบจะออกรายงานสรุปภาระงานสอนรายบุคคลและรายปีโดยอัตโนมัติ",
      color: "bg-red-100",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sarabun">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">กระบวนการทำงานของระบบ</h1>
          <p className="mt-2 text-slate-600">ขั้นตอนการบริหารจัดการภาระงานสอน คณะเภสัชศาสตร์</p>
        </div>

        <div className="relative">
          {/* เส้นแนวตั้งเชื่อมต่อ */}
          <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-200 hidden md:block"></div>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="relative flex flex-col md:flex-row gap-6 group">
                
                {/* Icon Circle */}
                <div className={`flex-shrink-0 mx-auto md:mx-0 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 ${step.color}`}>
                  {step.icon}
                </div>

                {/* Content Card */}
                <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative">
                  {/* Arrow for Desktop */}
                  <div className="hidden md:block absolute top-6 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 transform rotate-45"></div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-500 rounded-full">
                      {step.role}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer Action */}
        <div className="mt-12 text-center">
            <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium underline">
                กลับสู่หน้าหลัก
            </a>
        </div>
      </div>
    </div>
  );
}