"use client";

import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, Edit, Trash2, X, ChevronRight,
  User, ChevronsUpDown, Briefcase, Loader2, FolderPlus, BookOpen, Check, Filter
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// ==========================================
// 1. TYPES
// ==========================================
type UserData = {
  id: string; 
  name: string;
  email: string;
  position: string;
  academicPosition?: string;
  title?: string;
  adminTitle?: string;
  firstName?: string;
  lastName?: string;
};

type Curriculum = {
  id: number;
  name: string;
  chairId?: string | null;
  chair?: UserData | null;
  _count?: {
    programs: number;
    staffs: number;
  }
};

type Program = {
  id: number;
  name_th: string;
  year: number;
  degree_level?: string;
  programChairId?: string | null;
  programChair?: UserData | null;
  curriculumId?: number;
};

type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  credit: string;
  instructor?: string;
  program_full_name?: string;
  program: Program;
  responsibleUserId?: string | null;
  responsibleUser?: UserData | null;
};

type CourseFormData = {
  id?: number;
  code: string;
  name_th: string;
  name_en: string;
  credit: string;
  programId: string;
};

// ==========================================
// 2. HELPER FUNCTIONS
// ==========================================
const getFullName = (user: any) => {
  if (!user) return "-";
  if (user.firstName && user.lastName) {
    const prefix = user.academicPosition || user.title || "";
    return `${prefix}${user.firstName} ${user.lastName}`.trim();
  }
  return user.name || user.email || "-";
};

// Degree level ที่มีจริงใน DB (ตรงกับ schema)
const DEGREE_LEVELS = ["ป.ตรี", "ป.โท", "ป.เอก"];

const degreeLabelMap: Record<string, string> = {
  "ป.ตรี": "ปริญญาตรี",
  "ป.โท": "ปริญญาโท",
  "ป.เอก": "ปริญญาเอก",
};

// ==========================================
// 3. UI COMPONENTS
// ==========================================

// --- 3.1 FilterSelect ---
const FilterSelect = ({
  options, value, onChange, placeholder = "เลือก...", icon: Icon
}: {
  options: { label: string; value: string }[]; value: string; onChange: (val: string) => void; placeholder?: string; icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={`flex items-center justify-between w-full h-11 px-3 border rounded-lg cursor-pointer transition-all shadow-sm ${isOpen ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-slate-200 bg-white hover:border-purple-300'}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={16} className="text-slate-400 shrink-0" />}
          <span className={`text-sm truncate ${value ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{selectedLabel}</span>
        </div>
        <ChevronsUpDown size={16} className="text-slate-400 shrink-0" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="overflow-y-auto custom-scrollbar p-1" style={{ maxHeight: '280px' }}>
            {options.map((option) => (
              <div 
                key={option.value} 
                className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer flex items-start gap-2 transition-colors ${value === option.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`} 
                onClick={() => { onChange(option.value); setIsOpen(false); }}
              >
                {value === option.value && <Check size={16} className="mt-0.5 shrink-0" />}
                <span className={value === option.value ? "" : "pl-6 whitespace-normal leading-snug"}>{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3.2 SearchableUserSelect ---
const SearchableUserSelect = ({
  users, onSelect, placeholder = "ค้นหา...", initialValue = ""
}: { users: UserData[]; onSelect: (user: UserData) => void; placeholder?: string; initialValue?: string; }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    return users.filter(u => (u.name && u.name.toLowerCase().includes(search.toLowerCase())) || (u.email && u.email.toLowerCase().includes(search.toLowerCase())));
  }, [users, search]);

  const updateCoords = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (isOpen) { 
      updateCoords(); 
      window.addEventListener('resize', updateCoords); 
      window.addEventListener('scroll', updateCoords, true); 
    }
    return () => { 
      window.removeEventListener('resize', updateCoords); 
      window.removeEventListener('scroll', updateCoords, true); 
    };
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: any) {
      const dropdown = document.getElementById('user-select-dropdown');
      if (wrapperRef.current && !wrapperRef.current.contains(event.target) && dropdown && !dropdown.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside); 
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className="flex items-center justify-between w-full p-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-purple-400 hover:ring-2 hover:ring-purple-100 transition-all shadow-sm h-11" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`text-sm truncate ${initialValue ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{initialValue || placeholder}</span>
        <ChevronsUpDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
            id="user-select-dropdown" 
            className="fixed bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top custom-scrollbar" 
            style={{ 
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                maxHeight: '300px',
                zIndex: 99999
            }}
        >
          <div className="p-2 sticky top-0 bg-white/95 backdrop-blur border-b z-10">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                    autoFocus 
                    type="text" 
                    className="w-full pl-9 p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" 
                    placeholder="พิมพ์ชื่อเพื่อค้นหา..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                />
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '240px' }}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, idx) => (
                <div 
                    key={`${user.id}-${idx}`} 
                    className="px-4 py-2.5 text-sm hover:bg-purple-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-none transition-colors" 
                    onClick={() => { onSelect(user); setIsOpen(false); setSearch(""); }}
                >
                  <span className="font-medium text-slate-700">{user.name}</span>
                  <span className="text-xs text-slate-400">{user.email || user.position || "-"}</span>
                </div>
              ))
            ) : <div className="p-4 text-center text-xs text-slate-400">ไม่พบรายชื่อ</div>}
          </div>
        </div>, 
        document.body 
      )}
    </div>
  );
};

// --- 3.3 Modal (แก้ z-index ให้อยู่เหนือ navbar) ---
const Modal = ({ isOpen, onClose, title, icon: Icon, colorClass = "text-slate-800", children, maxWidth = "max-w-xl", zIndex = 1050 }: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => { setMounted(true); }, []);
  
  useEffect(() => {
    if (isOpen) { 
      setIsVisible(true); 
      setIsAnimatingOut(false); 
      document.body.style.overflow = 'hidden'; 
    } else if (isVisible) { 
      setIsAnimatingOut(true); 
      const timer = setTimeout(() => { 
        setIsVisible(false); 
        setIsAnimatingOut(false); 
        document.body.style.overflow = 'unset'; 
      }, 200); 
      return () => clearTimeout(timer); 
    }
  }, [isOpen, isVisible]);
  
  if (!mounted || !isVisible) return null;
  
  return createPortal(
    <div 
        className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-200" 
        style={{ zIndex }}  // ✅ z-index สูงพอที่จะอยู่เหนือ navbar
    >
      <div className="absolute inset-0" onClick={onClose}></div>
      <div 
        className={`relative bg-white rounded-2xl shadow-2xl w-full flex flex-col ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${maxWidth} ${isAnimatingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95 slide-in-from-bottom-8'}`} 
        style={{ maxHeight: '90vh' }}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0 z-20">
          <h3 className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}>
            {Icon && <Icon size={22} />} {title}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 relative bg-white">{children}</div>
      </div>
    </div>, 
    document.body
  );
};

// ==========================================
// 4. MAIN PAGE COMPONENT
// ==========================================
export default function CourseDataPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [isEditChairModalOpen, setIsEditChairModalOpen] = useState(false);
  const [isAddProgramModalOpen, setIsAddProgramModalOpen] = useState(false);

  // Forms
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({ code: "", name_th: "", name_en: "", credit: "", programId: "" });

  // ✅ ตัด curriculumId ออก เหลือแค่ field ที่มีใน schema จริง
  const [programFormData, setProgramFormData] = useState({ 
    name_th: "", 
    year: "", 
    degree_level: "ป.ตรี"  // ✅ ใช้ค่าจริงจาก DB
  });

  // Selections
  const [selectedResponsible, setSelectedResponsible] = useState<UserData | null>(null);
  const [selectedProgramChair, setSelectedProgramChair] = useState<UserData | null>(null);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [tempChair, setTempChair] = useState<UserData | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        const pCourses = fetch("/api/courses", { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []);
        const pStaff = fetch("/api/staff", { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []);
        const pPrograms = fetch("/api/programs", { cache: 'no-store' }).then(r => r.ok ? r.json() : []).catch(() => []);

        const [dataCourses, dataStaff, dataPrograms] = await Promise.all([pCourses, pStaff, pPrograms]);

        setCourses(Array.isArray(dataCourses) ? dataCourses : []);
        setPrograms(Array.isArray(dataPrograms) ? dataPrograms : []);
        
        if (Array.isArray(dataStaff)) {
            setUsers(dataStaff.map((s:any) => ({
                ...s, 
                id: String(s.id), 
                name: getFullName(s)
            })));
        }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // ✅ reset form ทุกครั้งที่เปิด modal เพิ่มหลักสูตร
  const openAddProgramModal = () => {
    setProgramFormData({ name_th: "", year: "", degree_level: "ป.ตรี" });
    setSelectedProgramChair(null);
    setIsAddProgramModalOpen(true);
  };

  const handleAddProgram = async () => {
    if (!programFormData.name_th || !programFormData.year) { 
      toast.error("กรุณากรอกชื่อหลักสูตรและปี พ.ศ."); 
      return; 
    }
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name_th: programFormData.name_th,
          degree_level: programFormData.degree_level,
          year: parseInt(programFormData.year),  // ✅ แปลงเป็น number
          programChairId: selectedProgramChair ? selectedProgramChair.id : null
        })
      });
      if (res.ok) {
        toast.success("เพิ่มหลักสูตรเรียบร้อย");
        setIsAddProgramModalOpen(false);
        // ✅ reset form หลังบันทึก
        setProgramFormData({ name_th: "", year: "", degree_level: "ป.ตรี" });
        setSelectedProgramChair(null);
        fetch("/api/programs", { cache: 'no-store' }).then(r=>r.json()).then(setPrograms);
      } else { 
        toast.error("เพิ่มหลักสูตรไม่สำเร็จ"); 
      }
    } catch (error) { 
      toast.error("เกิดข้อผิดพลาด"); 
    }
  };

  const handleDeleteProgram = async (programId: number) => {
    if (!confirm("⚠️ ลบหลักสูตร?")) return;
    try {
      await fetch(`/api/programs?id=${programId}`, { method: "DELETE" });
      setPrograms(prev => prev.filter(p => p.id !== programId));
      toast.success("ลบหลักสูตรเรียบร้อย");
    } catch (e) { toast.error("ลบไม่สำเร็จ"); }
  };

  const handleSaveProgramChair = async () => {
    if (!editingProgram) return;
    try {
      const res = await fetch("/api/programs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: editingProgram.id, 
          programChairId: tempChair ? tempChair.id : null 
        })
      });
      if (res.ok) {
        toast.success("บันทึกเรียบร้อย");
        setIsEditChairModalOpen(false);
        const resProgram = await fetch("/api/programs", { cache: 'no-store' });
        if (resProgram.ok) setPrograms(await resProgram.json());
      } else { toast.error("บันทึกไม่สำเร็จ"); }
    } catch (error) { toast.error("เกิดข้อผิดพลาด"); }
  };

  const openEditProgramChairModal = (prog: Program) => {
    setEditingProgram(prog);
    setTempChair(prog.programChair ? { ...prog.programChair, name: getFullName(prog.programChair) } : null);
    setIsEditChairModalOpen(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("ยืนยันลบ?")) return;
    try {
      await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
      setCourses(prev => prev.filter(c => c.id !== id));
      toast.success("ลบเรียบร้อย");
    } catch (err) { toast.error("ลบไม่สำเร็จ"); }
  };

  const handleSaveCourse = async () => {
    try {
      if (!formData.code || !formData.name_th || !formData.programId) { toast.error("กรุณากรอกข้อมูล"); return; }
      const payload = { ...formData, responsibleUserId: selectedResponsible ? selectedResponsible.id : null, instructor: null };
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch("/api/courses", {
        method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
      setIsModalOpen(false);
      fetch("/api/courses", { cache: 'no-store' }).then(r=>r.json()).then(setCourses);
      toast.success("บันทึกเรียบร้อย");
    } catch (err: any) { toast.error(err.message); }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ code: "", name_th: "", name_en: "", credit: "", programId: "" });
    setSelectedResponsible(null);
    setIsModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setIsEditMode(true);
    setFormData({
      id: course.id, code: course.code, name_th: course.name_th, name_en: course.name_en || "", credit: course.credit,
      programId: course.program?.id?.toString() || "", 
    });
    setSelectedResponsible(course.responsibleUser ? { ...course.responsibleUser, name: getFullName(course.responsibleUser) } : null);
    setIsModalOpen(true);
  };

  const filteredCourses = courses.filter((c) => {
    if (c.code === "EXTERNAL-PLACEHOLDER") return false;
    
    const matchesProgram = selectedProgram ? c.program?.id?.toString() === selectedProgram : true;
    let matchesLevel = true;
    if (selectedLevel) {
      const degree = c.program?.degree_level || "";
      matchesLevel = degree === selectedLevel;
    }
    const searchLower = searchTerm.toLowerCase();
    const responsibleName = c.responsibleUser ? getFullName(c.responsibleUser).toLowerCase() : "";
    return matchesProgram && matchesLevel && (c.code.toLowerCase().includes(searchLower) || c.name_th.toLowerCase().includes(searchLower) || responsibleName.includes(searchLower));
  });

  const programOptions = [{ label: "ทุกหลักสูตร", value: "" }, ...programs.map(p => ({ label: `${p.name_th} (${p.year})`, value: p.id.toString() }))];
  
  // ✅ degree filter ใช้ค่าจริงจาก DB
  const degreeOptions = [
    { label: "ทุกระดับ", value: "" }, 
    ...DEGREE_LEVELS.map(d => ({ label: degreeLabelMap[d] || d, value: d }))
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
      <Toaster position="top-center" richColors />
      <div className="mb-6">
        <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
          <span>จัดการข้อมูล</span><ChevronRight size={14} /><span className="text-purple-600">ข้อมูลรายวิชา</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">จัดการข้อมูลรายวิชา</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60 mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-purple-600" /> ค้นหาและกรองข้อมูล</h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="w-full md:w-80">
            <div className="relative group">
              <input type="text" placeholder="พิมพ์รหัสวิชา, ชื่อวิชา..." className="w-full pl-10 pr-4 h-11 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>
          <div className="w-full md:w-80"><FilterSelect options={programOptions} value={selectedProgram} onChange={setSelectedProgram} placeholder="ทุกหลักสูตร" icon={FolderPlus} /></div>
          <div className="w-full md:w-48"><FilterSelect options={degreeOptions} value={selectedLevel} onChange={setSelectedLevel} placeholder="ทุกระดับ" icon={Filter} /></div>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={24} className="text-slate-700" /> รายวิชาทั้งหมด 
            <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{filteredCourses.length} รายการ</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {/* ✅ เปลี่ยน onClick ไปเรียก openAddProgramModal แทน */}
            <button onClick={openAddProgramModal} className="flex items-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 bg-white shadow-sm text-sm"><FolderPlus size={18} /> <span>เพิ่มหลักสูตร</span></button>
            <button onClick={() => setIsCurriculumModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 bg-white shadow-sm text-sm"><Briefcase size={18} /> <span>จัดการประธานหลักสูตร</span></button>
            <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm text-sm"><Plus size={18} /> <span>เพิ่มรายวิชา</span></button>
          </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-sm uppercase tracking-wide">
                <th className="py-4 px-6 font-semibold w-[10%]">รหัสวิชา</th>
                <th className="py-4 px-6 font-semibold w-[30%]">ชื่อรายวิชา</th>
                <th className="py-4 px-6 font-semibold w-[10%]">ระดับ</th>
                <th className="py-4 px-6 font-semibold w-[20%]">หลักสูตร</th>
                <th className="py-4 px-6 font-semibold w-[20%]">ผู้รับผิดชอบ</th>
                <th className="py-4 px-6 font-semibold w-[10%] text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex justify-center gap-2 items-center"><Loader2 className="animate-spin" size={24} /> กำลังโหลด...</div></td></tr>
              ) : filteredCourses.length > 0 ? (
                filteredCourses.map((c, index) => (
                  <tr key={`${c.id}-${index}`} className="hover:bg-slate-50/80 transition-colors text-sm group">
                    <td className="py-4 px-6 align-top font-medium text-slate-700">{c.code}</td>
                    <td className="py-4 px-6 align-top">
                      <div className="font-semibold text-slate-800">{c.name_th}</div>
                      <div className="text-xs text-slate-500 font-light">{c.name_en}</div>
                      {c.program_full_name?.includes("ตกแผน") && <div className="mt-1"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">ตกแผน</span></div>}
                    </td>
                    <td className="py-4 px-6 align-top">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        {c.program?.degree_level || "ป.ตรี"}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top text-slate-600"><div>{c.program?.name_th}</div><div className="text-xs text-slate-400">({c.program?.year})</div></td>
                    <td className="py-4 px-6 align-top"><div className="font-medium text-slate-800">{getFullName(c.responsibleUser)}</div><div className="text-xs text-slate-400">{c.responsibleUser?.email || "-"}</div></td>
                    <td className="py-4 px-6 align-top text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                        <button onClick={() => openEditModal(c)} className="w-8 h-8 flex items-center justify-center border border-green-200 rounded-lg text-green-600 hover:bg-green-50 shadow-sm"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteCourse(c.id)} className="w-8 h-8 flex items-center justify-center border border-red-200 rounded-lg text-red-500 hover:bg-red-50 shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="p-16 text-center text-slate-400"><div className="flex flex-col items-center gap-2"><Search size={32} className="opacity-20" /><span>ไม่พบข้อมูลที่ค้นหา</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: เพิ่ม/แก้ไข รายวิชา */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditMode ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มรายวิชาใหม่"} icon={isEditMode ? Edit : Plus} colorClass={isEditMode ? "text-purple-700" : "text-green-700"} zIndex={1050}>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-2"><label className="text-sm font-semibold text-slate-700">รหัสวิชา</label><input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">หน่วยกิต</label><input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" value={formData.credit} onChange={e => setFormData({ ...formData, credit: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">ชื่อวิชา (ไทย)</label><input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" value={formData.name_th} onChange={e => setFormData({ ...formData, name_th: e.target.value })} /></div>
            <div className="space-y-2"><label className="text-sm font-semibold text-slate-700">ชื่อวิชา (อังกฤษ)</label><input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">หลักสูตร</label>
            <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white" value={formData.programId} onChange={e => setFormData({ ...formData, programId: e.target.value })}>
              <option value="">-- เลือกหลักสูตร --</option>
              {programs.map((p, index) => <option key={`${p.id}-${index}`} value={p.id}>{p.name_th} ({p.year}) - {p.degree_level}</option>)}
            </select>
          </div>
          <div className="space-y-2 pb-6">
            <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><User size={18} className="text-purple-600" /> ผู้รับผิดชอบ</label>
            <div className="w-full">
              {selectedResponsible ? (
                <div className="flex items-center justify-between bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                  <div className="flex flex-col"><span className="font-semibold text-slate-700 text-sm">{selectedResponsible.name}</span><span className="text-xs text-slate-400">{selectedResponsible.email}</span></div>
                  <button onClick={() => setSelectedResponsible(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              ) : (
                <SearchableUserSelect users={users} placeholder="เลือกผู้รับผิดชอบ..." onSelect={setSelectedResponsible} />
              )}
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white z-20">
          <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm">ยกเลิก</button>
          <button onClick={handleSaveCourse} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm shadow-md">บันทึกข้อมูล</button>
        </div>
      </Modal>

      {/* ✅ Modal: เพิ่มหลักสูตร (ตัด curriculumId ออก, ใช้ degree จาก DB จริง) */}
      <Modal isOpen={isAddProgramModalOpen} onClose={() => setIsAddProgramModalOpen(false)} title="เพิ่มหลักสูตรใหม่" icon={FolderPlus} colorClass="text-blue-700" maxWidth="max-w-md" zIndex={1050}>
        <div className="p-6 space-y-5">
          
          {/* ชื่อหลักสูตร */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">ชื่อหลักสูตร <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
              placeholder="เช่น หลักสูตรวิทยาศาสตรบัณฑิต"
              value={programFormData.name_th} 
              onChange={e => setProgramFormData({ ...programFormData, name_th: e.target.value })} 
            />
          </div>

          {/* ปี พ.ศ. + ระดับการศึกษา */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">ปี พ.ศ. <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                placeholder="เช่น 2567"
                value={programFormData.year} 
                onChange={e => setProgramFormData({ ...programFormData, year: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              {/* ✅ ใช้ค่า degree_level จาก DB จริง (ป.ตรี, ป.โท, ป.เอก) */}
              <label className="text-sm font-semibold text-slate-700">ระดับการศึกษา</label>
              <select 
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                value={programFormData.degree_level} 
                onChange={e => setProgramFormData({ ...programFormData, degree_level: e.target.value })}
              >
                {DEGREE_LEVELS.map(d => (
                  <option key={d} value={d}>{degreeLabelMap[d]} ({d})</option>
                ))}
              </select>
            </div>
          </div>

          {/* ประธานหลักสูตร (optional) */}
          <div className="space-y-2 pb-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} className="text-blue-500" /> ประธานหลักสูตร <span className="text-slate-400 font-normal">(ถ้ามี)</span>
            </label>
            {selectedProgramChair ? (
              <div className="flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-700 text-sm">{selectedProgramChair.name}</span>
                  <span className="text-xs text-slate-400">{selectedProgramChair.email || "-"}</span>
                </div>
                <button onClick={() => setSelectedProgramChair(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <SearchableUserSelect users={users} placeholder="ค้นหาชื่ออาจารย์..." onSelect={setSelectedProgramChair} />
            )}
          </div>
        </div>

        <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white z-20">
          <button onClick={() => setIsAddProgramModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors">ยกเลิก</button>
          <button onClick={handleAddProgram} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm shadow-md hover:bg-blue-700 transition-colors">บันทึกหลักสูตร</button>
        </div>
      </Modal>

      {/* Modal: จัดการประธานหลักสูตร */}
      <Modal isOpen={isCurriculumModalOpen} onClose={() => setIsCurriculumModalOpen(false)} title="จัดการประธานหลักสูตร" icon={Briefcase} colorClass="text-purple-800" maxWidth="max-w-5xl" zIndex={1050}>
        <div className="p-6 space-y-8 bg-slate-50/30">
            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <span className="w-1 h-4 bg-blue-500 rounded-full"></span> หลักสูตรทั้งหมด
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[10%]">ID</th>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[30%]">ชื่อหลักสูตร</th>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[10%] text-center">ปี พ.ศ.</th>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[10%] text-center">ระดับ</th>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[30%]">ประธานหลักสูตร</th>
                            <th className="py-3 px-4 font-semibold text-slate-600 w-[10%] text-center">จัดการ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {programs.map((prog) => (
                                <tr key={prog.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 align-top font-medium text-slate-500">#{prog.id}</td>
                                    <td className="py-4 px-4 align-top font-medium text-slate-700">{prog.name_th}</td>
                                    <td className="py-4 px-4 text-center align-top text-slate-600">{prog.year}</td>
                                    <td className="py-4 px-4 text-center align-top">
                                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                        {prog.degree_level}
                                      </span>
                                    </td>
                                    <td className="py-4 px-4 align-top">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-slate-800">{getFullName(prog.programChair)}</span>
                                            {prog.programChair ? (
                                                <span className="text-xs text-slate-400 mt-0.5">{prog.programChair.email}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">- ยังไม่ระบุ -</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center align-top">
                                        <button 
                                            onClick={() => openEditProgramChairModal(prog)} 
                                            className="w-8 h-8 flex items-center justify-center border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50 transition shadow-sm mx-auto"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {programs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">ไม่พบข้อมูลหลักสูตร</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="p-5 bg-white border-t sticky bottom-0 z-20 flex justify-end">
          <button onClick={() => setIsCurriculumModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50 font-medium shadow-sm transition-all">ปิดหน้าต่าง</button>
        </div>
      </Modal>

      {/* Modal: แก้ไขประธานหลักสูตร */}
      <Modal isOpen={isEditChairModalOpen} onClose={() => setIsEditChairModalOpen(false)} title="เลือกประธานหลักสูตร" maxWidth="max-w-md" zIndex={1100}>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-700">
            กำลังแก้ไข: <span className="font-bold">{editingProgram?.name_th} ({editingProgram?.year})</span>
          </div>
          <div className="space-y-2 pb-2">
            <label className="text-sm font-semibold text-slate-700">เลือกประธานหลักสูตร</label>
            <div className="w-full">
              {tempChair ? (
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-100 shadow-sm ring-1 ring-purple-50">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 text-sm">{tempChair.name}</span>
                    <span className="text-xs text-slate-400">{tempChair.email || "-"}</span>
                  </div>
                  <button onClick={() => setTempChair(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50">
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <SearchableUserSelect users={users} placeholder="ค้นหาชื่อ..." onSelect={setTempChair} />
              )}
            </div>
          </div>
        </div>
        <div className="p-5 border-t bg-slate-50 flex justify-end gap-3">
          <button onClick={() => setIsEditChairModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm">ยกเลิก</button>
          <button onClick={handleSaveProgramChair} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm shadow-md">บันทึก</button>
        </div>
      </Modal>

    </div>
  );
}