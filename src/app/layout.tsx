import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import {
  BUYHUB_FAVICON_PATH,
  BUYHUB_ICON_PATH,
} from "@/modules/brand/components/buyhub-logo";
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
  icons: {
    icon: [{ url: BUYHUB_FAVICON_PATH, type: "image/png" }],
    apple: [{ url: BUYHUB_ICON_PATH, type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-hidden`}
    >
      <body className="h-full overflow-hidden bg-background font-sans text-foreground">
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
