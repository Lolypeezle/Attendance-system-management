"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [pathname]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/clock-in", label: "Clock In", icon: Clock, highlight: true },
  ];


  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuoye-green to-fuoye-green-dark flex items-center justify-center text-white shadow-md shadow-emerald-900/10 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-sm tracking-tighter">CSC</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 leading-tight">FUOYE SAMS</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  CSC Dept
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Federal University Oye-Ekiti
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    link.highlight
                      ? "bg-fuoye-green text-white hover:bg-fuoye-green-dark shadow-sm shadow-emerald-800/20"
                      : isActive
                      ? "bg-emerald-50 text-fuoye-green border border-emerald-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser && (currentUser.role === "LECTURER" || currentUser.role === "HOD" || currentUser.role === "SUPERADMIN") ? (
              <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
                <div className="flex items-center gap-2">
                  {currentUser.role === "LECTURER" && (
                    <>
                      <Link
                        href="/lecturer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-fuoye-green hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
                      >
                        Workspace
                      </Link>
                      <Link
                        href="/lecturer/history"
                        className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors"
                      >
                        Secret Word History
                      </Link>
                    </>
                  )}
                  {(currentUser.role === "SUPERADMIN" || currentUser.role === "HOD") && (
                    <>
                      <Link
                        href="/admin"
                        className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors"
                      >
                        Admin
                      </Link>
                      <Link
                        href="/lecturer"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-fuoye-green hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
                      >
                        Lecturer View
                      </Link>
                    </>
                  )}
                </div>

                <div className="text-right border-l border-slate-200 pl-3">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[150px]">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] font-medium text-fuoye-green uppercase tracking-wider">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>


          {/* Mobile menu hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/clock-in"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-fuoye-green text-white shadow-sm flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clock In</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-emerald-50 text-fuoye-green font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 text-fuoye-green" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {currentUser && (currentUser.role === "LECTURER" || currentUser.role === "HOD" || currentUser.role === "SUPERADMIN") && (
              <>
                <Link
                  href="/lecturer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-800 bg-emerald-50"
                >
                  <GraduationCap className="w-4 h-4 text-fuoye-green" />
                  <span>Lecturer Workspace</span>
                </Link>

                <Link
                  href="/lecturer/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-purple-900 bg-purple-50"
                >
                  <span>Secret Word Attendance History</span>
                </Link>
              </>
            )}

            <div className="pt-2 border-t border-slate-100">
              {currentUser ? (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <Link
                    href={currentUser.role === "LECTURER" ? "/lecturer" : "/admin"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block hover:opacity-80"
                  >
                    <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                    <div className="text-[10px] text-fuoye-green uppercase font-semibold">
                      {currentUser.role}
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-rose-600 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : null}
            </div>

          </div>
        )}
      </div>
    </header>
  );
}
