import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
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

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://flamora.pk'),
  title: {
    default: "Flamora LPG | #1 Trusted LPG Gas Supplier in Pakistan — Home & Business Delivery",
    template: "%s | Flamora LPG Pakistan",
  },
  description: "Flamora is Pakistan's leading LPG gas distributor since 2015. Order 11.8 KG, 15 KG & 44.5 KG cylinders online. Same-day doorstep delivery, safety-certified, competitive prices. Serving Peshawar, Lahore, Islamabad, Karachi & 50+ cities.",
  keywords: [
    "flamora",
    "LPG gas Pakistan",
    "LPG cylinder delivery",
    "cooking gas cylinder",
    "buy LPG online Pakistan",
    "Flamora LPG",
    "gas cylinder Peshawar",
    "gas cylinder Lahore",
    "gas cylinder Islamabad",
    "gas cylinder Karachi",
    "11.8 KG cylinder",
    "15 KG cylinder",
    "44.5 KG commercial cylinder",
    "bulk LPG delivery",
    "B2B LPG supply",
    "restaurant gas supply Pakistan",
    "industrial LPG",
    "doorstep gas delivery",
    "safe LPG cylinders",
    "LPG refill service",
    "energy solutions Pakistan",
  ],
  authors: [{ name: "Flamora LPG", url: "https://flamora.pk" }],
  creator: "Flamora LPG",
  publisher: "Flamora LPG",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Flamora LPG | Pakistan's Trusted Energy Partner — Order LPG Online",
    description: "Order LPG gas cylinders online in Pakistan. Same-day doorstep delivery for homes, restaurants & industries. 11.8 KG, 15 KG, 44.5 KG options. Safety certified. 24/7 support.",
    url: "https://flamora.pk",
    siteName: "Flamora LPG",
    images: [
      {
        url: "/images/cylinder.webp",
        width: 1200,
        height: 630,
        alt: "Flamora LPG Gas Cylinders — Premium Energy Solutions in Pakistan",
      },
    ],
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flamora LPG | Pakistan's #1 LPG Gas Delivery Service",
    description: "Same-day LPG cylinder delivery across Pakistan. Order 11.8 KG, 15 KG & 44.5 KG cylinders. Safety certified. Competitive prices.",
    images: ["/images/cylinder.webp"],
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
    google: "5ga-3-Y7UUfHNVVf6JMdZKf6txNLtjVdidIuEphaBdg",
  },
  category: "energy",
};

/* ─── JSON-LD Structured Data ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Flamora LPG",
  url: "https://flamora.pk",
  logo: "https://flamora.pk/logo.png",
  description:
    "Flamora is Pakistan's leading LPG gas distributor, offering safe, certified, and affordable cooking gas cylinders with same-day doorstep delivery for homes and businesses since 2015.",
  foundingDate: "2015",
  areaServed: {
    "@type": "Country",
    name: "Pakistan",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "PK",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["English", "Urdu"],
    },
  ],
  sameAs: [],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
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
