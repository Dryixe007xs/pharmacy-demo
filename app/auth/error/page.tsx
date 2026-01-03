// app/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: Record<string, string> = {
    Configuration: "มีปัญหาในการตั้งค่า authentication",
    AccessDenied: "คุณไม่มีสิทธิ์เข้าถึง",
    Verification: "การยืนยันตัวตนล้มเหลว",
    OAuthSignin: "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Azure AD",
    OAuthCallback: "เกิดข้อผิดพลาดหลังจาก login (ตรวจสอบ Redirect URI)",
    OAuthCreateAccount: "ไม่สามารถสร้างบัญชีได้",
    EmailCreateAccount: "ไม่สามารถสร้างบัญชีด้วยอีเมลได้",
    Callback: "เกิดข้อผิดพลาดในการ callback",
    OAuthAccountNotLinked: "บัญชีนี้เชื่อมโยงกับ provider อื่นอยู่แล้ว",
    EmailSignin: "ไม่สามารถส่งอีเมลได้",
    CredentialsSignin: "ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง",
    SessionRequired: "กรุณาเข้าสู่ระบบก่อน",
    Default: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
  };

  const message = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          เกิดข้อผิดพลาด
        </h1>
        <p className="text-gray-600 mb-2">{message}</p>
        {error && (
          <p className="text-sm text-gray-400 mb-6">Error Code: {error}</p>
        )}
        <div className="space-y-2">
          
          <a href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            กลับหน้าแรก
          </a>
          
          <a href="/api/auth/signin"
            className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition"
          >
            ลองอีกครั้ง
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense 
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-gray-600">กำลังโหลด...</div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}