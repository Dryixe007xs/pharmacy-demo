"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react"; 
import { 
  Home, 
  Database, 
  Clock, 
  PieChart, 
  CalendarDays, 
  ChevronDown, 
  ChevronRight,
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Type Definitions ---
type Role = 'ADMIN' | 'LECTURER' | 'PROGRAM_CHAIR' | 'VICE_DEAN' | 'USER';

type MenuItem = {
  title: string;
  icon: any;
  href?: string;
  roles: Role[]; 
  submenu?: { 
      title: string; 
      href: string; 
      roles: Role[]; 
  }[];
};

// --- Configuration ---
const menuItems: MenuItem[] = [
  {
    title: "หน้าหลัก",
    icon: Home,
    href: "/dashboard",
    roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN', 'USER'],
  },
  {
    title: "จัดการข้อมูล",
    icon: Database,
    roles: ['ADMIN'], 
    submenu: [
      { title: "ข้อมูลรายวิชา", href: "/dashboard/manage/courses", roles: ['ADMIN'] },
      { title: "ข้อมูลบุคลากร", href: "/dashboard/manage/staff", roles: ['ADMIN'] },
    ],
  },
  {
    title: "จัดการชั่วโมงสอน",
    icon: Clock,
    roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'],
    submenu: [
      { 
          title: "ผู้รับผิดชอบรายวิชา", 
          href: "/dashboard/workload/owner", 
          roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'] 
      },
      { 
          title: "ผู้สอน", 
          href: "/dashboard/workload/instructor", 
          roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'] 
      },
      { 
          title: "ประธานหลักสูตร", 
          href: "/dashboard/workload/program-chair", // ⚠️ แก้ href ให้ตรงกับ Folder จริง (/chair หรือ /program-chair)
          roles: ['ADMIN', 'PROGRAM_CHAIR'] 
      },
      { 
          title: "รองคณบดีฝ่ายวิชาการ", 
          href: "/dashboard/workload/vice-dean", 
          roles: ['ADMIN', 'VICE_DEAN'] 
      },
    ],
  },
  {
    title: "รายงานสรุป",
    icon: PieChart,
    roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'],
    submenu: [
      { 
          title: "รายงานสรุปรายบุคคล", 
          href: "/dashboard/report/personal", 
          roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'] 
      },
      { 
          title: "รายงานสรุปของบุคลากรรายบุคคล", 
          href: "/dashboard/report/staff-summary", 
          roles: ['ADMIN', 'PROGRAM_CHAIR', 'VICE_DEAN'] 
      },
      { 
          title: "รายงานสรุปรายปี", 
          href: "/dashboard/report/yearly", 
          roles: ['ADMIN', 'PROGRAM_CHAIR', 'VICE_DEAN'] 
      },
    ],
  },
  {
    title: "กำหนดปฏิทินนัดหมาย",
    icon: CalendarDays,
    href: "/dashboard/calendar",
    roles: ['ADMIN', 'LECTURER', 'PROGRAM_CHAIR', 'VICE_DEAN'], 
  },
];

// --- Main Component ---
export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession(); 
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // ดึง Role จาก Session (ถ้าสวมรอยอยู่ ค่านี้จะเป็น Role ของคนที่เราสวมรอย)
  const userRole = (session?.user?.role as Role) || 'USER';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // เปิดเมนูอัตโนมัติเมื่ออยู่ในหน้านั้นๆ
  useEffect(() => {
    if (!userRole) return;

    menuItems.forEach((item) => {
      if (item.submenu) {
        const isActive = item.submenu.some(sub => 
            pathname.startsWith(sub.href) && sub.roles.includes(userRole)
        );
        if (isActive) {
          setOpenMenus(prev => [...new Set([...prev, item.title])]);
        }
      }
    });
  }, [pathname, userRole]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const handleLogout = async () => {
    // 1. ล้าง Cookie สวมรอย (เก็บไว้เหมือนเดิม กันเหนียว)
    document.cookie = "impersonateId=; path=/; max-age=0";

    // 2. สั่ง Logout แค่ใน App เราเท่านั้น (Local Logout)
    // callbackUrl: "/" คือพอลบ session เสร็จ ให้ดีดกลับหน้า Welcome ทันที
    // ไม่ต้องมีบรรทัด window.location.href ไปหา Microsoft แล้ว
    await signOut({ callbackUrl: "/", redirect: true });
};

  if (!isMounted) return <nav className="group fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 bg-white border-r border-slate-200 z-50"></nav>;

  return (
    <nav className="group fixed left-0 top-16 h-[calc(100vh-4rem)] w-20 hover:w-72 bg-white border-r border-slate-200 shadow-xl shadow-slate-200/50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-50 overflow-hidden flex flex-col font-sarabun">
      
      {/* --- MENU LIST --- */}
      <div className="flex-1 px-3 py-4 space-y-2 overflow-y-auto no-scrollbar">
        {menuItems.map((item, index) => {
          // เช็คสิทธิ์เมนูหลัก
          if (!item.roles.includes(userRole)) return null;

          // กรอง submenu ตาม role
          const visibleSubmenu = item.submenu?.filter(sub => 
             sub.roles.includes(userRole)
          );

          // ถ้ามี submenu แต่ user ไม่มีสิทธิ์เห็นลูกเลย -> ซ่อนแม่ด้วย
          if (item.submenu && (!visibleSubmenu || visibleSubmenu.length === 0)) return null;

          const isActive = item.href ? pathname === item.href : false;
          const isOpen = openMenus.includes(item.title);
          const isChildActive = visibleSubmenu?.some(sub => pathname.startsWith(sub.href));

          const itemClasses = cn(
            "flex items-center h-12 px-3 rounded-xl transition-all duration-200 relative overflow-hidden whitespace-nowrap cursor-pointer",
            isActive || isChildActive
              ? "bg-purple-50 text-purple-700 font-semibold"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          );

          return (
            <div key={index}>
              {item.submenu ? (
                // --- SUBMENU ---
                <div className="flex flex-col">
                  <div 
                    onClick={() => toggleMenu(item.title)}
                    className={itemClasses}
                  >
                    <div className="min-w-[2rem] flex justify-center">
                      <item.icon size={22} className={cn((isActive || isChildActive) && "text-purple-600")} />
                    </div>
                    
                    <div className="flex items-center justify-between flex-1 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 ml-3">
                      <span className="text-sm">{item.title}</span>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}>
                    <div className="ml-11 mt-1 space-y-1 border-l border-slate-200 pl-2">
                      {visibleSubmenu?.map((sub, subIndex) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={subIndex}
                            href={sub.href}
                            className={cn(
                              "block py-2 px-3 text-sm rounded-lg transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100 duration-300", 
                              isSubActive
                                ? "text-purple-700 bg-purple-50 font-medium"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                            )}
                          >
                            {sub.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // --- SINGLE LINK ---
                <Link href={item.href || "#"} className={itemClasses}>
                  <div className="min-w-[2rem] flex justify-center group-hover:scale-110 transition-transform duration-300">
                    <item.icon size={22} />
                  </div>
                  <span className="ml-3 text-sm opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                    {item.title}
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* --- FOOTER --- */}
      <div className="p-3 border-t border-slate-100 bg-white space-y-1">
          <button className="flex items-center h-12 w-full px-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all relative overflow-hidden whitespace-nowrap">
            <div className="min-w-[2rem] flex justify-center">
              <Settings size={22} />
            </div>
            <span className="ml-3 text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
              ตั้งค่าระบบ
            </span>
          </button>

          <button 
             onClick={handleLogout}
             className="flex items-center h-12 w-full px-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all relative overflow-hidden whitespace-nowrap"
          >
            <div className="min-w-[2rem] flex justify-center">
              <LogOut size={22} />
            </div>
            <span className="ml-3 text-sm font-medium opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
              ออกจากระบบ
            </span>
          </button>
      </div>
    </nav>
  );
}