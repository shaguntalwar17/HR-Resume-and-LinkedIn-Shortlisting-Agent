"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  ChartColumnBig,
  ClipboardList,
  FileText,
  GanttChartSquare,
  LayoutDashboard,
  LogOut,
  Microscope,
  Scale,
  SearchCode,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const protectedPrefixes = [
  "/dashboard",
  "/jobs",
  "/candidates",
  "/evaluations",
  "/shortlist",
  "/reports",
  "/analytics",
  "/audit-logs",
  "/responsible-ai",
  "/settings",
  "/integrations",
  "/workspace",
];

const appNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/evaluations", label: "Evaluations", icon: ClipboardList },
  { href: "/shortlist", label: "Shortlist", icon: SearchCode },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig },
  { href: "/audit-logs", label: "Audit Logs", icon: Scale },
  { href: "/responsible-ai", label: "Responsible AI", icon: ShieldCheck },
  { href: "/integrations", label: "Integrations", icon: GanttChartSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isProtected(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function toTitle(pathname: string) {
  if (pathname === "/") return "Home";
  const part = pathname.split("/").filter(Boolean)[0] ?? "Dashboard";
  return part
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationName: string;
};

export function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    if (!isProtected(pathname)) return;
    void (async () => {
      const response = await fetch("/api/auth/me");
      if (!response.ok) return;
      const data = (await response.json()) as { user: SessionUser };
      setUser(data.user);
    })();
  }, [pathname]);

  if (!isProtected(pathname)) {
    return (
      <div className="min-h-screen bg-[radial-gradient(110%_80%_at_50%_0%,#dff4ff_0%,#f8fafc_45%,#ffffff_100%)]">
        <header className="sticky top-0 z-20 border-b border-sky-100/70 bg-white/85 backdrop-blur-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold uppercase tracking-wider text-white">
                HireWise AI
              </span>
              <span className="hidden text-sm font-medium text-slate-600 sm:inline">
                Hiring Intelligence Platform
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/methodology">
                <Button variant="ghost" size="sm">
                  <Microscope className="h-4 w-4" />
                  Methodology
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white p-4 lg:block">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">HireWise AI</p>
            <h2 className="text-lg font-bold text-slate-900">Talent OS</h2>
          </div>
          <nav className="space-y-1">
            {appNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-sky-100 text-sky-800"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Enterprise Workspace</p>
                <h1 className="text-xl font-bold text-slate-900">{toTitle(pathname)}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:block">
                  <p className="font-semibold text-slate-700">{user?.organizationName ?? "Organization"}</p>
                  <p>
                    {user?.name ?? "User"} ({user?.role ?? "Role"})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-[1400px] p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
