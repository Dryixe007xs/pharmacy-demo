"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Loader2 
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
  const [activeTab, setActiveTab] = useState("ACADEMIC"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState(""); 
  const [selectedDepartment, setSelectedDepartment] = useState("");

  // ===== 1. FETCH DATA =====
  useEffect(() => {
    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/staff");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setStaffList(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching staff:", error);
            setStaffList([]);
        } finally {
            setLoading(false);
        }
    };
    fetchStaff();
  }, []);

  // ===== 2. EXTRACT UNIQUE OPTIONS =====
  const uniqueCurriculums = useMemo(() => {
    const list = staffList
        .filter(s => s.type?.toUpperCase() === 'ACADEMIC' && s.curriculum)
        .map(s => s.curriculum as string);
    return Array.from(new Set(list)).sort();
  }, [staffList]);

  const uniqueDepartments = useMemo(() => {
    let list = staffList.filter(s => s.type?.toUpperCase() === 'ACADEMIC' && s.department);
    if (selectedCurriculum) {
        list = list.filter(s => s.curriculum === selectedCurriculum);
    }
    const depts = list.map(s => s.department as string);
    return Array.from(new Set(depts)).sort();
  }, [staffList, selectedCurriculum]);

  // ===== 3. FILTER LOGIC =====
  const filteredStaff = staffList.filter(staff => {
    const isAcademic = staff.type?.toUpperCase() === 'ACADEMIC';
    if (activeTab === "ACADEMIC" && !isAcademic) return false;
    if (activeTab !== "ACADEMIC" && isAcademic) return false;

    const fullName = `${staff.academicPosition || ''}${staff.firstName} ${staff.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchesSearch = fullName.includes(search) || (staff.email || "").toLowerCase().includes(search);

    const matchesCurriculum = selectedCurriculum === "" || staff.curriculum === selectedCurriculum;
    const matchesDepartment = selectedDepartment === "" || staff.department === selectedDepartment;

    return matchesSearch && matchesCurriculum && matchesDepartment;
  });

  // Helper Functions
  const getFullName = (staff: Staff) => `${staff.academicPosition || ''} ${staff.firstName} ${staff.lastName}`.trim();
  
  // ✅ แก้ไข: ไม่ดึง academicPosition มาแสดงในช่องบทบาทแล้ว
  const getDisplayRole = (staff: Staff) => {
    if (staff.adminPosition && staff.adminPosition.trim() !== "") {
        return staff.adminPosition;
    }
    return "อาจารย์";
  };

  return (
    <div className="font-sarabun min-h-screen bg-white p-8">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-6 gap-4">
            <div className="flex-1 w-full lg:w-auto flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-[#1e3a8a]">
                  {activeTab === "ACADEMIC" ? "รายชื่อบุคลากรสายวิชาการ" : "รายชื่อเจ้าหน้าที่และผู้ดูแลระบบ"} 
                  <span className="text-gray-400 text-lg ml-2">({filteredStaff.length} ท่าน)</span>
                </h3>
                
                <div className="flex flex-wrap gap-4 w-full items-center relative z-20">
                    
                    {/* Search Input */}
                    <div className="relative w-80">
                        <input 
                            type="text" 
                            placeholder="ค้นหาชื่อ หรือ อีเมล..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 focus:ring-2 focus:ring-purple-200 outline-none" 
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    {activeTab === "ACADEMIC" && (
                      <>
                        {/* Dropdown 1: Curriculum */}
                        <div className="relative w-64 z-20">
                            <div className="absolute left-3 top-2.5 pointer-events-none">
                                <Filter className="w-4 h-4 text-gray-500" />
                            </div>
                            <select 
                                value={selectedCurriculum} 
                                onChange={(e) => { 
                                    setSelectedCurriculum(e.target.value); 
                                    setSelectedDepartment(""); 
                                }} 
                                className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer"
                            >
                                <option value="">ทุกหลักสูตร</option>
                                {uniqueCurriculums.map((curr, idx) => (
                                    <option key={idx} value={curr}>{curr}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                        </div>

                        {/* Dropdown 2: Department */}
                        {uniqueDepartments.length > 0 && (
                             <div className="relative w-64 z-10">
                                <div className="absolute left-3 top-2.5 pointer-events-none">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                </div>
                                <select 
                                    value={selectedDepartment} 
                                    onChange={(e) => setSelectedDepartment(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer"
                                >
                                    <option value="">ทุกกลุ่มวิชา</option>
                                    {uniqueDepartments.map((dept, idx) => (
                                        <option key={idx} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        )}
                      </>
                    )}
                </div>
            </div>
      </div>

      {/* --- Table Section --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 uppercase text-slate-700">
                    <tr>
                        <th className="px-6 py-4 font-bold w-[30%]">ชื่อ - สกุล</th>
                        <th className="px-6 py-4 font-bold w-[20%] text-center">E-Mail</th>
                        <th className="px-6 py-4 font-bold w-[20%] text-center">หลักสูตร</th>
                        <th className="px-6 py-4 font-bold w-[20%] text-center">บทบาท</th>
                        <th className="px-6 py-4 font-bold text-right w-[10%]">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400">
                                <div className="flex justify-center items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูล...
                                </div>
                            </td>
                        </tr>
                    ) : filteredStaff.length > 0 ? (
                        filteredStaff.map((staff) => (
                            <tr key={staff.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                                <td className="px-6 py-4 font-medium text-slate-800 align-top">
                                    {getFullName(staff)}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-center align-top">
                                    {staff.email || "-"}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-center align-top">
                                    {staff.curriculum || "-"}
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-center align-top">
                                    {getDisplayRole(staff)}
                                </td>
                                <td className="px-6 py-4 text-right align-top">
                                    <a 
                                        href={`/staff/${staff.id}`} 
                                        className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors"
                                    >
                                        รายละเอียด
                                    </a>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-400">
                                ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            {/* Footer / Pagination */}
            <div className="bg-slate-50 border-t px-6 py-3 flex items-center justify-between">
                 <span className="text-sm text-slate-500">
                    แสดง {filteredStaff.length} รายการ
                 </span>
                 <div className="flex gap-1">
                    <button disabled className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button disabled className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
            </div>
      </div>

    </div>
  );
}