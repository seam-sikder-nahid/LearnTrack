import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LearnTrack",
  description: "Learn every day. Track everything. Build your GitHub history automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-surface-sunken text-text">
        {children}
      </body>
    </html>
  );
}
