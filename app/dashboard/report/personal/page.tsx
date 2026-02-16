"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation"; 
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Mail, BookOpen, GraduationCap, Calendar, FileText, Building2, Info, Layers } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Interfaces ---
interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
}

interface SemesterData {
  title: string;
  courses: ReportCourse[];
}

interface LecturerProfile {
    firstName: string;
    lastName: string;
    email: string;
    academicPosition: string;
    curriculum: string;
    department: string;
}

export default function PersonalReportPage() {
  const { data: session, status } = useSession();
  
  const searchParams = useSearchParams();
  const queryLecturerId = searchParams.get("lecturerId");

  const [reportData, setReportData] = useState<SemesterData[]>([
    { title: "ภาคการศึกษาต้น", courses: [] },
    { title: "ภาคการศึกษาปลาย", courses: [] },
    { title: "ภาคฤดูร้อน", courses: [] }
  ]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  const [academicYear, setAcademicYear] = useState<string | number>("-");
  
  // ✅ State สำหรับ Iframe Print URL
  const [printUrl, setPrintUrl] = useState<string | null>(null);

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === 'unauthenticated') {
        setLoading(false);
        return;
    }
    
    // ถ้ามี ID ใน URL ให้ใช้ ID นั้น (สำหรับ Admin ดูคนอื่น) ถ้าไม่มีให้ใช้ ID ตัวเอง
    const targetId = queryLecturerId || session?.user?.id;
    if (!targetId) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. ดึงปีการศึกษา
            const termRes = await fetch("/api/term-config/active");
            const termData = await termRes.json();
            if (termData && termData.academicYear) {
                setAcademicYear(termData.academicYear);
            }

            // 2. ดึงข้อมูลรายงาน
            const res = await fetch(`/api/report/personal?lecturerId=${targetId}`);
            if (!res.ok) throw new Error("Failed to fetch");
            
            const { lecturer, assignments } = await res.json();

            setProfile(lecturer);

            const data = assignments || [];
            const term1: ReportCourse[] = [];
            const term2: ReportCourse[] = [];
            const term3: ReportCourse[] = [];

            data.forEach((assign: any) => {
                // กรองเฉพาะที่ผ่านการอนุมัติขั้นสุดท้ายแล้ว
                if (assign.academicApprovalStatus !== 'APPROVED') {
                    return; 
                }

                const isResponsible = String(assign.lecturerId) === String(assign.subject.responsibleUserId);
                const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";

                const courseObj: ReportCourse = {
                    code: assign.subject.code,
                    name: assign.subject.name_th,
                    credit: assign.subject.credit || assign.subject.credits || "-",
                    role: role,
                    lecture: Number(assign.lectureHours) || 0,
                    lab: Number(assign.labHours) || 0,
                    exam: Number(assign.examHours) || 0,
                    critique: Number(assign.examCritiqueHours) || 0,
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
            console.error(error);
            toast.error("ไม่สามารถโหลดข้อมูลรายงานได้");
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [status, session?.user?.id, queryLecturerId]);

  // ✅ ฟังก์ชันสั่งพิมพ์ (เรียกหน้า Template ผ่าน Iframe)
  const handlePrint = () => {
    const targetId = queryLecturerId || session?.user?.id;
    if (targetId) {
        toast.info("กำลังเตรียมเอกสารสำหรับพิมพ์...");
        // ใส่ timestamp เพื่อบังคับ reload iframe ทุกครั้งที่กด
        setPrintUrl(`/print/report/personal?lecturerId=${targetId}&t=${Date.now()}`);
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>;
  }

  if (!profile) {
      return <div className="min-h-screen flex items-center justify-center text-slate-400">กรุณาเข้าสู่ระบบ หรือระบุ ID อาจารย์ให้ถูกต้อง</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun text-slate-800">
      <Toaster position="top-center" richColors />
      
      {/* ✅ Iframe ซ่อนสำหรับโหลดหน้าปริ้น */}
      {printUrl && (
        <iframe 
            src={printUrl} 
            className="fixed w-0 h-0 border-0"
            title="Print Frame"
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-purple-600" /> รายงานสรุปภาระงานสอนรายบุคคล
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                ประจำปีการศึกษา {academicYear} | คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
            </p>
        </div>
        <Button onClick={handlePrint} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm gap-2">
            <Printer size={18} /> พิมพ์รายงาน
        </Button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Profile Header */}
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 via-white to-white">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl font-bold text-purple-600 shrink-0">
                    {profile.firstName?.charAt(0)}
                </div>
                
                <div className="flex-1 space-y-3">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                            {profile.academicPosition ? profile.academicPosition : ''} {profile.firstName} {profile.lastName}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-500 text-lg font-light mt-1">
                            <GraduationCap size={18} className="text-purple-400" />
                            <span>{profile.curriculum || "ไม่ระบุสังกัด/กลุ่มวิชา"}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Mail size={16} className="text-purple-500" /> 
                            <span>{profile.email}</span>
                        </div>
                
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
                                    <tr key={cIndex} className="hover:bg-slate-50 transition-colors group text-sm">
                                            <td className="py-4 px-6 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-800 text-base">{course.code}</span>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                            <BookOpen size={12} /> {course.credit} หน่วยกิต
                                                        </span>
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

                            {/* รวมยอดแต่ละเทอม */}
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
                    
                    {/* Grand Total Row */}
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
        <div className="p-5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex items-start gap-2 mb-2">
                <Info size={14} className="mt-0.5 shrink-0 text-purple-500" />
                <span className="font-medium text-slate-700">หมายเหตุการคำนวณภาระงาน:</span>
            </div>
            <ul className="list-disc pl-10 space-y-1">
                <li>ช่อง <strong>"วิพากษ์ข้อสอบ"</strong> แสดงจำนวนหัวข้อที่ทำจริง</li>
            </ul>
            
            <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between items-center gap-2 text-[10px] text-slate-400">
                <span>ระบบฐานข้อมูลภาระงานสอน คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</span>
                <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>

      </div>
    </div>
  );
}