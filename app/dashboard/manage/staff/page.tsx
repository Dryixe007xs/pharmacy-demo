"use client";

import { useState, useEffect, ReactNode } from "react";
import { 
  Plus, Pencil, Trash2, Search, ChevronDown, Filter, X, 
  Users, GraduationCap, Briefcase, Mail, BadgeCheck, Loader2, ChevronRight
} from "lucide-react";
// ✅ เพิ่ม AvatarImage เข้ามาใน import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster, toast } from 'sonner';

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
const CURRICULUM_SUPPORT = "สายสนับสนุน"; 

// --- Types ---
type StaffUser = {
  id: string;
  email: string;
  name: string; 
  image?: string; // ✅ เพิ่ม field image เพื่อรับ url รูปภาพ
  role: string;
  academicRank?: string;
  department: string; 
  curriculum?: string;
  managedPrograms?: string;
  createdAt?: string;
  workStatus?: string;
  adminTitle?: string;
  firstName?: string;
  lastName?: string;
  academicPosition?: string;
};

// --- Reusable Modal Component (จากหน้า Course) ---
const Modal = ({ 
    // ✅ แก้ zIndex default เป็น 9999 เพื่อให้อยู่หน้าสุดเสมอ
    isOpen, onClose, title, icon: Icon, colorClass = "text-slate-800", children, maxWidth = "max-w-2xl", zIndex = 9999
}: { 
    isOpen: boolean; onClose: () => void; title: string; icon?: any; colorClass?: string; children: ReactNode; maxWidth?: string; zIndex?: number;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in" style={{ zIndex }}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transition-all duration-200 ${maxWidth} animate-in zoom-in-95 slide-in-from-bottom-4`}>
                <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-20">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}>
                        {Icon && <Icon size={22} />} {title}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default function ManageStaffPage() {
  // --- States ---
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "SUPPORT">("ACADEMIC");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCurriculum, setFilterCurriculum] = useState("");
  const [filterProgram, setFilterProgram] = useState("");

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // --- Fetching Logic ---
  useEffect(() => {
    fetchStaffData();
  }, []);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff", { cache: 'no-store' });
      if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
      const data: StaffUser[] = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
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
        return (parts[parts.length-2][0] + parts[parts.length-1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const renderStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "ACTIVE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>ปฏิบัติงาน</span>;
      case "STUDY_LEAVE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>ลาศึกษาต่อ</span>;
      case "TRAINING": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>ฝึกอบรม</span>;
      default: return <span className="text-slate-400 text-xs">-</span>;
    }
  };

  // --- Handlers ---
  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ ยืนยันการลบข้อมูลบุคลากร?\nการกระทำนี้ไม่สามารถเรียกคืนได้")) return;
    try {
        await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
        fetchStaffData();
        toast.success("ลบข้อมูลเรียบร้อย");
    } catch (err) {
        toast.error("ลบข้อมูลไม่สำเร็จ");
    }
  };

  const handleSave = async () => {
    try {
        const requiredAdminTitleRoles = ['PROGRAM_CHAIR', 'VICE_DEAN', 'ADMIN'];
        if (requiredAdminTitleRoles.includes(formData.role)) {
            if (!formData.jobPosition || formData.jobPosition.trim() === "") {
                toast.error("กรุณากรอก 'ชื่อตำแหน่งบริหาร'");
                return; 
            }
        }

        const payload = {
            id: isEditMode ? formData.id : undefined,
            email: formData.email,
            title: formData.title || "", 
            academicPosition: formData.academicPosition,
            firstName: formData.firstName,
            lastName: formData.lastName,
            
            // ✅ จุดที่ 1: ส่ง image ไปบันทึกด้วย
            image: formData.image,

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

        if (!res.ok) throw new Error('บันทึกข้อมูลไม่สำเร็จ');

        setIsModalOpen(false);
        fetchStaffData(); 
        toast.success(isEditMode ? "แก้ไขข้อมูลเรียบร้อย" : "เพิ่มบุคลากรเรียบร้อย");
    } catch (err: any) {
        toast.error(err.message);
    }
  };

  // --- Modal Control ---
  const openAddModal = () => {
    setIsEditMode(false);
    const defaultCurriculum = activeTab === "SUPPORT" ? CURRICULUM_SUPPORT : "";
    const defaultProgram = activeTab === "SUPPORT" ? "สำนักงานคณะ" : "";
    setFormData({ 
      title: "", academicPosition: "", firstName: "", lastName: "", 
      email: "", role: "LECTURER", jobPosition: "", 
      curriculum: defaultCurriculum, program: defaultProgram, workStatus: "ACTIVE",
      image: "" // ✅ จุดที่ 2: ตั้งค่าเริ่มต้นให้ image
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
        workStatus: user.workStatus === "ลาศึกษาต่อ" ? "STUDY_LEAVE" : user.workStatus === "ฝึกอบรมในประเทศ" ? "TRAINING" : "ACTIVE",
        academicPosition: user.academicPosition || academicPosition, 
        firstName: user.firstName || firstName,
        lastName: user.lastName || lastName,
        jobPosition: user.adminTitle || "", 
        curriculum: user.role === 'ADMIN' ? CURRICULUM_SUPPORT : (user.curriculum || user.department), 
        program: user.department, 
        image: user.image || "" // ✅ จุดที่ 3: ดึงรูปภาพเดิมมาใส่ state
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

  // --- Filtering ---
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
        if (filterProgram && userDept !== filterProgram) return false;
      } else if (filterCurriculum === "COSMETIC") {
        const isCosmo = userDept.includes("เครื่องสำอาง") || userCurr.includes("วิทยาศาสตร์เครื่องสำอาง");
        if (!isCosmo) return false;
      }
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />
      
      {/* Header & Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
             <span>จัดการข้อมูล</span>
             <ChevronRight size={14}/>
             <span className="text-purple-600">ข้อมูลบุคลากร</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">จัดการข้อมูลบุคลากร</h1>
        <p className="text-slate-500 mt-2 font-light">
             จัดการรายชื่อ อาจารย์ เจ้าหน้าที่ และกำหนดสิทธิ์การใช้งานระบบ
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
         
         {/* Tabs */}
         <div className="flex border-b border-slate-200">
            <button 
                onClick={() => { setActiveTab("ACADEMIC"); setFilterCurriculum(""); }} 
                className={`flex-1 py-4 text-sm font-semibold flex justify-center items-center gap-2 transition-all relative ${activeTab === "ACADEMIC" ? "text-purple-700 bg-purple-50/30" : "text-slate-500 hover:bg-slate-50"}`}
            >
                <GraduationCap size={18} className={activeTab === "ACADEMIC" ? "text-purple-600" : "text-slate-400"}/>
                สายวิชาการ (อาจารย์)
                {activeTab === "ACADEMIC" && <span className="absolute bottom-0 w-full h-0.5 bg-purple-600"></span>}
            </button>
            <button 
                onClick={() => { setActiveTab("SUPPORT"); setFilterCurriculum(""); }} 
                className={`flex-1 py-4 text-sm font-semibold flex justify-center items-center gap-2 transition-all relative ${activeTab === "SUPPORT" ? "text-purple-700 bg-purple-50/30" : "text-slate-500 hover:bg-slate-50"}`}
            >
                <Users size={18} className={activeTab === "SUPPORT" ? "text-purple-600" : "text-slate-400"}/>
                สายสนับสนุน (สำนักงาน/Admin)
                {activeTab === "SUPPORT" && <span className="absolute bottom-0 w-full h-0.5 bg-purple-600"></span>}
            </button>
         </div>

         {/* Filters & Actions */}
         <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col xl:flex-row justify-between gap-4 items-center">
                
                {/* Search & Filters */}
                <div className="flex flex-col md:flex-row w-full xl:w-auto gap-3 items-center">
                    <div className="relative w-full md:w-72">
                        <input type="text" placeholder="ค้นหาชื่อ หรือ อีเมล..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-slate-50/30 focus:bg-white" />
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>

                    {activeTab === "ACADEMIC" && (
                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-48">
                                <select value={filterCurriculum} onChange={(e) => { setFilterCurriculum(e.target.value); setFilterProgram(""); }} className="w-full h-10 pl-9 pr-8 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white cursor-pointer appearance-none text-slate-600">
                                    <option value="">ทุกหลักสูตร</option>
                                    <option value="PHARMACY">เภสัชศาสตรบัณฑิต</option>
                                    <option value="COSMETIC">วิทย์ฯ เครื่องสำอาง</option>
                                </select>
                                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                            </div>

                            {filterCurriculum === "PHARMACY" && (
                                <div className="relative w-full md:w-56">
                                    <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-full h-10 pl-3 pr-8 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white cursor-pointer appearance-none text-slate-600">
                                        <option value="">ทุกกลุ่มวิชา</option>
                                        {PHARMACY_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Add Button */}
                <button onClick={openAddModal} className="w-full xl:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 whitespace-nowrap">
                    <Plus size={18} /> เพิ่มบุคลากร
                </button>
            </div>
         </div>

         {/* Table */}
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-[35%]">ชื่อ - สกุล</th>
                  <th className="py-4 px-4 w-[25%]">สังกัด / กลุ่มวิชา</th>
                  <th className="py-4 px-4 text-center w-[15%]">สถานะ</th>
                  <th className="py-4 px-4 text-center w-[15%]">บทบาท</th>
                  <th className="py-4 px-4 text-center w-[10%]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400"><div className="flex justify-center gap-2 items-center"><Loader2 className="animate-spin" size={24}/> กำลังโหลด...</div></td></tr>
                ) : filteredStaff.length > 0 ? (
                    filteredStaff.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 px-6">
                            <div className="flex items-center">
                                <Avatar className="w-10 h-10 bg-slate-100 mr-3 border border-slate-200 text-slate-500">
                                    {/* ✅ ใช้ AvatarImage ถ้ามีรูป และใช้ Fallback เป็นตัวย่อถ้าไม่มีรูป */}
                                    <AvatarImage src={user.image} alt={user.name} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-semibold text-slate-800">{user.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Mail size={10}/> {user.email}</div>
                                </div>
                            </div>
                        </td>
                        <td className="py-4 px-4">
                            <div className="flex flex-col">
                                <span className="text-slate-700 font-medium truncate max-w-[250px]">
                                    {user.department && user.department !== "-" ? user.department : <span className="text-slate-300 italic">ไม่ระบุสังกัด</span>}
                                </span>
                                {user.managedPrograms && (
                                    <span className="text-[11px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded w-fit mt-1 border border-purple-100 font-medium">
                                        ประธานหลักสูตร
                                    </span>
                                )}
                            </div>
                        </td>
                        <td className="py-4 px-4 text-center">{renderStatusBadge(user.workStatus)}</td>
                        <td className="py-4 px-4 text-center align-middle">
                             <div className="flex justify-center">
                                {user.role === 'ADMIN' ? (
                                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-600 border border-red-100 flex items-center gap-1"><BadgeCheck size={12}/> Admin</span>
                                ) : user.adminTitle ? (
                                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 text-center">{user.adminTitle}</span>
                                ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                )}
                             </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                <button onClick={() => openEditModal(user)} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(user.id)} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:text-red-500 hover:border-red-200 transition-all shadow-sm"><Trash2 size={16} /></button>
                            </div>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr><td colSpan={5} className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2"><Search size={32} className="opacity-20"/>ไม่พบข้อมูลที่ค้นหา</td></tr>
                )}
              </tbody>
            </table>
         </div>
      </div>

      {/* --- REUSABLE MODAL FORM --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากรใหม่"}
        icon={isEditMode ? Pencil : Plus}
        colorClass={isEditMode ? "text-purple-700" : "text-green-700"}
        // ✅ zIndex default จะถูกใช้ที่นี่
      >
          {/* ...Form content same as before... */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar pb-24">
              <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-2"><Briefcase size={14}/> ข้อมูลการทำงาน</h4>
                  
                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">หลักสูตร / สังกัด <span className="text-red-500">*</span></label>
                      <select 
                          value={formData.curriculum || ""} 
                          onChange={(e) => handleCurriculumChange(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white cursor-pointer"
                      >
                          <option value="">-- เลือกหลักสูตร --</option>
                          <option value={CURRICULUM_PHARMA}>หลักสูตรเภสัชศาสตรบัณฑิต</option>
                          <option value={CURRICULUM_COSMO}>หลักสูตรวิทยาศาสตร์เครื่องสำอาง</option>
                          <option value={CURRICULUM_SUPPORT}>สายสนับสนุน / สำนักงานคณะ</option>
                      </select>
                  </div>

                  {formData.curriculum === CURRICULUM_PHARMA && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-sm font-semibold text-slate-700">กลุ่มวิชา <span className="text-red-500">*</span></label>
                        <select 
                            value={formData.program || ""} 
                            onChange={(e) => setFormData({...formData, program: e.target.value})} 
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white cursor-pointer"
                        >
                            <option value="">-- เลือกกลุ่มวิชา --</option>
                            {PHARMACY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                  )}
              </div>

              {/* ✅ จุดที่ 4: เพิ่มส่วนใส่รูปภาพ */}
              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-2 mt-2"><Users size={14}/> ข้อมูลส่วนตัว</h4>
                 
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">URL รูปโปรไฟล์ (ถ้ามี)</label>
                    <div className="flex gap-3 items-center">
                        <Avatar className="w-10 h-10 border border-slate-200">
                            <AvatarImage src={formData.image} />
                            <AvatarFallback>IMG</AvatarFallback>
                        </Avatar>
                        <input 
                            type="text" 
                            value={formData.image || ""} 
                            onChange={(e) => setFormData({...formData, image: e.target.value})} 
                            placeholder="https://..." 
                            className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" 
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">คำนำหน้า (ตำแหน่งวิชาการ)</label>
                        <input type="text" value={formData.academicPosition || ""} onChange={(e) => setFormData({...formData, academicPosition: e.target.value})} placeholder="เช่น ผศ.ดร." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">E-Mail <span className="text-red-500">*</span></label>
                        <input type="email" disabled={isEditMode} value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all ${isEditMode ? 'bg-slate-100 text-slate-500' : ''}`}/>
                     </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">ชื่อจริง <span className="text-red-500">*</span></label><input type="text" value={formData.firstName || ""} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" /></div>
                    <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">นามสกุล <span className="text-red-500">*</span></label><input type="text" value={formData.lastName || ""} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" /></div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2 border-b pb-2 mt-2"><BadgeCheck size={14}/> สถานะและบทบาท</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">สถานะปฏิบัติงาน</label>
                        <select value={formData.workStatus || "ACTIVE"} onChange={(e) => setFormData({...formData, workStatus: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white cursor-pointer"><option value="ACTIVE">ปฏิบัติงานปกติ</option><option value="STUDY_LEAVE">ลาศึกษาต่อ</option><option value="TRAINING">ฝึกอบรมในประเทศ</option></select>
                    </div>
                    <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700">สิทธิ์การใช้งาน (System Role)</label>
                         <select value={formData.role || "LECTURER"} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white cursor-pointer"><option value="LECTURER">อาจารย์ผู้สอน (ทั่วไป)</option><option value="PROGRAM_CHAIR">ประธานหลักสูตร</option><option value="VICE_DEAN">รองคณบดี/ผู้บริหาร</option><option value="ADMIN">ผู้ดูแลระบบ (Admin)</option></select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        ชื่อตำแหน่งบริหาร {['PROGRAM_CHAIR', 'VICE_DEAN', 'ADMIN'].includes(formData.role) && <span className="text-red-500 text-xs">(จำเป็นต้องระบุ*)</span>}
                    </label>
                    <input type="text" value={formData.jobPosition || ""} onChange={(e) => setFormData({...formData, jobPosition: e.target.value})} placeholder="เช่น ประธานหลักสูตรฯ, หัวหน้างาน..." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                 </div>
              </div>
          </div>
          
          <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-20">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-white hover:text-slate-700 text-slate-600 font-medium transition-all shadow-sm">ยกเลิก</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium shadow-md shadow-green-200 hover:shadow-lg transition-all active:scale-95">บันทึกข้อมูล</button>
          </div>
      </Modal>
    </div>
  );
}