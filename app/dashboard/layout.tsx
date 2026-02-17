"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    Swal.close();
    document.body.style.overflow = "";
    document.body.classList.remove("swal2-shown", "swal2-height-auto");
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-50 font-sarabun">
      <Navbar />
      <Sidebar />
      <main className="lg:ml-20 pt-16 transition-all duration-300">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}