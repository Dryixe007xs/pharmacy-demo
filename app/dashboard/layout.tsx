import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 font-sarabun">
      {/* Navbar อยู่ด้านบนสุด (Fixed) */}
      <Navbar />
      
      {/* Sidebar อยู่ด้านซ้าย (Fixed) */}
      <Sidebar />
      
      {/* พื้นที่เนื้อหาหลัก */}
      {/* lg:ml-20 : เว้นระยะซ้ายให้ Sidebar (เมื่อหุบ) */}
      {/* pt-16    : เว้นระยะบนให้ Navbar */}
      <main className="lg:ml-20 pt-16 transition-all duration-300">
        
        {/* กำหนด Padding รวมตรงนี้ที่เดียว (p-4) เพื่อให้เนื้อหาไม่ชิดขอบเกินไป แต่ไม่ห่างจนโล่ง */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}