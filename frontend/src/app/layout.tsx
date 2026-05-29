import type { Metadata } from "next";
import { Syne, DM_Sans, DM_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { APP_NAME } from "@/lib/utils/constants";
import { assertEnv } from "@/lib/env";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "AI-powered automation platform for social media, email, and CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  assertEnv();
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased font-sans`}
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: "#0D0E14",
                  border: "1px solid #1E2330",
                  color: "#F1F5F9",
                  fontFamily: "var(--font-dm-mono), monospace",
                  fontSize: "13px",
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
