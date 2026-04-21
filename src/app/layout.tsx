import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { NavigationProgress } from "@/modules/navigation/components/navigation-progress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BuyHub Manage",
  description: "B2B electronics store operations and supplier portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-white font-sans text-slate-900">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
