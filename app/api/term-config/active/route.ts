// app/api/term-config/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // หรือ import { db } from "@/lib/db";

export async function GET() {
  try {
    const activeTerm = await prisma.termConfiguration.findFirst({
      where: { isActive: true }
    });
    
    // ถ้าไม่มีเทอมไหนเปิดอยู่เลย
    if (!activeTerm) {
        return NextResponse.json(null);
    }

    return NextResponse.json(activeTerm);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}