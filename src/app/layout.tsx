import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "RolePulse Jobs",
  description: "GTM careers. 2,400+ roles from GTM SaaS companies. Updated daily.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>{children}</body>
    </html>
  );
}
