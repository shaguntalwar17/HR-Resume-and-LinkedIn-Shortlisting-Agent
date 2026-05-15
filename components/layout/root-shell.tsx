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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-purple-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-sky-100/50 bg-white/60 backdrop-blur-xl p-4 lg:block shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
          <div className="mb-8 px-2 mt-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-md flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/80">HireWise AI</p>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Talent OS</h2>
              </div>
            </div>
          </div>
          <nav className="space-y-1.5">
            {appNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 group relative",
                    active
                      ? "bg-white text-indigo-700 shadow-sm border border-indigo-100"
                      : "text-slate-600 hover:bg-white/50 hover:text-indigo-600 border border-transparent"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full" />
                  )}
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col relative z-0">
          <header className="sticky top-0 z-20 border-b border-sky-100/50 bg-white/70 px-6 py-4 backdrop-blur-md shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Enterprise Workspace</p>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{toTitle(pathname)}</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden rounded-2xl border border-indigo-50 bg-white/80 shadow-sm px-4 py-2 text-xs text-slate-600 sm:flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                    {user?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{user?.organizationName ?? "Organization"}</p>
                    <p className="text-slate-500 font-medium">
                      {user?.name ?? "User"} <span className="text-indigo-400 opacity-70">•</span> {user?.role ?? "Role"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1400px] p-6 lg:p-8 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
