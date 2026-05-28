import type { Metadata } from "next";
import { Toaster } from "sonner";
import { QueryProvider } from "@/lib/providers/query-provider";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { APP_NAME } from "@/lib/utils/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "AI-powered automation platform for social media, email, and CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster
              theme="dark"
              toastOptions={{
                style: {
                  background: "#111318",
                  border: "1px solid #1E2330",
                  color: "#F1F5F9",
                  fontFamily: "DM Mono, monospace",
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
