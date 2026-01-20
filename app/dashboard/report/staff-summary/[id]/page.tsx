"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, BookOpen, Loader2, Printer, Building2 } from "lucide-react";
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
}

interface ReportCourse {
  code: string;
  name: string;
  credit: string | number;
  role: string;
  lecture: number;
  lab: number;
  exam: number;
  note: string;
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

  useEffect(() => {
    if (!staffId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
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
            // ✅ 1. เพิ่มตัวกรอง: ถ้ายังไม่ Approved ข้ามไปเลย
            if (assign.deanApprovalStatus !== 'APPROVED') {
                return;
            }

            const isResponsible = String(assign.lecturerId) === String(assign.subject.responsibleUserId);
            const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";
            
            // ✅ 2. ปรับ Note: ไม่ต้องเช็คเงื่อนไขอื่นแล้ว เพราะผ่านมาถึงตรงนี้คืออนุมัติแล้วแน่นอน
            const note = "อนุมัติแล้ว";

            const courseObj: ReportCourse = {
                code: assign.subject.code,
                name: assign.subject.name_th,
                credit: assign.subject.credit || assign.subject.credits || "-",
                role: role,
                lecture: assign.lectureHours || 0,
                lab: assign.labHours || 0,
                exam: assign.examHours || 0,
                note: note
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
        console.error("Fetch Error:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [staffId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
            <Loader2 className="animate-spin w-10 h-10 text-purple-600"/>
            <p className="text-slate-400 text-sm animate-pulse">กำลังดึงข้อมูลรายงาน...</p>
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
    <div className="min-h-screen bg-slate-100/50 p-6 font-sarabun text-slate-800 print:bg-white print:p-0">
      <Toaster position="top-center" richColors />

      {/* Styles for Print */}
      <style jsx global>{`
        @media print {
            @page { margin: 10mm; size: A4; }
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            tr.bg-slate-100 { background-color: #f1f5f9 !important; }
        }
      `}</style>

      {/* Navigation Bar */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center no-print">
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

      {/* A4 Paper Simulation */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl shadow-slate-200/60 p-[15mm] min-h-[297mm] relative flex flex-col rounded-xl print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-0 print:rounded-none">
        
        {/* --- Header Section --- */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div className="flex items-center gap-5">
                {/* Avatar Placeholder */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 border border-purple-100 flex items-center justify-center text-2xl font-bold text-purple-700 shadow-sm print:border-slate-300 print:bg-none print:text-black">
                    {staff.firstName?.charAt(0)}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 mb-1">
                        {staff.title && staff.title !== 'NULL' ? staff.title : ''} {staff.firstName} {staff.lastName}
                    </h1>
                    <div className="text-sm text-slate-500 space-y-1">
                        <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-purple-400 print:text-slate-400"/> 
                            {staff.department || "คณะเภสัชศาสตร์"}
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen size={14} className="text-purple-400 print:text-slate-400"/> 
                            {staff.curriculum || "-"}
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">ปีการศึกษา</div>
                <div className="text-3xl font-bold text-slate-700">2567</div>
            </div>
        </div>

        {/* --- Content Table --- */}
        <div className="flex-grow">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wide text-[11px] print:bg-slate-100">
                        <th className="py-3 px-2 text-left w-[35%]">วิชา</th>
                        <th className="py-3 px-2 text-center w-[15%]">สถานะ</th>
                        <th className="py-3 px-2 text-center w-[10%]">บรรยาย</th>
                        <th className="py-3 px-2 text-center w-[10%]">ปฏิบัติ</th>
                        <th className="py-3 px-2 text-center w-[10%]">คุมสอบ</th>
                        <th className="py-3 px-2 text-center w-[20%]">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {reportData.map((term, index) => (
                        <React.Fragment key={index}>
                            {/* Semester Header */}
                            <tr className="bg-slate-50/50 print:bg-white">
                                <td colSpan={6} className="py-3 px-2 font-bold text-purple-700 text-xs border-b border-slate-100 print:text-black mt-4">
                                    {term.title}
                                </td>
                            </tr>
                            
                            {term.courses.length > 0 ? (
                                term.courses.map((course, cIndex) => (
                                    <tr key={cIndex} className="group">
                                            <td className="py-3 px-2 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-700">{course.code}</span>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 print:border-indigo-300 print:text-black">
                                                            <BookOpen size={10} /> {course.credit} หน่วยกิต
                                                        </span>
                                                    </div>
                                                    <div className="text-slate-500 text-xs font-light">{course.name}</div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 text-center align-top">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                                    course.role === 'ผู้รับผิดชอบรายวิชา' 
                                                    ? 'bg-orange-50 text-orange-700 border-orange-100' 
                                                    : 'bg-slate-50 text-slate-600 border-slate-100'
                                                }`}>
                                                    {course.role}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-center align-top text-slate-600 font-medium">{course.lecture}</td>
                                            <td className="py-3 px-2 text-center align-top text-slate-600 font-medium">{course.lab}</td>
                                            <td className="py-3 px-2 text-center align-top text-slate-600 font-medium">{course.exam || '-'}</td>
                                            <td className="py-3 px-2 text-center align-top text-xs text-slate-400">{course.note}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-slate-300 text-xs italic">
                                        - ไม่มีรายวิชา -
                                    </td>
                                </tr>
                            )}

                            {/* Subtotal */}
                            {term.courses.length > 0 && (
                                <tr className="border-t border-slate-200 border-dashed">
                                    <td colSpan={2} className="py-2 px-2 text-right text-[10px] text-slate-400 font-medium uppercase">รวม{term.title}</td>
                                    <td className="py-2 px-2 text-center text-xs font-bold text-slate-700">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(1)}</td>
                                    <td className="py-2 px-2 text-center text-xs font-bold text-slate-700">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(1)}</td>
                                    <td className="py-2 px-2 text-center text-xs font-bold text-slate-700">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(1)}</td>
                                    <td></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
                
                {/* Grand Total */}
                <tfoot className="border-t-2 border-slate-800 bg-slate-50 print:bg-slate-100 print:border-black mt-4">
                    <tr>
                        <td colSpan={2} className="py-3 px-4 text-right font-bold text-slate-800">รวมทั้งสิ้น</td>
                        <td className="py-3 px-2 text-center font-bold text-purple-700 text-base">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-purple-700 text-base">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-purple-700 text-base">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0).toFixed(1)}
                        </td>
                        <td className="py-3 px-2 text-center text-xs text-slate-500">ชั่วโมง</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Footer Signature Area */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end text-xs text-slate-400 no-print">
            <div>เอกสารสรุปภาระงานสอนออนไลน์</div>
            <div>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</div>
        </div>

      </div>
    </div>
  );
}