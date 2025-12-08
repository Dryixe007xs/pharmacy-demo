"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Search, Edit, Trash2, X, ChevronLeft, ChevronRight, User, ChevronsUpDown
} from "lucide-react";

// --- Types ---
type UserData = {
  id: number;
  name: string;
  email: string;
  position: string;
};

type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  credit: string;
  instructor?: string; // Field นี้มีไว้สำหรับแสดงผลในหน้ารายละเอียดเท่านั้น
  program_full_name?: string;
  program: {
    id: number;
    name_th: string;
    year: number;
    degree_level?: string;
  };
  responsibleUserId?: number;
  responsibleUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    academicRank?: string;
    academicPosition?: string;
    title?: string;
  };
};

type Program = {
  id: number;
  name_th: string;
  year: number;
};

// Helper: สร้างชื่อเต็มผู้รับผิดชอบ (ใช้ตัวนี้เป็นหลัก)
const getResponsibleName = (user: Course['responsibleUser']) => {
  if (!user) return "-";
  const prefix = user.academicPosition || user.title || "";
  return `${prefix} ${user.firstName || ""} ${user.lastName || ""}`.trim();
};


export default function CourseDataPage() {
  // --- States ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserData[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState<any>({});
  
  // *** REMOVED: selectedInstructors state ถูกนำออก (ตามความต้องการล่าสุด) ***
  const [selectedResponsible, setSelectedResponsible] = useState<UserData | null>(null);

  const [viewCourse, setViewCourse] = useState<Course | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const resCourses = await fetch("/api/courses", { cache: 'no-store' });
      const dataCourses = await resCourses.json();
      
      const resStaff = await fetch("/api/staff", { cache: 'no-store' });
      const dataStaff = await resStaff.json();

      setCourses(Array.isArray(dataCourses) ? dataCourses : []);
      setUsers(Array.isArray(dataStaff) ? dataStaff : []);

      const uniquePrograms = new Map();
      if (Array.isArray(dataCourses)) {
        dataCourses.forEach((c: any) => {
            if (c.program) uniquePrograms.set(c.program.id, c.program);
        });
      }
      setPrograms(Array.from(uniquePrograms.values()));

    } catch (err) {
      console.error("Error fetching data:", err);
      setCourses([]); 
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันการลบรายวิชานี้?")) return;
    try {
      // NOTE: API courses/route.ts จะจัดการลบ TeachingAssignment ที่ผูกกับ Subject นี้ให้
      await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
      fetchInitialData();
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name_th || !formData.programId) {
        alert("กรุณากรอกข้อมูลสำคัญ (รหัส, ชื่อไทย, หลักสูตร) ให้ครบถ้วน");
        return;
      }

      const payload = {
        ...formData,
        responsibleUserId: selectedResponsible ? selectedResponsible.id : null,
        // ไม่ส่ง instructor field ไป เพราะหน้า courses นี้ไม่จัดการผู้สอนแล้ว
        instructor: null 
      };

      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch("/api/courses", {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");

      setIsModalOpen(false);
      setFormData({});
      setSelectedResponsible(null);
      fetchInitialData();
      alert(isEditMode ? "แก้ไขข้อมูลเรียบร้อย" : "เพิ่มรายวิชาเรียบร้อย");
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false); 
    setFormData({ 
      code: "", name_th: "", name_en: "", credit: "", programId: "" 
    });
    setSelectedResponsible(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setIsEditMode(true);
    setFormData({
        id: course.id,
        code: course.code,
        name_th: course.name_th,
        name_en: course.name_en || "",
        credit: course.credit,
        programId: course.program?.id.toString() || "",
        // ไม่ต้องดึง instructor มาใส่ใน state แล้ว
    });

    // Setup Responsible User
    if (course.responsibleUser) {
        const fullName = getResponsibleName(course.responsibleUser);
        setSelectedResponsible({
            id: course.responsibleUser.id,
            name: fullName,
            email: course.responsibleUser.email,
            position: course.responsibleUser.academicPosition || ""
        });
    } else {
        setSelectedResponsible(null);
    }
    
    setIsModalOpen(true);
  };

  const openDetailModal = (course: Course) => {
    setViewCourse(course);
    setIsDetailModalOpen(true);
  };

  const SearchableUserSelect = ({ 
    onSelect, 
    placeholder = "ค้นหารายชื่อ..." 
  }: { 
    onSelect: (user: UserData) => void, 
    placeholder?: string
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className="flex items-center justify-between w-full p-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-gray-500 text-sm">{placeholder}</span>
                <ChevronsUpDown size={16} className="text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="p-2 sticky top-0 bg-white border-b">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400"/>
                            <input 
                                autoFocus
                                type="text" 
                                className="w-full pl-8 p-1 text-sm border rounded outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div 
                                key={user.id}
                                className="p-2 text-sm hover:bg-blue-50 cursor-pointer flex flex-col border-b border-gray-50 last:border-none"
                                onClick={() => {
                                    onSelect(user);
                                    setIsOpen(false);
                                    setSearch("");
                                }}
                            >
                                <span className="font-medium text-slate-700">{user.name}</span>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-gray-400">ไม่พบรายชื่อ</div>
                    )}
                </div>
            )}
        </div>
    );
  };

  // --- Filter Logic ---
  const filteredCourses = courses.filter((c) => {
    const matchesProgram = selectedProgram ? c.program?.id.toString() === selectedProgram : true;
    
    let matchesLevel = true;
    if (selectedLevel) {
        const degree = c.program?.degree_level || "";
        if (selectedLevel === "bachelor") matchesLevel = degree.includes("ตรี") || degree.toLowerCase().includes("bachelor");
        else if (selectedLevel === "master") matchesLevel = degree.includes("โท") || degree.toLowerCase().includes("master");
        else if (selectedLevel === "doctor") matchesLevel = degree.includes("เอก") || degree.toLowerCase().includes("doctor");
    }

    const searchLower = searchTerm.toLowerCase();
    const responsibleName = getResponsibleName(c.responsibleUser).toLowerCase();
    
    const matchesSearch = 
      c.code.toLowerCase().includes(searchLower) ||
      c.name_th.toLowerCase().includes(searchLower) ||
      (c.name_en && c.name_en.toLowerCase().includes(searchLower)) ||
      responsibleName.includes(searchLower);

    return matchesProgram && matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-8 font-sarabun p-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">จัดการข้อมูล/ข้อมูลรายวิชา</h1>
      </div>

      {/* Search Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">ค้นหารายวิชา</h2>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:w-80">
                 <div className="relative">
                    <input 
                        type="text"
                        placeholder="พิมพ์รหัสวิชา, ชื่อวิชา, หรือชื่อผู้รับผิดชอบ..."
                        className="w-full pl-10 pr-4 h-10 border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            <div className="w-full md:w-64">
                <select 
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-slate-600 outline-none focus:border-purple-500 bg-white text-sm"
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                >
                    <option value="">ทุกหลักสูตร</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name_th} ({p.year})</option>
                    ))}
                </select>
            </div>

            <div className="w-full md:w-48">
                <select 
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-slate-600 outline-none focus:border-purple-500 bg-white text-sm"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                >
                    <option value="">ทุกระดับ</option>
                    <option value="bachelor">ปริญญาตรี</option>
                    <option value="master">ปริญญาโท</option>
                    <option value="doctor">ปริญญาเอก</option>
                </select>
            </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
                รายวิชาทั้งหมด <span className="text-sm font-normal text-gray-500">({filteredCourses.length} รายการ)</span>
            </h2>
            
            <button 
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 border border-green-500 text-green-600 rounded-md hover:bg-green-50 transition-colors font-medium bg-white shadow-sm"
            >
                <Plus size={20} />
                เพิ่มรายวิชา
            </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white border-b border-gray-200 text-slate-800 text-sm">
                        <th className="py-4 px-6 font-semibold w-[10%]">รหัสวิชา</th>
                        <th className="py-4 px-6 font-semibold w-[35%]">ชื่อรายวิชา</th>
                        <th className="py-4 px-6 font-semibold w-[10%]">ระดับ</th>
                        <th className="py-4 px-6 font-semibold w-[20%]">หลักสูตร</th>
                        <th className="py-4 px-6 font-semibold w-[20%]">ผู้รับผิดชอบ</th>
                        <th className="py-4 px-6 font-semibold w-[5%] text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">กำลังโหลด...</td></tr>
                    ) : filteredCourses.length > 0 ? (
                        filteredCourses.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors text-sm">
                                <td className="py-4 px-6 align-top text-slate-700">{c.code}</td>
                                <td className="py-4 px-6 align-top">
                                    <div className="font-medium text-slate-800">{c.name_th}</div>
                                    <div className="text-xs text-slate-500">{c.name_en}</div>
                                    {c.program_full_name?.includes("ตกแผน") && (
                                        <div className="mt-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-600">
                                                ตกแผน
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td className="py-4 px-6 align-top text-slate-700">
                                    {c.program?.degree_level || "ปริญญาตรี"}
                                </td>
                                <td className="py-4 px-6 align-top text-slate-700">
                                    <div>{c.program?.name_th}</div>
                                    <div className="text-xs text-slate-500">({c.program?.year})</div>
                                </td>
                                <td className="py-4 px-6 align-top">
                                    <div className="font-medium text-slate-800">
                                        {getResponsibleName(c.responsibleUser)}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {c.responsibleUser?.email || "-"}
                                    </div>
                                </td>
                                <td className="py-4 px-6 align-top text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            onClick={() => openEditModal(c)}
                                            className="w-8 h-8 flex items-center justify-center border border-green-500 rounded text-green-500 hover:bg-green-50 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(c.id)}
                                            className="w-8 h-8 flex items-center justify-center border border-red-500 rounded text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-gray-400">
                                ไม่พบข้อมูลที่ค้นหา
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            <div className="flex justify-end items-center p-4 gap-4 text-xs text-slate-500">
                <span>Rows per page: All ▼</span>
                <span>1-10 of {filteredCourses.length}</span>
                <div className="flex gap-2">
                    <ChevronLeft size={16} className="cursor-pointer hover:text-slate-800" />
                    <ChevronRight size={16} className="cursor-pointer hover:text-slate-800" />
                </div>
            </div>
        </div>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-slate-800">
                        {isEditMode ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มรายวิชาใหม่"}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)}>
                        <X className="text-slate-400 hover:text-slate-600" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto">
                    {/* Basic Info */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                รหัสวิชา <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-1 ring-purple-500"
                                value={formData.code || ""} 
                                onChange={e => setFormData({...formData, code: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">หน่วยกิต</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-1 ring-purple-500"
                                value={formData.credit || ""} 
                                onChange={e => setFormData({...formData, credit: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">
                                ชื่อวิชา (ไทย) <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-1 ring-purple-500"
                                value={formData.name_th || ""} 
                                onChange={e => setFormData({...formData, name_th: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700">ชื่อวิชา (อังกฤษ)</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-1 ring-purple-500"
                                value={formData.name_en || ""} 
                                onChange={e => setFormData({...formData, name_en: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">
                            หลักสูตร <span className="text-red-500">*</span>
                        </label>
                        <select 
                            className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:ring-1 ring-purple-500"
                            value={formData.programId || ""} 
                            onChange={e => setFormData({...formData, programId: e.target.value})}
                        >
                            <option value="">-- เลือกหลักสูตร --</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name_th} ({p.year})</option>)}
                        </select>
                    </div>

                    <hr className="my-2 border-gray-100" />

                    {/* --- Responsible Person Section --- */}
                    <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <User size={16} className="text-purple-600" />
                            ผู้รับผิดชอบรายวิชา
                        </label>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             {/* Display Selected Responsible */}
                             {selectedResponsible ? (
                                <div className="flex items-center justify-between bg-white p-3 rounded border border-purple-100 shadow-sm mb-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700 text-sm">
                                            {selectedResponsible.name}
                                        </span>
                                        <span className="text-xs text-gray-400">{selectedResponsible.email}</span>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedResponsible(null)}
                                        className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                                        title="ลบ"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                             ) : (
                                <div className="text-center text-xs text-gray-400 mb-3 py-2 border-dashed border border-gray-300 rounded">
                                    ยังไม่ได้ระบุผู้รับผิดชอบ
                                </div>
                             )}

                             {/* Add Responsible Button / Search */}
                             {!selectedResponsible && (
                                <SearchableUserSelect 
                                    placeholder="ค้นหาและเลือกผู้รับผิดชอบ..."
                                    onSelect={(user) => setSelectedResponsible(user)} 
                                />
                             )}
                        </div>
                    </div>
                    {/* *** REMOVED: Instructors Section ถูกนำออกแล้ว *** */}

                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="px-4 py-2 border rounded text-sm hover:bg-gray-100 text-gray-600"
                    >
                        ยกเลิก
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium shadow-sm"
                    >
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- DETAIL MODAL (Fixed) --- */}
      {isDetailModalOpen && viewCourse && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
             <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col relative">
                
                <button 
                    onClick={() => setIsDetailModalOpen(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"
                >
                    <X size={24} />
                </button>

                <div className="p-8 pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">รายละเอียด</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">หลักสูตร</span>
                                <span className="text-slate-600">
                                    {viewCourse.program?.name_th} ({viewCourse.program?.year})
                                </span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">สาขา</span>
                                <span className="text-slate-600">การบริบาลทางเภสัชกรรม</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">ชื่อวิชา(ภาษาไทย)</span>
                                <span className="text-slate-600 font-medium text-purple-700">{viewCourse.name_th}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">จำนวนหน่วยกิต</span>
                                <span className="text-slate-600">{viewCourse.credit}</span>
                            </div>
                             <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">ผู้รับผิดชอบรายวิชา</span>
                                {/* *** FIXED CALL *** */}
                                <span className="text-slate-600">{getResponsibleName(viewCourse.responsibleUser)}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">ระดับ</span>
                                <span className="text-slate-600">{viewCourse.program?.degree_level || "ปริญญาตรี"}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">รหัสวิชา</span>
                                <span className="text-slate-600">{viewCourse.code}</span>
                            </div>
                            <div className="grid grid-cols-[140px_1fr]">
                                <span className="font-bold text-slate-700">ชื่อวิชา(ภาษาอังกฤษ)</span>
                                <span className="text-slate-600">{viewCourse.name_en}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <h3 className="font-bold text-slate-700 mb-2">ผู้สอน</h3>
                        <div className="pl-0 space-y-1 text-slate-600 text-sm">
                            {viewCourse.instructor ? (
                                viewCourse.instructor.split('\n').map((inst, index) => (
                                    <div key={index}>{inst}</div>
                                ))
                            ) : (
                                <div className="text-gray-400">- ไม่ระบุข้อมูลผู้สอน -</div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="h-8"></div>
             </div>
        </div>
      )}

    </div>
  );
}