'use client';

import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, Flame, ArrowUp } from 'lucide-react';
import FlamoraAnimatedLogo from '@/components/ui/FlamoraAnimatedLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '#about' },
    { name: 'Products', href: '#products' },
    { name: 'Services', href: '/services' },
    { name: 'Contact', href: '#contact' },
  ];

  const products = [
    { name: 'Domestic 11.8KG', href: '/shop' },
    { name: 'Standard 15KG', href: '/shop' },
    { name: 'Commercial 44.5KG', href: '/shop' },
    { name: 'Bulk Orders', href: '/contact' },
  ];

  const socialLinks = [
    { name: 'Facebook', href: '#', icon: Facebook },
    { name: 'Instagram', href: '#', icon: Instagram },
    { name: 'LinkedIn', href: '#', icon: Linkedin },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="landing-page bg-[#080b10] text-white relative overflow-hidden">
      {/* Top Gradient Line */}
      <div className="h-[2px] w-full flame-gradient" />

      {/* Subtle Background Elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#f36523]/3 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#f8a11b]/3 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="w-44 mb-6">
              <FlamoraAnimatedLogo hideBadge textColor="#ffffff" />
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              Premium LPG distribution — delivering clean, safe, and affordable
              energy solutions to homes and businesses across Pakistan.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-10 h-10 bg-white/5 border border-white/8 rounded-xl flex items-center justify-center hover:bg-[#f36523]/15 hover:border-[#f36523]/30 hover:text-[#f8a11b] transition-all duration-300 text-white/40"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white/80 mb-6">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/40 hover:text-[#f8a11b] transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white/80 mb-6">Our Cylinders</h3>
            <ul className="space-y-3">
              {products.map((product) => (
                <li key={product.name}>
                  <Link
                    href={product.href}
                    className="text-white/40 hover:text-[#f8a11b] transition-colors duration-300 text-sm flex items-center gap-2"
                  >
                    <Flame className="w-3 h-3 text-[#f36523]/50" />
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white/80 mb-6">Contact</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f36523]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[#f36523]" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">+92 300 1234567</p>
                  <p className="text-white/30 text-xs">WhatsApp Available</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f36523]/10 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-[#f36523]" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">info@flamora.pk</p>
                  <p className="text-white/30 text-xs">24hr Response</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f36523]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-[#f36523]" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Peshawar, Pakistan</p>
                  <p className="text-white/30 text-xs">Nationwide Coverage</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/25 text-sm">
              © {currentYear} Flamora LPG Distribution. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-white/25 hover:text-white/50 text-sm transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-white/25 hover:text-white/50 text-sm transition-colors">
                Terms
              </Link>
              <button
                onClick={scrollToTop}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center hover:bg-[#f36523]/15 hover:border-[#f36523]/30 text-white/30 hover:text-[#f8a11b] transition-all duration-300"
                aria-label="Scroll to top"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}