import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.json',
  title: {
    default: "Elk Grove Soccer | NorCal Premier Youth Soccer Club",
    template: "%s | Elk Grove Soccer",
  },
  description:
    "Elk Grove Soccer — Sacramento's premier youth soccer club. Recreational, Select, and Academy programs for ages 4–16. Register for Spring 2026.",
  keywords: [
    "Elk Grove Soccer",
    "youth soccer",
    "NorCal soccer",
    "Sacramento soccer",
    "recreational soccer",
    "academy soccer",
    "kids soccer",
  ],
  openGraph: {
    title: "Elk Grove Soccer | NorCal Premier Youth Soccer Club",
    description:
      "Sacramento's premier youth soccer club. Programs for ages 4–16.",
    type: "website",
    locale: "en_US",
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} h-full`}>
      <head>
        <meta name="theme-color" content="#080d1a" />
      </head>
      <body className="bg-midnight text-cloud font-sans antialiased min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`}
        </Script>
      </body>
    </html>
  );
}
