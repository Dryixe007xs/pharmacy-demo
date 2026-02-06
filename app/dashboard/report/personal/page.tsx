"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Mail, BookOpen, GraduationCap, Calendar, FileText, Building2, Info } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Types ---
interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  critique: number;
  statusLabel: string;
  statusColor: string; 
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
  const [reportData, setReportData] = useState<SemesterData[]>([
    { title: "ภาคการศึกษาต้น", courses: [] },
    { title: "ภาคการศึกษาปลาย", courses: [] },
    { title: "ภาคฤดูร้อน", courses: [] }
  ]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LecturerProfile | null>(null);
  
  // ✅ เพิ่ม State เก็บปีการศึกษาจริง
  const [academicYear, setAcademicYear] = useState<string | number>("-");

  // ===== FETCH DATA =====
  useEffect(() => {
    if (status === 'unauthenticated') {
        setLoading(false);
        return;
    }
    
    const targetId = session?.user?.id;
    if (!targetId) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            // ✅ 1. ดึงข้อมูลปีการศึกษาปัจจุบัน (Active Term)
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
                if (assign.deanApprovalStatus !== 'APPROVED') {
                    return; 
                }

                const isResponsible = String(assign.lecturerId) === String(assign.subject.responsibleUserId);
                const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";
                const statusLabel = "อนุมัติแล้ว";
                const statusColor = "bg-green-100 text-green-700 border-green-200";

                const courseObj: ReportCourse = {
                    code: assign.subject.code,
                    name: assign.subject.name_th,
                    credit: assign.subject.credit || assign.subject.credits || "-",
                    role: role,
                    lecture: assign.lectureHours || 0,
                    lab: assign.labHours || 0,
                    exam: assign.examHours || 0,
                    critique: assign.examCritiqueHours || 0,
                    statusLabel: statusLabel,
                    statusColor: statusColor
                };

                const sem = assign.semester;
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
  }, [status, session?.user?.id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>;
  }

  if (!profile) {
      return <div className="min-h-screen flex items-center justify-center text-slate-400">กรุณาเข้าสู่ระบบเพื่อดูรายงาน</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/30 p-8 font-sarabun text-slate-800 print:bg-white print:p-0">
      <Toaster position="top-center" richColors />
      
      <style jsx global>{`
        @media print {
            @page { margin: 10mm; size: landscape; }
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-purple-600" /> รายงานสรุปภาระงานสอนรายบุคคล
            </h1>
            <p className="text-slate-500 text-sm mt-1">
                {/* ✅ ใช้ตัวแปร academicYear */}
                ประจำปีการศึกษา {academicYear} | คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
            </p>
        </div>
        <Button onClick={handlePrint} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm gap-2">
            <Printer size={18} /> พิมพ์รายงาน
        </Button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Profile Header */}
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 via-white to-white print:bg-none">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl font-bold text-purple-600 shrink-0 print:border-slate-300">
                    {profile.firstName?.charAt(0)}
                </div>
                
                <div className="flex-1 space-y-3">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
                            {profile.academicPosition ? profile.academicPosition : ''} {profile.firstName} {profile.lastName}
                        </h2>
                        <div className="flex items-center gap-2 text-slate-500 text-lg font-light mt-1">
                            <Building2 size={18} className="text-purple-400" />
                            <span>{profile.department || "ไม่ระบุสังกัด/กลุ่มวิชา"}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Mail size={16} className="text-purple-500" /> 
                            <span>{profile.email}</span>
                        </div>
                        {profile.curriculum && (
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <GraduationCap size={16} className="text-purple-500" /> 
                                <span className="truncate max-w-[250px]">{profile.curriculum}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Calendar size={16} className="text-purple-500" /> 
                            {/* ✅ ใช้ตัวแปร academicYear */}
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
                        <th className="py-4 px-6 w-[25%]">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-4 px-6 w-[15%] text-center">บทบาท</th>
                        <th className="py-4 px-4 w-[10%] text-center">ชั่วโมงบรรยาย</th>
                        <th className="py-4 px-4 w-[10%] text-center">ชั่วโมงปฏิบัติ</th>
                        <th className="py-4 px-4 w-[10%] text-center">คุมสอบนอกตาราง</th>
                        
                        <th className="py-4 px-4 w-[10%] text-center text-purple-700 bg-purple-50/20 border-b border-purple-100">
                            วิพากษ์ข้อสอบ <br/>
                            <span className="text-[10px] font-normal">(หัวข้อ)*</span>
                        </th>
                        
                        <th className="py-4 px-6 w-[10%] text-center font-bold text-slate-800 bg-slate-100/50">
                            รวม (ชม.)
                        </th>
                        <th className="py-4 px-6 w-[10%] text-center">สถานะ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.map((term, index) => (
                        <React.Fragment key={index}>
                            <tr className="bg-purple-50/30">
                                <td colSpan={8} className="py-3 px-6 font-bold text-purple-800 text-sm border-b border-slate-100">
                                    {term.title}
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
                                            
                                            <td className="py-4 px-6 text-center align-top font-bold text-slate-800 bg-slate-50/30">
                                                {(course.lecture + course.lab + (course.exam || 0) + (course.critique || 0)).toFixed(2)}
                                            </td>
                                            <td className="py-4 px-6 text-center align-top">
                                                <span className={`inline-block px-2 py-1 rounded-md text-[11px] font-medium border ${course.statusColor}`}>
                                                    {course.statusLabel}
                                                </span>
                                            </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-300 italic bg-white">
                                        - ไม่มีรายวิชาในภาคการศึกษานี้ -
                                    </td>
                                </tr>
                            )}

                            {term.courses.length > 0 && (
                                <tr className="bg-slate-50/50 font-semibold text-slate-700 border-t border-slate-200 text-sm">
                                    <td colSpan={2} className="py-3 px-6 text-right text-xs uppercase tracking-wider">รวมเฉพาะ{term.title}</td>
                                    <td className="py-3 px-4 text-center">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-center">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-center">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-center text-purple-600">{term.courses.reduce((a, b) => a + b.critique, 0).toFixed(2)}</td>
                                    <td className="py-3 px-6 text-center text-white bg-slate-600">
                                        {(term.courses.reduce((a, b) => a + b.lecture + b.lab + (b.exam || 0) + (b.critique || 0), 0)).toFixed(2)}
                                    </td>
                                    <td></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    
                    {/* Grand Total Row */}
                    <tr className="bg-slate-800 text-white font-bold text-base print:bg-gray-200 print:text-black print:border-t-2 print:border-black">
                        <td colSpan={2} className="py-4 px-6 text-right">รวมตลอดปีการศึกษา</td>
                        <td className="py-4 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-center">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-center text-purple-300 print:text-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.critique, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-center bg-slate-900 print:bg-gray-400 border-l border-slate-700">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture + b.lab + (b.exam || 0) + (b.critique || 0), 0), 0).toFixed(2)}
                        </td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Footer Remark */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-start gap-2 mb-2">
                <Info size={14} className="mt-0.5 shrink-0 text-purple-500" />
                <span className="font-medium text-slate-600">หมายเหตุการคำนวณภาระงาน:</span>
            </div>
            <ul className="list-disc pl-10 space-y-1">
                <li>ช่อง <strong>"วิพากษ์ข้อสอบ"</strong> แสดงจำนวนหัวข้อที่ทำจริง</li>
                <li>ในการคำนวณ <strong>"รวม (ชม.)"</strong> คิดภาระงานเทียบเท่า <strong>1 หัวข้อ = 1 ชั่วโมงทำการ</strong> (*)</li>
            </ul>
            
            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                <span>ระบบฐานข้อมูลภาระงานสอน คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</span>
                <span>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>

      </div>
    </div>
  );
}