"use client"; // ต้องมีบรรทัดนี้ เพราะ SessionProvider ทำงานฝั่ง Client

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}