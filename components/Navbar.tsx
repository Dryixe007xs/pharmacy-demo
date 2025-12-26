"use client";

import { Bell, User as UserIcon, BookOpen, LogOut } from "lucide-react"; 
import { useSession, signOut } from "next-auth/react"; // signOut มาจากตรงนี้
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // เพิ่ม router เพื่อรีเฟรชหน้า
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DebugUserSwitcher from "@/components/DebugUserSwitcher";

export function Navbar() {
  // 1. ดึง update มาใช้สำหรับฟังก์ชันสวมรอย
  const { data: session, update } = useSession();
  const router = useRouter();
  
  const user = session?.user;
  const [allStaffs, setAllStaffs] = useState<any[]>([]);

  // เช็ค Flag ที่เราฝังไว้ใน Session (จาก auth.ts ตัวใหม่)
  const isImpersonating = (user as any)?.isImpersonating;

  useEffect(() => {
    // โหลดรายชื่อเฉพาะตอนเป็น Admin หรือตอนกำลังสวมรอย
    if (user?.role === 'ADMIN' || isImpersonating) {
        const fetchStaffs = async () => {
            try {
                const res = await fetch("/api/staff");
                const data = await res.json();
                setAllStaffs(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to load staff list", error);
            }
        };
        fetchStaffs();
    }
  }, [user?.role, isImpersonating]); // แก้ dependency เล็กน้อยให้ React ไม่บ่น

  // 🔥 2. แก้ฟังก์ชันสลับร่าง: เลิกใช้ Cookie -> ใช้ update() แทน
  const handleUserChange = async (newUserId: string) => {
      // เรียก update ไปหา auth.ts (เข้า case trigger === "update")
      await update({ impersonateId: newUserId || null });
      
      // รีเฟรชหน้าจอเพื่อให้ UI เปลี่ยนตาม Role ใหม่ทันที
      router.refresh();
      window.location.reload(); 
  };

  // 🔥 3. แก้ฟังก์ชัน Logout: เอาบรรทัด Microsoft ออก
  const handleLogout = async () => {
    // ถ้าสวมรอยอยู่ ให้เลิกสวมรอยก่อนออก (Option เสริม เพื่อความสะอาด)
    if (isImpersonating) {
        await update({ impersonateId: null });
    }

    // สั่ง Logout แค่ Local (ไม่ไป Microsoft)
    await signOut({ callbackUrl: "/", redirect: true });
  };

  const formatCurriculum = (text: string | null | undefined) => {
    if (!text) return "";
    if (text.includes("สายสนับสนุน")) return "สายสนับสนุน";
    const branchIndex = text.indexOf("สาขาวิชา");
    if (branchIndex !== -1) return text.substring(branchIndex);
    return text;
  };

  const displayCurriculum = formatCurriculum(user?.department);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[60] px-4 flex items-center justify-between font-sarabun shadow-sm">
      
      {/* LOGO */}
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

      {/* DEBUG SWITCHER */}
      <div className="hidden lg:block">
        {(user?.role === 'ADMIN' || isImpersonating) && (
            <DebugUserSwitcher 
                users={allStaffs}
                currentUser={(user as any) || null} 
                realUserRole="ADMIN" 
                onUserChange={handleUserChange} // ส่งฟังก์ชันตัวใหม่ไป
            />
        )}
      </div>

      {/* RIGHT: PROFILE */}
      <div className="flex items-center gap-2 sm:gap-4">
        {isImpersonating && (
             <span className="hidden sm:inline-block text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold border border-red-200 animate-pulse">
                จำลองสิทธิ์
             </span>
        )}
        
        <button className="p-2 text-slate-500 hover:bg-slate-50 hover:text-purple-600 rounded-full transition-all relative">
          <Bell size={20} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 outline-none">
                {user?.image ? (
                    <img src={user.image} alt="Profile" className="h-9 w-9 rounded-full object-cover border-2 border-white shadow-sm"/>
                ) : (
                    <div className="h-9 w-9 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                        <UserIcon size={18} />
                    </div>
                )}
                
                <div className="hidden md:block text-left">
                    <p className="text-sm font-semibold text-slate-700 leading-tight whitespace-nowrap">
                        {user?.name || "กำลังโหลด..."}
                    </p>
                    {displayCurriculum ? (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-purple-600 font-medium" title={user?.department || ""}>
                            <BookOpen size={10} className="shrink-0" />
                            <span className="whitespace-nowrap">{displayCurriculum}</span>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500 leading-tight whitespace-nowrap">{user?.role}</p>
                    )}
                </div>
            </div>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>บัญชีของฉัน {isImpersonating && "(สวมรอย)"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
               แก้ไขข้อมูลส่วนตัว
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* ปุ่ม Logout ใน Dropdown ก็เรียก handleLogout ตัวใหม่ */}
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </nav>
  );
}