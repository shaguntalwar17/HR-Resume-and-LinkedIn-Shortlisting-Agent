import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";

import { RootShell } from "@/components/layout/root-shell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireWise AI - Production HR Shortlisting Platform",
  description:
    "Enterprise hiring intelligence platform with AI-assisted evaluation, shortlist workflows, auditability, and responsible AI guardrails.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RootShell>{children}</RootShell>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
