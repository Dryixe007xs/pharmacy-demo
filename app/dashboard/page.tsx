"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react"; // 👈 1. Import พระเอกของเรา
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, BookOpen, Search, Calendar, FileText, ChevronRight, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  responsibleUserId: string; // 👈 แก้เป็น String ตาม Database
};

type Assignment = {
  id: number;
  lectureHours: number;
  labHours: number;
  subject: {
    code: string;
    name_th: string;
    name_en: string;
    responsibleUser?: {
        firstName: string;
        lastName: string;
        academicPosition: string;
    };
  };
  lecturerStatus: string;
  responsibleStatus: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession(); // 👈 2. ดึงข้อมูล Session จากระบบ Login
  const [activeTab, setActiveTab] = useState<"responsible" | "teaching">("responsible");
  
  // Data States
  const [responsibleCourses, setResponsibleCourses] = useState<Course[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalHours, setTotalHours] = useState(0);

  // 3. Load Data เมื่อ Login สำเร็จแล้วเท่านั้น
  useEffect(() => {
    const loadData = async () => {
        if (status === "loading") return; // รอโหลด Session
        if (status === "unauthenticated" || !session?.user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const userId = session.user.id; // 👈 ดึง ID จาก Session จริงๆ

            // Fetch 1: วิชาที่รับผิดชอบ
            const resCourses = await fetch("/api/courses");
            const allCourses = await resCourses.json();
            if (Array.isArray(allCourses)) {
                // กรองเฉพาะวิชาที่ฉันรับผิดชอบ
                const myCourses = allCourses.filter((c: any) => c.responsibleUserId === userId);
                setResponsibleCourses(myCourses);
            }

            // Fetch 2: วิชาที่สอน
            const resAssignments = await fetch(`/api/assignments?lecturerId=${userId}`);
            const myAssignments = await resAssignments.json();
            if (Array.isArray(myAssignments)) {
                setTeachingAssignments(myAssignments);
                const total = myAssignments.reduce((sum: number, a: any) => sum + (a.lectureHours || 0) + (a.labHours || 0), 0);
                setTotalHours(total);
            }

        } catch (e) {
            console.error("Error loading dashboard data", e);
        } finally {
            setLoading(false);
        }
    };

    loadData();
  }, [session, status]); // รันใหม่เมื่อ Session เปลี่ยนสถานะ

  const getResponsibleName = (user: any) => {
    if (!user) return "-";
    return `${user.academicPosition || ''} ${user.firstName} ${user.lastName}`.trim();
  };

  // ถ้ายังไม่ Login หรือกำลังโหลด ให้โชว์ Loading
  if (status === "loading") {
      return <div className="flex h-screen items-center justify-center text-slate-400">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sarabun p-6 bg-slate-50/30 min-h-screen">
      
      {/* 1. Header Section */}
      <div className="text-center pt-0 pb-4 space-y-2">
        <h1 className="text-2xl font-bold text-slate-800">
          {/* ✅ 4. ดึงชื่อจาก Session โดยตรง (มาจาก route.ts ที่เราแก้) */}
          สวัสดี, <span className="text-purple-600">{session?.user?.name || "อาจารย์"}</span>
        </h1>
        <p className="text-slate-500 text-sm">
          ยินดีต้อนรับสู่ระบบจัดการชั่วโมงสอน ประจำปีการศึกษา 2567
        </p>
      </div>

      {/* 2. Notification Banner */}
      <div className="bg-white rounded-xl border border-purple-100 p-1 shadow-sm flex flex-col md:flex-row items-center justify-between pr-4 overflow-hidden relative group hover:border-purple-300 transition-colors cursor-pointer">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 group-hover:bg-purple-600 transition-colors"></div>
        <div className="flex items-center gap-4 p-3 pl-4 w-full md:w-auto">
          <div className="bg-purple-100 p-2.5 rounded-lg text-purple-600 min-w-fit">
             <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">เปิดให้กรอกภาระงานสอน (ภาคเรียนที่ 1/2567)</h3>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-2">
              <Clock className="w-3 h-3" /> หมดเขต: 15 พ.ย. 67
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2 md:p-0">
          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-medium border border-red-100 flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            เหลือเวลา 5 วัน
          </span>
          <Button size="sm" variant="outline" className="text-xs h-8">ดูประกาศ</Button>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: ส่วนแสดงผลหลัก */}
        <div className="col-span-1 md:col-span-8 space-y-4">
          
          <div className="bg-white p-4 rounded-xl border shadow-sm min-h-[500px]">
            {/* Header: Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              
              {/* ปุ่มเลือกแท็บ */}
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg self-start">
                <button 
                  onClick={() => setActiveTab("responsible")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                    activeTab === "responsible" 
                      ? "bg-white text-purple-700 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Users className="w-4 h-4" /> วิชาที่รับผิดชอบ 
                  <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full">
                    {responsibleCourses.length}
                  </span>
                </button>
                <button 
                  onClick={() => setActiveTab("teaching")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                    activeTab === "teaching" 
                      ? "bg-white text-blue-700 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <BookOpen className="w-4 h-4" /> วิชาที่สอน 
                  <span className="ml-1 bg-yellow-100 text-yellow-600 text-[10px] px-1.5 rounded-full">
                    {teachingAssignments.length}
                  </span>
                </button>
              </div>
              
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="ค้นหารหัสวิชา..." 
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-slate-50"
                />
              </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center items-center h-64 text-slate-400">กำลังโหลดข้อมูล...</div>
            ) : activeTab === "responsible" ? (
              // ------------------ TAB 1: ตารางวิชาที่รับผิดชอบ ------------------
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 border-b text-slate-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 font-medium">รหัส / ชื่อวิชา</th>
                        <th className="px-5 py-3 font-medium text-center">สถานะ</th>
                        <th className="px-5 py-3 font-medium text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {responsibleCourses.length > 0 ? (
                          responsibleCourses.map((course) => (
                              <tr key={course.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-3.5">
                                  <div className="font-semibold text-slate-700">{course.code}</div>
                                  <div className="text-xs text-slate-500">{course.name_th}</div>
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                      รอดำเนินการ
                                    </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  {/* ✅ LINK TO COURSE OWNER PAGE */}
                                  <Button asChild size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 shadow-sm">
                                    <Link href="/dashboard/workload/owner">
                                        <FileText className="w-3.5 h-3.5 mr-1.5" /> กรอกข้อมูล
                                    </Link>
                                  </Button>
                                </td>
                              </tr>
                          ))
                      ) : (
                          <tr>
                              <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                                  คุณไม่มีรายวิชาที่รับผิดชอบ
                              </td>
                          </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // ------------------ TAB 2: การ์ดวิชาที่สอน ------------------
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                <h3 className="font-bold text-slate-700">รายการที่รอการยืนยันจากคุณ</h3>
                
                {teachingAssignments.length > 0 ? (
                    teachingAssignments.map((assign) => (
                        <div key={assign.id} className="border rounded-lg p-4 hover:border-blue-400 transition-all bg-white shadow-sm hover:shadow-md group">
                          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div className="space-y-3 w-full">
                              <div>
                                <h4 className="text-base font-bold text-slate-800">
                                    {assign.subject.code} {assign.subject.name_th}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    ผู้รับผิดชอบ : <span className="font-medium text-slate-700">{getResponsibleName(assign.subject.responsibleUser)}</span>
                                </p>
                              </div>
                              
                              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 w-fit">
                                <p className="text-xs font-semibold text-slate-600 mb-1">สรุปภาระงานที่ถูกกรอกมา:</p>
                                <p className="text-sm text-slate-800">
                                    บรรยาย {assign.lectureHours} / ปฏิบัติการ {assign.labHours} ชม.
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <div className="text-xs text-slate-400 mb-1">
                                    สถานะ: {assign.lecturerStatus}
                                </div>
                                {/* ✅ LINK TO INSTRUCTOR PAGE */}
                                <Button asChild variant="ghost" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-8 text-sm font-medium w-full md:w-auto">
                                    <Link href="/dashboard/workload/instructor">
                                        ตรวจสอบ <ChevronRight size={16} />
                                    </Link>
                                </Button>
                            </div>
                          </div>
                        </div>
                    ))
                ) : (
                    <div className="p-8 text-center border rounded-lg bg-slate-50 text-slate-400">
                        ยังไม่มีรายวิชาที่ถูกมอบหมายให้สอน
                    </div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Right Column: Stats & Menu */}
        <div className="col-span-1 md:col-span-4 space-y-4">
            <Card className="shadow-sm">
                <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">ภาระงานรวม</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">
                                {totalHours} <span className="text-base font-normal text-slate-400">ชม.</span>
                            </h3>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min((totalHours / 150) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 text-right">เป้าหมาย: 150 ชม.</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-2">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-slate-700">{responsibleCourses.length}</p>
                        <p className="text-xs text-slate-500">วิชาที่รับผิดชอบ</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <div className="mx-auto w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-2">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-slate-700">{teachingAssignments.length}</p>
                        <p className="text-xs text-slate-500">วิชาที่สอน</p>
                    </CardContent>
                </Card>
            </div>
            
        </div>

      </div>
    </div>
  );
}