"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import { 
  Plus, Search, Edit, Trash2, X, ChevronLeft, ChevronRight, User, ChevronsUpDown, Briefcase, Check, Loader2, FolderPlus, AlertCircle
} from "lucide-react";
import { Toaster, toast } from 'sonner';

// --- Types ---
type UserData = {
  id: number;
  name: string;
  email: string;
  position: string;
};

type Program = {
  id: number;
  name_th: string;
  year: number;
  programChairId?: number | null; 
  programChair?: {
    id: number;
    firstName: string;
    lastName: string;
    academicPosition: string;
    adminTitle?: string;
  } | null;
};

type Course = {
  id: number;
  code: string;
  name_th: string;
  name_en: string;
  credit: string;
  instructor?: string;
  program_full_name?: string;
  program: {
    id: number;
    name_th: string;
    year: number;
    degree_level?: string;
    programChairId?: number | null;
    programChair?: any; 
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

const getFullName = (user: any) => {
  if (!user) return "-";
  const prefix = user.academicPosition || user.title || "";
  return `${prefix} ${user.firstName || ""} ${user.lastName || ""}`.trim();
};

// --- ✨ ANIMATED MODAL WRAPPER (Fixed Z-Index) ✨ ---
const Modal = ({ 
    isOpen, 
    onClose, 
    title, 
    icon: Icon, 
    colorClass = "text-slate-800",
    children,
    maxWidth = "max-w-xl",
    zIndex = "z-[9999]" // ✅ ปรับ Z-Index ให้สูงลิ่ว ทับ Navbar แน่นอน
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    icon?: any; 
    colorClass?: string;
    children: ReactNode;
    maxWidth?: string;
    zIndex?: string;
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsAnimatingOut(false);
        } else if (isVisible) {
            setIsAnimatingOut(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setIsAnimatingOut(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isVisible]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-200 ${isAnimatingOut ? 'opacity-0' : 'opacity-100 animate-in fade-in'}`}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ring-1 ring-black/5 overflow-hidden transition-all duration-200 ${maxWidth} ${isAnimatingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100 animate-in zoom-in-95 slide-in-from-bottom-8'}`}>
                {/* Header */}
                <div className="px-5 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${colorClass}`}>
                        {Icon && <Icon size={22} />} {title}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                {/* Body */}
                {children}
            </div>
        </div>
    );
};

export default function CourseDataPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserData[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProgramModalOpen, setIsProgramModalOpen] = useState(false);
  const [isAddProgramModalOpen, setIsAddProgramModalOpen] = useState(false); 
  const [isEditChairModalOpen, setIsEditChairModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [formData, setFormData] = useState<any>({});
  const [programFormData, setProgramFormData] = useState({ name_th: "", year: "", degree_level: "ปริญญาตรี" });
  
  const [selectedResponsible, setSelectedResponsible] = useState<UserData | null>(null);
  const [selectedProgramChair, setSelectedProgramChair] = useState<UserData | null>(null);

  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [tempChair, setTempChair] = useState<UserData | null>(null); 

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resCourses, resStaff] = await Promise.all([
          fetch("/api/courses", { cache: 'no-store' }),
          fetch("/api/staff", { cache: 'no-store' })
      ]);
      const dataCourses = await resCourses.json();
      const dataStaff = await resStaff.json();

      setCourses(Array.isArray(dataCourses) ? dataCourses : []);
      setUsers(Array.isArray(dataStaff) ? dataStaff : []);

      const uniquePrograms = new Map();
      if (Array.isArray(dataCourses)) {
        dataCourses.forEach((c: any) => {
            if (c.program && !uniquePrograms.has(c.program.id)) {
                uniquePrograms.set(c.program.id, c.program);
            }
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
                  ...programFormData,
                  programChairId: selectedProgramChair ? selectedProgramChair.id : null 
              })
          });

          if (res.ok) {
              const newProgram = await res.json();
              toast.success("เพิ่มหลักสูตรเรียบร้อย");
              setPrograms(prev => [...prev, newProgram]); 
              setIsAddProgramModalOpen(false);
              setProgramFormData({ name_th: "", year: "", degree_level: "ปริญญาตรี" });
              setSelectedProgramChair(null);
          } else {
              toast.error("เพิ่มหลักสูตรไม่สำเร็จ");
          }
      } catch (error) {
          toast.error("เกิดข้อผิดพลาด");
      }
  };

  const handleDeleteProgram = async (programId: number) => {
      if(!confirm("⚠️ คำเตือน: การลบหลักสูตรอาจส่งผลกระทบต่อรายวิชาในหลักสูตรนั้น\nต้องการลบจริงๆ หรือไม่?")) return;
      try {
          const res = await fetch(`/api/programs?id=${programId}`, { method: "DELETE" });
          if (res.ok) {
              toast.success("ลบหลักสูตรเรียบร้อย");
              setPrograms(prev => prev.filter(p => p.id !== programId));
          } else {
              const errorData = await res.json();
              toast.error(errorData.error || "ลบไม่สำเร็จ");
          }
      } catch (error) {
          toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      }
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
            toast.success("บันทึกข้อมูลเรียบร้อย");
            setIsEditChairModalOpen(false);
            setEditingProgram(null);
            setTempChair(null);
            fetchInitialData(); 
        } else {
            toast.error("บันทึกไม่สำเร็จ");
        }
    } catch (error) {
        toast.error("เกิดข้อผิดพลาด");
    }
  };

  const openEditChairModal = (program: Program) => {
      setEditingProgram(program);
      if (program.programChair) {
          setTempChair({
              id: program.programChair.id,
              name: getFullName(program.programChair),
              email: "",
              position: program.programChair.academicPosition || ""
          });
      } else {
          setTempChair(null);
      }
      setIsEditChairModalOpen(true);
  };

  const handleDeleteCourse = async (id: number) => {
    if (!confirm("ยืนยันการลบรายวิชานี้?")) return;
    try {
      await fetch(`/api/courses?id=${id}`, { method: 'DELETE' });
      fetchInitialData();
      toast.success("ลบรายวิชาเรียบร้อย");
    } catch (err) {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleSaveCourse = async () => {
    try {
      if (!formData.code || !formData.name_th || !formData.programId) {
        toast.error("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");
        return;
      }
      const payload = {
        ...formData,
        responsibleUserId: selectedResponsible ? selectedResponsible.id : null,
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
      toast.success(isEditMode ? "แก้ไขข้อมูลเรียบร้อย" : "เพิ่มรายวิชาเรียบร้อย");
    } catch (err: any) {
      toast.error(err.message);
    }
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
        id: course.id,
        code: course.code,
        name_th: course.name_th,
        name_en: course.name_en || "",
        credit: course.credit,
        programId: course.program?.id.toString() || "",
    });
    if (course.responsibleUser) {
        setSelectedResponsible({
            id: course.responsibleUser.id,
            name: getFullName(course.responsibleUser),
            email: course.responsibleUser.email,
            position: course.responsibleUser.academicPosition || ""
        });
    } else {
        setSelectedResponsible(null);
    }
    setIsModalOpen(true);
  };

  // ✅ Searchable User Select (Responsive & Animated)
  const SearchableUserSelect = ({ onSelect, placeholder = "ค้นหา...", initialValue = "" }: { onSelect: (user: UserData) => void, placeholder?: string, initialValue?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        function handleClickOutside(event: any) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className="flex items-center justify-between w-full p-2.5 border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-purple-400 hover:ring-2 hover:ring-purple-100 transition-all shadow-sm h-11" 
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`text-sm truncate ${initialValue ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{initialValue || placeholder}</span>
                <ChevronsUpDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {/* ✅ Dropdown Animation + Z-Index Fix */}
            {isOpen && (
                <div className="absolute z-[100] w-full min-w-[300px] mt-1.5 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top custom-scrollbar">
                    <div className="p-2 sticky top-0 bg-white/95 backdrop-blur border-b z-10">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"/>
                            <input autoFocus type="text" className="w-full pl-9 p-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500" placeholder="พิมพ์ชื่อเพื่อค้นหา..." value={search} onChange={(e) => setSearch(e.target.value)}/>
                        </div>
                    </div>
                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                            <div key={user.id} className="px-4 py-2.5 text-sm hover:bg-purple-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-none transition-colors" onClick={() => { onSelect(user); setIsOpen(false); setSearch(""); }}>
                                <span className="font-medium text-slate-700">{user.name}</span>
                                <span className="text-xs text-slate-400">{user.position}</span>
                            </div>
                        ))
                    ) : <div className="p-4 text-center text-xs text-slate-400">ไม่พบรายชื่อ</div>}
                </div>
            )}
        </div>
    );
  };

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
    const responsibleName = getFullName(c.responsibleUser).toLowerCase();
    const matchesSearch = c.code.toLowerCase().includes(searchLower) || c.name_th.toLowerCase().includes(searchLower) || (c.name_en && c.name_en.toLowerCase().includes(searchLower)) || responsibleName.includes(searchLower);
    return matchesProgram && matchesLevel && matchesSearch;
  });

  return (
    <div className="space-y-8 font-sarabun p-8 bg-slate-50/50 min-h-screen">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">จัดการข้อมูลรายวิชา</h1>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/60">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" /> ค้นหาและกรองข้อมูล
        </h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:w-80">
                 <div className="relative group">
                    <input type="text" placeholder="พิมพ์รหัสวิชา, ชื่อวิชา, หรือชื่อผู้รับผิดชอบ..." className="w-full pl-10 pr-4 h-11 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm bg-slate-50/30 focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                </div>
            </div>
            <div className="w-full md:w-64">
                <select className="w-full h-11 border border-slate-200 rounded-lg px-3 text-slate-600 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white text-sm cursor-pointer" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
                    <option value="">ทุกหลักสูตร</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name_th} ({p.year})</option>)}
                </select>
            </div>
            <div className="w-full md:w-48">
                <select className="w-full h-11 border border-slate-200 rounded-lg px-3 text-slate-600 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white text-sm cursor-pointer" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
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
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                รายวิชาทั้งหมด 
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {filteredCourses.length} รายการ
                </span>
            </h2>
            <div className="flex flex-wrap gap-3">
                <button 
                    onClick={() => setIsAddProgramModalOpen(true)}
                    className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium bg-white shadow-sm hover:shadow active:scale-95 text-sm whitespace-nowrap"
                >
                    <FolderPlus size={18} /> <span>เพิ่มหลักสูตร</span>
                </button>

                <button onClick={() => setIsProgramModalOpen(true)} className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-medium bg-white shadow-sm hover:shadow active:scale-95 text-sm whitespace-nowrap">
                    <Briefcase size={18} /> <span>จัดการประธานหลักสูตร</span>
                </button>
                <button onClick={openAddModal} className="flex flex-row items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-sm hover:shadow-md active:scale-95 text-sm whitespace-nowrap">
                    <Plus size={18} /> <span>เพิ่มรายวิชา</span>
                </button>
            </div>
        </div>

        <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-700 text-sm uppercase tracking-wide">
                        <th className="py-4 px-6 font-semibold w-[10%]">รหัสวิชา</th>
                        <th className="py-4 px-6 font-semibold w-[35%]">ชื่อรายวิชา</th>
                        <th className="py-4 px-6 font-semibold w-[10%]">ระดับ</th>
                        <th className="py-4 px-6 font-semibold w-[20%]">หลักสูตร</th>
                        <th className="py-4 px-6 font-semibold w-[20%]">ผู้รับผิดชอบ</th>
                        <th className="py-4 px-6 font-semibold w-[5%] text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400"><div className="flex justify-center gap-2 items-center"><Loader2 className="animate-spin" size={24}/> กำลังโหลด...</div></td></tr>
                    ) : filteredCourses.length > 0 ? (
                        filteredCourses.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors text-sm group">
                                <td className="py-4 px-6 align-top font-medium text-slate-700">{c.code}</td>
                                <td className="py-4 px-6 align-top">
                                    <div className="font-semibold text-slate-800">{c.name_th}</div>
                                    <div className="text-xs text-slate-500 font-light">{c.name_en}</div>
                                    {c.program_full_name?.includes("ตกแผน") && <div className="mt-1"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">ตกแผน</span></div>}
                                </td>
                                <td className="py-4 px-6 align-top text-slate-600">{c.program?.degree_level || "ปริญญาตรี"}</td>
                                <td className="py-4 px-6 align-top text-slate-600"><div>{c.program?.name_th}</div><div className="text-xs text-slate-400">({c.program?.year})</div></td>
                                <td className="py-4 px-6 align-top">
                                    <div className="font-medium text-slate-800">{getFullName(c.responsibleUser)}</div>
                                    <div className="text-xs text-slate-400">{c.responsibleUser?.email || "-"}</div>
                                </td>
                                <td className="py-4 px-6 align-top text-center">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                        <button onClick={() => openEditModal(c)} className="w-8 h-8 flex items-center justify-center border border-green-200 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-300 transition-all shadow-sm"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteCourse(c.id)} className="w-8 h-8 flex items-center justify-center border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={6} className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2"><Search size={32} className="opacity-20"/>ไม่พบข้อมูลที่ค้นหา</td></tr>
                    )}
                </tbody>
            </table>
            
            <div className="flex justify-end items-center p-4 gap-4 text-xs text-slate-500 bg-slate-50/50 border-t border-slate-100">
                <span>แสดงผล {filteredCourses.length} รายการ</span>
                <div className="flex gap-1">
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"><ChevronLeft size={16} /></button>
                    <button className="p-1 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
      </div>

      {/* --- ADD/EDIT COURSE MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "แก้ไขข้อมูลรายวิชา" : "เพิ่มรายวิชาใหม่"}
        icon={isEditMode ? Edit : Plus}
        colorClass={isEditMode ? "text-purple-700" : "text-green-700"}
      >
          <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              {/* Basic Info */}
              <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2 space-y-2">
                      <label className="text-sm font-semibold text-slate-700">รหัสวิชา <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="เช่น 341221" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.code || ""} onChange={e => setFormData({...formData, code: e.target.value})}/>
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">หน่วยกิต</label>
                      {/* ✅ Placeholder */}
                      <input type="text" placeholder="เช่น 3 (2-2-5)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.credit || ""} onChange={e => setFormData({...formData, credit: e.target.value})}/>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">ชื่อวิชา (ไทย) <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="เช่น เภสัชกรรมปฏิบัติ" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.name_th || ""} onChange={e => setFormData({...formData, name_th: e.target.value})}/>
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">ชื่อวิชา (อังกฤษ)</label>
                      <input type="text" placeholder="เช่น Pharmacy Practice" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.name_en || ""} onChange={e => setFormData({...formData, name_en: e.target.value})}/>
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">หลักสูตร <span className="text-red-500">*</span></label>
                  <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white cursor-pointer" value={formData.programId || ""} onChange={e => setFormData({...formData, programId: e.target.value})}>
                      <option value="">-- เลือกหลักสูตร --</option>
                      {programs.map(p => <option key={p.id} value={p.id}>{p.name_th} ({p.year})</option>)}
                  </select>
              </div>
              
              <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-100"></div>
                  </div>
              </div>

              {/* ✅ ลดระยะห่างผู้รับผิดชอบ */}
              <div className="space-y-2 pb-24"> 
                    <label className="text-sm font-semibold text-slate-800 flex items-center gap-2"><User size={18} className="text-purple-600" /> ผู้รับผิดชอบรายวิชา</label>
                  <div className="w-full">
                        {selectedResponsible ? (
                          <div className="flex items-center justify-between bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                              <div className="flex flex-col"><span className="font-semibold text-slate-700 text-sm">{selectedResponsible.name}</span><span className="text-xs text-slate-400">{selectedResponsible.email}</span></div>
                              <button onClick={() => setSelectedResponsible(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="ลบ"><Trash2 size={16} /></button>
                          </div>
                        ) : (
                          <SearchableUserSelect placeholder="ค้นหาและเลือกผู้รับผิดชอบ..." onSelect={(user) => setSelectedResponsible(user)} />
                        )}
                  </div>
              </div>
          </div>
          <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-white hover:text-slate-700 text-slate-600 font-medium transition-all shadow-sm">ยกเลิก</button>
              <button onClick={handleSaveCourse} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium shadow-md shadow-green-200 hover:shadow-lg transition-all active:scale-95">บันทึกข้อมูล</button>
          </div>
      </Modal>

      {/* --- ADD PROGRAM MODAL (Extra Space for Scroll) --- */}
      <Modal
        isOpen={isAddProgramModalOpen}
        onClose={() => setIsAddProgramModalOpen(false)}
        title="เพิ่มหลักสูตรใหม่"
        icon={FolderPlus}
        colorClass="text-blue-700"
        maxWidth="max-w-md"
      >
          {/* ✅ เพิ่ม min-h-400px และ pb-32 เพื่อให้ Dropdown มีพื้นที่แสดงผล */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] min-h-[400px] pb-32 custom-scrollbar">
              <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">ชื่อหลักสูตร <span className="text-red-500">*</span></label>
                  <input 
                      type="text" 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                      placeholder="เช่น หลักสูตรเภสัชศาสตรบัณฑิต..."
                      value={programFormData.name_th} 
                      onChange={e => setProgramFormData({...programFormData, name_th: e.target.value})}
                  />
              </div>
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">ปี พ.ศ. <span className="text-red-500">*</span></label>
                      <input 
                          type="number" 
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                          placeholder="2567"
                          value={programFormData.year} 
                          onChange={e => setProgramFormData({...programFormData, year: e.target.value})}
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">ระดับปริญญา</label>
                      <select 
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white cursor-pointer"
                          value={programFormData.degree_level}
                          onChange={e => setProgramFormData({...programFormData, degree_level: e.target.value})}
                      >
                          <option value="ปริญญาตรี">ปริญญาตรี</option>
                          <option value="ปริญญาโท">ปริญญาโท</option>
                          <option value="ปริญญาเอก">ปริญญาเอก</option>
                      </select>
                  </div>
              </div>

              <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-100"></div>
                  </div>
              </div>

              <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <User size={18} className="text-blue-600" /> 
                      ประธานหลักสูตร (ถ้ามี)
                  </label>
                  <div className="w-full">
                        {selectedProgramChair ? (
                          <div className="flex items-center justify-between bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                              <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-sm">{selectedProgramChair.name}</span>
                                  <span className="text-xs text-slate-400">{selectedProgramChair.position || "-"}</span>
                              </div>
                              <button onClick={() => setSelectedProgramChair(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                        ) : (
                          <SearchableUserSelect 
                              placeholder="ค้นหาอาจารย์ที่เป็นประธาน..."
                              onSelect={(user) => setSelectedProgramChair(user)} 
                          />
                        )}
                  </div>
              </div>

          </div>
          <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 bg-white z-10">
              <button onClick={() => setIsAddProgramModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-white hover:text-slate-700 text-slate-600 font-medium transition-all shadow-sm">ยกเลิก</button>
              <button onClick={handleAddProgram} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium shadow-md shadow-blue-200 hover:shadow-lg transition-all active:scale-95">บันทึกหลักสูตร</button>
          </div>
      </Modal>

      {/* --- MANAGE PROGRAM CHAIR MODAL --- */}
      <Modal
        isOpen={isProgramModalOpen}
        onClose={() => setIsProgramModalOpen(false)}
        title="จัดการประธานหลักสูตร"
        icon={Briefcase}
        colorClass="text-purple-800"
        maxWidth="max-w-4xl"
      >
          <div className="p-0 overflow-y-auto custom-scrollbar max-h-[70vh]">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                          <th className="py-4 px-6 font-semibold text-slate-600 w-[35%]">หลักสูตร</th>
                          <th className="py-4 px-6 font-semibold text-slate-600 w-[10%] text-center">ปี</th>
                          <th className="py-4 px-6 font-semibold text-slate-600 w-[35%]">ประธานหลักสูตร</th>
                          <th className="py-4 px-6 font-semibold text-slate-600 w-[20%] text-center">จัดการ</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {programs.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="py-4 px-6 align-top font-medium text-slate-700">{p.name_th}</td>
                              <td className="py-4 px-6 text-center align-top text-slate-500 bg-slate-50/50 rounded-lg mx-2">{p.year}</td>
                              
                              <td className="py-3 px-6 align-top">
                                  <div className="flex flex-col">
                                      <span className="font-semibold text-slate-800">
                                          {getFullName(p.programChair)}
                                      </span>
                                      {p.programChair && (
                                          <span className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                              {p.programChair.adminTitle || "-"}
                                          </span>
                                      )}
                                      {!p.programChair && <span className="text-xs text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded w-fit">- ยังไม่ระบุ -</span>}
                                  </div>
                              </td>

                              <td className="py-4 px-6 text-center align-top">
                                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                      {/* ✅ เปิด Modal แก้ไขแยกต่างหาก */}
                                      <button 
                                          onClick={() => openEditChairModal(p)}
                                          className="w-8 h-8 flex items-center justify-center border border-purple-200 rounded-lg text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
                                          title="แก้ไขประธาน"
                                      >
                                          <Edit size={16} />
                                      </button>
                                      <button 
                                          onClick={() => handleDeleteProgram(p.id)}
                                          className="w-8 h-8 flex items-center justify-center border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                                          title="ลบหลักสูตร"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <div className="p-5 bg-slate-50 text-right border-t sticky bottom-0 bg-white z-10">
              <button onClick={() => setIsProgramModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-white hover:text-slate-800 font-medium shadow-sm transition-all">ปิดหน้าต่าง</button>
          </div>
      </Modal>

      {/* --- ✅ NEW: EDIT PROGRAM CHAIR MODAL (Modal ซ้อน Modal) --- */}
      <Modal
        isOpen={isEditChairModalOpen}
        onClose={() => setIsEditChairModalOpen(false)}
        title="แก้ไขประธานหลักสูตร"
        icon={Briefcase}
        colorClass="text-purple-800"
        maxWidth="max-w-md"
        zIndex="z-[100]" // Layer สูงกว่า
      >
        <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh] min-h-[300px] pb-32 custom-scrollbar">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-700">
                กำลังแก้ไขประธานของ: <span className="font-bold">{editingProgram?.name_th}</span>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">เลือกประธานคนใหม่</label>
                <div className="w-full">
                    {tempChair ? (
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-purple-100 shadow-sm ring-1 ring-purple-50">
                            <div className="flex flex-col">
                                <span className="font-semibold text-slate-700 text-sm">{tempChair.name}</span>
                                <span className="text-xs text-slate-400">{tempChair.position || "-"}</span>
                            </div>
                            <button onClick={() => setTempChair(null)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ) : (
                        <SearchableUserSelect 
                            placeholder="ค้นหาอาจารย์..."
                            onSelect={(user) => setTempChair(user)} 
                        />
                    )}
                </div>
            </div>
        </div>
        <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10 bg-white">
             <button onClick={() => setIsEditChairModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-white hover:text-slate-700 text-slate-600 font-medium transition-all shadow-sm">ยกเลิก</button>
             <button onClick={handleSaveProgramChair} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-medium shadow-md shadow-purple-200 hover:shadow-lg transition-all active:scale-95">บันทึกการเปลี่ยนแปลง</button>
        </div>
      </Modal>

    </div>
  );
}