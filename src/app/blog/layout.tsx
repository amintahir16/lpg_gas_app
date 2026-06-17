import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Blog — LPG Safety Tips, Industry News & Energy Guides",
  description:
    "Read Flamora's expert blog posts on LPG safety tips, industry trends, maintenance guides, and energy solutions. Stay informed about cooking gas best practices in Pakistan.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Flamora LPG Blog — Safety Tips, Guides & Industry Insights",
    description:
      "Expert articles on LPG safety, cylinder maintenance, energy efficiency, and the latest industry news from Pakistan's trusted gas distribution company.",
    url: "https://flamora.pk/blog",
    images: [
      {
        url: "/images/cylinder.webp",
        width: 1200,
        height: 630,
        alt: "Flamora LPG Blog — Energy Industry Insights",
      },
    ],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
