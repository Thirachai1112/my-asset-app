import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Playfair_Display, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "Asset Management Portal",
  description: "ระบบบริหารจัดการครุภัณฑ์และงานแจ้งซ่อม",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${dmSans.variable} ${dmMono.variable} ${playfairDisplay.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col w-full m-0 p-0">{children}</body>
    </html>
  );
}
