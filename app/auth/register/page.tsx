"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  
  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: ""
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    // 1. ตรวจสอบว่าอีเมลตรงกันหรือไม่
    if (formData.email !== formData.confirmEmail) {
        setErrorMsg("อีเมลยืนยันไม่ตรงกับอีเมลที่ระบุ");
        setIsLoading(false);
        return;
    }

    // 2. ตรวจสอบรหัสผ่าน
    if (formData.password !== formData.confirmPassword) {
        setErrorMsg("รหัสผ่านไม่ตรงกัน");
        setIsLoading(false);
        return;
    }

    try {
        // ส่งข้อมูลไปที่ API
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: formData.email,
                password: formData.password
            }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            // สมัครสำเร็จ -> บันทึกข้อมูล -> เข้าสู่ระบบอัตโนมัติ
            localStorage.setItem("currentUser", JSON.stringify(data.user));
            
            // ส่งสัญญาณบอก Navbar
            window.dispatchEvent(new Event("auth-change"));
            
            // Redirect ไปหน้าหลักทันที
            window.location.href = "/";
        } else {
            setErrorMsg(data.message || "การสมัครสมาชิกไม่สำเร็จ");
            setIsLoading(false);
        }

    } catch (error) {
        console.error("Register error:", error);
        setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sarabun">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header สีม่วง */}
        <div className="bg-purple-600 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white rounded-full mix-blend-overlay"></div>
                <div className="absolute top-10 left-10 w-12 h-12 bg-white rounded-full mix-blend-overlay"></div>
            </div>
            
            {/* ปุ่มย้อนกลับไปหน้า Login */}
            <Link href="/auth/login" className="absolute top-4 left-4 text-white/80 hover:text-white transition-colors">
                <ArrowLeft size={24} />
            </Link>

            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2 shadow-lg p-2">
                    <img src="/Logo_phar.png" alt="Logo" className="w-full h-full object-contain" />
                 </div>
                 <h1 className="text-xl font-bold text-white">ลงทะเบียนสมาชิกใหม่</h1>
                 <p className="text-purple-100 text-xs">คณะเภสัชศาสตร์ University of Phayao</p>
            </div>
        </div>

        {/* Form */}
        <div className="p-6 md:p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center animate-in fade-in slide-in-from-top-1">
                    {errorMsg}
                </div>
            )}

             {/* Email */}
             <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">อีเมลมหาวิทยาลัย (@up.ac.th)</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors">
                    <Mail size={18} />
                </div>
                <input 
                  type="email" name="email" required
                  value={formData.email} onChange={handleChange}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm text-slate-800"
                  placeholder="name@up.ac.th"
                />
              </div>
            </div>

            {/* Confirm Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 ml-1">ยืนยันอีเมล</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors">
                    <CheckCircle size={18} />
                </div>
                <input 
                  type="email" name="confirmEmail" required
                  value={formData.confirmEmail} onChange={handleChange}
                  onPaste={(e) => e.preventDefault()} // ป้องกันการ Copy Paste เพื่อให้พิมพ์ยืนยันเอง
                  className={`w-full h-10 pl-10 pr-4 rounded-lg border ${formData.confirmEmail && formData.email !== formData.confirmEmail ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm text-slate-800`}
                  placeholder="กรอกอีเมลอีกครั้ง"
                />
              </div>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 ml-1">รหัสผ่าน</label>
                    <div className="relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors">
                            <Lock size={18} />
                        </div>
                        <input 
                        type={showPassword ? "text" : "password"} 
                        name="password" required
                        value={formData.password} onChange={handleChange}
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm text-slate-800"
                        placeholder="••••••"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 ml-1">ยืนยันรหัสผ่าน</label>
                    <div className="relative group">
                        <input 
                        type={showPassword ? "text" : "password"} 
                        name="confirmPassword" required
                        value={formData.confirmPassword} onChange={handleChange}
                        className={`w-full h-10 pl-4 pr-4 rounded-lg border ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm text-slate-800`}
                        placeholder="••••••"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
                <input 
                    type="checkbox" 
                    id="showPass" 
                    checked={showPassword} 
                    onChange={() => setShowPassword(!showPassword)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="showPass" className="text-xs text-slate-600 cursor-pointer select-none">แสดงรหัสผ่าน</label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>กำลังสมัครสมาชิก...</span>
                </>
              ) : (
                <>
                    <span>ยืนยันการสมัคร</span>
                    <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer: ลิงก์กลับหน้า Login */}
          <div className="mt-8 text-center text-sm text-slate-500">
            มีบัญชีผู้ใช้งานแล้ว?{" "}
            <Link href="/auth/login" className="text-purple-600 font-bold hover:underline">
              เข้าสู่ระบบที่นี่
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}