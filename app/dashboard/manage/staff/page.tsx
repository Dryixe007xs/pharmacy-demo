"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Pencil, Trash2, Search, ChevronDown, Filter, X 
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Constants ---
const PHARMACY_GROUPS = [
  "เภสัชกรรมคลินิก",
  "เทคโนโลยีเภสัชกรรม",
  "เภสัชศาสตร์สังคม และการบริหารเภสัชกิจ",
  "เภสัชเคมี เภสัชเวทและการควบคุมคุณภาพ",
  "เภสัชวิทยา"
];

const CURRICULUM_PHARMA = "หลักสูตรเภสัชศาสตรบัณฑิต สาขาวิชาการบริบาลทางเภสัชกรรม";
const CURRICULUM_COSMO = "หลักสูตรวิทยาศาสตร์บัณฑิต สาขาวิทยาศาสตร์เครื่องสำอาง";

// *** แก้ไข: ปรับค่าให้ตรงกับข้อมูลในฐานข้อมูล (users_data.json) ***
// จากเดิม "สายสนับสนุน / สำนักงานคณะ" -> เป็น "สายสนับสนุน" เพื่อให้ Dropdown จับคู่ได้ถูกต้อง
const CURRICULUM_SUPPORT = "สายสนับสนุน"; 

// --- Types ---
type StaffUser = {
  id: number;
  email: string;
  name: string; 
  role: string;
  academicRank: string;
  department: string; 
  curriculum?: string;
  managedPrograms: string;
  createdAt: string;
  workStatus?: string;
  adminTitle?: string;
  position?: string;
};

export default function ManageStaffPage() {
  // --- States ---
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "SUPPORT">("ACADEMIC");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCurriculum, setFilterCurriculum] = useState("");
  const [filterProgram, setFilterProgram] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // --- Fetching Logic ---
  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      const res = await fetch("/api/staff", { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 403) throw new Error('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
        throw new Error(errorData.error || 'โหลดข้อมูลไม่สำเร็จ');
      }
      const data: StaffUser[] = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Action Handlers ---
  const handleDelete = async (id: number) => {
    if (!confirm("คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?")) return;
    try {
        await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
        fetchStaffData();
    } catch (err) {
        alert("ลบข้อมูลไม่สำเร็จ");
    }
  };

  // ✨ ฟังก์ชันบันทึกของจริง (เชื่อม API) ✨
  const handleSave = async () => {
    try {
        // Validation: เช็คว่าถ้าเป็นตำแหน่งบริหาร ต้องกรอกชื่อตำแหน่งด้วย
        const requiredAdminTitleRoles = ['PROGRAM_CHAIR', 'VICE_DEAN', 'ADMIN'];
        if (requiredAdminTitleRoles.includes(formData.role)) {
            if (!formData.jobPosition || formData.jobPosition.trim() === "") {
                alert("กรุณากรอก 'ชื่อตำแหน่งบริหาร' สำหรับบทบาทที่ท่านเลือก");
                return; // หยุดการทำงาน ไม่ส่งข้อมูลไป API
            }
        }

        setLoading(true);
        
        // Map ข้อมูลจาก Form เพื่อส่งไป API
        const payload = {
            id: isEditMode ? formData.id : undefined,
            email: formData.email,
            title: formData.title || "", // ใช้ค่าจาก Form หรือว่างไว้
            academicPosition: formData.academicPosition,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            adminTitle: formData.jobPosition, 
            department: formData.program,     
            curriculum: formData.curriculum,  
            workStatus: formData.workStatus
        };

        const method = isEditMode ? 'PUT' : 'POST';
        
        const res = await fetch('/api/staff', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'บันทึกข้อมูลไม่สำเร็จ');
        }

        // สำเร็จ
        setIsModalOpen(false);
        fetchStaffData(); // โหลดข้อมูลใหม่ทันที
        alert(isEditMode ? "แก้ไขข้อมูลเรียบร้อย" : "เพิ่มบุคลากรเรียบร้อย");

    } catch (err: any) {
        console.error("Save Error:", err);
        alert(err.message);
    } finally {
        setLoading(false);
    }
  };

  // --- Helper Functions ---
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ');
    // Logic แยกชื่อคร่าวๆ (อาจต้องปรับถ้าชื่อซับซ้อน)
    if (parts.length >= 2) {
        const lastName = parts.pop() || '';
        const firstName = parts.pop() || '';
        const academicPosition = parts.join(' ');
        return { academicPosition, firstName, lastName };
    }
    return { academicPosition: '', firstName: fullName, lastName: '' };
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        const first = parts[parts.length-2]?.[0] || '';
        const last = parts[parts.length-1]?.[0] || '';
        return (first + last).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "ACTIVE": return <div className="flex items-center justify-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-green-700 font-medium">ปฏิบัติงาน</span></div>;
      case "STUDY_LEAVE": return <div className="flex items-center justify-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-sky-500"></div><span className="text-sky-700 font-medium">ลาศึกษาต่อ</span></div>;
      case "TRAINING": return <div className="flex items-center justify-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div><span className="text-yellow-700 font-medium">ฝึกอบรม</span></div>;
      default: return <span className="text-gray-400">-</span>;
    }
  };

  // --- Modal Logic ---
  const openAddModal = () => {
    setIsEditMode(false);
    const defaultCurriculum = activeTab === "SUPPORT" ? CURRICULUM_SUPPORT : "";
    const defaultProgram = activeTab === "SUPPORT" ? "สำนักงานคณะ" : "";
    
    setFormData({ 
      title: "", academicPosition: "", firstName: "", lastName: "", 
      email: "", role: "LECTURER", jobPosition: "", 
      curriculum: defaultCurriculum, program: defaultProgram, workStatus: "ACTIVE" 
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: StaffUser) => {
    setIsEditMode(true);
    const { academicPosition, firstName, lastName } = splitName(user.name);
    
    setFormData({ 
        id: user.id,
        email: user.email,
        role: user.role,
        workStatus: user.workStatus || 'ACTIVE',
        academicPosition: academicPosition, 
        firstName: firstName,
        lastName: lastName,
        jobPosition: user.adminTitle || "", 
        // แก้ไข: ถ้าค่า curriculum ตรงกับค่าคงที่ ให้ใช้ค่าคงที่เพื่อเลือก Dropdown ได้ถูกต้อง
        // ถ้าเป็นสายสนับสนุน ให้ใช้ CURRICULUM_SUPPORT แน่ๆ เพื่อให้ Dropdown เลือกถูก
        curriculum: user.role === 'ADMIN' ? CURRICULUM_SUPPORT : (user.curriculum || user.department), 
        program: user.department, 
    });
    setIsModalOpen(true);
  };

  const handleCurriculumChange = (value: string) => {
    if (value === CURRICULUM_COSMO) {
      setFormData({ ...formData, curriculum: value, program: "วิทยาศาสตร์เครื่องสำอาง" });
    } else if (value === CURRICULUM_SUPPORT) {
      setFormData({ ...formData, curriculum: value, program: "สำนักงานคณะ" });
    } else {
      setFormData({ ...formData, curriculum: value, program: "" });
    }
  };

  // --- Filter Logic ---
  const filteredStaff = staff.filter((user) => {
    const matchesSearch = 
      (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    const isSupportStaff = user.role === "ADMIN"; 

    if (activeTab === "ACADEMIC" && isSupportStaff) return false;
    if (activeTab === "SUPPORT" && !isSupportStaff) return false;

    if (activeTab === "ACADEMIC" && filterCurriculum) {
      const userDept = (user.department || "").trim();
      const userCurr = (user.curriculum || "").trim();

      if (filterCurriculum === "PHARMACY") {
        const isPharma = PHARMACY_GROUPS.includes(userDept) || userCurr.includes("เภสัชศาสตรบัณฑิต");
        if (!isPharma) return false;

        if (filterProgram && userDept !== filterProgram) {
            return false;
        }

      } else if (filterCurriculum === "COSMETIC") {
        const isCosmo = userDept.includes("เครื่องสำอาง") || userCurr.includes("วิทยาศาสตร์เครื่องสำอาง");
        if (!isCosmo) return false;
      }
    }
    
    return matchesSearch;
  });

  if (loading && staff.length === 0) return <div className="p-10 text-center text-slate-500 animate-pulse">กำลังโหลดข้อมูล...</div>;
  if (error) return <div className="p-10 text-center text-red-600 bg-red-50 border border-red-200 rounded-lg mx-8 mt-8">Error: {error}</div>;

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto w-full font-sarabun">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#1e3a8a]">จัดการข้อมูล/ข้อมูลบุคลากร</h2>
            <button onClick={openAddModal} className="flex items-center gap-2 border border-green-500 text-green-600 px-6 py-2 rounded hover:bg-green-50 transition bg-white font-bold text-sm whitespace-nowrap h-fit shadow-sm">
              <Plus className="w-5 h-5" /> เพิ่มบุคลากร
            </button>
        </div>

        {/* TABS MENU */}
        <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-8">
                <button onClick={() => { setActiveTab("ACADEMIC"); setFilterCurriculum(""); setFilterProgram(""); }} className={`pb-3 text-base font-bold transition-all relative ${activeTab === "ACADEMIC" ? "text-[#1e3a8a]" : "text-gray-400 hover:text-gray-600"}`}>
                    สายวิชาการ (อาจารย์)
                    {activeTab === "ACADEMIC" && <span className="absolute bottom-0 left-0 w-full h-1 bg-[#1e3a8a] rounded-t-md"></span>}
                </button>
                <button onClick={() => { setActiveTab("SUPPORT"); setFilterCurriculum(""); setFilterProgram(""); }} className={`pb-3 text-base font-bold transition-all relative ${activeTab === "SUPPORT" ? "text-[#1e3a8a]" : "text-gray-400 hover:text-gray-600"}`}>
                    สายสนับสนุน (สำนักงาน/แอดมิน)
                    {activeTab === "SUPPORT" && <span className="absolute bottom-0 left-0 w-full h-1 bg-[#1e3a8a] rounded-t-md"></span>}
                </button>
            </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-6 gap-4">
            <div className="flex-1 w-full lg:w-auto flex flex-col gap-4">
                <h3 className="text-2xl font-bold text-[#1e3a8a]">
                  {activeTab === "ACADEMIC" ? "รายชื่อบุคลากรสายวิชาการ" : "รายชื่อเจ้าหน้าที่และผู้ดูแลระบบ"} 
                  <span className="text-gray-400 text-lg ml-2">({filteredStaff.length} ท่าน)</span>
                </h3>
                
                {/* Z-Index: 20 */}
                <div className="flex flex-wrap gap-4 w-full items-center relative z-20">
                    <div className="relative w-80">
                        <input type="text" placeholder="ค้นหาชื่อ หรือ อีเมล..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-gray-900 focus:ring-2 focus:ring-purple-200 outline-none" />
                        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                    </div>

                    {activeTab === "ACADEMIC" && (
                      <>
                        <div className="relative w-64 z-20">
                            <div className="absolute left-3 top-2.5 pointer-events-none"><Filter className="w-4 h-4 text-gray-500" /></div>
                            <select value={filterCurriculum} onChange={(e) => { setFilterCurriculum(e.target.value); setFilterProgram(""); }} className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer">
                                <option value="">ทุกหลักสูตร</option>
                                <option value="PHARMACY">เภสัชศาสตรบัณฑิต</option>
                                <option value="COSMETIC">วิทย์ฯ เครื่องสำอาง</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                        </div>

                        {filterCurriculum === "PHARMACY" && (
                             <div className="relative w-64 z-10">
                                <div className="absolute left-3 top-2.5 pointer-events-none"><Filter className="w-4 h-4 text-gray-500" /></div>
                                <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-gray-900 bg-white outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer">
                                    <option value="">ทุกกลุ่มวิชา</option>
                                    {PHARMACY_GROUPS.map((group) => (
                                        <option key={group} value={group}>{group}</option>
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

        {/* Z-Index: 0 (Table) */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative z-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-white border-b border-gray-200 text-sm text-gray-900 font-bold">
                  <th className="py-6 px-6 text-left w-[30%]">ชื่อ - สกุล</th>
                  <th className="py-6 px-4 text-center w-[15%]">สถานะ</th>
                  <th className="py-6 px-4 text-left w-[25%]">กลุ่มวิชา / สังกัด</th>
                  <th className="py-6 px-4 text-center w-[15%]">บทบาท</th>
                  <th className="py-6 px-4 text-center w-[15%]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700">
                {filteredStaff.length > 0 ? (
                    filteredStaff.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                        <td className="py-4 px-6">
                            <div className="flex items-center">
                                <Avatar className="w-10 h-10 bg-slate-200 mr-3 border border-slate-100">
                                    <AvatarFallback className="text-slate-600 font-bold">{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td className="py-4 px-4 text-center">{renderStatusBadge(user.workStatus)}</td>
                        <td className="py-4 px-4">
                            <div className="font-medium text-gray-900 truncate max-w-[250px]">
                                {user.department && user.department !== "-" ? user.department : <span className="text-red-300 italic">ไม่ระบุสังกัด</span>}
                                {user.managedPrograms && (
                                    <div className="text-xs text-purple-600 font-medium mt-0.5">(ประธานหลักสูตร)</div>
                                )}
                            </div>
                        </td>
                        <td className="py-4 px-4 text-center text-xs align-middle">
                          <div className="flex justify-center">
                            <span 
                              className={`px-3 py-1.5 rounded-xl border font-medium text-center inline-block leading-snug
                              ${user.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : 
                                user.adminTitle ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'}`}
                            >
                              {user.adminTitle || "อาจารย์"}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                            <button onClick={() => openEditModal(user)} className="p-2 border border-green-500 rounded text-green-500 hover:bg-green-50 transition"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(user.id)} className="p-2 border border-red-500 rounded text-red-500 hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr><td colSpan={5} className="py-12 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODAL FORM --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl transform transition-all scale-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-4 flex justify-between items-start border-b">
              <h3 className="text-xl font-bold text-[#1e293b]">
                {isEditMode ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากร"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 pt-6 space-y-6 overflow-y-auto">
              <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">หลักสูตร / สังกัด</label>
                  <div className="relative">
                    <select 
                        value={formData.curriculum || ""} 
                        onChange={(e) => handleCurriculumChange(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 bg-white outline-none focus:border-purple-500 appearance-none"
                    >
                        <option value="">เลือกหลักสูตร</option>
                        <option value={CURRICULUM_PHARMA}>หลักสูตรเภสัชศาสตรบัณฑิต (บริบาลทางเภสัชกรรม)</option>
                        <option value={CURRICULUM_COSMO}>หลักสูตรวิทยาศาสตร์บัณฑิต (วิทยาศาสตร์เครื่องสำอาง)</option>
                        <option value={CURRICULUM_SUPPORT}>สายสนับสนุน / สำนักงานคณะ</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
              </div>

              {formData.curriculum === CURRICULUM_PHARMA && (
              <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-900 mb-1">กลุ่มวิชา</label>
                  <div className="relative">
                        <select 
                            value={formData.program || ""} 
                            onChange={(e) => setFormData({...formData, program: e.target.value})} 
                            className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 bg-white outline-none focus:border-purple-500 appearance-none"
                        >
                            <option value="">เลือกกลุ่มวิชา</option>
                            {PHARMACY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
              </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">ตำแหน่งวิชาการ / คำนำหน้า</label>
                    <input type="text" value={formData.academicPosition || ""} onChange={(e) => setFormData({...formData, academicPosition: e.target.value})} placeholder="เช่น ผศ.ดร., นาย" className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 outline-none focus:border-purple-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold text-gray-900 mb-1">ชื่อจริง</label><input type="text" value={formData.firstName || ""} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 outline-none focus:border-purple-500" /></div>
                    <div><label className="block text-sm font-bold text-gray-900 mb-1">นามสกุล</label><input type="text" value={formData.lastName || ""} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 outline-none focus:border-purple-500" /></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">E-Mail</label>
                  <input type="email" disabled={isEditMode} value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 outline-none focus:border-purple-500 ${isEditMode ? 'bg-gray-100 text-gray-500' : ''}`}/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">สถานะปฏิบัติงาน</label>
                  <div className="relative"><select value={formData.workStatus || "ACTIVE"} onChange={(e) => setFormData({...formData, workStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 bg-white outline-none focus:border-purple-500 appearance-none"><option value="ACTIVE">ปฏิบัติงานปกติ</option><option value="STUDY_LEAVE">ลาศึกษาต่อ</option><option value="TRAINING">ฝึกอบรมในประเทศ</option></select><ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1.5">สิทธิ์การใช้งาน (System Role)</label>
                  <div className="relative"><select value={formData.role || "LECTURER"} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 bg-white outline-none focus:border-purple-500 appearance-none"><option value="LECTURER">อาจารย์ผู้สอน (ทั่วไป)</option><option value="PROGRAM_CHAIR">ประธานหลักสูตร</option><option value="VICE_DEAN">รองคณบดี/รองอื่นๆ</option><option value="ADMIN">ผู้ดูแลระบบ</option></select><ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" /></div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                      ชื่อตำแหน่งบริหาร 
                      {/* แสดง * ถ้าเลือก Role ที่บังคับ */}
                      {['PROGRAM_CHAIR', 'VICE_DEAN', 'ADMIN'].includes(formData.role) ? <span className="text-red-500 ml-1">*</span> : " (ถ้ามี)"}
                    </label>
                    <input type="text" value={formData.jobPosition || ""} onChange={(e) => setFormData({...formData, jobPosition: e.target.value})} placeholder="เช่น ประธานหลักสูตรฯ" className="w-full border border-gray-300 rounded px-3 py-2.5 text-gray-900 outline-none focus:border-purple-500" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition">ยกเลิก</button>
              <button onClick={handleSave} className="px-8 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg font-bold shadow-sm transition flex items-center gap-2">
                  บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}