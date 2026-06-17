import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Contact Flamora — Get a Quote, Order LPG, or Request Support",
  description:
    "Contact Flamora LPG for cylinder orders, bulk delivery quotes, business partnerships, or customer support. Call, WhatsApp, or email us — we respond within hours. Available 24/7.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Flamora LPG — Orders, Quotes & 24/7 Support",
    description:
      "Reach out to Flamora for LPG orders, business quotes, or any enquiry. Multiple contact channels available including phone, WhatsApp, and email.",
    url: "https://flamora.pk/contact",
    images: [
      {
        url: "/images/cylinder.webp",
        width: 1200,
        height: 630,
        alt: "Contact Flamora LPG",
      },
    ],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
