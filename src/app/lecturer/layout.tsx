"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const isLoginPage = pathname === "/lecturer/login";

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(true);
      return;
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/lecturer/login");
          return;
        }
        const data = await res.json();
        const role = (data.user?.role || "").toUpperCase();
        if (
          role === "LECTURER" ||
          role === "HOD" ||
          role === "SUPERADMIN"
        ) {
          setAuthorized(true);
        } else if (role === "STUDENT") {
          router.replace("/student");
        } else {
          router.replace("/lecturer/login");
        }
      })
      .catch(() => {
        router.replace("/lecturer/login");
      });
  }, [router, isLoginPage, pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (authorized === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-50">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-fuoye-green" />
          <p className="text-xs font-bold text-slate-700">Verifying Lecturer Workspace Credentials...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
