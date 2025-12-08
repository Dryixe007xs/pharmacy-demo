"use client";

import { Bell, User as UserIcon, BookOpen } from "lucide-react"; 
import { useEffect, useState } from "react";
// 1. IMPORT Component ที่เราสร้างไว้
import DebugUserSwitcher from "@/components/DebugUserSwitcher"; 

interface UserData {
  id: number; // เพิ่ม id เข้ามาด้วย เพราะจำเป็นสำหรับการสลับ user
  name: string;
  role: string;
  image?: string;
  adminTitle?: string | null;
  academicRank?: string | null;
  curriculum?: string | null; 
}

export function Navbar({ user: propUser }: { user?: UserData }) {
  const [user, setUser] = useState<UserData | null>(propUser || null);
  
  // State สำหรับเก็บรายชื่อที่จะให้เลือกสลับ (สำหรับ Debug)
  const [allStaffs, setAllStaffs] = useState<UserData[]>([]);

  const loadUserFromStorage = () => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user data", e);
        setUser(null);
      }
    } else {
        setUser(null);
    }
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (!propUser) {
        loadUserFromStorage();
    } else {
        setUser(propUser);
    }

    // Event Listener สำหรับอัปเดต UI เวลาเปลี่ยน User
    const handleAuthChange = () => {
        loadUserFromStorage();
    };

    window.addEventListener("auth-change", handleAuthChange);

    // 2. Fetch รายชื่อ Staff ทั้งหมดมาเตรียมไว้ให้ Debug Switcher
    // (ทำเฉพาะตอน Development หรือ Admin ก็ได้)
    const fetchStaffs = async () => {
        try {
            const res = await fetch("/api/staff"); // เรียก API เพื่อเอารายชื่อมาใส่ Dropdown
            const data = await res.json();
            setAllStaffs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Debug: Failed to load staff list");
        }
    };
    fetchStaffs();

    return () => {
        window.removeEventListener("auth-change", handleAuthChange);
    };
  }, [propUser]);

  // 3. Handler เมื่อมีการเลือก User ใหม่จาก Dropdown
  const handleDebugUserChange = (userId: number) => {
    const selectedUser = allStaffs.find(u => u.id === userId);
    if (selectedUser) {
        // บันทึก User ใหม่ลง LocalStorage
        localStorage.setItem("currentUser", JSON.stringify(selectedUser));
        
        // *** สำคัญ: ส่ง Event บอกทุก Component ว่า User เปลี่ยนแล้วนะ ***
        window.dispatchEvent(new Event("auth-change"));
        
        // (Optional) อาจจะ redirect ไปหน้า Home ด้วยเพื่อให้ข้อมูลรีเฟรชใหม่หมด
        // window.location.href = "/"; 
    }
  };

  // ... (Helper Functions เดิม: getDisplayRole, formatCurriculum) ...
  const getDisplayRole = (u: UserData) => {
    if (u.adminTitle && u.adminTitle !== "null" && u.adminTitle.trim() !== "") return u.adminTitle;
    if (u.academicRank && u.academicRank !== "null" && u.academicRank.trim() !== "") return u.academicRank;
    return u.role || "";
  };

  const formatCurriculum = (text: string | null | undefined) => {
    if (!text) return "";
    if (text.includes("สายสนับสนุน")) return "สายสนับสนุน";
    const branchIndex = text.indexOf("สาขาวิชา");
    if (branchIndex !== -1) return text.substring(branchIndex);
    return text;
  };

  const displayRole = user ? getDisplayRole(user) : "";
  const displayCurriculum = formatCurriculum(user?.curriculum);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[60] px-4 flex items-center justify-between font-sarabun shadow-sm">
      
      {/* --- LEFT SIDE: LOGO --- */}
      <div className="flex items-center gap-4">
        <div className="flex items-center h-full pl-2">
            <img 
              src="/Logo_phar.png" 
              alt="ตราสัญลักษณ์คณะ" 
              className="h-14 w-auto object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) parent.innerHTML = '<div class="flex items-center gap-2"><div class="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">UP</div><span class="text-purple-900 font-bold text-lg">Pharmacy</span></div>';
              }}
            />
        </div>
      </div>

      {/* --- CENTER (หรือแปะไว้ข้างๆ) : DEBUG SWITCHER --- */}
      {/* แสดงเฉพาะตอน Dev หรือถ้าเป็น Admin (อันนี้ผม Hardcode role="ADMIN" ไว้เป็นตัวอย่าง) */}
      <div className="hidden lg:block mx-4">
          <DebugUserSwitcher 
            users={allStaffs}
            currentUser={user}
            onUserChange={handleDebugUserChange}
            realUserRole="ADMIN" // ในของจริงต้องเช็คจาก Session จริงๆ นะครับ
          />
      </div>

      {/* --- RIGHT SIDE: PROFILE & ACTIONS --- */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* ... (ปุ่มแจ้งเตือนเดิม) ... */}
        <button className="p-2 text-slate-500 hover:bg-slate-50 hover:text-purple-600 rounded-full transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        {/* User Profile Section */}
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                {user?.image ? (
                    <img src={user.image} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-sm"/>
                ) : (
                    <div className="h-9 w-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                        <UserIcon size={18} />
                    </div>
                )}
                
                <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-slate-700 leading-tight whitespace-nowrap">{user?.name}</p>
                    {displayCurriculum ? (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-purple-600 font-medium" title={user?.curriculum || ""}>
                            <BookOpen size={10} className="shrink-0" />
                            <span className="whitespace-nowrap">{displayCurriculum}</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500 leading-tight whitespace-nowrap">{displayRole}</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </nav>
  );
}