"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, BookOpen, Loader2, Printer } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Interfaces ---
interface StaffProfile {
  id: string; // ✅ แก้เป็น string
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  department: string;
  curriculum: string;
  adminPosition: string;
  academicPosition: string;
  workStatus: string;
}

interface ReportCourse {
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
  courses: ReportCourse[];
}

export default function StaffIndividualReportPage() {
  const params = useParams();
  const router = useRouter();
  // แปลงเป็น string ให้ชัวร์ (บางที params.id อาจจะเป็น array ถ้าใช้ catch-all routes)
  const staffId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [reportData, setReportData] = useState<SemesterData[]>([
    { title: "ภาคการศึกษาต้น", courses: [] },
    { title: "ภาคการศึกษาปลาย", courses: [] },
    { title: "ภาคฤดูร้อน", courses: [] }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffId) return;

    const fetchData = async () => {
        setLoading(true);
        try {
            // ---------------------------------------------------------
            // 1. Fetch Staff Profile
            // ---------------------------------------------------------
            const staffRes = await fetch("/api/staff");
            const staffData = await staffRes.json();
            
            let staffList: any[] = [];

            if (Array.isArray(staffData)) {
                staffList = staffData;
            } else if (staffData && Array.isArray(staffData.data)) {
                staffList = staffData.data;
            }

            // ✅ แก้ไข: เทียบ ID เป็น String (เพราะใน DB เป็น String แล้ว)
            const foundStaff = staffList.find((s: any) => String(s.id) === String(staffId));
            
            if (foundStaff) {
                setStaff(foundStaff);
            } else {
                toast.error("ไม่พบข้อมูลบุคลากรในระบบ");
            }

            // ---------------------------------------------------------
            // 2. Fetch Assignments
            // ---------------------------------------------------------
            // ส่ง staffId ไปตรงๆ (API รองรับ String แล้ว)
            const assignRes = await fetch(`/api/report/personal?lecturerId=${staffId}`);
            const assignData = await assignRes.json();

            if (Array.isArray(assignData)) {
                const term1: ReportCourse[] = [];
                const term2: ReportCourse[] = [];
                const term3: ReportCourse[] = [];

                assignData.forEach((assign: any) => {
                    // ✅ แก้ไข: เทียบ ID เป็น String
                    const isResponsible = String(assign.lecturerId) === String(assign.subject.responsibleUserId);
                    const role = isResponsible ? "ผู้รับผิดชอบรายวิชา" : "ผู้สอน";
                    
                    let note = "";
                    if (assign.lecturerStatus !== 'APPROVED') note = "รอการยืนยัน";
                    else if (assign.headApprovalStatus !== 'APPROVED') note = "รอหน.อนุมัติ";
                    else if (assign.deanApprovalStatus !== 'APPROVED') note = "รอคณบดีอนุมัติ";

                    const courseObj: ReportCourse = {
                        code: assign.subject.code,
                        name: assign.subject.name_th,
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
            } else {
                 console.warn("API Report Personal ไม่ได้ส่งกลับมาเป็น Array", assignData);
            }

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
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>;
  }

  if (!staff && !loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
            <p>ไม่พบข้อมูลผู้ใช้งาน หรือ เกิดข้อผิดพลาด (ID: {staffId})</p>
            <Button onClick={() => router.back()}>กลับไปหน้าก่อนหน้า</Button>
        </div>
      );
  }

  // --- ส่วนแสดงผล UI (เหมือนเดิม) ---
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun text-slate-800 print:bg-white print:p-0">
      <Toaster position="top-center" richColors />

      <style jsx global>{`
        @media print {
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
        }
      `}</style>

      {/* Navigation */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
          <Button variant="ghost" onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 gap-2 pl-0 hover:bg-transparent">
              <ArrowLeft size={20} /> ย้อนกลับหน้ารายชื่อ
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer size={16} /> พิมพ์รายงาน
          </Button>
      </div>

      {/* A4 Paper */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-md p-10 min-h-[297mm] relative flex flex-col print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-8">
        
        {/* Header */}
        <div className="border-b-2 border-slate-100 pb-6 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center print:border-black">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 print:border print:border-slate-300 print:text-black">
                {staff?.firstName?.charAt(0)}
            </div>
            
            <div className="flex-1 space-y-1">
                <h1 className="text-2xl font-bold text-slate-800">
                    {staff?.academicPosition && staff.academicPosition !== 'NULL' ? staff.academicPosition : ''} {staff?.firstName} {staff?.lastName}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 print:text-black">
                    <div className="flex items-center gap-1">
                        <Mail size={14} /> {staff?.email}
                    </div>
                    <div className="flex items-center gap-1">
                        <BookOpen size={14} /> {staff?.curriculum || "ไม่ระบุหลักสูตร"}
                    </div>
                </div>
                {staff?.adminPosition && staff.adminPosition !== 'NULL' && (
                    <div className="inline-block bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded mt-2 font-medium print:border print:border-black print:text-black print:bg-white">
                        {staff.adminPosition}
                    </div>
                )}
            </div>

            <div className="text-right">
                <div className="text-sm text-slate-500 mb-1">ปีการศึกษา</div>
                <div className="text-3xl font-bold text-slate-200 print:text-black">2567</div>
            </div>
        </div>

        {/* Content Table */}
        <div className="border rounded-lg overflow-hidden mb-12 flex-grow print:border-black">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b print:bg-gray-100 print:border-black">
                    <tr>
                        <th className="py-3 px-4 text-left font-semibold border-r print:border-black">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">สถานะ</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">บรรยาย</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">ปฏิบัติการ</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">คุมสอบ</th>
                        <th className="py-3 px-4 text-center font-semibold">หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody className="divide-y print:divide-black">
                    {reportData.map((term, index) => (
                        <React.Fragment key={index}>
                            <tr className="bg-slate-50/50 print:bg-gray-50">
                                <td colSpan={6} className="py-3 px-4 font-bold text-slate-700 border-b print:border-black">{term.title}</td>
                            </tr>
                            
                            {term.courses.length > 0 ? (
                                term.courses.map((course, cIndex) => (
                                    <tr key={cIndex} className="hover:bg-slate-50/30 print:hover:bg-none border-b print:border-black">
                                            <td className="py-3 px-4 align-top border-r print:border-black">
                                                <div className="font-medium">{course.code}</div>
                                                <div className="text-slate-500 text-xs">{course.name}</div>
                                            </td>
                                            <td className="py-3 px-4 text-center align-top border-r print:border-black">{course.role}</td>
                                            <td className="py-3 px-4 text-center align-top border-r print:border-black">{course.lecture}</td>
                                            <td className="py-3 px-4 text-center align-top border-r print:border-black">{course.lab}</td>
                                            <td className="py-3 px-4 text-center align-top border-r print:border-black">{course.exam || '-'}</td>
                                            <td className="py-3 px-4 text-center align-top text-slate-400 text-xs">{course.note}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="border-b print:border-black">
                                    <td colSpan={6} className="py-4 text-center text-slate-300 italic text-xs print:text-black">ไม่มีรายวิชา</td>
                                </tr>
                            )}

                            {term.courses.length > 0 && (
                                <tr className="bg-slate-50/30 font-bold text-slate-700 border-t border-dashed print:border-solid print:border-black print:bg-white">
                                    <td colSpan={2} className="py-2 px-4 text-right text-xs border-r print:border-black">รวม{term.title}</td>
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.lecture, 0).toFixed(2)}</td>
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.lab, 0).toFixed(2)}</td>
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.exam, 0).toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-gray-200 print:border-black">
                        <td colSpan={2} className="py-3 px-4 text-right text-sm border-r print:border-black">รวมตลอดปีการศึกษา</td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0).toFixed(2)}
                        </td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div className="mt-8 text-center print:text-left">
            <div className="text-[10px] text-slate-400 print:text-black">
                เอกสารสรุปภาระงานสอน ออกจากระบบออนไลน์
            </div>
        </div>

      </div>
    </div>
  );
}