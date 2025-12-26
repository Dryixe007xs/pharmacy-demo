"use client";

import { User, RefreshCcw, XCircle } from "lucide-react";

type UserData = {
  id: string; 
  name: string;
  role?: string;
  isImpersonating?: boolean; // เพิ่ม field นี้เพื่อเช็คสถานะ
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

  // ถ้าไม่ใช่ Admin และไม่ได้กำลังสวมรอยอยู่ ให้ซ่อนไปเลย
  // (แต่ถ้ากำลังสวมรอยอยู่ ต้องโชว์เพื่อให้กดออกได้)
  if (realUserRole !== "ADMIN" && !currentUser?.isImpersonating) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 shadow-sm mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      
      {/* ส่วนแสดงสถานะ */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-full text-orange-600">
           {currentUser?.isImpersonating ? <User size={20} /> : <User size={20} />}
        </div>
        <div>
           <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
             {currentUser?.isImpersonating ? "⚠️ กำลังสวมรอยเป็น:" : "🔧 Admin Mode"}
           </h3>
           <p className="text-xs text-orange-700">
             {currentUser?.name || "ยังไม่ระบุ"} ({currentUser?.role})
           </p>
        </div>
      </div>
      
      {/* ส่วนควบคุม */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        
        {/* Dropdown เลือกคนที่จะสวมรอย */}
        <select
          className="flex-1 sm:w-48 p-2 border border-orange-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
          value={currentUser?.isImpersonating ? currentUser?.id : ""}
          onChange={(e) => onUserChange(e.target.value)}
        >
          <option value="">-- เลือก User เพื่อสวมรอย --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>

      </div>
    </div>
  );
}