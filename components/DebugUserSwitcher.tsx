"use client";

import { User, RefreshCcw } from "lucide-react";

type UserData = {
  id: string; 
  name: string;
  role?: string;
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

  if (realUserRole !== "ADMIN") {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
      <div>
        <h3 className="text-orange-800 font-bold flex items-center gap-2">
          <User size={20} /> Admin Debug Mode
        </h3>
        <p className="text-sm text-orange-600">
          จำลองสถานะเป็น: <span className="font-bold underline">{currentUser?.name || "ยังไม่ระบุ"}</span> 
          <span className="text-xs ml-2 text-orange-400">(ID: {currentUser?.id})</span>
        </p>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select
          className="p-2 border border-orange-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64"
          value={currentUser?.id || ""}
          onChange={(e) => onUserChange(e.target.value)}
        >
          <option value="">-- เลือก User เพื่อทดสอบ --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </select>
        
        {/* ปุ่ม Reset */}
        <button 
            // 🛠️ แก้ตรงนี้ครับ: ส่งค่าว่าง "" เพื่อบอก Navbar ให้ลบ Cookie
            onClick={() => onUserChange("")} 
            className="p-2 bg-orange-200 text-orange-800 rounded hover:bg-orange-300 transition-colors"
            title="รีเซ็ตค่ากลับเป็นตัวเอง"
        >
            <RefreshCcw size={18}/>
        </button>
      </div>
    </div>
  );
}