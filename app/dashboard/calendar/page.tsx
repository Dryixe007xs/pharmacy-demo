"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Pencil, 
  Trash2, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types & Mock Data ---
type EventType = 'filling' | 'verify'; // filling = กรอก (เขียว), verify = ยืนยัน (ส้ม)

interface Appointment {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  type: EventType;
  status: 'active' | 'upcoming' | 'expired';
  description: string;
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    title: "เปิดกรอกชั่วโมงสอน ภาคเรียนที่ 1/2568",
    startDate: new Date(2025, 10, 1), // 1 Nov 2025 (Month index starts at 0 in JS)
    endDate: new Date(2025, 10, 16), // 16 Nov 2025
    startTime: "08:00",
    endTime: "17:00",
    type: "filling",
    status: "active",
    description: "ช่วงเวลากรอกชั่วโมงสอนสำหรับอาจารย์ประจำ"
  },
  {
    id: "2",
    title: "ยืนยันชั่วโมงสอน ภาคเรียนที่ 1/2568",
    startDate: new Date(2025, 10, 17), // 17 Nov 2025
    endDate: new Date(2025, 10, 30), // 30 Nov 2025
    startTime: "08:00",
    endTime: "17:00",
    type: "verify",
    status: "upcoming",
    description: "ช่วงเวลากรอกชั่วโมงสอนสำหรับอาจารย์ประจำ"
  }
];

// Helper to check if a day has an event
const getEventForDay = (day: Date, appointments: Appointment[]) => {
  return appointments.find(app => {
    // Reset time for accurate date comparison
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const start = new Date(app.startDate.getFullYear(), app.startDate.getMonth(), app.startDate.getDate());
    const end = new Date(app.endDate.getFullYear(), app.endDate.getMonth(), app.endDate.getDate());
    return d >= start && d <= end;
  });
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 10, 1)); // Mock Nov 2025 to match data
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- Calendar Logic ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sun
  
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  return (
    <div className="space-y-6 font-sarabun min-h-screen bg-slate-50/50 p-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">ปฏิทินนัดหมาย</h1>
        <h2 className="text-xl text-slate-600 mt-2">ปฏิทินการดำเนินงานฝ่ายวิชาการเกี่ยวกับการจัดการข้อมูลชั่วโมงสอน</h2>
      </div>

      {/* Calendar Section */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        
        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
           <div className="text-xl font-bold text-slate-800">
             {monthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
           </div>
           <div className="flex gap-2 items-center">
             <div className="flex gap-2 mr-4">
                 <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                 </Button>
             </div>
             
             {/* Add Button */}
             <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-green-500 hover:bg-green-600 text-white flex gap-2">
                        <Plus size={18} /> เพิ่มนัดหมาย
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มกำหนดการนัดหมาย</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">หัวข้อกิจกรรม</label>
                            <Input placeholder="เช่น เปิดกรอกชั่วโมงสอน ภาคเรียนที่ 1/2568" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">ประเภท</label>
                                <Select>
                                    <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fill">เปิดกรอกข้อมูล (เขียว)</SelectItem>
                                        <SelectItem value="verify">ยืนยันข้อมูล (ส้ม)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <label className="text-sm font-medium">สถานะ</label>
                                <Select>
                                    <SelectTrigger><SelectValue placeholder="เลือกสถานะ" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">กำลังดำเนินการ</SelectItem>
                                        <SelectItem value="upcoming">รอดำเนินการ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">วันที่เริ่มต้น</label>
                                <Input type="date" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">วันที่สิ้นสุด</label>
                                <Input type="date" />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">เวลาเริ่มต้น</label>
                                <Input type="time" defaultValue="08:00" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">เวลาสิ้นสุด</label>
                                <Input type="time" defaultValue="17:00" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">รายละเอียดเพิ่มเติม</label>
                            <Input placeholder="หมายเหตุ..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>ยกเลิก</Button>
                        <Button className="bg-green-500 hover:bg-green-600" onClick={() => setIsAddModalOpen(false)}>บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
           </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-2">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                <div key={day} className="text-center text-sm font-bold text-slate-500 py-2">
                    {day}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="h-24 bg-slate-50/30 rounded-lg"></div>;

                const event = getEventForDay(day, mockAppointments);
                
                return (
                    <div key={index} className="h-24 border rounded-lg p-2 flex flex-col items-start bg-slate-50/20 hover:bg-slate-50 transition-colors relative">
                        <span className="text-sm font-medium text-slate-700">{day.getDate()}</span>
                        {event && (
                            <div className={cn(
                                "mt-1 text-[10px] px-2 py-1 rounded w-full truncate font-medium",
                                event.type === 'filling' 
                                    ? "bg-green-100 text-green-700 border border-green-200" 
                                    : "bg-orange-100 text-orange-700 border border-orange-200"
                            )}>
                                {event.type === 'filling' ? 'เปิดกรอกช้า...' : 'ยืนยันชั่วโม...'}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

      </div>

      {/* List Section */}
      <div>
        <h3 className="text-xl font-bold text-slate-800 mb-4">รายการนัดหมาย</h3>
        
        <div className="grid gap-4">
            {mockAppointments.map((app) => (
                <div key={app.id} className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-3">
                        <h4 className="font-bold text-lg text-slate-800">{app.title}</h4>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded border">
                                <CalendarIcon className="w-4 h-4 text-slate-500" />
                                <span>{app.startDate.toLocaleDateString('th-TH')} - {app.endDate.toLocaleDateString('th-TH')}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded border">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>{app.startTime} - {app.endTime} น.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            {app.status === 'active' ? (
                                <span className="text-green-600 flex items-center gap-1 font-medium bg-green-50 px-2 py-0.5 rounded text-xs">
                                    <CheckCircle size={12} /> กำลังดำเนินการ
                                </span>
                            ) : (
                                <span className="text-orange-500 flex items-center gap-1 font-medium bg-orange-50 px-2 py-0.5 rounded text-xs">
                                    <Clock size={12} /> รอดำเนินการ
                                </span>
                            )}
                            <span className="text-slate-400 text-xs border-l pl-2">{app.description}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" className="text-green-600 border-green-200 hover:bg-green-50">
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-red-500 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      </div>

    </div>
  );
}