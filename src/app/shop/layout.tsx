import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Shop — Order LPG Gas Cylinders Online | 11.8 KG, 15 KG, 44.5 KG",
  description:
    "Order LPG gas cylinders from Flamora online. Choose Domestic (11.8 KG), Standard (15 KG), or Commercial (44.5 KG) cylinders. Same-day doorstep delivery available across Pakistan. Competitive prices, safe & certified.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Order LPG Cylinders Online — Flamora Shop",
    description:
      "Browse and order LPG cylinders from Flamora. Domestic, Standard, and Commercial sizes with same-day delivery across Pakistan.",
    url: "https://flamora.pk/shop",
    images: [
      {
        url: "/images/cylinder.webp",
        width: 1200,
        height: 630,
        alt: "Flamora LPG Shop — Order Gas Cylinders Online",
      },
    ],
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
