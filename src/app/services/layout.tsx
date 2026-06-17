import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "LPG Services — Cylinder Refill, Bulk Delivery & Nationwide Distribution",
  description:
    "Flamora LPG offers comprehensive services: cylinder refill (11.8 KG, 15 KG, 44.5 KG), bulk commercial delivery, nationwide distribution, safety training, and equipment inspection. Same-day service available across Pakistan.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Flamora LPG Services — Refill, Bulk Delivery & Distribution",
    description:
      "Explore Flamora's full range of LPG services. From quick domestic refills to industrial-scale bulk delivery and safety training. Serving homes and businesses across Pakistan.",
    url: "https://flamora.pk/services",
    images: [
      {
        url: "/images/cylinder.webp",
        width: 1200,
        height: 630,
        alt: "Flamora LPG Services — Comprehensive Energy Solutions",
      },
    ],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
