"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
// 1. เปลี่ยน import เป็น ClipboardList
import { ClipboardList, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleLogin = () => {
    setIsLoading(true);
    signIn("azure-ad", {
      callbackUrl: "/dashboard",
      redirect: true,
    });
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sarabun selection:bg-purple-200 selection:text-purple-900">
      
      {/* --- 1. Animated Background --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-300/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* --- 2. Main Card --- */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px] bg-white/70 backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl overflow-hidden p-8 mx-4"
      >
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 mb-6 relative group"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity rounded-2xl"></div>
            
            {/* --- ใช้ไอคอน ClipboardList (แฟ้มงาน) --- */}
            <ClipboardList className="w-10 h-10 text-white drop-shadow-md" />
            {/* -------------------------------------- */}

            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-white"
            >
              <Sparkles size={12} className="text-yellow-800" />
            </motion.div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-slate-800 text-center tracking-tight"
          >
            Pharmacy Workload
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-slate-500 text-sm font-medium mt-2 text-center"
          >
            คณะเภสัชศาสตร์ มหาวิทยาลัยพะเยา
          </motion.p>
        </div>

        {/* Action Section */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center px-4"
          >
            <p className="text-slate-600 text-sm leading-relaxed">
              ระบบจัดการชั่วโมงภาระงานสอน
              <br />
              กรุณาเข้าสู่ระบบด้วยอีเมล{" "}
              <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold font-mono">
                @up.ac.th
              </span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              whileHover={{
                scale: 1.02,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-[#2F2F2F] hover:bg-black text-white p-1 rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

              <div className="flex items-center justify-center gap-3 py-3.5 px-4 bg-[#2F2F2F] group-hover:bg-black rounded-[10px] h-full w-full">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-sm font-medium">Connecting...</span>
                  </div>
                ) : (
                  <>
                    {/* Microsoft Icon (SVG แบบ Inline) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 21 21"
                      className="w-5 h-5"
                    >
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                    <span className="font-medium">Log in with UP Mail</span>
                    <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </>
                )}
              </div>
            </motion.button>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-6 border-t border-slate-100 text-center"
        >
          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            School of Pharmaceutical Sciences
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            © {new Date().getFullYear()} University of Phayao
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}