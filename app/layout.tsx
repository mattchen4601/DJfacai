import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "家人防骗提醒平台",
  description: "用于家庭反诈提醒的安全页面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
