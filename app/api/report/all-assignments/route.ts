// src/app/api/report/all-assignments/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // ลองดึง Query params (เผื่อจะเอาไปใช้ filter ใน database จริง)
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  // ข้อมูลจำลอง (Mock Data) ที่ย้ายจากหน้าบ้านมาไว้หลังบ้าน
  // เพื่อให้หน้าเว็บคิดว่าดึงมาจาก Database จริงๆ
  const mockData = [
    {
      id: 1,
      semester: 1,
      academicYear: 2567,
      lectureHours: 12,
      labHours: 90,
      lecturer: {
        id: 101,
        firstName: "ปฐมพงษ์",
        lastName: "ริมแดง",
        academicPosition: "ผศ.ดร."
      },
      subject: {
        code: "341221[2]",
        name_th: "เภสัชกรรม 1",
        curriculum: "การบริบาลทางเภสัชกรรม"
      },
      responsible: true
    },
    {
      id: 2,
      semester: 1,
      academicYear: 2567,
      lectureHours: 4,
      labHours: 72,
      lecturer: {
        id: 102,
        firstName: "นันทวรรณ",
        lastName: "วรุฒจิต",
        academicPosition: "ดร."
      },
      subject: {
        code: "341221[2]",
        name_th: "เภสัชกรรม 1",
        curriculum: "การบริบาลทางเภสัชกรรม"
      },
      responsible: false
    },
    {
      id: 3,
      semester: 2,
      academicYear: 2567,
      lectureHours: 8,
      labHours: 42,
      lecturer: {
        id: 103,
        firstName: "แสงระวี",
        lastName: "สุทธิปริญญาพงศ์",
        academicPosition: "ผศ.ดร."
      },
      subject: {
        code: "341441[2]",
        name_th: "การสื่อสารเชิงวิชาชีพ",
        curriculum: "วิทยาศาสตร์เครื่องสำอาง"
      },
      responsible: true
    },
    // เพิ่มข้อมูลตามใจชอบ...
  ];

  // จำลองความหน่วง (Delay) นิดหน่อยให้เหมือนโหลดจริง
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json(mockData);
}