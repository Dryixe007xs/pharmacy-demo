import Link from 'next/link';
import { Pill, FileText, ArrowRight, UserPlus, LogIn } from 'lucide-react'; // อย่าลืมลง npm install lucide-react

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      
      {/* Background Decoration (Optional: สร้างบรรยากาศให้ดูไม่เรียบเกินไป) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-emerald-600 p-8 text-center text-white">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <Pill className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Pharmacy Workload</h1>
          <p className="text-emerald-100 text-sm font-light">ระบบบริหารจัดการภาระงาน คณะเภสัชศาสตร์</p>
        </div>

        {/* Content Section */}
        <div className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-slate-800 font-semibold text-lg">ยินดีต้อนรับสู่ระบบ</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              กรุณาเข้าสู่ระบบเพื่อบันทึกและตรวจสอบภาระงาน<br/> หรือลงทะเบียนหากใช้งานครั้งแรก
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link 
              href="/auth/login" 
              className="group flex items-center justify-center w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <LogIn className="w-5 h-5 mr-2" />
              <span>เข้าสู่ระบบ (Log In)</span>
              <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
            </Link>

            <Link 
              href="/auth/register" 
              className="flex items-center justify-center w-full py-3 px-4 bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-600 font-medium rounded-lg transition-all duration-200"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              <span>กำหนดรหัสผ่าน / ลงทะเบียน</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Faculty of Pharmacy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}