"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, BookOpen, Loader2, Printer, Building2, Calendar, GraduationCap, Info, Layers } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Interfaces ---
interface StaffProfile {
  firstName: string;
  lastName: string;
  email: string;
  title: string; 
  department: string;
  curriculum: string;
  adminPosition?: string;
  academicPosition?: string; 
}

interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  isExternal?: boolean; 
}

interface SemesterData {
  title: string;
  courses: ReportCourse[];
}

export default function StaffIndividualReportPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [reportData, setReportData] = useState<SemesterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState<string | number>("-"); 
  
  // 👈 เพิ่ม State สำหรับ iframe
  const [printUrl, setPrintUrl] = useState<string | null>(null); 

  useEffect(() => {
    if (!staffId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. ดึง Active Term
        const termRes = await fetch("/api/term-config/active");
        const termData = await termRes.json();
        if (termData && termData.academicYear) {
            setAcademicYear(termData.academicYear);
        }

        // 2. ดึงข้อมูลรายงาน
        const res = await fetch(`/api/report/personal?lecturerId=${staffId}`);
        
        if (!res.ok) {
            throw new Error("ไม่สามารถดึงข้อมูลได้");
        }

        const data = await res.json();
        const { lecturer, assignments } = data;

        // Set Profile
        if (lecturer) {
            setStaff({
                ...lecturer,
                title: lecturer.title || lecturer.academicPosition || '' 
            });
        } else {
            toast.error("ไม่พบข้อมูลอาจารย์ท่านนี้");
        }

        // Process Assignments
        const assignList = Array.isArray(assignments) ? assignments : [];
        const term1: ReportCourse[] = [];
        const term2: ReportCourse[] = [];
        const term3: ReportCourse[] = [];

        assignList.forEach((assign: any) => {
            if (assign.academicApprovalStatus !== 'APPROVED') {
                return;
            }

            const isExternal = assign.courseType === "EXTERNAL";
            const isResponsible = String(assign.lecturerId) === String(assign.subject?.responsibleUserId);
            const role = isExternal ? "ผู้สอน" : isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";
            
            const courseObj: ReportCourse = {
                code: isExternal 
                    ? assign.externalCourseCode || "-"
                    : assign.subject?.code || "-",
                name: isExternal
                    ? assign.externalCourseName || "-"
                    : assign.subject?.name_th || "-",
                credit: isExternal
                    ? assign.externalCredit || "-"
                    : assign.subject?.credit || assign.subject?.credits || "-",
                role: role,
                lecture: Number(assign.lectureHours) || 0,
                lab: Number(assign.labHours) || 0,
                exam: Number(assign.examHours) || 0,
                critique: Number(assign.examCritiqueHours) || 0,
                isExternal, 
            };

            const sem = Number(assign.semester);
            if (sem === 1) term1.push(courseObj);
            else if (sem === 2) term2.push(courseObj);
            else if (sem === 3) term3.push(courseObj);
        });

        setReportData([
            { title: "ภาคการศึกษาต้น", courses: term1 },
            { title: "ภาคการศึกษาปลาย", courses: term2 },
            { title: "ภาคฤดูร้อน", courses: term3 }
        ]);

      } catch (error) {
        console.error("Fetch Error:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [staffId]);

  // 👈 แก้ไขฟังก์ชันปริ้นท์ ให้ชี้ไปที่ไฟล์ที่เราทำเสร็จแล้ว!
  const handlePrint = () => {
    toast.info("กำลังเตรียมเอกสารสำหรับพิมพ์...");
    setPrintUrl(`/print/report/personal?lecturerId=${staffId}&t=${Date.now()}`);
  };

  if (loading) {
      return (
        <div className="min-h-screen bg-slate-100/50 p-6 font-sarabun">
          <Toaster position="top-center" richColors />
          
          {/* Skeleton Header */}
          <div className="max-w-full mx-auto mb-6 flex justify-between items-center animate-pulse">
            <div className="h-10 w-24 bg-slate-200 rounded"></div>
            <div className="h-10 w-32 bg-slate-200 rounded-full"></div>
          </div>

          {/* Skeleton Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-8">
            <div className="flex gap-8 items-center mb-8 animate-pulse">
              <div className="w-24 h-24 rounded-2xl bg-slate-200"></div>
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="flex gap-4">
                  <div className="h-8 bg-slate-200 rounded w-32"></div>
                  <div className="h-8 bg-slate-200 rounded w-40"></div>
                </div>
              </div>
            </div>

            {/* Skeleton Table */}
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-slate-100 rounded"></div>
              <div className="h-16 bg-slate-50 rounded"></div>
              <div className="h-16 bg-slate-50 rounded"></div>
              <div className="h-16 bg-slate-50 rounded"></div>
            </div>
          </div>
        </div>
      );
  }

  if (!staff) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
            <p>ไม่พบข้อมูลผู้ใช้งาน</p>
            <Button onClick={() => router.back()} variant="outline">กลับไปหน้าก่อนหน้า</Button>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100/50 p-6 font-sarabun text-slate-800">
      <Toaster position="top-center" richColors />

      {/* 👈 ซ่อน iframe สำหรับสั่งปริ้นท์แบบเบื้องหลัง */}
      {printUrl && (
        <iframe
          src={printUrl}
          className="fixed w-0 h-0 border-0"
          title="Print Frame"
        />
      )}

      {/* Navigation Bar */}
      <div className="max-w-full mx-auto mb-6 flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="text-slate-500 hover:text-slate-800 hover:bg-white/50 transition-all gap-2 pl-2"
          >
              <ArrowLeft size={18} /> ย้อนกลับ
          </Button>
          <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md gap-2 rounded-full px-6">
              <Printer size={18} /> พิมพ์รายงาน
          </Button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Profile Header */}
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 via-white to-white">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl font-bold text-purple-600 shrink-0">
                    {staff.firstName?.charAt(0)}
                </div>
                
                <div className="flex-1 space-y-3">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                            {staff.academicPosition || staff.title ? (staff.academicPosition || staff.title) : ''} {staff.firstName} {staff.lastName}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-500 text-lg font-light mt-1">
                            <Building2 size={18} className="text-purple-400" />
                            <span>{staff.department || "ไม่ระบุสังกัด/กลุ่มวิชา"}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Mail size={16} className="text-purple-500" /> 
                            <span>{staff.email}</span>
                        </div>
                        {staff.curriculum && (
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <GraduationCap size={16} className="text-purple-500" /> 
                                <span className="truncate max-w-[250px]">{staff.curriculum}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Calendar size={16} className="text-purple-500" /> 
                            <span>ปีการศึกษา {academicYear}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="p-0">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wide font-semibold">
                        <th className="py-4 px-6 w-[35%]">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-4 px-6 w-[15%] text-center">บทบาท</th>
                        <th className="py-4 px-4 w-[12.5%] text-center">ชั่วโมงบรรยาย</th>
                        <th className="py-4 px-4 w-[12.5%] text-center">ชั่วโมงปฏิบัติ</th>
                        <th className="py-4 px-4 w-[12.5%] text-center">คุมสอบนอกตาราง</th>
                        <th className="py-4 px-4 w-[12.5%] text-center text-purple-700 bg-purple-50/20 border-b border-purple-100">
                            วิพากษ์ข้อสอบ <br/>
                            <span className="text-[10px] font-normal">(หัวข้อ)*</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.map((term, index) => (
                        <React.Fragment key={index}>
                            
                            <tr className="bg-slate-50">
                                <td colSpan={6} className="p-0 border-t-[3px] border-slate-200">
                                    <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-50/80 to-transparent border-l-[6px] border-indigo-500 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
                                        <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                            <Layers size={18} strokeWidth={2.5} />
                                        </div>
                                        <h3 className="font-bold text-indigo-900 text-base tracking-wide">
                                            {term.title}
                                        </h3>
                                        <span className="ml-2 bg-white px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 border border-indigo-100 shadow-sm">
                                            {term.courses.length} รายวิชา
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            
                            {term.courses.length > 0 ? (
                                term.courses.map((course, cIndex) => (
                                    <tr key={cIndex} className={`hover:bg-slate-50 transition-colors group text-sm ${course.isExternal ? "bg-orange-50/20" : ""}`}>
                                        <td className="py-4 px-6 align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <span className="font-semibold text-slate-800 text-base">{course.code}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                        {course.isExternal && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                                                                🏛️ นอกคณะ
                                                            </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                            <BookOpen size={12} /> {course.credit} หน่วยกิต
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-slate-500 font-light">{course.name}</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center align-top">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${course.role.includes('รับผิดชอบ') ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                {course.role}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center align-top text-slate-600">{course.lecture || '-'}</td>
                                        <td className="py-4 px-4 text-center align-top text-slate-600">{course.lab || '-'}</td>
                                        <td className="py-4 px-4 text-center align-top text-slate-600">{course.exam || '-'}</td>
                                        <td className="py-4 px-4 text-center align-top text-purple-600 bg-purple-50/10 font-medium">
                                            {course.critique ? course.critique : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-300 italic bg-white">
                                        - ไม่มีรายวิชาในภาคการศึกษานี้ -
                                    </td>
                                </tr>
                            )}

                            {term.courses.length > 0 && (
                                <tr className="bg-slate-50/80 font-semibold text-slate-700 border-y-2 border-slate-200 text-sm">
                                    <td colSpan={2} className="py-3.5 px-6 text-right text-xs uppercase tracking-wider text-slate-500">
                                        รวมเฉพาะ <span className="text-slate-700 font-bold">{term.title}</span>
                                    </td>
                                    <td className="py-3.5 px-4 text-center text-blue-700 font-bold">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(2)}</td>
                                    <td className="py-3.5 px-4 text-center text-blue-700 font-bold">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(2)}</td>
                                    <td className="py-3.5 px-4 text-center text-blue-700 font-bold">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(2)}</td>
                                    <td className="py-3.5 px-4 text-center text-purple-700 font-bold bg-purple-50/30">{term.courses.reduce((a, b) => a + b.critique, 0).toFixed(2)}</td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    
                    <tr className="bg-slate-800 text-white font-bold text-base shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] relative z-10">
                        <td colSpan={2} className="py-5 px-6 text-right tracking-wide uppercase text-sm">รวมตลอดปีการศึกษา</td>
                        <td className="py-5 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-5 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-5 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-5 px-4 text-center text-purple-200 border-r border-slate-700 bg-slate-900/50">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.critique, 0), 0).toFixed(2)}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Footer Remark */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 rounded-b-2xl">
            <div className="flex items-start gap-2 mb-2">
                <Info size={14} className="mt-0.5 shrink-0 text-purple-500" />
                <span className="font-medium text-slate-700">หมายเหตุการคำนวณภาระงาน:</span>
            </div>
            <ul className="list-disc pl-10 space-y-1">
                <li>ช่อง <strong>"วิพากษ์ข้อสอบ"</strong> แสดงจำนวนหัวข้อที่ทำจริง</li>
                <li>รายวิชาที่มี badge <strong>🏛️ นอกคณะ</strong> คือรายวิชาที่สอนให้กับคณะอื่น</li>
            </ul>
        </div>
      </div>
    </div>
  );
}