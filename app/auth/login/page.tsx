"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";
import Link from "next/link"; // เพิ่ม Link

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
        // เรียกใช้ API Login (เพื่อตรวจสอบ Token และ Cookie)
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // 1. บันทึกข้อมูลลง LocalStorage (สำหรับ UI Navbar)
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            
            // 2. ส่งสัญญาณ
            window.dispatchEvent(new Event("auth-change"));
            
            // 3. โหลดหน้าใหม่ (ตามที่คุณต้องการ)
            window.location.href = "/"; 
        } else {
            setErrorMsg(data.message || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
            setIsLoading(false);
        }

    } catch (error) {
        console.error("Login error:", error);
        setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sarabun">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-purple-600 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white rounded-full mix-blend-overlay"></div>
                <div className="absolute top-10 left-10 w-12 h-12 bg-white rounded-full mix-blend-overlay"></div>
            </div>
            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg p-3">
                    <img 
                        src="/Logo_phar.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) parent.innerHTML = '<span class="text-purple-600 font-bold text-2xl">UP</span>';
                        }}
                    />
                 </div>
                 <h1 className="text-2xl font-bold text-white mb-1">เข้าสู่ระบบ</h1>
                 <p className="text-purple-100 text-sm font-medium">คณะเภสัชศาสตร์ University of Phayao</p>
            </div>
        </div>

        <div className="p-8 pt-10">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* แสดง Error */}
            {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center animate-in fade-in slide-in-from-top-1">
                    {errorMsg}
                </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">ชื่อผู้ใช้งาน</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors">
                    <User size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-slate-800"
                  placeholder="Username หรือ Email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700 ml-1">รหัสผ่าน</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors">
                    <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-slate-800"
                  placeholder="กรอกรหัสผ่าน"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <a href="#" className="text-xs text-purple-600 hover:text-purple-800 font-medium hover:underline">ลืมรหัสผ่าน?</a>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                    <span>เข้าสู่ระบบ</span>
                    <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* --- ส่วนที่เพิ่มใหม่: ลิงก์ไปหน้าสมัครสมาชิก --- */}
          <div className="mt-8 text-center text-sm text-slate-500">
            ยังไม่มีบัญชีผู้ใช้งาน?{" "}
            <Link href="/auth/register" className="text-purple-600 font-bold hover:underline">
              สมัครสมาชิกที่นี่
            </Link>
          </div>
          {/* ------------------------------------------- */}

          <div className="mt-8 text-center">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-slate-400">Smart Pharmacy System</span>
                </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-400">© 2024 School of Pharmaceutical Sciences, UP.</p>
          </div>
        </div>
      </div>
    </div>
  );
}