import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers"; // 👈 1. เพิ่มบรรทัดนี้

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบจัดการภาระงานสอน", // 👈 (แอบแก้ชื่อ Title ให้เข้ากับโปรเจกต์ครับ)
  description: "School of Pharmaceutical Sciences, University of Phayao",
  icons: {
    icon: "/favicon.ico",         // หรือ "/logo.png"
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 👇 2. เอา Providers มาครอบ children ตรงนี้ครับ */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}