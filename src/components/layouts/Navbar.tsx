'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ChevronDown, User, ChevronRight, Flame } from 'lucide-react';
import { useSession } from 'next-auth/react';
import FlamoraAnimatedLogo from '@/components/ui/FlamoraAnimatedLogo';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/#about' },
    { name: 'Products', href: '/#products' },
    { name: 'Services', href: '/services', hasDropdown: true },
    { name: 'Contact', href: '/contact' },
  ];

  const services = [
    { name: 'LPG Refill', href: '/services#refill' },
    { name: 'Bulk Deliveries', href: '/services#bulk' },
    { name: 'Distribution', href: '/services#distribution' },
  ];

  const logoWidth = 170;
  const logoMoveX = 8;
  const logoMoveY = 0;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
        ? 'glass-navbar shadow-2xl shadow-black/20'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div style={{ transform: `translate(${logoMoveX}px, ${logoMoveY}px)` }}>
            <Link href="/" className="flex items-center space-x-2">
              <div style={{ width: `${logoWidth}px` }}>
                <FlamoraAnimatedLogo hideBadge textColor="#ffffff" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <div key={item.name} className="relative">
                {item.hasDropdown ? (
                  <div
                    className="relative"
                    onMouseEnter={() => setIsServicesOpen(true)}
                    onMouseLeave={() => setIsServicesOpen(false)}
                  >
                    <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white/70 hover:text-[#f8a11b] rounded-lg transition-colors duration-300">
                      {item.name}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isServicesOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.96 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-full left-0 mt-1 w-52 glass-card py-2 shadow-2xl shadow-black/30 rounded-xl overflow-hidden"
                        >
                          {services.map((service) => (
                            <Link
                              key={service.name}
                              href={service.href}
                              className="block px-4 py-2.5 text-sm text-white/60 hover:text-[#f8a11b] hover:bg-white/5 transition-colors duration-200"
                            >
                              {service.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className="px-4 py-2 text-sm font-medium text-white/70 hover:text-[#f8a11b] rounded-lg transition-colors duration-300"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Order CTA */}
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white flame-gradient rounded-xl hover:shadow-[0_0_20px_rgba(243,101,35,0.3)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <Flame className="w-4 h-4" />
              Order Now
            </Link>

            {session && (
              <Link
                href="/dashboard"
                className="group hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white/80 bg-white/5 border border-white/10 hover:border-[#f8a11b]/30 hover:text-[#f8a11b] rounded-xl transition-all duration-300"
              >
                <User className="w-4 h-4" />
                <span>Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-white/70 hover:text-[#f8a11b] transition-colors rounded-lg"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden border-t border-white/5 glass-card rounded-b-2xl mt-1 overflow-hidden"
            >
              <div className="py-4 space-y-1 px-2">
                {navigation.map((item) => (
                  <div key={item.name}>
                    {item.hasDropdown ? (
                      <div>
                        <button
                          onClick={() => setIsServicesOpen(!isServicesOpen)}
                          className="flex items-center justify-between w-full text-left px-4 py-3 text-white/70 hover:text-[#f8a11b] transition-colors rounded-lg"
                        >
                          {item.name}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isServicesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="pl-6 space-y-1"
                            >
                              {services.map((service) => (
                                <Link
                                  key={service.name}
                                  href={service.href}
                                  className="block px-4 py-2 text-sm text-white/50 hover:text-[#f8a11b] transition-colors"
                                  onClick={() => setIsOpen(false)}
                                >
                                  {service.name}
                                </Link>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className="block px-4 py-3 text-white/70 hover:text-[#f8a11b] transition-colors rounded-lg"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}

                {/* Mobile CTA */}
                <div className="pt-3 px-2 border-t border-white/5">
                  <Link
                    href="/shop"
                    className="flex items-center justify-center gap-2 w-full py-3 flame-gradient text-white font-bold rounded-xl"
                    onClick={() => setIsOpen(false)}
                  >
                    <Flame className="w-4 h-4" />
                    Order Now
                  </Link>
                </div>

                {session && (
                  <Link
                    href="/dashboard"
                    className="group flex items-center justify-between px-4 py-3 text-[#f8a11b] font-medium transition-all rounded-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Dashboard</span>
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}