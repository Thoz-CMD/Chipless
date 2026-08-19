import type { Metadata, Viewport } from "next";
import { Audiowide } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chipless",
  description: "Mobile-first poker session tracker setup.",
  icons: {
    icon: "/images/logo/ChatGPT Image 27 ก.ค. 2569 18_26_31.png",
    apple: "/images/logo/ChatGPT Image 27 ก.ค. 2569 18_26_31.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${audiowide.variable}`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
