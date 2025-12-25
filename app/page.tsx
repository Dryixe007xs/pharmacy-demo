"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Pill, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion"; // พระเอกของเรา

export default function WelcomePage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    signIn("azure-ad", {
      callbackUrl: "/",
      redirect: true,
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden font-sarabun selection:bg-purple-200 selection:text-purple-900">
      
      {/* --- 1. Animated Background (พื้นหลังเคลื่อนไหว) --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {/* Blob 1: Purple */}
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-300/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        {/* Blob 2: Emerald */}
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-300/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        {/* Blob 3: Blue */}
        <motion.div 
          animate={{ x: [0, 40, 0], y: [0, -40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-[80px]"
        />
        
        {/* Grid Pattern Overlay (เพิ่ม Texture ให้ดูไม่โล่ง) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* --- 2. Main Card (Glassmorphism) --- */}
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
                <Pill className="w-10 h-10 text-white" />
                
                {/* Sparkle Icon Decor */}
                <motion.div 
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-white"
                >
                  <Sparkles size={12} className="text-yellow-800"/>
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
                ระบบบริหารจัดการภาระงานบุคลากร <br/>
                กรุณาเข้าสู่ระบบด้วยอีเมล <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs font-bold font-mono">@up.ac.th</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
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
                          <span className="text-sm font-medium">Connecting to Microsoft...</span>
                       </div>
                    ) : (
                       <>
                          <img 
                            src="https://authjs.dev/img/providers/microsoft.svg" 
                            alt="Microsoft" 
                            className="w-5 h-5" 
                          />
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