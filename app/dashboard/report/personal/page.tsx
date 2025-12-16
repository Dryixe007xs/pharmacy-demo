"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Printer } from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Types ---
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

export default function PersonalReportPage() {
  const [reportData, setReportData] = useState<SemesterData[]>([
    { title: "ภาคการศึกษาต้น", courses: [] },
    { title: "ภาคการศึกษาปลาย", courses: [] },
    { title: "ภาคฤดูร้อน", courses: [] }
  ]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ===== FETCH DATA =====
  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        // 1. Get User
        const storedUser = localStorage.getItem("currentUser");
        if (!storedUser) {
            setLoading(false);
            return;
        }
        const userData = JSON.parse(storedUser);
        setUser(userData);

        try {
            // 2. Fetch Assignments
            const res = await fetch(`/api/assignments?lecturerId=${userData.id}`);
            const data = await res.json();

            if (!Array.isArray(data)) return;

            // 3. Process Data
            const term1: ReportCourse[] = [];
            const term2: ReportCourse[] = [];
            const term3: ReportCourse[] = [];

            data.forEach((assign: any) => {
                // Determine Role
                const role = assign.lecturerId === assign.subject.responsibleUserId 
                    ? "ผู้รับผิดชอบรายวิชา" 
                    : "ผู้สอน";
                
                // Determine Note (e.g. status)
                let note = "";
                if (assign.lecturerStatus !== 'APPROVED') note = "รอการยืนยัน";
                else if (assign.headApprovalStatus !== 'APPROVED') note = "รออนุมัติ";

                const courseObj: ReportCourse = {
                    code: assign.subject.code,
                    name: assign.subject.name_th,
                    role: role,
                    lecture: assign.lectureHours || 0,
                    lab: assign.labHours || 0,
                    exam: assign.examHours || 0,
                    note: note
                };

                // Group by Semester (สมมติว่า DB เก็บ semester เป็น 1, 2, 3)
                // ถ้าไม่มีค่า semester ใน DB ให้ default ลงเทอม 1
                const sem = assign.semester || 1;
                
                if (sem === 1) term1.push(courseObj);
                else if (sem === 2) term2.push(courseObj);
                else term3.push(courseObj);
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
  }, []);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun text-slate-800 print:bg-white print:p-0">
      <Toaster position="top-center" richColors />
      
      {/* Header Breadcrumb (Hidden on Print) */}
      <div className="mb-6 print:hidden">
        <h1 className="text-xl text-slate-500">รายงานสรุป / รายงานสรุปรายบุคคล</h1>
      </div>

      {/* A4 Paper Container */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-md p-10 min-h-[297mm] relative flex flex-col print:shadow-none print:w-full print:max-w-none print:min-h-0 print:p-8">
        
        {/* Report Header */}
        <div className="text-center mb-8 space-y-2">
           <h2 className="text-xl font-bold">รายงานสรุปชั่วโมงสอนประจำปีการศึกษา 2567</h2>
           <p className="font-bold text-lg">
             {user ? `${user.academicPosition || ''} ${user.firstName} ${user.lastName}` : "-"}
           </p>
           <p className="font-semibold text-lg">สาขาวิชาการบริบาลทางเภสัชกรรม</p>
           <p className="font-semibold text-slate-600">คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา</p>
        </div>

        {/* Content Table */}
        <div className="border rounded-lg overflow-hidden mb-12 flex-grow print:border-black">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b print:bg-gray-100 print:border-black">
                    <tr>
                        <th className="py-3 px-4 text-left font-semibold border-r print:border-black">รหัสวิชา / ชื่อรายวิชา</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">ตำแหน่ง</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">ชั่วโมงบรรยาย</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">ชั่วโมงปฏิบัติการ</th>
                        <th className="py-3 px-4 text-center font-semibold border-r print:border-black">คุมสอบนอกตาราง</th>
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
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.lecture, 0)}</td>
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.lab, 0)}</td>
                                    <td className="py-2 px-4 text-center text-xs border-r print:border-black">{term.courses.reduce((a, b) => a + b.exam, 0)}</td>
                                    <td></td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                    
                    {/* Grand Total */}
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 print:bg-gray-200 print:border-black">
                        <td colSpan={2} className="py-3 px-4 text-right text-sm border-r print:border-black">รวมตลอดปีการศึกษา</td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lecture, 0), 0)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.lab, 0), 0)}
                        </td>
                        <td className="py-3 px-4 text-center text-sm border-r print:border-black">
                            {reportData.reduce((sum, term) => sum + term.courses.reduce((a, b) => a + b.exam, 0), 0)}
                        </td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Signatures Section */}
        <div className="mt-8 grid grid-cols-2 gap-16 px-8 break-inside-avoid">
            <div className="text-center space-y-12">
                <div className="space-y-2">
                    <div className="font-bold text-sm">(ผศ.ดร.ภก ณัฐ นาเอก)</div>
                    <div className="text-xs font-semibold">ประธานหลักสูตรเภสัชศาสตรบัณฑิต</div>
                    <div className="text-xs text-slate-400 pt-2 print:text-black">___/___/___</div>
                </div>
            </div>
            <div className="text-center space-y-12">
                <div className="space-y-2">
                    <div className="font-bold text-sm">(รศ. ดร. ภญ. สุภางค์ คนดี)</div>
                    <div className="text-xs font-semibold">รองคณบดีฝ่ายวิชาการ</div>
                    <div className="text-xs text-slate-400 pt-2 print:text-black">___/___/___</div>
                </div>
            </div>
        </div>

        {/* Bottom Small Text */}
        <div className="mt-16 text-[10px] text-slate-500 flex flex-col gap-1 print:mt-8">
            <span>เจ้าหน้าที่ฝ่ายวิชาการผู้ปฏิบัติงาน</span>
            <div className="flex gap-4">
                 <span>1. นางสาว ธนารีย์ เครือวัลย์</span>
                 <span>2. นาง ไพจิตรา อินสุขขิน</span>
            </div>
        </div>

        {/* Download Button Section (Hidden on Print) */}
        <div className="mt-8 flex flex-col items-center gap-2 print:hidden">
             <Button onClick={handlePrint} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50 flex gap-2 w-fit">
                <Printer size={16} /> พิมพ์รายงาน / บันทึกเป็น PDF
             </Button>
             <p className="text-[10px] text-slate-400 font-light">
                * ข้อมูลดังกล่าวจะเปิดให้ดาวน์โหลดได้เมื่อสิ้นสุดปีการศึกษา
             </p>
        </div>

      </div>

    </div>
  );
}