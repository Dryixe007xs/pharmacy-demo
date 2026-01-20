"use client";

import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

// Import 2 หน้าที่เราสร้างไว้เมื่อกี้
import InstructorDashboard from "@/components/dashboard/InstructorDashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  // 1. ถ้ากำลังโหลดข้อมูล User
  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-10 h-10 text-purple-600" />
      </div>
    );
  }

  // 2. ถ้ายังไม่ Login
  if (status === "unauthenticated" || !session) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        กรุณาเข้าสู่ระบบ
      </div>
    );
  }

  // 3. ตรวจสอบสิทธิ์ (Role Check)
  // หมายเหตุ: ตรงนี้ต้องเปลี่ยนให้ตรงกับ field ใน database ของคุณ (เช่น user.role)
  const userRole = (session.user as any)?.role; 
  
  // กำหนดว่า Role ไหนบ้างที่ถือว่าเป็น Admin
  const isAdmin = userRole === 'ADMIN' || userRole === 'ACADEMIC' || userRole === 'VICE_DEAN';

  // 4. สลับหน้าจอ
  if (isAdmin) {
    // ถ้าเป็นแอดมิน ให้ไปหน้าแอดมิน
    return <AdminDashboard session={session} />;
  }

  // ถ้าไม่ใช่แอดมิน (เป็นอาจารย์) ให้ไปหน้าอาจารย์
  return <InstructorDashboard session={session} />;
}