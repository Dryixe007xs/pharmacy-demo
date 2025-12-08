"use client";

import { User, RefreshCcw } from "lucide-react";

type UserData = {
  id: number;
  name: string;
  role?: string; // สมมติว่าใน UserData มี field role
  [key: string]: any;
};

type DebugUserSwitcherProps = {
  users: UserData[];          // รายชื่อ User ทั้งหมดที่จะให้เลือก
  currentUser: UserData | null; // User ที่กำลังถูก Simulate อยู่
  onUserChange: (userId: number) => void; // ฟังก์ชันเมื่อมีการเปลี่ยน User
  realUserRole?: string;      // Role ของคน "จริงๆ" ที่กำลังใช้งาน (เพื่อเช็คสิทธิ์ Admin)
};

export default function DebugUserSwitcher({ 
  users, 
  currentUser, 
  onUserChange,
  realUserRole = "ADMIN" // Default ไว้ทดสอบ (ในการใช้งานจริงต้องส่ง Role จริงๆ เข้ามา)
}: DebugUserSwitcherProps) {

  // Logic: ถ้าคนใช้งานจริงๆ ไม่ใช่ ADMIN ให้ return null (ไม่แสดงผลเลย)
  // ข้อควรระวัง: ต้องใช้ Role ของ "คนจริงๆ" (Real User) ไม่ใช่ Role ของ User ที่เรากำลังสวมรอย (Simulated User)
  // ไม่งั้นพอสลับไปเป็น Teacher ปุ๊บ กล่องนี้จะหายไปทันที ทำให้สลับกลับไม่ได้
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
          คุณกำลังใช้งานในฐานะ: <span className="font-bold underline">{currentUser?.name || "ยังไม่ระบุ"}</span> (ID: {currentUser?.id})
        </p>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <select
          className="p-2 border border-orange-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-64"
          value={currentUser?.id || ""}
          onChange={(e) => onUserChange(Number(e.target.value))}
        >
          <option value="">-- เลือก User เพื่อทดสอบ --</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              [{u.id}] {u.name}
            </option>
          ))}
        </select>
        
        {/* ปุ่ม Reset กลับไปเป็น Admin (Optional) */}
        <button 
            onClick={() => window.location.reload()} // หรือ Logic อื่นเพื่อ Reset
            className="p-2 bg-orange-200 text-orange-800 rounded hover:bg-orange-300 transition-colors"
            title="รีเซ็ตค่า"
        >
            <RefreshCcw size={18}/>
        </button>
      </div>
    </div>
  );
}