'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronDown,
  User,
  ChevronRight,
  Flame,
  LogIn,
  Truck,
  Factory,
  Phone,
  Sparkles,
  Package,
  ArrowRight,
  Home,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import FlamoraAnimatedLogo from '@/components/ui/FlamoraAnimatedLogo';

interface NavItem {
  id: string;
  name: string;
  href: string;
  hash?: string;
  icon: typeof Home;
  hasDropdown?: boolean;
}

interface ServiceItem {
  name: string;
  href: string;
  description: string;
  badge?: string;
  icon: typeof Flame;
  iconColor: string;
  bgGradient: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [scrolled, setScrolled] = useState(false);

  const pathname = usePathname();
  const { data: session } = useSession();
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll listener for sticky glass styling & active section tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setScrolled(scrollPos > 20);

      // Active section tracking on root landing page
      if (pathname === '/') {
        const aboutEl = document.getElementById('about');
        const productsEl = document.getElementById('products');
        const offset = 180;

        if (productsEl && scrollPos + offset >= productsEl.offsetTop) {
          setActiveSection('products');
        } else if (aboutEl && scrollPos + offset >= aboutEl.offsetTop) {
          setActiveSection('about');
        } else {
          setActiveSection('home');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Update active section based on current route
  useEffect(() => {
    if (pathname === '/services') {
      setActiveSection('services');
    } else if (pathname === '/contact') {
      setActiveSection('contact');
    } else if (pathname === '/') {
      // Checked by scroll handler
    } else {
      setActiveSection('');
    }
  }, [pathname]);

  // Smooth in-page scroll handler for hash anchors when on home page
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    setIsOpen(false);
    if (pathname === '/' && item.hash) {
      e.preventDefault();
      const target = document.getElementById(item.hash);
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: 'smooth' });
        setActiveSection(item.id);
      }
    } else if (pathname === '/' && item.id === 'home') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveSection('home');
    }
  };

  const handleServicesMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsServicesOpen(true);
  };

  const handleServicesMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsServicesOpen(false);
    }, 180);
  };

  const navigation: NavItem[] = [
    { id: 'home', name: 'Home', href: '/', icon: Home },
    { id: 'about', name: 'About', href: '/#about', hash: 'about', icon: Sparkles },
    { id: 'products', name: 'Products', href: '/#products', hash: 'products', icon: Package },
    { id: 'services', name: 'Services', href: '/services', hasDropdown: true, icon: Flame },
    { id: 'contact', name: 'Contact', href: '/contact', icon: Phone },
  ];

  const services: ServiceItem[] = [
    {
      name: 'LPG Refill',
      href: '/services#refill',
      description: 'Doorstep exchange for 11.8kg, 15kg & 45.5kg cylinders',
      badge: 'Popular',
      icon: Flame,
      iconColor: 'text-[#f8a11b]',
      bgGradient: 'bg-amber-500/10',
    },
    {
      name: 'Bulk Deliveries',
      href: '/services#bulk',
      description: 'High-volume commercial supply for hotels & factories',
      badge: 'Commercial',
      icon: Truck,
      iconColor: 'text-[#f36523]',
      bgGradient: 'bg-orange-500/10',
    },
    {
      name: 'Nationwide Distribution',
      href: '/services#distribution',
      description: 'Certified dealer network and logistics across Pakistan',
      badge: 'Network',
      icon: Factory,
      iconColor: 'text-[#e1382b]',
      bgGradient: 'bg-red-500/10',
    },
  ];

  return (
    <motion.nav
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: 0.12,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={`fixed top-0 left-0 right-0 z-50 w-full max-w-[100vw] transition-all duration-300 ${scrolled
        ? 'glass-navbar shadow-2xl shadow-black/40 py-2.5'
        : 'bg-transparent py-4'
        }`}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-12 w-full min-w-0 gap-3">
          {/* Brand Logo */}
          <div className="min-w-0 shrink max-w-[calc(100%-8rem)] md:max-w-none">
            <Link href="/" className="flex items-center min-w-0 focus:outline-none">
              <div className="min-w-0 overflow-hidden w-[128px] md:w-[165px]">
                <FlamoraAnimatedLogo hideBadge textColor="#ffffff" className="[&_svg]:!px-0" />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Floating Island (Clean & Borderless) */}
          <div className="hidden md:flex items-center">
            <div
              className="flex items-center gap-1 p-1 rounded-full bg-black/40 backdrop-blur-1xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
              onMouseLeave={() => setHoveredNav(null)}
            >
              {navigation.map((item) => {
                const isActive = activeSection === item.id;
                const isHovered = hoveredNav === item.id;

                if (item.hasDropdown) {
                  return (
                    <div
                      key={item.id}
                      className="relative"
                      onMouseEnter={() => {
                        setHoveredNav(item.id);
                        handleServicesMouseEnter();
                      }}
                      onMouseLeave={() => {
                        handleServicesMouseLeave();
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsServicesOpen((prev) => !prev);
                        }}
                        className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full focus:outline-none cursor-pointer ${isActive
                          ? '!text-white font-semibold'
                          : isHovered
                            ? '!text-white'
                            : '!text-zinc-300 hover:!text-white'
                          }`}
                      >
                        <span>{item.name}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-300 text-zinc-400 ${isServicesOpen ? 'rotate-180 text-[#f8a11b]' : ''
                            }`}
                        />

                        {/* Animated Hover Background Pill (Clean & Borderless) */}
                        {isHovered && (
                          <motion.div
                            layoutId="navbar-hover-glow"
                            className="absolute inset-0 bg-white/10 rounded-full -z-10 shadow-sm"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}

                        {/* Active State Pill (Clean & Borderless) */}
                        {isActive && !isHovered && (
                          <motion.div
                            layoutId="navbar-active-glow"
                            className="absolute inset-0 bg-white/[0.12] rounded-full -z-10 shadow-inner"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>

                      {/* Mega Dropdown Menu (Clean & Borderless) */}
                      <AnimatePresence>
                        {isServicesOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-88 p-2 rounded-2xl bg-black/60 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_32px_rgba(0,0,0,0.4)] z-[60] before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3"
                          >
                            <div className="space-y-1">
                              {services.map((service) => {
                                const IconComponent = service.icon;
                                return (
                                  <Link
                                    key={service.name}
                                    href={service.href}
                                    onClick={() => {
                                      setIsServicesOpen(false);
                                      setIsOpen(false);
                                    }}
                                    className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
                                  >
                                    <div
                                      className={`w-9 h-9 rounded-lg ${service.bgGradient} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform duration-200`}
                                    >
                                      <IconComponent className={`w-4 h-4 ${service.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold !text-white group-hover:!text-[#f8a11b] transition-colors">
                                          {service.name}
                                        </span>
                                        {service.badge && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f8a11b]/15 text-[#f8a11b]">
                                            {service.badge}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs !text-zinc-400 group-hover:!text-zinc-300 transition-colors mt-0.5 line-clamp-1 leading-snug">
                                        {service.description}
                                      </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                                  </Link>
                                );
                              })}
                            </div>

                            {/* Dropdown Footer (Clean & Borderless) */}
                            <div className="mt-2 pt-2 px-2.5 flex items-center justify-between">
                              <Link
                                href="/services"
                                onClick={() => setIsServicesOpen(false)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold !text-[#f8a11b] hover:!text-[#f36523] transition-colors group py-1"
                              >
                                <span>Explore all services</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                              </Link>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                                24/7 Supply
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    onMouseEnter={() => setHoveredNav(item.id)}
                    className={`relative z-10 px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full focus:outline-none cursor-pointer ${isActive
                      ? '!text-white font-semibold'
                      : isHovered
                        ? '!text-white'
                        : '!text-zinc-300 hover:!text-white'
                      }`}
                  >
                    <span>{item.name}</span>

                    {/* Animated Hover Background Pill (Clean & Borderless) */}
                    {isHovered && (
                      <motion.div
                        layoutId="navbar-hover-glow"
                        className="absolute inset-0 bg-white/10 rounded-full -z-10 shadow-sm"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Active State Pill (Clean & Borderless) */}
                    {isActive && !isHovered && (
                      <motion.div
                        layoutId="navbar-active-glow"
                        className="absolute inset-0 bg-white/[0.12] rounded-full -z-10 shadow-inner"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Side CTAs */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {/* Primary Order CTA */}
            <Link
              href="/shop"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2 text-sm font-bold !text-white flame-gradient animated-gradient-x rounded-full shadow-[0_0_20px_rgba(243,101,35,0.35)] hover:shadow-[0_0_30px_rgba(243,101,35,0.55)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            >
              <Flame className="w-4 h-4 text-white" />
              <span>Order Now</span>
            </Link>

            {/* Dashboard (Authenticated) */}
            {session && (
              <Link
                href="/dashboard"
                className="group hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium !text-zinc-200 hover:!text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-full transition-all duration-300"
              >
                <User className="w-4 h-4 text-[#f8a11b]" />
                <span>Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {/* Login (Unauthenticated) */}
            {!session && (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold !text-zinc-200 hover:!text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-full transition-all duration-300 shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#f8a11b]" />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              className="md:hidden p-2 rounded-full bg-white/[0.06] text-zinc-200 hover:text-white hover:bg-white/10 transition-colors shrink-0 focus:outline-none"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Clean & Borderless) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="md:hidden mt-3 rounded-3xl bg-black/60 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-3 overflow-hidden w-full"
            >
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  if (item.hasDropdown) {
                    return (
                      <div key={item.id} className="rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIsServicesOpen(!isServicesOpen)}
                          className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive
                            ? '!text-[#f8a11b] bg-white/[0.08]'
                            : '!text-zinc-200 hover:!text-white hover:bg-white/[0.05]'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#f8a11b]' : 'text-zinc-400'}`} />
                            <span>{item.name}</span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-300 text-zinc-400 ${isServicesOpen ? 'rotate-180 text-[#f8a11b]' : ''
                              }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isServicesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pl-3 pr-2 py-1 space-y-1 bg-black/40 rounded-xl mt-1"
                            >
                              {services.map((service) => {
                                const ServiceIcon = service.icon;
                                return (
                                  <Link
                                    key={service.name}
                                    href={service.href}
                                    onClick={() => {
                                      setIsOpen(false);
                                      setIsServicesOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg !text-zinc-300 hover:!text-white hover:bg-white/10 transition-colors text-xs font-medium"
                                  >
                                    <div className={`w-7 h-7 rounded-md ${service.bgGradient} flex items-center justify-center shrink-0`}>
                                      <ServiceIcon className={`w-3.5 h-3.5 ${service.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold !text-white text-xs">{service.name}</p>
                                      <p className="!text-zinc-400 text-[11px] truncate">{service.description}</p>
                                    </div>
                                  </Link>
                                );
                              })}
                              <Link
                                href="/services"
                                onClick={() => {
                                  setIsOpen(false);
                                  setIsServicesOpen(false);
                                }}
                                className="block text-center py-2 text-xs font-semibold !text-[#f8a11b] hover:underline"
                              >
                                View all services →
                              </Link>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive
                        ? '!text-[#f8a11b] bg-white/[0.08] font-semibold'
                        : '!text-zinc-200 hover:!text-white hover:bg-white/[0.05]'
                        }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#f8a11b]' : 'text-zinc-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Mobile Order CTA */}
                <div className="pt-2 px-1">
                  <Link
                    href="/shop"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 flame-gradient animated-gradient-x !text-white font-bold rounded-2xl shadow-lg shadow-[#f36523]/25 active:scale-[0.98] transition-transform"
                  >
                    <Flame className="w-4 h-4 text-white" />
                    <span>Order Now</span>
                  </Link>
                </div>

                {/* Mobile Dashboard Link */}
                {session && (
                  <div className="pt-1 px-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.05] !text-[#f8a11b] text-sm font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Dashboard</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}