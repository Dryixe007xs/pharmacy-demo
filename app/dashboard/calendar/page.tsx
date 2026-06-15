"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Layers,
  Clock,
  PlusCircle,
  BookOpen,
  Search,
  Loader2,
  Pencil,
  X,
  Check,
  User as UserIcon,
  ShieldCheck,
  Trash2,
  Save,
  Filter,
  ChevronDown,
  Users,
  Zap,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";

import {
  getAcademicYearData,
  createAcademicYear,
  updateTimeline,
  toggleCourseOffering,
  setActiveYear,
  deleteAcademicYear,
  updateCourseResponsible,
} from "@/app/action/academic-year";

const BUDDHIST_YEAR_OFFSET = 543;
const getCurrentBuddhistYear = () =>
  new Date().getFullYear() + BUDDHIST_YEAR_OFFSET;

// ==========================================
// TYPES
// ==========================================
type ProcessStep = {
  id: number;
  label: string;
  role: string;
  startDate: string;
  endDate: string;
};

type UserOption = {
  id: string;
  title: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

type Course = {
  id: string;
  code: string;
  name: string;
  isOpen: boolean;
  responsibleUserId: string | null;
  responsibleName: string;
  programName: string;
};

type TermData = {
  configId?: string;
  semester: 1 | 2 | 3;
  label: string;
  timeline: ProcessStep[];
  courses: Course[];
};

type AcademicYearData = {
  year: number;
  isActiveYear: boolean;
  terms: { 1: TermData; 2: TermData; 3: TermData };
};

type ApiResponse = { success: boolean; message?: string; data?: any };

// ==========================================
// HELPERS
// ==========================================
const formatDate = (date: Date | null | undefined): string => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const getTermNumber = (tab: string): 1 | 2 | 3 => {
  const num = parseInt(tab);
  if (num === 1 || num === 2 || num === 3) return num;
  return 1;
};

const getTermLabel = (term: number): string => {
  return term === 3 ? "ภาคฤดูร้อน" : `เทอม ${term}`;
};

const getUserDisplayName = (user: UserOption): string => {
  return `${user.title || ""} ${user.firstName || ""} ${user.lastName || ""}`.trim();
};

// ==========================================
// SEARCHABLE USER SELECT COMPONENT
// ==========================================
function SearchableUserSelect({
  users,
  value,
  onChange,
  placeholder = "— ไม่ระบุ —",
  compact = false,
}: {
  users: UserOption[];
  value: string | null;
  onChange: (val: string | null) => void;
  placeholder?: string;
  compact?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const t = search.toLowerCase();
    return users.filter(
      (u) =>
        getUserDisplayName(u).toLowerCase().includes(t) ||
        (u.email?.toLowerCase().includes(t) ?? false),
    );
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left border rounded flex items-center justify-between gap-1 transition-all
          ${compact ? "text-xs px-2 py-1.5" : "text-sm px-3 py-2"}
          ${
            open
              ? "border-purple-400 ring-2 ring-purple-100 bg-white"
              : "border-slate-200 hover:border-slate-300 bg-white"
          }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <UserIcon
            className={`shrink-0 text-slate-400 ${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`}
          />
          <span
            className={`truncate ${selectedUser ? "text-slate-800" : "text-slate-400"}`}
          >
            {selectedUser ? getUserDisplayName(selectedUser) : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`shrink-0 text-slate-400 transition-transform duration-200
            ${compact ? "w-3 h-3" : "w-3.5 h-3.5"}
            ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-[9999] mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="พิมพ์ชื่อเพื่อค้นหา..."
                className="w-full pl-7 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {search && (
              <p className="text-[10px] text-slate-400 mt-1 px-1">
                พบ {filtered.length} รายการ
              </p>
            )}
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearch("");
              }}
              className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition-colors border-b border-slate-50"
            >
              — ไม่ระบุ —
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-xs text-slate-400 text-center">
                <Search className="w-4 h-4 mx-auto mb-1 opacity-40" />
                ไม่พบชื่อ "{search}"
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = u.id === value;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2
                      ${
                        isSelected
                          ? "bg-purple-50 text-purple-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center
                        ${isSelected ? "bg-purple-600" : "border border-slate-300"}`}
                    >
                      {isSelected && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{getUserDisplayName(u)}</div>
                      {u.email && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {u.email}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function AcademicYearConfigPage() {
  const [db, setDb] = useState<Record<string, AcademicYearData>>({});
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [activeTab, setActiveTab] = useState("1");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState(getCurrentBuddhistYear());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isCopyPrevious, setIsCopyPrevious] = useState(true);

  // Course open/close editing
  const [isEditingCourses, setIsEditingCourses] = useState(false);
  const [pendingCourseChanges, setPendingCourseChanges] = useState<
    Record<string, boolean>
  >({});
  const [isSavingCourses, setIsSavingCourses] = useState(false);

  // Responsible editing
  const [isEditingResponsible, setIsEditingResponsible] = useState(false);
  const [pendingResponsibleChanges, setPendingResponsibleChanges] = useState<
    Record<string, string | null>
  >({});
  const [isSavingResponsible, setIsSavingResponsible] = useState(false);

  // Bulk assign
  const [bulkAssignUser, setBulkAssignUser] = useState<string | null>(null);

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const {
          termConfigs,
          allSubjects,
          allUsers: fetchedUsers,
          academicYears,
        } = await getAcademicYearData();

        setAllUsers(fetchedUsers || []);

        const newDb: Record<string, AcademicYearData> = {};

        termConfigs.forEach((config) => {
          const yearStr = config.academicYear.toString();
          const yearMaster = academicYears?.find(
            (y: any) => y.id === config.academicYear,
          );

          if (!newDb[yearStr]) {
            newDb[yearStr] = {
              year: config.academicYear,
              isActiveYear: yearMaster?.isActive || false,
              terms: {} as any,
            };
          }

          const timeline: ProcessStep[] = [
            {
              id: 1,
              label: "บันทึกภาระงานสอนในระบบ",
              role: "ผู้รับผิดชอบรายวิชา",
              startDate: formatDate(config.step1Start),
              endDate: formatDate(config.step1End),
            },
            {
              id: 2,
              label: "ตรวจสอบและติดตามการดำเนินงาน",
              role: "อาจารย์ผู้สอน",
              startDate: formatDate(config.step2Start),
              endDate: formatDate(config.step2End),
            },
            {
              id: 3,
              label: "พิจารณาตรวจสอบข้อมูล (ระดับหลักสูตร)",
              role: "ประธานหลักสูตร",
              startDate: formatDate(config.step3Start),
              endDate: formatDate(config.step3End),
            },
            {
              id: 4,
              label: "พิจารณาตรวจสอบและรับรองข้อมูล (ระดับคณะ)",
              role: "รองคณบดีฝ่ายวิชาการ",
              startDate: formatDate(config.step4Start),
              endDate: formatDate(config.step4End),
            },
          ];

          const courses: Course[] = allSubjects
            .filter((sub) => sub.code !== "EXTERNAL-PLACEHOLDER")
            .map((sub) => {
              const offering = config.courseOfferings.find(
                (o) => o.subjectId === sub.id,
              );
              const responsible = (offering as any)?.responsibleUser;
              return {
                id: sub.id.toString(),
                code: sub.code,
                name: sub.name_th,
                isOpen: offering ? offering.isOpen : false,
                responsibleUserId: (offering as any)?.responsibleUserId ?? null,
                responsibleName: responsible
                  ? `${responsible.title || ""} ${responsible.firstName || ""} ${responsible.lastName || ""}`.trim()
                  : "-",
                programName: sub.program
                  ? `${sub.program.name_th}${sub.program.year ? ` (ปี ${sub.program.year})` : ""}`
                  : "วิชาแกน",
              };
            });

          newDb[yearStr].terms[config.semester as 1 | 2 | 3] = {
            configId: config.id,
            semester: config.semester as 1 | 2 | 3,
            label: getTermLabel(config.semester),
            timeline,
            courses,
          };
        });

        setDb(newDb);
      } catch (error) {
        console.error("Failed to fetch academic year data:", error);
        toast.error(
          error instanceof Error
            ? `เกิดข้อผิดพลาด: ${error.message}`
            : "โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (Object.keys(db).length === 0) return;
    if (selectedYear) return;
    const activeY = Object.keys(db).find((y) => db[y].isActiveYear);
    setSelectedYear(activeY || Object.keys(db).sort().reverse()[0]);
  }, [db]);

  // ==========================================
  // DERIVED STATE
  // ==========================================
  const currentYearData = db[selectedYear];
  const currentTermNumber = getTermNumber(activeTab);
  const currentTermData = currentYearData?.terms[currentTermNumber];

  const visibleTimeline = useMemo(() => {
    if (!currentTermData?.timeline) return [];
    if (currentTermNumber === 1) {
      return currentTermData.timeline.filter((step) => step.id <= 2);
    }
    return currentTermData.timeline;
  }, [currentTermData?.timeline, currentTermNumber]);

  const displayCourses = useMemo(() => {
    if (!currentTermData?.courses) return [];
    return currentTermData.courses.map((course) => ({
      ...course,
      isOpen: pendingCourseChanges.hasOwnProperty(course.id)
        ? pendingCourseChanges[course.id]
        : course.isOpen,
    }));
  }, [currentTermData?.courses, pendingCourseChanges]);

  const programOptions = useMemo(() => {
    if (!currentTermData?.courses) return [];
    const names = new Set(currentTermData.courses.map((c) => c.programName));
    return Array.from(names).sort();
  }, [currentTermData?.courses]);

  const filteredCourses = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return displayCourses.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term);
      const matchProgram =
        selectedProgram === "all" || c.programName === selectedProgram;
      return matchSearch && matchProgram;
    });
  }, [displayCourses, searchTerm, selectedProgram]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSetActiveYear = useCallback(async () => {
    const result = await Swal.fire({
      title: `เปิดใช้งานปี ${selectedYear}?`,
      html: `ระบบจะตั้งค่าให้ปี <b>${selectedYear}</b> เป็นปีการศึกษาหลัก<br>และปิดการใช้งานปีอื่นๆ ทั้งหมด`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยัน เปิดใช้งาน",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsActivating(true);
    try {
      const res: ApiResponse = await setActiveYear(parseInt(selectedYear));
      if (res.success) {
        await Swal.fire({
          title: "เปิดใช้งานสำเร็จ!",
          text: `ปีการศึกษา ${selectedYear} เป็นปีหลักของระบบแล้ว`,
          icon: "success",
          confirmButtonColor: "#9333ea",
          timer: 2000,
          timerProgressBar: true,
        });
        window.location.reload();
      } else {
        setIsActivating(false);
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: res.message || "ไม่สามารถเปิดใช้งานได้ กรุณาลองใหม่",
          icon: "error",
          confirmButtonColor: "#9333ea",
        });
      }
    } catch (e) {
      console.error("Failed to set active year:", e);
      setIsActivating(false);
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: e instanceof Error ? e.message : "เกิดข้อผิดพลาดในการเปิดใช้งาน",
        icon: "error",
        confirmButtonColor: "#9333ea",
      });
    }
  }, [selectedYear]);

  const handleDeleteYear = useCallback(async () => {
    if (!selectedYear) return;

    if (db[selectedYear]?.isActiveYear) {
      await Swal.fire({
        title: "ไม่สามารถลบได้",
        html: `ปีการศึกษา <b>${selectedYear}</b> กำลังเปิดใช้งานอยู่<br>กรุณาเปลี่ยนปี Active ก่อนทำการลบ`,
        icon: "warning",
        confirmButtonColor: "#9333ea",
        confirmButtonText: "รับทราบ",
      });
      return;
    }

    const { value: inputYear } = await Swal.fire({
      title: "ยืนยันการลบปีการศึกษา",
      html: `
        <p class="text-sm text-gray-500 mb-3">การกระทำนี้<b>ไม่สามารถย้อนกลับได้</b><br>ข้อมูลกำหนดการและการเปิดรายวิชาทั้งหมดของปี <b>${selectedYear}</b> จะถูกลบออก</p>
        <p class="text-sm font-semibold mb-2">พิมพ์ <b>${selectedYear}</b> เพื่อยืนยัน</p>
      `,
      input: "text",
      inputPlaceholder: `พิมพ์ ${selectedYear} เพื่อยืนยัน`,
      inputAttributes: { autocomplete: "off" },
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
      preConfirm: (val) => {
        if (val !== selectedYear) {
          Swal.showValidationMessage(`กรุณาพิมพ์ "${selectedYear}" ให้ถูกต้อง`);
          return false;
        }
        return true;
      },
    });

    if (!inputYear) return;

    try {
      const res: ApiResponse = await deleteAcademicYear(parseInt(selectedYear));
      if (res.success) {
        await Swal.fire({
          title: "ลบเรียบร้อย",
          text: `ปีการศึกษา ${selectedYear} ถูกลบออกจากระบบแล้ว`,
          icon: "success",
          confirmButtonColor: "#9333ea",
          timer: 2000,
          timerProgressBar: true,
        });
        window.location.reload();
      } else {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: res.message || "ไม่สามารถลบได้ กรุณาลองใหม่อีกครั้ง",
          icon: "error",
          confirmButtonColor: "#9333ea",
        });
      }
    } catch (error) {
      console.error("Failed to delete academic year:", error);
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: error instanceof Error ? error.message : "ไม่สามารถลบได้",
        icon: "error",
        confirmButtonColor: "#9333ea",
      });
    }
  }, [selectedYear, db]);

  const handleTimelineChange = useCallback(
    (stepId: number, field: "startDate" | "endDate", value: string) => {
      setDb((prev) => {
        const newDb = { ...prev };
        const yearData = newDb[selectedYear];
        if (!yearData) return prev;
        const termData = yearData.terms[currentTermNumber];
        if (!termData) return prev;
        const newTimeline = [...termData.timeline];
        const stepIndex = newTimeline.findIndex((t) => t.id === stepId);
        if (stepIndex !== -1) {
          newTimeline[stepIndex] = {
            ...newTimeline[stepIndex],
            [field]: value,
          };
        }
        newDb[selectedYear] = {
          ...yearData,
          terms: {
            ...yearData.terms,
            [currentTermNumber]: { ...termData, timeline: newTimeline },
          },
        };
        return newDb;
      });
    },
    [selectedYear, currentTermNumber],
  );

  const handleSaveTimeline = useCallback(async () => {
    if (!currentTermData?.configId) return;
    const timeline = currentTermData.timeline;
    const getStep = (id: number) => timeline.find((s) => s.id === id);
    const data = {
      step1Start: getStep(1)?.startDate
        ? new Date(getStep(1)!.startDate)
        : undefined,
      step1End: getStep(1)?.endDate ? new Date(getStep(1)!.endDate) : undefined,
      step2Start: getStep(2)?.startDate
        ? new Date(getStep(2)!.startDate)
        : undefined,
      step2End: getStep(2)?.endDate ? new Date(getStep(2)!.endDate) : undefined,
      step3Start:
        currentTermNumber !== 1 && getStep(3)?.startDate
          ? new Date(getStep(3)!.startDate)
          : undefined,
      step3End:
        currentTermNumber !== 1 && getStep(3)?.endDate
          ? new Date(getStep(3)!.endDate)
          : undefined,
      step4Start:
        currentTermNumber !== 1 && getStep(4)?.startDate
          ? new Date(getStep(4)!.startDate)
          : undefined,
      step4End:
        currentTermNumber !== 1 && getStep(4)?.endDate
          ? new Date(getStep(4)!.endDate)
          : undefined,
    };
    try {
      const res: ApiResponse = await updateTimeline(
        currentTermData.configId,
        data,
      );
      if (res.success) {
        setIsEditingTimeline(false);
        toast.success("บันทึกกำหนดการเรียบร้อย");
      } else {
        toast.error(res.message || "ไม่สามารถบันทึกได้");
      }
    } catch (error) {
      console.error("Failed to update timeline:", error);
      toast.error(
        error instanceof Error
          ? `เกิดข้อผิดพลาด: ${error.message}`
          : "เกิดข้อผิดพลาดในการบันทึก",
      );
    }
  }, [currentTermData, currentTermNumber]);

  const handleToggleCourseLocal = useCallback(
    (courseId: string, currentStatus: boolean) => {
      setPendingCourseChanges((prev) => ({
        ...prev,
        [courseId]: !currentStatus,
      }));
    },
    [],
  );

  const handleSaveCourseChanges = useCallback(async () => {
    if (!currentTermData?.configId) return;
    const changesCount = Object.keys(pendingCourseChanges).length;
    if (changesCount === 0) {
      toast.info("ไม่มีการเปลี่ยนแปลง");
      setIsEditingCourses(false);
      return;
    }
    const result = await Swal.fire({
      title: "ยืนยันการบันทึก?",
      html: `คุณต้องการบันทึกการเปลี่ยนแปลง <b>${changesCount}</b> รายวิชาใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#9333ea",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setIsSavingCourses(true);
    try {
      const results = await Promise.all(
        Object.entries(pendingCourseChanges).map(([courseId, newStatus]) =>
          toggleCourseOffering(
            currentTermData.configId!,
            parseInt(courseId),
            newStatus,
          )
            .then((res) => ({ courseId, success: res.success }))
            .catch(() => ({ courseId, success: false })),
        ),
      );
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;
      if (errorCount === 0) {
        await Swal.fire({
          title: "สำเร็จ!",
          text: `บันทึกการเปลี่ยนแปลง ${successCount} รายวิชาเรียบร้อย`,
          icon: "success",
          confirmButtonColor: "#9333ea",
          timer: 2000,
        });
        setDb((prev) => {
          const newDb = { ...prev };
          const yearData = newDb[selectedYear];
          if (!yearData) return prev;
          const termData = yearData.terms[currentTermNumber];
          if (!termData) return prev;
          const newCourses = termData.courses.map((c) =>
            pendingCourseChanges.hasOwnProperty(c.id)
              ? { ...c, isOpen: pendingCourseChanges[c.id] }
              : c,
          );
          newDb[selectedYear] = {
            ...yearData,
            terms: {
              ...yearData.terms,
              [currentTermNumber]: { ...termData, courses: newCourses },
            },
          };
          return newDb;
        });
        setPendingCourseChanges({});
        setIsEditingCourses(false);
      } else {
        await Swal.fire({
          title: "บันทึกบางส่วน",
          html: `สำเร็จ: ${successCount} รายวิชา<br>ล้มเหลว: ${errorCount} รายวิชา`,
          icon: "warning",
          confirmButtonColor: "#9333ea",
        });
      }
    } catch (error) {
      console.error("Failed to save course changes:", error);
      await Swal.fire({
        title: "เกิดข้อผิดพลาด!",
        text: error instanceof Error ? error.message : "ไม่สามารถบันทึกได้",
        icon: "error",
        confirmButtonColor: "#9333ea",
      });
    } finally {
      setIsSavingCourses(false);
    }
  }, [currentTermData, pendingCourseChanges, selectedYear, currentTermNumber]);

  const handleCancelCourseEdit = useCallback(() => {
    if (Object.keys(pendingCourseChanges).length > 0) {
      Swal.fire({
        title: "ยกเลิกการแก้ไข?",
        text: "การเปลี่ยนแปลงที่ยังไม่บันทึกจะหายไป",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ยกเลิก",
        cancelButtonText: "กลับไปแก้ไข",
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          setPendingCourseChanges({});
          setIsEditingCourses(false);
        }
      });
    } else {
      setIsEditingCourses(false);
    }
  }, [pendingCourseChanges]);

  // Handler บันทึก responsible
  const handleSaveResponsibleChanges = useCallback(async () => {
    if (!currentTermData?.configId) return;
    const changesCount = Object.keys(pendingResponsibleChanges).length;
    if (changesCount === 0) {
      setIsEditingResponsible(false);
      return;
    }

    setIsSavingResponsible(true);
    try {
      const results = await Promise.all(
        Object.entries(pendingResponsibleChanges).map(([subjectId, userId]) =>
          updateCourseResponsible(
            currentTermData.configId!,
            parseInt(subjectId),
            userId,
          )
            .then((res) => ({ subjectId, success: res.success }))
            .catch(() => ({ subjectId, success: false })),
        ),
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount === 0) {
        toast.success(`บันทึกผู้รับผิดชอบ ${successCount} รายวิชาเรียบร้อย`);
        setDb((prev) => {
          const newDb = { ...prev };
          const yearData = newDb[selectedYear];
          if (!yearData) return prev;
          const termData = yearData.terms[currentTermNumber];
          if (!termData) return prev;
          const newCourses = termData.courses.map((c) => {
            if (!pendingResponsibleChanges.hasOwnProperty(c.id)) return c;
            const userId = pendingResponsibleChanges[c.id];
            const user = allUsers.find((u) => u.id === userId);
            return {
              ...c,
              responsibleUserId: userId,
              responsibleName: user ? getUserDisplayName(user) : "-",
            };
          });
          newDb[selectedYear] = {
            ...yearData,
            terms: {
              ...yearData.terms,
              [currentTermNumber]: { ...termData, courses: newCourses },
            },
          };
          return newDb;
        });
        setPendingResponsibleChanges({});
        setIsEditingResponsible(false);
        setBulkAssignUser(null);
      } else {
        toast.error(`บันทึกไม่สำเร็จ ${errorCount} รายวิชา`);
      }
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSavingResponsible(false);
    }
  }, [
    currentTermData,
    pendingResponsibleChanges,
    selectedYear,
    currentTermNumber,
    allUsers,
  ]);

  // Bulk assign handler
  const handleBulkAssign = useCallback(() => {
    if (!bulkAssignUser || filteredCourses.length === 0) return;
    const updates: Record<string, string | null> = {};
    filteredCourses.forEach((c) => {
      updates[c.id] = bulkAssignUser;
    });
    setPendingResponsibleChanges((prev) => ({ ...prev, ...updates }));
    const user = allUsers.find((u) => u.id === bulkAssignUser);
    const userName = user ? getUserDisplayName(user) : "";
    toast.success(
      `Assign "${userName}" ให้ ${filteredCourses.length} วิชาแล้ว รอการบันทึก`,
    );
    setBulkAssignUser(null);
  }, [bulkAssignUser, filteredCourses, allUsers]);

  const handleCreateYear = useCallback(async () => {
    if (db[String(newYearInput)]) {
      setIsCreateModalOpen(false);
      await new Promise((r) => setTimeout(r, 200));
      await Swal.fire({
        title: "ปีการศึกษานี้มีอยู่แล้ว",
        text: `ปี ${newYearInput} ถูกสร้างไว้ในระบบแล้ว`,
        icon: "warning",
        confirmButtonColor: "#9333ea",
        confirmButtonText: "รับทราบ",
      });
      setIsCreateModalOpen(true);
      return;
    }

    setIsCreateModalOpen(false);
    await new Promise((r) => setTimeout(r, 200));

    const result = await Swal.fire({
      title: `สร้างปีการศึกษา ${newYearInput}?`,
      html: isCopyPrevious
        ? `จะสร้างปี <b>${newYearInput}</b> และคัดลอกรายวิชาที่เปิดสอนจากปี <b>${newYearInput - 1}</b>`
        : `จะสร้างปี <b>${newYearInput}</b> โดยไม่คัดลอกรายวิชาจากปีก่อน`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#9333ea",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ยืนยัน สร้างปีการศึกษา",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      setIsCreateModalOpen(true);
      return;
    }

    try {
      const res: ApiResponse = await createAcademicYear(
        newYearInput,
        isCopyPrevious,
      );
      if (res.success) {
        await Swal.fire({
          title: "สร้างสำเร็จ!",
          text: `ปีการศึกษา ${newYearInput} ถูกสร้างเรียบร้อยแล้ว`,
          icon: "success",
          confirmButtonColor: "#9333ea",
          timer: 2000,
          timerProgressBar: true,
        });
        window.location.reload();
      } else {
        await Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: res.message || "ไม่สามารถสร้างได้ กรุณาลองใหม่",
          icon: "error",
          confirmButtonColor: "#9333ea",
        });
        setIsCreateModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to create academic year:", error);
      await Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการสร้างปีการศึกษา",
        icon: "error",
        confirmButtonColor: "#9333ea",
      });
      setIsCreateModalOpen(true);
    }
  }, [newYearInput, isCopyPrevious, db]);

  // ==========================================
  // DERIVED VALUES
  // ==========================================
  const activeYearID = Object.keys(db).find((y) => db[y].isActiveYear);
  const hasData = Object.keys(db).length > 0;
  const openCoursesCount = displayCourses.filter((c) => c.isOpen).length;
  const totalCoursesCount = displayCourses.length;
  const pendingChangesCount = Object.keys(pendingCourseChanges).length;
  const pendingResponsibleCount = Object.keys(pendingResponsibleChanges).length;

  // ==========================================
  // RENDER
  // ==========================================
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="animate-spin" />
        <span>กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sarabun space-y-6">
      <Toaster position="top-center" richColors />

      {/* SYSTEM STATUS */}
      <Alert className="bg-slate-900 border-none text-white shadow-md flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-purple-600 rounded-lg animate-pulse">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <AlertTitle className="text-xs font-medium text-slate-400 tracking-widest uppercase">
              ปีการศึกษาปัจจุบัน (Active)
            </AlertTitle>
            <AlertDescription className="text-xl font-bold">
              พ.ศ. {activeYearID || "ยังไม่ได้ระบุ"}
            </AlertDescription>
          </div>
        </div>

        {currentYearData && !currentYearData.isActiveYear && (
          <Button
            onClick={handleSetActiveYear}
            disabled={isActivating}
            className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg min-w-[160px]"
            aria-label={`เปิดใช้งานปีการศึกษา ${selectedYear}`}
          >
            {isActivating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังเริ่ม...
              </>
            ) : (
              `เปิดใช้งานปี ${selectedYear}`
            )}
          </Button>
        )}
      </Alert>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="text-purple-600" /> จัดการปีการศึกษา
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ตั้งค่ากำหนดการและรายวิชา
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedYear}
            onValueChange={(val) => {
              setSelectedYear(val);
              setSelectedProgram("all");
            }}
            disabled={!hasData}
          >
            <SelectTrigger className="w-auto min-w-[200px] px-4 font-bold text-lg">
              <SelectValue placeholder="เลือกปีการศึกษา..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(db)
                .sort()
                .reverse()
                .map((y) => (
                  <SelectItem key={y} value={y}>
                    พ.ศ. {y} {db[y].isActiveYear ? "(Active)" : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="เพิ่มปีการศึกษาใหม่"
              >
                <PlusCircle size={20} className="text-purple-600" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] z-[9999]">
              <DialogHeader>
                <DialogTitle>เพิ่มปีการศึกษา</DialogTitle>
                <DialogDescription>
                  สร้างปีการศึกษาใหม่สำหรับระบบ
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">
                    ปีพุทธศักราช (พ.ศ.)
                  </label>
                  <Input
                    type="number"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(+e.target.value)}
                    min={2500}
                    max={2600}
                  />
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-md bg-slate-50">
                  <Checkbox
                    id="copy-data"
                    checked={isCopyPrevious}
                    onCheckedChange={(c) => setIsCopyPrevious(c as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="copy-data"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      คัดลอกรายวิชาที่เปิดสอนจากปี {newYearInput - 1}
                    </Label>
                    <p className="text-[11px] text-slate-500">
                      ระบบจะเปิดรายวิชาตามปีที่แล้วให้อัตโนมัติ
                      (ไม่ต้องติ๊กใหม่)
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button onClick={handleCreateYear} className="bg-purple-600">
                  สร้าง
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {hasData && (
            <Button
              variant="outline"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              aria-label="ลบปีการศึกษา"
              onClick={handleDeleteYear}
            >
              <Trash2 size={20} />
            </Button>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-20 bg-white rounded-xl border-dashed border">
          <p className="text-slate-500">ไม่พบข้อมูลปีการศึกษา</p>
          <p className="text-sm text-slate-400 mt-2">
            กรุณาเพิ่มปีการศึกษาใหม่
          </p>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val);
            setSelectedProgram("all");
            setPendingResponsibleChanges({});
            setIsEditingResponsible(false);
            setBulkAssignUser(null);
          }}
          className="space-y-6"
        >
          <TabsList className="bg-white p-1.5 rounded-xl border shadow-sm">
            {[1, 2, 3].map((t) => (
              <TabsTrigger
                key={t}
                value={t.toString()}
                className="px-6 py-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700"
              >
                {getTermLabel(t)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent
            value={activeTab}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* TIMELINE */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader className="pb-4 border-b flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base flex gap-2">
                      <Clock className="text-blue-500" /> ไทม์ไลน์
                    </CardTitle>
                    {currentTermNumber === 1 && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        เทอม 1 ใช้เฉพาะขั้นตอนที่ 1–2
                      </p>
                    )}
                  </div>
                  {!isEditingTimeline ? (
                    <Button
                      onClick={() => setIsEditingTimeline(true)}
                      variant="ghost"
                      size="sm"
                      aria-label="แก้ไขไทม์ไลน์"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditingTimeline(false)}
                        variant="ghost"
                        size="sm"
                        aria-label="ยกเลิก"
                      >
                        <X />
                      </Button>
                      <Button
                        onClick={handleSaveTimeline}
                        size="sm"
                        className="bg-purple-600"
                        aria-label="บันทึก"
                      >
                        <Check />
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-4 space-y-5">
                  {visibleTimeline.map((step) => (
                    <div
                      key={step.id}
                      className="relative pl-4 border-l-2 border-slate-100 last:border-0 pb-1"
                    >
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-400"></div>
                      <div className="mb-1">
                        <span className="text-sm font-bold">{step.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[10px] text-slate-400">
                            เริ่ม
                          </label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={step.startDate || ""}
                            onChange={(e) =>
                              handleTimelineChange(
                                step.id,
                                "startDate",
                                e.target.value,
                              )
                            }
                            disabled={!isEditingTimeline}
                            aria-label={`วันที่เริ่ม ${step.label}`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">
                            สิ้นสุด
                          </label>
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={step.endDate || ""}
                            onChange={(e) =>
                              handleTimelineChange(
                                step.id,
                                "endDate",
                                e.target.value,
                              )
                            }
                            disabled={!isEditingTimeline}
                            aria-label={`วันที่สิ้นสุด ${step.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* COURSES */}
            <div className="lg:col-span-8">
              <Card className="shadow-sm border-t-4 border-t-purple-500 h-[650px] flex flex-col">
                <CardHeader className="bg-slate-50/50 pb-3 border-b">
                  {/* Row 1: Title + action buttons */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-600" /> รายวิชา
                      </CardTitle>
                      <CardDescription>
                        รายวิชาสำหรับ {getTermLabel(currentTermNumber)}
                        {pendingChangesCount > 0 && (
                          <span className="ml-2 text-orange-600 font-semibold">
                            • {pendingChangesCount} รายการรอบันทึก
                          </span>
                        )}
                        {pendingResponsibleCount > 0 && (
                          <span className="ml-2 text-blue-600 font-semibold">
                            • ผู้รับผิดชอบ {pendingResponsibleCount}{" "}
                            รายการรอบันทึก
                          </span>
                        )}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <div className="relative w-48">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                          type="text"
                          placeholder="ค้นหารหัส / ชื่อวิชา..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                          aria-label="ค้นหารายวิชา"
                        />
                      </div>

                      <Select
                        value={selectedProgram}
                        onValueChange={setSelectedProgram}
                      >
                        <SelectTrigger className="w-56 text-xs h-8 gap-1">
                          <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                          <SelectValue placeholder="ทุกหลักสูตร" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">ทุกหลักสูตร</SelectItem>
                          {programOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* ปุ่มแก้ไขเปิด/ปิดวิชา */}
                      {!isEditingCourses ? (
                        <Button
                          onClick={() => setIsEditingCourses(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5" /> เปิด/ปิดรายวิชา
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCancelCourseEdit}
                            variant="outline"
                            size="sm"
                            disabled={isSavingCourses}
                          >
                            <X className="w-4 h-4 mr-1" /> ยกเลิก
                          </Button>
                          <Button
                            onClick={handleSaveCourseChanges}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 gap-2"
                            disabled={
                              isSavingCourses || pendingChangesCount === 0
                            }
                          >
                            {isSavingCourses ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                กำลังบันทึก...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4" /> บันทึก (
                                {pendingChangesCount})
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Bulk Assign Panel — แสดงเฉพาะตอน isEditingResponsible */}
                  {/* {isEditingResponsible && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1 bg-blue-600 rounded">
                          <Zap className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-blue-700">
                          Bulk Assign
                        </span>
                        <span className="text-[10px] text-blue-500">
                          — assign อาจารย์คนเดียวให้ทุกวิชาที่กรองอยู่ (
                          {filteredCourses.length} วิชา)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <SearchableUserSelect
                            users={allUsers}
                            value={bulkAssignUser}
                            onChange={setBulkAssignUser}
                            placeholder="เลือกอาจารย์สำหรับ Bulk Assign..."
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={
                            !bulkAssignUser || filteredCourses.length === 0
                          }
                          onClick={handleBulkAssign}
                          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 h-9"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Apply {filteredCourses.length} วิชา
                        </Button>
                      </div>
                      <p className="text-[10px] text-blue-400 mt-1.5">
                        💡 ใช้ filter หลักสูตรด้านบนเพื่อเลือกเฉพาะกลุ่มวิชา
                        แล้วค่อย Apply
                      </p>
                    </div>
                  )} */}
                </CardHeader>

                <CardContent className="p-0 flex-1 overflow-hidden relative">
                  <div className="absolute inset-0 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white text-slate-500 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="px-4 py-3 w-[70px] text-center bg-slate-50">
                            สถานะ
                          </th>
                          <th className="px-4 py-3 bg-slate-50 w-[13%]">
                            รหัส
                          </th>
                          <th className="px-4 py-3 bg-slate-50 w-[35%]">
                            ชื่อวิชา / หลักสูตร
                          </th>
                          {/* column ผู้รับผิดชอบ พร้อมปุ่มแก้ไข */}
                          <th className="px-4 py-3 bg-slate-50">
                            <div className="flex items-center justify-between gap-2">
                              <span>ผู้รับผิดชอบ</span>
                              {!isEditingResponsible ? (
                                <button
                                  onClick={() => setIsEditingResponsible(true)}
                                  className="flex items-center gap-1 text-[15px] text-purple-600 border border-purple-200 hover:bg-purple-50 px-2 py-0.5 rounded transition-colors"
                                >
                                  <Pencil className="w-2.5 h-2.5" /> แก้ไขผู้รับผิดชอบรายวิชา
                                </button>
                              ) : (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setPendingResponsibleChanges({});
                                      setIsEditingResponsible(false);
                                      setBulkAssignUser(null);
                                    }}
                                    disabled={isSavingResponsible}
                                    className="p-1 text-slate-400 hover:text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={handleSaveResponsibleChanges}
                                    disabled={
                                      isSavingResponsible ||
                                      pendingResponsibleCount === 0
                                    }
                                    className="flex items-center gap-1 text-[15px] text-white bg-purple-600 hover:bg-purple-700 px-2 py-0.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isSavingResponsible ? (
                                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    ) : (
                                      <Save className="w-2.5 h-2.5" />
                                    )}
                                    บันทึก
                                    {pendingResponsibleCount > 0
                                      ? ` (${pendingResponsibleCount})`
                                      : ""}
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCourses.map((course) => {
                          const hasPendingChange =
                            pendingCourseChanges.hasOwnProperty(course.id);
                          const hasPendingResponsible =
                            pendingResponsibleChanges.hasOwnProperty(course.id);

                          const currentResponsibleId = hasPendingResponsible
                            ? pendingResponsibleChanges[course.id]
                            : course.responsibleUserId;

                          return (
                            <tr
                              key={course.id}
                              className={`hover:bg-slate-50 transition-colors
                                ${hasPendingChange ? "bg-orange-50/50" : ""}
                                ${hasPendingResponsible ? "bg-blue-50/30" : ""}
                              `}
                            >
                              <td className="px-4 py-3 text-center">
                                <Switch
                                  checked={course.isOpen}
                                  onCheckedChange={() =>
                                    handleToggleCourseLocal(
                                      course.id,
                                      course.isOpen,
                                    )
                                  }
                                  disabled={
                                    !isEditingCourses || isSavingCourses
                                  }
                                  className={`data-[state=checked]:bg-purple-600 scale-90 ${hasPendingChange ? "ring-2 ring-orange-400" : ""}`}
                                  aria-label={`${course.isOpen ? "ปิด" : "เปิด"}การสอน ${course.name}`}
                                />
                                {hasPendingChange && (
                                  <div className="text-[9px] text-orange-600 font-semibold mt-1">
                                    รอบันทึก
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700 align-top pt-4">
                                {course.code}
                              </td>
                              <td className="px-4 py-3 align-top pt-3">
                                <div className="text-slate-800 font-medium">
                                  {course.name}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="mt-1 text-[10px] text-slate-500 bg-slate-50 border-slate-200 font-normal"
                                >
                                  {course.programName}
                                </Badge>
                              </td>

                              {/* cell ผู้รับผิดชอบ */}
                              <td className="px-4 py-2.5 text-slate-500 text-xs align-middle">
                                {isEditingResponsible ? (
                                  <div
                                    className={`rounded-lg transition-all ${hasPendingResponsible ? "ring-2 ring-blue-300" : ""}`}
                                  >
                                    <SearchableUserSelect
                                      users={allUsers}
                                      value={currentResponsibleId ?? null}
                                      onChange={(val) =>
                                        setPendingResponsibleChanges(
                                          (prev) => ({
                                            ...prev,
                                            [course.id]: val,
                                          }),
                                        )
                                      }
                                      compact
                                    />
                                    {hasPendingResponsible && (
                                      <div className="text-[9px] text-blue-600 font-semibold mt-0.5 px-1">
                                        รอบันทึก
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>
                                      {hasPendingResponsible
                                        ? (() => {
                                            const uid =
                                              pendingResponsibleChanges[
                                                course.id
                                              ];
                                            const u = allUsers.find(
                                              (x) => x.id === uid,
                                            );
                                            return u
                                              ? getUserDisplayName(u)
                                              : "-";
                                          })()
                                        : course.responsibleName}
                                    </span>
                                    {hasPendingResponsible && (
                                      <span className="text-[9px] text-blue-600 font-semibold">
                                        รอบันทึก
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredCourses.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center py-12 text-slate-400"
                            >
                              {searchTerm || selectedProgram !== "all"
                                ? "ไม่พบรายวิชาที่ตรงกับเงื่อนไข"
                                : "ไม่พบรายวิชาในเทอมนี้"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>

                <CardFooter className="bg-slate-50 py-2 border-t text-[10px] text-slate-500 flex justify-between">
                  <span>เปิดสอน: {openCoursesCount} วิชา</span>
                  <span>
                    แสดง: {filteredCourses.length} / ทั้งหมด:{" "}
                    {totalCoursesCount} วิชา
                  </span>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
