"use client";

import { Bell, User as UserIcon, BookOpen, LogOut } from "lucide-react"; 
import { useSession, signOut } from "next-auth/react"; 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import DebugUserSwitcher from "@/components/DebugUserSwitcher"; // 🚫 ปิดการใช้งาน

export function Navbar() {
  // 🚫 ลบ update ออก เพราะไม่ได้ใช้สวมรอยแล้ว
  const { data: session } = useSession(); 
  const router = useRouter();
  
  const user = session?.user;
  
  // 🚫 ปิดตัวแปรที่ใช้จำลองสิทธิ์
  // const isImpersonating = user?.isImpersonating;
  // const [allStaffs, setAllStaffs] = useState<any[]>([]);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  // ดึงรูปโปรไฟล์
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!user?.email) {
        setPhotoLoading(false);
        return;
      }
      try {
        setPhotoLoading(true);
        const response = await fetch('/api/profile-photo');
        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setProfilePhotoUrl(imageUrl);
        } else {
          setProfilePhotoUrl(user?.image || null);
        }
      } catch (error) {
        console.error('Error fetching profile photo:', error);
        setProfilePhotoUrl(user?.image || null);
      } finally {
        setPhotoLoading(false);
      }
    };
    fetchProfilePhoto();
    
    return () => {
      if (profilePhotoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePhotoUrl);
      }
    };
  }, [user?.email]);

  /* 🚫 ปิดการดึงข้อมูล Staff เพื่อจำลองสิทธิ์
  useEffect(() => {
    if (user) { 
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
  }, [user]); 
  */

  /* 🚫 ปิดฟังก์ชันสลับผู้ใช้งาน (Impersonation)
  const handleUserChange = async (newUserId: string) => {
      await update({ impersonateId: newUserId || null });
      router.refresh();
      window.location.reload(); 
  };
  */

  // ฟังก์ชันออกจากระบบแบบปกติ
  const handleLogout = async () => {
    /* 🚫 ปิดการคืนสิทธิ์
    if (isImpersonating) {
        await update({ impersonateId: null });
    }
    */
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

  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[60] px-4 flex items-center justify-between font-sarabun shadow-sm">
      
      {/* ฝั่งซ้าย: โลโก้ */}
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

      {/* ฝั่งขวา: เมนูจัดการผู้ใช้ */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* 🚫 ปิด UI สำหรับสวมรอยทั้งหมด
        <div className="hidden lg:block">
          <DebugUserSwitcher 
              users={allStaffs}
              currentUser={user || null} 
              realUserRole={user?.role} 
              onUserChange={handleUserChange} 
          />
        </div>

        {isImpersonating && (
             <span className="hidden sm:inline-block text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold border border-red-200 animate-pulse">
                จำลองสิทธิ์
             </span>
        )}
        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
        */}

        {/* เมนูโปรไฟล์ผู้ใช้งาน */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 outline-none">
                
                <Avatar className="h-9 w-9 border-2 border-white shadow-sm cursor-pointer">
                    {photoLoading ? (
                        <AvatarFallback className="bg-slate-100 text-slate-400">
                            <div className="animate-pulse">
                                <UserIcon size={18} />
                            </div>
                        </AvatarFallback>
                    ) : (
                        <>
                            <AvatarImage 
                                src={profilePhotoUrl || ""} 
                                alt="Profile" 
                                className="object-cover" 
                            />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                                {user?.name ? getInitials(user.name) : <UserIcon size={18} />}
                            </AvatarFallback>
                        </>
                    )}
                </Avatar>
                
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