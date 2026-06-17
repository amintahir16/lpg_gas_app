import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "About Flamora — Pakistan's Leading LPG Gas Distribution Company",
  description:
    "Learn about Flamora LPG, Pakistan's trusted LPG gas distributor since 2015. Our mission, values, safety certifications, and commitment to providing clean, affordable energy to homes and businesses across Pakistan.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Flamora LPG — Our Story, Mission & Values",
    description:
      "Discover how Flamora became Pakistan's most trusted LPG distribution company. 10+ years of excellence, 5,000+ happy customers, and a commitment to safety-first energy solutions.",
    url: "https://flamora.pk/about",
    images: [
      {
        url: "/images/section-pattern.webp",
        width: 1200,
        height: 630,
        alt: "Flamora LPG Company — About Us",
      },
    ],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
