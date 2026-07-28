import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// Configure optimized Google Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CircuitMind | Autonomous AI Electronic Design Automation",
  description: "AI-First Hardware Engineering Engine for Circuit Design, SPICE Simulation, and 3D PCB Layout Synthesis.",
  keywords: ["EDA", "PCB Design", "Circuit Simulation", "Ngspice", "KiCad", "AI Engineering", "GaN Power Electronics"],
  authors: [{ name: "CircuitMind Engineering Team" }],
};

export const viewport: Viewport = {
  themeColor: "#0B0F17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0B0F17] text-slate-100 min-h-screen selection:bg-blue-600 selection:text-white`}
      >
        <div className="relative flex min-h-screen flex-col">
          {/* Main Application Container */}
          <main className="flex-1">{children}</main>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
