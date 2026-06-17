'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  ChevronRight, Flame, Shield, Zap, Truck, Star,
  Phone, Mail, MapPin, User, Clock, Award,
  Home, Building2, Factory, ChevronDown,
  CheckCircle2, ArrowRight, Sparkles, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePublicSiteSettings } from '@/components/providers/PublicSiteSettingsProvider';
import { phoneToTelHref, phoneToWhatsAppHref } from '@/lib/public-site-settings';
import FlamoraHero from '@/components/pages/FlamoraHero';


/* ─── Animated Counter Hook ─── */
function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!startOnView || !inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView, startOnView]);

  return { count, ref };
}

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 50 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] as const }
  })
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } }
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.6, delay: i * 0.15, ease: 'easeOut' as const }
  })
};
const slideInLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' as const } }
};
const slideInRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' as const } }
};


/* ─── Cylinder Products ─── */
const cylinders = [
  {
    name: 'Domestic',
    weight: '11.8 KG',
    icon: Home,
    audience: 'B2C — For Homes',
    color: '#f8a11b',
    description: 'Perfect for everyday household cooking. Reliable, safe, and long-lasting for families.',
    features: ['Safe for home use', 'Easy to handle', 'Ideal for daily cooking', 'Compact design']
  },
  {
    name: 'Standard',
    weight: '15 KG',
    icon: Building2,
    audience: 'B2C / B2B',
    color: '#f36523',
    description: 'Our versatile mid-range cylinder for small restaurants, cafes, and larger households.',
    features: ['Versatile usage', 'Extended burn time', 'Restaurant ready', 'Best value']
  },
  {
    name: 'Commercial',
    weight: '44.5 KG',
    icon: Factory,
    audience: 'B2B — Industries & Restaurants',
    color: '#e1382b',
    description: 'Heavy-duty cylinders designed for high-demand commercial kitchens and industrial operations.',
    features: ['Industrial grade', 'Maximum capacity', 'Bulk discounts', 'Priority delivery']
  }
];

/* ─── Testimonials ─── */
const testimonials = [
  { 
    name: 'Ahmed Hassan', 
    role: 'Restaurant Owner, Peshawar', 
    content: 'We run a busy restaurant in Peshawar. Sui gas pressure is always low in winters, so we shifted to Flamora. Their 44.5KG cylinders last us about a week and delivery is very prompt. 4 stars because once they got late by an hour during heavy rain, but overall highly recommended.', 
    rating: 4 
  },
  { 
    name: 'Fatima Bibi', 
    role: 'Homemaker, Islamabad', 
    content: 'Ordered for the first time on recommendation of my neighbor. The gas burns very clean, no black soot on my pots. Direct doorstep delivery is super convenient for household chores.', 
    rating: 5 
  },
  { 
    name: 'Tariq Mehmood', 
    role: 'Industrial Manager, Lahore', 
    content: 'Excellent rates and very professional commercial supply.', 
    rating: 5 
  },
  { 
    name: 'Ayesha Khan', 
    role: 'Hotel Manager, Karachi', 
    content: 'We run a hotel in Karachi. Flamora handles our bulk delivery safely. Their staff is well trained and always double checks the connection valves for leaks. Great safety standards.', 
    rating: 5 
  },
  { 
    name: 'Mohammad Ali', 
    role: 'Baker, Rawalpindi', 
    content: 'Bohat acchi service hai, deliveries are always quick!', 
    rating: 5 
  },
  { 
    name: 'Sana Malik', 
    role: 'Homemaker, Faisalabad', 
    content: 'Highly satisfied with their customer care. The delivery person actually inspected my stove hose pipe and recommended a change because it was getting old. Safety first!', 
    rating: 5 
  },
  { 
    name: 'Usman Sheikh', 
    role: 'Factory Supervisor, Sialkot', 
    content: 'Decent prices, accurate weight, and quick response.', 
    rating: 4 
  },
  { 
    name: 'Nadia Javed', 
    role: 'Café Owner, Multan', 
    content: 'Ordering through WhatsApp is super convenient. Usually gets delivered within 2 hours of booking.', 
    rating: 5 
  },
  { 
    name: 'Bilal Raza', 
    role: 'Dhaba Owner, Mardan', 
    content: 'Sui gas ka pressure boht kam hota hai winter mein. Flamora is our main source now. Best decision for my shop.', 
    rating: 5 
  },
  { 
    name: 'Hira Noor', 
    role: 'Homemaker, Abbottabad', 
    content: 'Best gas delivery service in Abbottabad.', 
    rating: 5 
  },
  { 
    name: 'Zainab Fatima', 
    role: 'Homemaker, Quetta', 
    content: 'Now ordering gas is just one call away. Very convenient.', 
    rating: 5 
  },
  { 
    name: 'Asad Iqbal', 
    role: 'Textile Mill Owner, Faisalabad', 
    content: 'Been using their commercial cylinders for 6 months now. High pressure, consistent flow, and very transparent billing system. Good B2B partner.', 
    rating: 5 
  },
  { 
    name: 'Mehreen Abbas', 
    role: 'Caterer, Islamabad', 
    content: 'Super reliable LPG delivery for our catering business.', 
    rating: 5 
  },
  { 
    name: 'Kamran Yousaf', 
    role: 'Restaurant Chain Manager, Lahore', 
    content: 'We operate 12 branches and Flamora supplies all of them. The billing process is streamlined, and their customer portal makes tracking easy.', 
    rating: 5 
  },
  { 
    name: 'Rizwan Ahmed', 
    role: 'Hotel Chef, Swat', 
    content: 'Great service and delivery even in Swat valley.', 
    rating: 5 
  },
  { 
    name: 'Kiran Batool', 
    role: 'Homemaker, Sargodha', 
    content: 'Highly recommended! Clean gas and safe cylinders.', 
    rating: 5 
  },
  { 
    name: 'Waqas Ali', 
    role: 'Food Truck Owner, Karachi', 
    content: 'We use the 15KG cylinder on our food truck. Easy to transport and burns cleanly. Delivery is sometimes delayed in heavy Karachi traffic but they keep us updated.', 
    rating: 4 
  },
  { 
    name: 'Samina Rafiq', 
    role: 'Boutique Hotel Owner, Nathia Gali', 
    content: 'Running a boutique hotel in the mountains means unpredictable supply chains. Flamora never disappoints regardless of weather or terrain. Outstanding service!', 
    rating: 5 
  },
  { 
    name: 'Hamza Tariq', 
    role: 'Pizza Restaurant Owner, Islamabad', 
    content: 'Perfect pressure consistency for baking ovens.', 
    rating: 5 
  },
  { 
    name: 'Aqsa Mahmood', 
    role: 'Homemaker, Hyderabad', 
    content: 'Ordered on WhatsApp and got delivery in 90 mins.', 
    rating: 5 
  },
  { 
    name: 'Tahira Parveen', 
    role: 'Homemaker, Okara', 
    content: 'Extremely safe cylinders and helpful delivery boys.', 
    rating: 5 
  },
  { 
    name: 'Danish Mirza', 
    role: 'Biryani Restaurant Owner, Karachi', 
    content: 'Making biryani for 1000 people daily requires serious gas. Flamora 44.5KG cylinders handle the load easily without drops in pressure.', 
    rating: 5 
  },
  { 
    name: 'Saima Naz', 
    role: 'Homemaker, Mingora', 
    content: 'Service is good. Sometimes in extreme snow it takes a bit longer, but they are the only ones who deliver to our doorstep in Mingora.', 
    rating: 4 
  },
  { 
    name: 'Amir Sohail', 
    role: 'Ceramics Factory Owner, Gujrat', 
    content: 'Our kilns need precise temperature control. Flamora premium LPG delivers exactly that. Highly professional team.', 
    rating: 5 
  },
  { 
    name: 'Raza Khan', 
    role: 'Trucking Company Owner, Quetta', 
    content: 'Very satisfied with their commercial supply in Quetta.', 
    rating: 5 
  },
];

/* ─── Stats ─── */
const stats = [
  { label: 'Happy Customers', value: 5000, suffix: '+' },
  { label: 'Years of Trust', value: 10, suffix: '+' },
  { label: 'Deliveries/Month', value: 2000, suffix: '+' },
  { label: 'Cylinder Types', value: 3, suffix: '' }
];

/* ─── How It Works Steps ─── */
const steps = [
  { step: 1, title: 'Place Your Order', description: 'Call us, WhatsApp, or use our app to place your cylinder order in seconds.', icon: Phone },
  { step: 2, title: 'We Deliver Fast', description: 'Our trained delivery team brings the cylinder right to your doorstep safely.', icon: Truck },
  { step: 3, title: 'You Enjoy', description: 'Cook with clean, safe LPG gas — hassle-free. We handle the rest.', icon: Flame }
];

/* ─── Features ─── */
const features = [
  { icon: Truck, title: 'Lightning Fast Delivery', desc: 'Same-day delivery across major cities. We value your time and never keep you waiting.' },
  { icon: Shield, title: 'Safety Certified', desc: 'Every cylinder undergoes rigorous safety checks. We comply with all Pakistani safety standards.' },
  { icon: Zap, title: 'Competitive Pricing', desc: 'The best LPG rates in the market. No hidden charges. Transparent pricing you can trust.' },
  { icon: Clock, title: '24/7 Support', desc: 'Our support team is always available. Call, WhatsApp, or message us anytime.' }
];


export default function LandingPage() {
  const { data: session } = useSession();
  const { settings } = usePublicSiteSettings();
  const [activeTab, setActiveTab] = useState<'b2c' | 'b2b'>('b2c');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="landing-page relative min-h-screen bg-[#0a0e14]">

      {/* ═══════════════════════════════════════════
          SECTION 1: HERO (Flamora Cylinder)
          ═══════════════════════════════════════════ */}
      <section
        ref={heroRef}
        id="hero"
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black"
      >
        {/* Cylinder + flame visual */}
        <div className="absolute inset-0 z-0">
          <FlamoraHero />
        </div>

        {/* Floating Ember Particles */}
        <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: i % 2 === 0 ? '#f36523' : '#f8a11b',
                left: `${15 + i * 14}%`,
                bottom: '10%',
              }}
              animate={{
                y: [-20, -180],
                opacity: [0.8, 0],
                scale: [1, 0.3],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                repeatType: 'loop',
                delay: i * 0.8,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <motion.div
          className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          style={{ opacity: heroOpacity, y: heroY }}
        >
          <div className="flex min-h-screen translate-y-16 flex-col items-center justify-center gap-5 pt-28 pb-16 lg:translate-y-0 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.9fr)_minmax(0,1.05fr)] lg:gap-10 lg:py-16">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-center lg:text-left lg:pr-4"
            >
              <h1 className="font-[var(--font-space-grotesk)] text-5xl sm:text-6xl md:text-7xl lg:text-[clamp(3.6rem,5.2vw,6.25rem)] font-bold leading-[0.95] tracking-tight drop-shadow-[0_10px_36px_rgba(0,0,0,0.55)]">
                <span className="text-white lg:hidden">Gas Right To</span>
                <span className="hidden text-white lg:inline lg:whitespace-nowrap">Gas Right</span>
                <br />
                <span className="text-gradient-flamora animated-gradient-x lg:hidden">Your Doorstep</span>
                <span className="hidden text-white lg:inline lg:whitespace-nowrap">To </span>
                <span className="hidden text-gradient-flamora animated-gradient-x lg:inline lg:whitespace-nowrap">Your</span>
                <br />
                <span className="hidden text-gradient-flamora animated-gradient-x lg:inline lg:whitespace-nowrap">Doorstep</span>
              </h1>
            </motion.div>

            <div aria-hidden="true" className="hidden lg:block" />

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mx-auto flex max-w-xl flex-col items-center text-center lg:ml-auto lg:mr-0 lg:-translate-y-1"
            >
              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-white/5 border border-white/10 text-white/80 backdrop-blur-sm">
                  <Sparkles className="w-4 h-4 text-[#f8a11b]" />
                  Trusted LPG Distribution Partner
                </span>
              </div>

              <p className="max-w-2xl font-[var(--font-inter)] text-lg md:text-xl font-normal text-white/68 leading-relaxed drop-shadow-[0_8px_28px_rgba(0,0,0,0.55)] lg:max-w-xl">
                {settings.heroSubtitle}
              </p>

              <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row lg:flex-row">
                <Link
                  href="/shop"
                  className="group relative inline-flex w-[220px] items-center justify-center px-8 py-4 text-lg font-bold text-white flame-gradient animated-gradient-x rounded-2xl shadow-[0_0_30px_rgba(243,101,35,0.3)] hover:shadow-[0_0_50px_rgba(243,101,35,0.5)] transform hover:-translate-y-1 transition-all duration-300 sm:w-auto lg:min-w-[180px]"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Flame className="w-5 h-5" />
                    Order Now
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>

                <Link
                  href="/contact"
                  className="group inline-flex w-[190px] items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 sm:w-auto lg:min-w-[180px]"
                >
                  <span className="flex items-center gap-3 whitespace-nowrap">
                    <Phone className="w-5 h-5 text-[#f8a11b]" />
                    Contact Us
                  </span>
                </Link>

              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-scroll-bounce">
          <ChevronDown className="w-6 h-6 text-white/30" />
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 2: STATS BAR
          ═══════════════════════════════════════════ */}
      <section className="relative py-16 bg-[#0d1117] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const { count, ref } = useCounter(stat.value);
              return (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="text-center"
                >
                  <span ref={ref} className="stat-counter text-4xl md:text-5xl font-black text-gradient-flamora">
                    {count.toLocaleString()}{stat.suffix}
                  </span>
                  <p className="text-white/40 mt-2 text-sm font-medium uppercase tracking-widest">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 3: ABOUT / WHO WE ARE
          ═══════════════════════════════════════════ */}
      <section id="about" className="relative py-24 bg-[#0a0e14] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <motion.div
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
                About Flamora
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Fueling Pakistan&apos;s
                <br />
                <span className="text-gradient-flamora">Homes & Industries</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-8">
                Flamora is a premium LPG distribution company committed to delivering clean, safe,
                and affordable energy solutions across Pakistan. We serve both household customers (B2C)
                and businesses including restaurants and industrial operations (B2B) with three
                specialized cylinder types.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'B2C Homes', icon: Home },
                  { label: 'B2B Business', icon: Building2 },
                  { label: 'Safety First', icon: Shield },
                  { label: 'Fast Delivery', icon: Truck }
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-white/60">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-[#f36523]" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Image */}
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden animate-float">
                <img
                  src="/images/section-pattern.webp"
                  alt="Flamora warehouse operations"
                  className="object-cover rounded-3xl w-full h-[450px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent" />
              </div>
              {/* Floating stat card */}
              <motion.div
                className="absolute -bottom-6 -left-6 glass-card p-5"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 flame-gradient rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">10+ Years</p>
                    <p className="text-white/40 text-sm">Of Excellence</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 4: OUR CYLINDERS
          ═══════════════════════════════════════════ */}
      <section id="products" className="relative py-24 bg-[#0d1117]">
        {/* Subtle mesh gradient background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#f36523]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#f8a11b]/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
              Our Products
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Choose Your <span className="text-gradient-flamora">Cylinder</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              Three specialized cylinder types designed for every need — from home cooking to industrial operations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {cylinders.map((cyl, i) => (
              <motion.div
                key={cyl.name}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="product-card-glow glass-card p-8 text-center group"
              >
                {/* Icon */}
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-500 group-hover:scale-110"
                  style={{ background: `${cyl.color}15`, border: `1px solid ${cyl.color}30` }}
                >
                  <cyl.icon className="w-10 h-10" style={{ color: cyl.color }} />
                </div>

                {/* Weight Badge */}
                <div
                  className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-4"
                  style={{ background: `${cyl.color}15`, color: cyl.color, border: `1px solid ${cyl.color}25` }}
                >
                  {cyl.weight}
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{cyl.name}</h3>
                <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-4" style={{ color: cyl.color }}>
                  {cyl.audience}
                </p>
                <p className="text-white/40 text-sm mb-6 leading-relaxed">{cyl.description}</p>

                {/* Features List */}
                <ul className="space-y-2 text-left mb-8">
                  {cyl.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white/50 text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: cyl.color }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/shop"
                  className="group relative z-10 inline-flex w-full cursor-pointer items-center justify-center py-3 px-6 rounded-xl font-bold text-white animated-gradient-x transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(243,101,35,0.3)]"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${cyl.color} 0%, ${cyl.color}cc 25%, #f8a11b 50%, ${cyl.color} 75%, ${cyl.color}cc 100%)`,
                  }}
                >
                  <span className="flex items-center gap-2">
                    Order Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 5: B2C vs B2B
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Who We Serve
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Solutions for <span className="text-gradient-flamora">Everyone</span>
            </h2>
          </motion.div>

          {/* Tabs */}
          <div className="flex justify-center mb-12">
            <div className="glass-card inline-flex p-1.5 gap-1">
              <button
                onClick={() => setActiveTab('b2c')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'b2c'
                  ? 'flame-gradient text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  For Homes (B2C)
                </span>
              </button>
              <button
                onClick={() => setActiveTab('b2b')}
                className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'b2b'
                  ? 'flame-gradient text-white shadow-lg'
                  : 'text-white/50 hover:text-white/80'
                  }`}
              >
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  For Business (B2B)
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            {activeTab === 'b2c' ? (
              <>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Clean Energy for Your <span className="text-[#f8a11b]">Home</span>
                  </h3>
                  <p className="text-white/50 text-lg mb-8 leading-relaxed">
                    Flamora delivers safe, certified LPG cylinders right to your doorstep.
                    Our Domestic 11.8KG and Standard 15KG cylinders are perfect for everyday
                    cooking, providing clean and efficient fuel for Pakistani households.
                  </p>
                  <div className="space-y-4">
                    {['Doorstep delivery within hours', 'Safe & certified cylinders', 'Affordable household pricing', 'Easy reorder system', 'Family-safe quality guaranteed'].map((item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#f8a11b]/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#f8a11b]" />
                        </div>
                        <span className="text-white/60">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="glass-card p-8 text-center">
                  <Home className="w-16 h-16 text-[#f8a11b] mx-auto mb-4" />
                  <h4 className="text-2xl font-bold text-white mb-2">Domestic Cylinders</h4>
                  <p className="text-white/40 mb-6">11.8 KG & 15 KG options available</p>
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3 flame-gradient animated-gradient-x text-white font-bold rounded-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    Order for Home <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    Power Your <span className="text-[#e1382b]">Business</span>
                  </h3>
                  <p className="text-white/50 text-lg mb-8 leading-relaxed">
                    From restaurant kitchens to industrial facilities, Flamora provides
                    reliable commercial-grade LPG supply. Our 44.5KG Commercial cylinders
                    and bulk delivery options keep your operations running smoothly.
                  </p>
                  <div className="space-y-4">
                    {['Priority commercial delivery', 'Bulk order discounts', 'Dedicated account manager', '44.5KG heavy-duty cylinders', 'Custom delivery schedules'].map((item, i) => (
                      <motion.div
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-[#e1382b]/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#e1382b]" />
                        </div>
                        <span className="text-white/60">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="glass-card p-8 text-center">
                  <Factory className="w-16 h-16 text-[#e1382b] mx-auto mb-4" />
                  <h4 className="text-2xl font-bold text-white mb-2">Commercial Cylinders</h4>
                  <p className="text-white/40 mb-6">44.5 KG & bulk supply available</p>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#e1382b] to-[#f36523] text-white font-bold rounded-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    Get Business Quote <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 6: WHY CHOOSE FLAMORA
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
              Why Flamora
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why Businesses & Homes <span className="text-gradient-flamora">Choose Us</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass-card p-8 text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f36523]/20 to-[#f8a11b]/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 border border-[#f36523]/15">
                  <feature.icon className="w-8 h-8 text-[#f36523]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 7: HOW IT WORKS
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 bg-[#0a0e14]">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white">
              How It <span className="text-gradient-flamora">Works</span>
            </h2>
          </motion.div>

          <div className="relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-16 left-[16.5%] right-[16.5%] h-[2px] bg-gradient-to-r from-[#f8a11b]/30 via-[#f36523]/50 to-[#e1382b]/30" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {steps.map((s, i) => (
                <motion.div
                  key={s.step}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  className="text-center relative"
                >
                  {/* Step Number Circle */}
                  <div className="relative z-10 w-32 h-32 mx-auto mb-8 rounded-full bg-[#0d1117] border-2 border-white/10 flex items-center justify-center group transition-all duration-500 hover:border-[#f36523]/40">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center flame-gradient animate-gradient">
                      <s.icon className="w-10 h-10 text-white" />
                    </div>
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white text-[#0a0e14] flex items-center justify-center text-sm font-black shadow-lg">
                      {s.step}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto">{s.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 8: TESTIMONIALS
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Testimonials
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              What Our Customers <span className="text-gradient-flamora">Say</span>
            </h2>
          </motion.div>

          {/* Infinite Marquee */}
          <div className="relative overflow-hidden">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#0d1117] to-transparent z-10 pointer-events-none" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#0d1117] to-transparent z-10 pointer-events-none" />

            <div
              className="flex gap-6 marquee-track"
              style={{
                animation: 'marquee-scroll 200s linear infinite',
                width: 'max-content',
              }}
            >
              {/* Duplicate cards for seamless loop */}
              {[...testimonials, ...testimonials].map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="glass-card p-8 flex-shrink-0 w-[380px]"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-[#f8a11b] fill-[#f8a11b]" />
                    ))}
                  </div>
                  <p className="text-white/60 italic mb-6 leading-relaxed text-sm">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flame-gradient flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      <p className="text-white/30 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 9: CTA BANNER
          ═══════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 flame-gradient animate-gradient opacity-90" />
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
          <FlamoraHero />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-white/20"
              style={{ left: `${10 + i * 12}%`, bottom: '15%' }}
              animate={{ y: [-10, -140], opacity: [0.6, 0] }}
              transition={{ duration: 3 + i * 0.3, repeat: Infinity, delay: i * 0.6 }}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              Ready to Get Your<br />LPG Delivered?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
              Order your preferred cylinder today — Domestic, Standard, or Commercial.
              We deliver right to your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shop"
                className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold bg-white text-[#e1382b] rounded-2xl shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <span className="flex items-center gap-3">
                  <Flame className="w-5 h-5" />
                  Order Now
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white bg-black/20 border-2 border-white/30 hover:bg-black/30 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                <span className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Us
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 10: CONTACT
          ═══════════════════════════════════════════ */}
      <section id="contact" className="relative py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
              Get In Touch
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Contact <span className="text-gradient-flamora">{settings.companyName}</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Have questions? Need a quote? Reach out to us anytime — we&apos;re here to help.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Phone, title: 'Call Us', info: settings.phonePrimary, sub: settings.businessHoursWeekday, href: phoneToTelHref(settings.phonePrimary) },
              { icon: MessageCircle, title: 'WhatsApp', info: settings.phonePrimary, sub: 'Quick Response', href: phoneToWhatsAppHref(settings.whatsappNumber || settings.phonePrimary) },
              { icon: Mail, title: 'Email', info: settings.emailPrimary, sub: '24hr Response', href: `mailto:${settings.emailPrimary}` },
              { icon: MapPin, title: 'Head Office', info: settings.locationHeadline, sub: settings.locationSubtitle, href: undefined as string | undefined },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={scaleIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="glass-card p-8 text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#f36523]/10 border border-[#f36523]/15 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="w-7 h-7 text-[#f36523]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                {item.href ? (
                  <a href={item.href} className="text-[#f8a11b] font-semibold mb-1 block hover:underline">
                    {item.info}
                  </a>
                ) : (
                  <p className="text-[#f8a11b] font-semibold mb-1">{item.info}</p>
                )}
                <p className="text-white/30 text-sm">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}