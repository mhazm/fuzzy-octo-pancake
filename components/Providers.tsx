"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { NotificationProvider } from "./ui/NotificationProvider";
import { DialogContainer } from "./ui/DialogContainer";

// WAJIB menggunakan 'export' agar bisa di-import di layout.tsx
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <DialogContainer />
        {children}
      </NotificationProvider>
    </SessionProvider>
  );
}
