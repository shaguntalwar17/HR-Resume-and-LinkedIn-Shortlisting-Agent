"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validation/auth";

type LoginFormValues = z.infer<typeof loginSchema>;

const demoCredentials = [
  { role: "Admin", email: "admin@hirewise.demo", password: "DemoPass#123" },
  { role: "Recruiter", email: "recruiter@hirewise.demo", password: "DemoPass#123" },
  { role: "Hiring Manager", email: "manager@hirewise.demo", password: "DemoPass#123" },
  { role: "Viewer", email: "viewer@hirewise.demo", password: "DemoPass#123" },
];
const isDemoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sign in.");
      }

      toast.success("Login successful.");
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const nextPath = params?.get("next") || "/dashboard";
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-14">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign In to HireWise AI</CardTitle>
            <CardDescription>
              Access your organization workspace with role-based controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.email.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" {...form.register("password")} />
                {form.formState.errors.password ? (
                  <p className="text-xs text-rose-600">{form.formState.errors.password.message}</p>
                ) : null}
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        {isDemoModeEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Demo Credentials</CardTitle>
              <CardDescription>
                Use seeded demo users to test end-to-end HR workflows instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {demoCredentials.map((entry) => (
                <div key={entry.role} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">{entry.role}</p>
                  <p className="text-xs text-slate-600">{entry.email}</p>
                  <p className="text-xs text-slate-500">{entry.password}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Production Access</CardTitle>
              <CardDescription>
                Demo credentials are disabled in this environment. Use your organization account.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
