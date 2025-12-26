"use client";

import React from "react";
import Link from "next/link"; // ✅ เพิ่ม Link
import { 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Stamp, 
  ChevronDown,
  ArrowRight,
  ArrowLeft, // ✅ เพิ่ม ArrowLeft
  RotateCcw,
  Send,
  FileSearch,
  FileCheck,
  AlertCircle
} from "lucide-react";

export default function SystemWorkflowPage() {
  const steps = [
    {
      title: "1. ตรวจสอบและกำหนด Timeline",
      role: "ฝ่ายวิชาการ",
      icon: <FileSpreadsheet className="w-6 h-6 text-white" />,
      description: "เริ่มต้นตรวจสอบข้อมูลรายวิชา บันทึกข้อมูล และกำหนด Timeline การกรอก/ยืนยันชั่วโมงสอน",
      color: "bg-pink-500",
      borderColor: "group-hover:border-pink-300",
      actions: null
    },
    {
      title: "2. บันทึกภาระงานสอน",
      role: "ผู้รับผิดชอบรายวิชา",
      icon: <Users className="w-6 h-6 text-white" />,
      description: "ตรวจสอบรายวิชาที่ตนรับผิดชอบ และบันทึกรายชื่อผู้สอนพร้อมชั่วโมงสอนของผู้สอนและของตนเอง",
      color: "bg-blue-500",
      borderColor: "group-hover:border-blue-300",
      actions: null
    },
    {
      title: "3. ตรวจสอบชั่วโมงสอน",
      role: "อาจารย์ผู้สอน",
      icon: <CheckCircle2 className="w-6 h-6 text-white" />,
      description: "อาจารย์แต่ละท่านตรวจสอบข้อมูลชั่วโมงสอนของตนเอง",
      color: "bg-green-500",
      borderColor: "group-hover:border-green-300",
      actions: [
        { type: "success", text: "ข้อมูลถูกต้อง: กดยืนยันถูกต้อง" },
        { type: "warning", text: "ข้อมูลไม่ถูกต้อง: แจ้งแก้ไข/ระบุจุดที่ผิด ส่งกลับไปที่ผู้รับผิดชอบฯ" }
      ]
    },
    {
      title: "4. พิจารณาแก้ไขและนำส่ง",
      role: "ผู้รับผิดชอบรายวิชา",
      icon: <Send className="w-6 h-6 text-white" />,
      description: "รับทราบผลการตรวจสอบจากอาจารย์ผู้สอน และพิจารณาข้อร้องขอแก้ไข (ถ้ามี)",
      color: "bg-indigo-500",
      borderColor: "group-hover:border-indigo-300",
      actions: [
        { type: "warning", text: "กรณีมีการแจ้งแก้: พิจารณา 'แก้ไขข้อมูล' หรือ 'ไม่แก้ไข (ระบุเหตุผล)'" },
        { type: "success", text: "เมื่อข้อมูลครบถ้วน: กดยืนยันส่งต่อให้ประธานหลักสูตร" }
      ]
    },
    {
      title: "5. พิจารณาตรวจสอบ (ระดับหลักสูตร)",
      role: "ประธานหลักสูตร",
      icon: <UserCheck className="w-6 h-6 text-white" />,
      description: "พิจารณาตรวจสอบชั่วโมงสอนภาพรวมของรายวิชาที่ส่งมา",
      color: "bg-orange-500",
      borderColor: "group-hover:border-orange-300",
      actions: [
        { type: "success", text: "อนุมัติข้อมูล: บันทึกตราประทับ & วันที่ -> ส่งต่อไปที่รองวิชาการ" },
        { type: "reject", text: "ไม่อนุมัติ (ทวนสอบใหม่): ตีกลับไปที่ผู้รับผิดชอบรายวิชา" }
      ]
    },
    {
      title: "6. พิจารณาตรวจสอบ (ระดับคณะ)",
      role: "รองคณบดี / รองวิชาการ",
      icon: <Stamp className="w-6 h-6 text-white" />,
      description: "พิจารณาตรวจสอบชั่วโมงสอนขั้นสุดท้าย",
      color: "bg-red-500",
      borderColor: "group-hover:border-red-300",
      actions: [
        { type: "success", text: "อนุมัติข้อมูล: บันทึกตราประทับ & วันที่ -> ส่งคืนฝ่ายวิชาการ " }
      ]
    },
    {
      title: "7. สิ้นสุดกระบวนการ",
      role: "ฝ่ายวิชาการ",
      icon: <FileCheck className="w-6 h-6 text-white" />,
      description: "รับข้อมูลที่ผ่านการอนุมัติครบถ้วนและจบกระบวนการ (สิ้นสุด) ",
      color: "bg-pink-500",
      borderColor: "group-hover:border-pink-300",
      actions: [
        { type: "info", text: "ตรวจสอบความถูกต้องครบถ้วนของข้อมูลและนำข้อมูลเข้าสู่ระบบจัดเก็บถาวร" }
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sarabun relative">
      
      {/* ✅ ปุ่มย้อนกลับแบบ Modern Floating Button */}
      <Link 
        href="/dashboard" 
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-5 py-2.5 bg-white/80 backdrop-blur-md text-slate-600 rounded-full shadow-lg shadow-slate-200/50 border border-white hover:text-purple-600 hover:border-purple-200 transition-all duration-300 group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
        <span className="text-sm font-semibold tracking-wide">กลับสู่หน้าหลัก</span>
      </Link>

      <div className="max-w-3xl mx-auto mt-8"> {/* เพิ่ม margin-top นิดนึงกันชนปุ่มถ้าจอเล็ก */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">คำแนะนำเบื้องต้นการใช้งานระบบ</h1>
          <p className="mt-2 text-slate-500 font-medium">แผนผังระบบบริหารภาระงานสอน (Workload Workflow)</p>
        </div>

        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-200 hidden md:block"></div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="relative flex flex-col md:flex-row gap-6 group cursor-default">
                
                {/* Icon Circle */}
                <div className={`flex-shrink-0 mx-auto md:mx-0 w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-transform duration-300 group-hover:scale-110 ${step.color}`}>
                  {step.icon}
                </div>

                {/* Content Card */}
                <div className={`flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 transition-all duration-300 relative ${step.borderColor} group-hover:shadow-md group-hover:border-l-4`}>
                  
                  {/* Triangle Indicator */}
                  <div className="hidden md:block absolute top-6 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 transform rotate-45"></div>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">{step.title}</h3>
                    <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-500 rounded-full group-hover:bg-slate-200 transition-colors">
                      {step.role}
                    </span>
                  </div>

                  {/* Expandable Content */}
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-in-out">
                    <div className="overflow-hidden">
                        
                        {/* Description */}
                        <p className="text-slate-600 text-sm leading-relaxed mt-4 pt-4 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                            {step.description}
                        </p>

                        {/* Actions */}
                        {step.actions && (
                            <div className="mt-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                                {step.actions.map((action, i) => (
                                    <div key={i} className={`text-sm p-3 rounded-lg flex items-start gap-3 border ${
                                        action.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' :
                                        action.type === 'reject' ? 'bg-red-50 border-red-100 text-red-800' :
                                        action.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' :
                                        'bg-slate-50 border-slate-100 text-slate-600'
                                    }`}>
                                            <div className="mt-0.5 shrink-0">
                                                {action.type === 'success' && <ArrowRight size={16} />}
                                                {action.type === 'reject' && <RotateCcw size={16} />} 
                                                {action.type === 'warning' && <AlertCircle size={16} />}
                                                {action.type === 'info' && <FileCheck size={16} />}
                                            </div>
                                            <span>{action.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Hint Icon */}
                  <div className="absolute bottom-2 right-1/2 translate-x-1/2 opacity-30 group-hover:opacity-0 transition-opacity">
                      <ChevronDown size={16} />
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}