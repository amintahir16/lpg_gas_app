import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionProvider from "@/components/providers/SessionProvider";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
import LandingLayout from "@/components/layouts/LandingLayout";
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
  title: "LPG Gas Company - Your Trusted Energy Partner",
  description: "Leading LPG provider in Pakistan since 2005. Quality gas cylinders, refill services, bulk deliveries, and 24/7 support. Safe, reliable, and affordable energy solutions.",
  keywords: "LPG, gas cylinders, Pakistan, Karachi, energy, cooking gas, bulk delivery, refill service",
  authors: [{ name: "LPG Gas Company" }],
  openGraph: {
    title: "LPG Gas Company - Your Trusted Energy Partner",
    description: "Leading LPG provider in Pakistan since 2005. Quality gas cylinders, refill services, bulk deliveries, and 24/7 support.",
    url: "https://lpgcompany.com",
    siteName: "LPG Gas Company",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "LPG Gas Company",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LPG Gas Company - Your Trusted Energy Partner",
    description: "Leading LPG provider in Pakistan since 2005. Quality gas cylinders, refill services, bulk deliveries, and 24/7 support.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <NotificationProvider>
            <LandingLayout>
              {children}
            </LandingLayout>
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
