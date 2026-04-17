// components/layout/Navbar.tsx

"use client";

import Link from "next/link";
import { Menu, X, Zap, Moon, Sun, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

const NAV_ITEMS = [
  { name: "Features", href: "/#features" },
  { name: "Agents", href: "/#agents" },

];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isAuthed = status === "authenticated";

  const navBg = scrolled
    ? resolvedTheme === "dark" 
      ? "rgba(10,10,12,0.97)" 
      : "rgba(248,249,255,0.97)"
    : resolvedTheme === "dark" 
      ? "rgba(10,10,12,0.80)" 
      : "rgba(248,249,255,0.80)";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6 md:px-10 transition-all duration-300 backdrop-blur-xl"
      style={{
        background: navBg,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <Link href={isAuthed ? "/dashboard" : "/"} className="flex items-center gap-2 flex-shrink-0 group">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-brand-muted flex items-center justify-center group-hover:scale-105 transition-transform">
          <Zap size={18} className="text-brand fill-brand" />
        </div>
        <span className="text-base md:text-lg font-extrabold tracking-tight text-text-base">
          Fin<span className="text-brand">Path</span>
        </span>
      </Link>

      {/* Desktop links */}
      <div className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.name}
            href={item.href}
            className="text-text-muted hover:text-text-base transition-colors duration-200"
          >
            {item.name}
          </a>
        ))}
      </div>

      {/* Right actions */}
      <div className="hidden md:flex gap-2 items-center">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-surface-raised text-text-muted hover:text-text-base hover:border-brand/30 transition-all"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* Auth-aware CTA */}
        <div suppressHydrationWarning>
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-[#0A0A0A] bg-brand hover:bg-brand-dim transition-all"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all border border-border text-text-muted hover:text-text-base hover:border-brand/30 mr-2"
              >
                <LogIn size={14} className="inline mr-1" />
                Login
              </Link>
              <Link
                href="/auth/signin"
                className="px-5 py-2 rounded-xl text-sm font-bold text-[#0A0A0A] bg-brand hover:bg-brand-dim transition-all"
              >
                <UserPlus size={14} className="inline mr-1" />
                Start Free
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-raised transition-all"
        aria-label="Toggle menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile menu */}
      {open && (
        <div
          className="fixed inset-x-0 top-16 z-40 p-5 flex flex-col gap-2 md:hidden bg-surface border-b border-border"
          style={{
            background: resolvedTheme === "dark" ? "rgba(10,10,12,0.98)" : "rgba(248,249,255,0.98)",
            backdropFilter: "blur(20px)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block py-3 px-2 text-base font-semibold border-b border-border text-text-muted hover:text-text-base transition-colors"
            >
              {item.name}
            </a>
          ))}

          <div className="pt-4 flex gap-3" suppressHydrationWarning>
            {isAuthed ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl text-center font-bold text-[#0A0A0A] bg-brand flex items-center justify-center gap-2"
              >
                <LayoutDashboard size={14} /> Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3 rounded-xl text-center font-semibold border border-border text-text-muted"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-3 rounded-xl text-center font-bold text-[#0A0A0A] bg-brand"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}