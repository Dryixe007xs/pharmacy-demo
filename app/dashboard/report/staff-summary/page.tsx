"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  Users,
  LayoutGrid
} from "lucide-react";

// --- Type Definition ---
interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  type?: string;           
  department?: string;     
  curriculum?: string;     
  adminPosition?: string;  
  academicPosition?: string | null; 
}

export default function StaffSummaryListPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState(""); 

  // ===== 1. FETCH DATA =====
  useEffect(() => {
    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/staff");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            // กรองเอาเฉพาะสายวิชาการ (ACADEMIC) ตั้งแต่ตอนโหลดข้อมูลมาเลย
            const academics = Array.isArray(data) 
                ? data.filter((s: Staff) => s.type?.toUpperCase() === 'ACADEMIC') 
                : [];
            setStaffList(academics);
        } catch (error) {
            console.error("Error fetching staff:", error);
            setStaffList([]);
        } finally {
            setLoading(false);
        }
    };
    fetchStaff();
  }, []);

  // ===== 2. EXTRACT UNIQUE CURRICULUMS =====
  const uniqueCurriculums = useMemo(() => {
    const list = staffList
        .filter(s => s.curriculum)
        .map(s => s.curriculum as string);
    return Array.from(new Set(list)).sort();
  }, [staffList]);

  // ===== 3. FILTER LOGIC =====
  const filteredStaff = staffList.filter(staff => {
    // Search Filter
    const fullName = `${staff.academicPosition || ''}${staff.firstName} ${staff.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || (staff.email || "").toLowerCase().includes(search);

    // Curriculum Filter
    const matchesCurriculum = selectedCurriculum === "" || staff.curriculum === selectedCurriculum;

    return matchesSearch && matchesCurriculum;
  });

  // Helper Functions
  const getFullName = (staff: Staff) => `${staff.academicPosition || ''} ${staff.firstName} ${staff.lastName}`.trim();
  
  const getDisplayRole = (staff: Staff) => {
    if (staff.adminPosition && staff.adminPosition.trim() !== "") {
        return staff.adminPosition;
    }
    return "อาจารย์";
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <div className="font-sarabun min-h-screen bg-slate-50/50 p-6 md:p-8">
      
      {/* --- Header Section --- */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Users className="text-purple-600" /> ทำเนียบบุคลากรสายวิชาการ
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    รายชื่ออาจารย์และผู้รับผิดชอบรายวิชา แยกตามหลักสูตร
                </p>
            </div>
        </div>

        {/* --- Filters Bar --- */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col lg:flex-row gap-3 w-full lg:w-auto">
                
                {/* Curriculum Dropdown (Filter หลัก) */}
                <div className="relative w-full lg:w-80">
                    <div className="absolute left-3 top-2.5 pointer-events-none">
                        <LayoutGrid className="w-4 h-4 text-slate-400" />
                    </div>
                    <select 
                        value={selectedCurriculum} 
                        onChange={(e) => setSelectedCurriculum(e.target.value)} 
                        className="w-full border border-slate-200 rounded-lg pl-10 pr-8 py-2.5 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 appearance-none cursor-pointer"
                    >
                        <option value="">ทุกหลักสูตร</option>
                        {uniqueCurriculums.map((curr, idx) => (
                            <option key={idx} value={curr}>{curr}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>

                {/* Search Input */}
                <div className="relative w-full lg:w-80">
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่ออาจารย์ หรือ อีเมล..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none transition-all" 
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
            </div>
            
            <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
                พบข้อมูล {filteredStaff.length} ท่าน
            </div>
        </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                        <tr>
                            <th className="px-6 py-4 w-[35%]">อาจารย์</th>
                            <th className="px-6 py-4 w-[25%] text-center">หลักสูตร</th>
                            <th className="px-6 py-4 w-[20%] text-center">การติดต่อ</th>
                            <th className="px-6 py-4 w-[20%] text-right">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-20 text-slate-400">
                                    <div className="flex flex-col justify-center items-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" /> 
                                        <span>กำลังโหลดข้อมูล...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredStaff.length > 0 ? (
                            filteredStaff.map((staff) => (
                                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-4">
                                            {/* Avatar Initials */}
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shrink-0 shadow-sm">
                                                {getInitials(staff.firstName, staff.lastName)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-base">
                                                    {getFullName(staff)}
                                                </div>
                                                {/* ❌ เอา ID ออกแล้ว */}
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {getDisplayRole(staff)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-center align-middle">
                                        {staff.curriculum ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {staff.curriculum}
                                            </span>
                                        ) : <span className="text-slate-400">-</span>}
                                    </td>

                                    <td className="px-6 py-4 text-center align-middle">
                                        {staff.email ? (
                                            <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs border border-slate-200">
                                                {staff.email}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-right align-middle">
                                        <a 
                                            href={`/dashboard/report/staff-summary/${staff.id}`} 
                                            className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-medium text-purple-700 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 hover:shadow-sm transition-all whitespace-nowrap"
                                        >
                                            ดูรายละเอียด
                                        </a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Search className="w-10 h-10 mb-2 opacity-20" />
                                        <p>ไม่พบรายชื่ออาจารย์ที่ตรงกับเงื่อนไข</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer / Pagination */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
                 <div className="text-xs text-slate-500">
                    แสดง {filteredStaff.length} รายการ
                 </div>
                 <div className="flex gap-2">
                    <button disabled className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <button disabled className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                 </div>
            </div>
      </div>

    </div>
  );
}