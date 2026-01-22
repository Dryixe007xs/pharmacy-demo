"use client";

import { User, RefreshCcw, XCircle } from "lucide-react";

type UserData = {
  id: string; 
  name: string;
  role?: string;
  isImpersonating?: boolean;
  [key: string]: any;
};

type DebugUserSwitcherProps = {
  users: UserData[];            
  currentUser: UserData | null; 
  onUserChange: (userId: string) => void; 
  realUserRole?: string;       
};

export default function DebugUserSwitcher({ 
  users, 
  currentUser, 
  onUserChange,
  realUserRole
}: DebugUserSwitcherProps) {

  // --- ลบเงื่อนไข if ออก เพื่อให้ทุกคนเห็น (ตามที่ขอ) ---

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    // ส่งค่า ID ใหม่ไป หรือส่ง string ว่าง "" ถ้าต้องการรีเซ็ต/เลิกสวมรอย
    onUserChange(selectedId);
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 shadow-sm mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      
      {/* ส่วนแสดงสถานะ */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${currentUser?.isImpersonating ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
           {/* เปลี่ยนไอคอนนิดหน่อยเพื่อให้รู้ว่าสถานะต่างกัน */}
           {currentUser?.isImpersonating ? <RefreshCcw size={20} /> : <User size={20} />}
        </div>
        <div>
           <h3 className={`text-sm font-bold flex items-center gap-2 ${currentUser?.isImpersonating ? "text-red-700" : "text-orange-900"}`}>
             {currentUser?.isImpersonating ? "⚠️ กำลังสวมรอยเป็น:" : "👤 สถานะบัญชีปัจจุบัน"}
           </h3>
           <p className="text-xs text-orange-700">
             {currentUser?.name || "ไม่ระบุชื่อ"} <span className="opacity-75">({currentUser?.role || "No Role"})</span>
           </p>
        </div>
      </div>
      
      {/* ส่วนควบคุม */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        
        {/* Dropdown เลือกคนที่จะสวมรอย */}
        <select
          className="flex-1 sm:w-56 p-2 border border-orange-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          // แก้ไข: ใช้ currentUser.id ตรงๆ เพื่อไม่ให้ Dropdown เด้งหลุดตอนเลือก
          value={currentUser?.id || ""} 
          onChange={handleSelectChange}
        >
          {/* Option แรกสำหรับ Reset */}
          <option value="">❌ ยกเลิกการสวมรอย / รีเซ็ต</option>
          
          {/* รายชื่อ User ทั้งหมด */}
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role}) {u.id === currentUser?.id ? "👈(ใช้อยู่)" : ""}
            </option>
          ))}
        </select>

      </div>
    </div>
  );
}