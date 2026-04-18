import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Nav } from "@/components/Nav";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "RolePulse Jobs",
  description: "GTM careers. 2,400+ roles from GTM SaaS companies. Updated daily.",
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/rolepulse-logo-dark.png', sizes: '32x32', type: 'image/png' },
      { url: '/rolepulse-logo-dark.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/rolepulse-logo-dark.png',
    shortcut: '/rolepulse-logo-dark.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <AnalyticsProvider>
          <Nav />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
