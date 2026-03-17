"use client";

import { useState, useEffect, useRef, useMemo, ReactNode } from "react";
import { 
  Plus, Pencil, Trash2, Search, ChevronDown, Filter, X, 
  Users, GraduationCap, Briefcase, Mail, BadgeCheck, Loader2, ChevronRight, Check, ChevronsUpDown
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster, toast } from 'sonner';
import Swal from 'sweetalert2';

// --- Types ---
type Curriculum = {
  id: number;
  name: string;
};

type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  academicRank?: string;
  department: string;
  curriculum?: string;
  curriculumId?: number | null;
  managedPrograms?: string;
  createdAt?: string;
  workStatus?: string;
  adminTitle?: string;
  firstName?: string;
  lastName?: string;
  academicPosition?: string;
};

// ==========================================
// Custom Dropdown Component
// ==========================================
type DropdownOption = { label: string; value: string; description?: string; color?: string };

const CustomDropdown = ({
  options, value, onChange, placeholder = "เลือก...", disabled = false, icon: Icon
}: {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all
          ${disabled 
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
            : isOpen 
              ? 'border-purple-500 ring-2 ring-purple-100 bg-white' 
              : 'border-slate-200 bg-white hover:border-purple-300 cursor-pointer'
          }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
          {selected ? (
            <span className="truncate text-slate-700 font-medium">{selected.label}</span>
          ) : (
            <span className="truncate text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown size={15} className={`shrink-0 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1 max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors
                  ${value === opt.value ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <div className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center
                  ${value === opt.value ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                  {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className={`text-sm font-medium ${value === opt.value ? 'text-purple-700' : 'text-slate-700'}`}>{opt.label}</div>
                  {opt.description && <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Custom Select (for filter bar)
// ==========================================
const FilterDropdown = ({
  options, value, onChange, placeholder = "ทั้งหมด", icon: Icon
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-10 flex items-center gap-2 pl-3 pr-3 rounded-lg border text-sm transition-all
          ${isOpen ? 'border-purple-500 ring-2 ring-purple-100 bg-white' : 'border-slate-200 bg-white hover:border-purple-300'}
        `}
      >
        {Icon && <Icon size={14} className="text-slate-400 shrink-0" />}
        <span className={`flex-1 text-left truncate ${value ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1 max-h-64 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors
                  ${value === opt.value ? 'bg-purple-50 text-purple-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}
              >
                <span>{opt.label}</span>
                {value === opt.value && <Check size={14} className="text-purple-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Reusable Modal ---
const Modal = ({ 
    isOpen, onClose, title, icon: Icon, colorClass = "text-slate-800", children, maxWidth = "max-w-2xl", zIndex = 9999
}: { 
    isOpen: boolean; onClose: () => void; title: string; icon?: any; colorClass?: string; children: ReactNode; maxWidth?: string; zIndex?: number;
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" style={{ zIndex }}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden ${maxWidth} animate-in zoom-in-95 slide-in-from-bottom-4`}>
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

// ==========================================
// CONSTANTS
// ==========================================
const OFFICE_KEYWORDS = ["สำนักงานคณะ", "สายสนับสนุน", "ฝ่ายสนับสนุน", "สนับสนุน"];

// ✅ ชื่อสังกัดที่จะ fix อัตโนมัติเมื่อเลือกสายสนับสนุน
const OFFICE_DEPARTMENT_FIXED = "สำนักงานคณะ";

const ROLE_OPTIONS_ACADEMIC: DropdownOption[] = [
  { label: "อาจารย์ผู้สอน (ทั่วไป)", value: "LECTURER", description: "สิทธิ์กรอกภาระงานสอน" },
  { label: "ประธานหลักสูตร", value: "PROGRAM_CHAIR", description: "อนุมัติภาระงานในหลักสูตร" },
  { label: "รองคณบดี / ผู้บริหาร", value: "VICE_DEAN", description: "อนุมัติภาระงานทั้งคณะ" },
];

const ROLE_OPTIONS_ADMIN: DropdownOption[] = [
  { label: "ผู้ดูแลระบบ (Admin)", value: "ADMIN", description: "จัดการข้อมูลทั้งระบบ" },
];

const WORK_STATUS_OPTIONS: DropdownOption[] = [
  { label: "ปฏิบัติงานปกติ", value: "ACTIVE", description: "อยู่ในที่ทำงาน" },
  { label: "ลาศึกษาต่อ", value: "STUDY_LEAVE", description: "ลาศึกษาต่อในหรือต่างประเทศ" },
  { label: "ฝึกอบรมในประเทศ", value: "TRAINING", description: "เข้าร่วมโครงการฝึกอบรม" },
];

// ==========================================
// MAIN PAGE
// ==========================================
export default function ManageStaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"ACADEMIC" | "SUPPORT">("ACADEMIC");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCurriculumId, setFilterCurriculumId] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchCurriculums();
    fetchStaffData();
  }, []);

  const fetchCurriculums = async () => {
    try {
      const res = await fetch("/api/curriculums");
      if (!res.ok) throw new Error();
      setCurriculums(await res.json());
    } catch {
      toast.error("ไม่สามารถโหลดรายชื่อหลักสูตรได้");
    }
  };

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff", { cache: 'no-store' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // ---- Helpers ----
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      const lastName = parts.pop() || '';
      const firstName = parts.pop() || '';
      return { academicPosition: parts.join(' '), firstName, lastName };
    }
    return { academicPosition: '', firstName: fullName, lastName: '' };
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[parts.length-2][0] + parts[parts.length-1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isOfficeCurriculum = (curriculumId: string | number) => {
    if (!curriculumId) return false;
    const found = curriculums.find(c => String(c.id) === String(curriculumId));
    if (!found) return false;
    return OFFICE_KEYWORDS.some(kw => found.name.includes(kw));
  };

  const renderStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "ACTIVE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>ปฏิบัติงาน</span>;
      case "STUDY_LEAVE": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-100"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>ลาศึกษาต่อ</span>;
      case "TRAINING": return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>ฝึกอบรม</span>;
      default: return <span className="text-slate-400 text-xs">-</span>;
    }
  };

  // ---- Handlers ----
  const handleDelete = async (id: string, name: string) => {
    const first = await Swal.fire({
      title: 'ลบข้อมูลบุคลากร?',
      html: `ต้องการลบข้อมูลบุคลากรของ<br/><strong class="text-gray-800">${name}</strong><br/>ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, ดำเนินการต่อ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      customClass: { popup: 'swal-above-modal' },
    });

    if (!first.isConfirmed) return;

    const second = await Swal.fire({
      title: 'ยืนยันอีกครั้ง',
      html: `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ<br/><strong class="text-red-600">${name}</strong><br/><span class="text-sm text-gray-500">การกระทำนี้ไม่สามารถเรียกคืนได้</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ลบถาวร',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
      focusCancel: true,
      customClass: { popup: 'swal-above-modal' },
    });

    if (!second.isConfirmed) return;

    try {
      await fetch(`/api/staff?id=${id}`, { method: 'DELETE' });
      fetchStaffData();
      Swal.fire({
        title: 'ลบเรียบร้อย!',
        text: `ลบข้อมูล ${name} แล้ว`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
        timerProgressBar: true,
        customClass: { popup: 'swal-above-modal' },
      });
    } catch {
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
        icon: 'error',
        confirmButtonColor: '#7c3aed',
        confirmButtonText: 'ตกลง',
        customClass: { popup: 'swal-above-modal' },
      });
    }
  };

  const handleSave = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      Swal.fire({ title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกอีเมล, ชื่อ, และนามสกุล', icon: 'warning', confirmButtonColor: '#7c3aed', confirmButtonText: 'ตกลง', customClass: { popup: 'swal-above-modal' } });
      return;
    }
    if (!formData.curriculumId) {
      Swal.fire({ title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกหลักสูตร / สังกัด', icon: 'warning', confirmButtonColor: '#7c3aed', confirmButtonText: 'ตกลง', customClass: { popup: 'swal-above-modal' } });
      return;
    }

    if (isEditMode) {
      const confirm = await Swal.fire({
        title: 'บันทึกการแก้ไข?',
        text: `ยืนยันการแก้ไขข้อมูลของ ${formData.firstName} ${formData.lastName}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        customClass: { popup: 'swal-above-modal' },
      });
      if (!confirm.isConfirmed) return;
    }

    try {
      const payload = {
        id: isEditMode ? formData.id : undefined,
        email: formData.email,
        academicPosition: formData.academicPosition || "",
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        adminTitle: null,
        department: formData.department || null,
        curriculumId: formData.curriculumId,
        workStatus: formData.workStatus
      };

      const res = await fetch('/api/staff', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      setIsModalOpen(false);
      fetchStaffData();
      Swal.fire({
        title: isEditMode ? 'แก้ไขเรียบร้อย!' : 'เพิ่มบุคลากรแล้ว!',
        text: `${formData.firstName} ${formData.lastName}`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false,
        timerProgressBar: true,
        customClass: { popup: 'swal-above-modal' },
      });
    } catch (err: any) {
      Swal.fire({ title: 'เกิดข้อผิดพลาด', text: err.message || 'บันทึกข้อมูลไม่สำเร็จ', icon: 'error', confirmButtonColor: '#7c3aed', confirmButtonText: 'ตกลง', customClass: { popup: 'swal-above-modal' } });
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ academicPosition: "", firstName: "", lastName: "", email: "", role: "LECTURER", curriculumId: "", department: "", workStatus: "ACTIVE" });
    setIsModalOpen(true);
  };

  const openEditModal = (user: StaffUser) => {
    setIsEditMode(true);
    const { academicPosition, firstName, lastName } = splitName(user.name);
    setFormData({
      id: user.id, email: user.email, role: user.role,
      workStatus: user.workStatus === "ลาศึกษาต่อ" ? "STUDY_LEAVE" : user.workStatus === "ฝึกอบรมในประเทศ" ? "TRAINING" : "ACTIVE",
      academicPosition: user.academicPosition || academicPosition,
      firstName: user.firstName || firstName,
      lastName: user.lastName || lastName,
      curriculumId: user.curriculumId || "",
      department: user.department || ""
    });
    setIsModalOpen(true);
  };

  // ✅ เมื่อเปลี่ยน curriculum:
  //    - ถ้าเป็นสายสนับสนุน → role = ADMIN, department = "สำนักงานคณะ" (fix)
  //    - ถ้าเป็นสายวิชาการ  → role = LECTURER (ถ้าเดิมเป็น ADMIN), department = ""
  const handleCurriculumChange = (val: string) => {
    const found = curriculums.find(c => String(c.id) === val);
    const isOffice = found ? OFFICE_KEYWORDS.some(kw => found.name.includes(kw)) : false;
    setFormData((prev: any) => ({
      ...prev,
      curriculumId: val,
      role: isOffice ? "ADMIN" : (prev.role === "ADMIN" ? "LECTURER" : prev.role),
      department: isOffice ? OFFICE_DEPARTMENT_FIXED : (prev.department === OFFICE_DEPARTMENT_FIXED ? "" : prev.department),
    }));
  };

  const filteredStaff = staff.filter((user) => {
    const matchesSearch = (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const isSupportStaff = user.role === "ADMIN";
    if (activeTab === "ACADEMIC" && isSupportStaff) return false;
    if (activeTab === "SUPPORT" && !isSupportStaff) return false;
    if (activeTab === "ACADEMIC" && filterCurriculumId && String(user.curriculumId) !== filterCurriculumId) return false;
    return matchesSearch;
  });

  // ✅ กรองหลักสูตรสายสนับสนุนออกจาก filter dropdown ของแท็บสายวิชาการ
  const curriculumFilterOptions = [
    { label: "ทุกหลักสูตร", value: "" },
    ...curriculums
      .filter(c => !OFFICE_KEYWORDS.some(kw => c.name.includes(kw)))
      .map(c => ({ label: c.name, value: String(c.id) }))
  ];

  const currentIsOffice = isOfficeCurriculum(formData.curriculumId);

  return (
    <>
      <style>{`
        .swal-above-modal { z-index: 99999 !important; }
        .swal2-container { z-index: 99990 !important; }
      `}</style>

      <div className="min-h-screen bg-slate-50/50 p-6 font-sarabun">
        <Toaster position="top-center" richColors />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-slate-400 mb-1 text-sm font-medium">
            <span>จัดการข้อมูล</span><ChevronRight size={14}/><span className="text-purple-600">ข้อมูลบุคลากร</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">จัดการข้อมูลบุคลากร</h1>
          <p className="text-slate-500 mt-2 font-light">จัดการรายชื่อ อาจารย์ เจ้าหน้าที่ และกำหนดสิทธิ์การใช้งานระบบ</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {[
              { key: "ACADEMIC", label: "สายวิชาการ (อาจารย์)", Icon: GraduationCap },
              { key: "SUPPORT", label: "สายสนับสนุน (สำนักงาน/Admin)", Icon: Users },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key as any); setFilterCurriculumId(""); }}
                className={`flex-1 py-4 text-sm font-semibold flex justify-center items-center gap-2 transition-all relative ${activeTab === key ? "text-purple-700 bg-purple-50/30" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <Icon size={18} className={activeTab === key ? "text-purple-600" : "text-slate-400"}/>
                {label}
                {activeTab === key && <span className="absolute bottom-0 w-full h-0.5 bg-purple-600"></span>}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="p-5 border-b border-slate-100 bg-white">
            <div className="flex flex-col xl:flex-row justify-between gap-4 items-center">
              <div className="flex flex-col md:flex-row w-full xl:w-auto gap-3 items-center">
                <div className="relative w-full md:w-72">
                  <input type="text" placeholder="ค้นหาชื่อ หรือ อีเมล..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-slate-50/30 focus:bg-white" />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                {/* ✅ แสดง filter dropdown เฉพาะแท็บ สายวิชาการ และกรองสายสนับสนุนออกแล้ว */}
                {activeTab === "ACADEMIC" && (
                  <div className="w-full md:w-72">
                    <FilterDropdown
                      options={curriculumFilterOptions}
                      value={filterCurriculumId}
                      onChange={setFilterCurriculumId}
                      placeholder="ทุกหลักสูตร"
                      icon={Filter}
                    />
                  </div>
                )}
              </div>
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
                  <th className="py-4 px-4 w-[25%]">หลักสูตร / กลุ่มวิชา</th>
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
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-slate-800">{user.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Mail size={10}/> {user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-700 font-medium truncate max-w-[250px]">{user.curriculum || <span className="text-slate-300 italic">ไม่ระบุหลักสูตร</span>}</span>
                          {user.department && user.department !== "-" && <span className="text-xs text-slate-500">{user.department}</span>}
                          {user.managedPrograms && <span className="text-[11px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded w-fit border border-purple-100 font-medium">ประธานหลักสูตร</span>}
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
                          <button onClick={() => handleDelete(user.id, user.name)} className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-white hover:text-red-500 hover:border-red-200 transition-all shadow-sm"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="py-16 text-center text-slate-400"><div className="flex flex-col items-center gap-2"><Search size={32} className="opacity-20"/>ไม่พบข้อมูลที่ค้นหา</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================== MODAL FORM ==================== */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={isEditMode ? "แก้ไขข้อมูลบุคลากร" : "เพิ่มบุคลากรใหม่"}
          icon={isEditMode ? Pencil : Plus}
          colorClass={isEditMode ? "text-purple-700" : "text-green-700"}
        >
          <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] custom-scrollbar pb-4">

            {/* ===== ข้อมูลการทำงาน ===== */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Briefcase size={13}/> ข้อมูลการทำงาน
              </h4>

              {/* หลักสูตร/สังกัด */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">หลักสูตร / สังกัด <span className="text-red-500">*</span></label>
                <CustomDropdown
                  options={curriculums.map(c => ({ label: c.name, value: String(c.id) }))}
                  value={String(formData.curriculumId || "")}
                  onChange={handleCurriculumChange}
                  placeholder="-- เลือกหลักสูตร / สังกัด --"
                />
                {currentIsOffice && (
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 mt-1 flex items-center gap-1.5">
                    <BadgeCheck size={13}/> สังกัดสำนักงานคณะ — สิทธิ์และสังกัดย่อยถูกกำหนดอัตโนมัติ
                  </p>
                )}
              </div>

              {/* กลุ่มวิชา / สังกัดย่อย */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  กลุ่มวิชา / สังกัดย่อย{" "}
                  {currentIsOffice
                    ? <span className="text-amber-500 font-normal text-xs">(ถูกกำหนดอัตโนมัติ)</span>
                    : <span className="text-slate-400 font-normal">(ถ้ามี)</span>
                  }
                </label>
                <input
                  type="text"
                  value={formData.department || ""}
                  onChange={(e) => setFormData({...formData, department: e.target.value})}
                  placeholder="เช่น เภสัชกรรมคลินิก, สำนักงานคณะ"
                  // ✅ ถ้าเป็นสายสนับสนุน → disable และแสดงค่า fix
                  disabled={currentIsOffice}
                  className={`w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all
                    ${currentIsOffice ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* ===== ข้อมูลส่วนตัว ===== */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Users size={13}/> ข้อมูลส่วนตัว
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">คำนำหน้า (ตำแหน่งวิชาการ)</label>
                  <input type="text" value={formData.academicPosition || ""} onChange={(e) => setFormData({...formData, academicPosition: e.target.value})} placeholder="เช่น ผศ.ดร., อ." className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">E-Mail <span className="text-red-500">*</span></label>
                  <input type="email" disabled={isEditMode} value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all ${isEditMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">ชื่อจริง <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.firstName || ""} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">นามสกุล <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.lastName || ""} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" />
                </div>
              </div>
            </div>

            {/* ===== สถานะและบทบาท ===== */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <BadgeCheck size={13}/> สถานะและบทบาท
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">สถานะปฏิบัติงาน</label>
                  <CustomDropdown
                    options={WORK_STATUS_OPTIONS}
                    value={formData.workStatus || "ACTIVE"}
                    onChange={(val) => setFormData({...formData, workStatus: val})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                    <span>สิทธิ์การใช้งาน</span>
                    {currentIsOffice && <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-normal">ถูกล็อกเป็น Admin</span>}
                  </label>
                  <CustomDropdown
                    options={currentIsOffice ? ROLE_OPTIONS_ADMIN : ROLE_OPTIONS_ACADEMIC}
                    value={currentIsOffice ? "ADMIN" : (formData.role === "ADMIN" ? "LECTURER" : formData.role || "LECTURER")}
                    onChange={(val) => setFormData({...formData, role: val})}
                    disabled={currentIsOffice}
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="p-5 border-t flex justify-end gap-3 sticky bottom-0 bg-white z-20">
            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 text-slate-600 font-medium transition-all">ยกเลิก</button>
            <button onClick={handleSave} className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium shadow-md transition-all active:scale-95">บันทึกข้อมูล</button>
          </div>
        </Modal>
      </div>
    </>
  );
}