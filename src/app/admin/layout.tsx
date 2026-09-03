"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (
          data.user &&
          (data.user.role === "SUPERADMIN" ||
            data.user.role === "ADMIN" ||
            data.user.role === "LECTURER" ||
            data.user.role === "HOD")
        ) {
          setAuthorized(true);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-50">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-fuoye-green" />
          <p className="text-xs font-bold text-slate-700">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
