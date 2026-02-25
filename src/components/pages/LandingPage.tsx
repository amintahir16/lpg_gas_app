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
  { name: 'Ahmed Hassan', role: 'Restaurant Owner, Peshawar', content: 'Flamora transformed our kitchen operations. The 44.5KG cylinders last longer and their delivery is always on time. Absolutely the best LPG provider.', rating: 5 },
  { name: 'Fatima Bibi', role: 'Homemaker, Islamabad', content: 'I switched to Flamora for my home cooking needs and the difference is remarkable. Clean gas, safe cylinders, and doorstep delivery!', rating: 5 },
  { name: 'Tariq Mehmood', role: 'Industrial Manager, Lahore', content: 'Managing fuel for our factory was always a headache until we partnered with Flamora. Reliable supply chain and competitive pricing.', rating: 5 },
  { name: 'Ayesha Khan', role: 'Hotel Manager, Karachi', content: 'We run a 200-room hotel and Flamora has never missed a single delivery. Their bulk packages save us thousands every month.', rating: 5 },
  { name: 'Mohammad Ali', role: 'Baker, Rawalpindi', content: 'My bakery depends on consistent gas supply. Flamora ensures I never run out during peak hours. Best decision for my business.', rating: 5 },
  { name: 'Sana Malik', role: 'Homemaker, Faisalabad', content: 'The safety features on Flamora cylinders give me peace of mind. Their team even taught us proper handling. Truly caring service!', rating: 5 },
  { name: 'Usman Sheikh', role: 'Factory Supervisor, Sialkot', content: 'We switched from our old supplier to Flamora and saw a 20% cost reduction. The commercial cylinders are top-notch quality.', rating: 5 },
  { name: 'Nadia Javed', role: 'Café Owner, Multan', content: 'Flamora customer service is incredible. One call and they are at our doorstep within hours. Cannot imagine going back.', rating: 5 },
  { name: 'Bilal Raza', role: 'Dhaba Owner, Mardan', content: 'Running a roadside dhaba needs constant gas. Flamora keeps us fueled even during peak dinner rush. Excellent reliability!', rating: 5 },
  { name: 'Hira Noor', role: 'Homemaker, Abbottabad', content: 'Living in the hills makes delivery tricky but Flamora reaches us without fail. Their drivers are polite and professional.', rating: 5 },
  { name: 'Kamran Yousaf', role: 'Restaurant Chain Manager, Lahore', content: 'We operate 12 branches and Flamora supplies all of them. Consistent quality across every single delivery.', rating: 5 },
  { name: 'Zainab Fatima', role: 'Homemaker, Quetta', content: 'Before Flamora, getting a cylinder refilled was a whole day task. Now it is just one phone call. Life-changing convenience.', rating: 5 },
  { name: 'Asad Iqbal', role: 'Textile Mill Owner, Faisalabad', content: 'Our textile operations need precise heat control. Flamora commercial grade cylinders deliver consistent pressure every time.', rating: 5 },
  { name: 'Mehreen Abbas', role: 'Caterer, Islamabad', content: 'As a professional caterer, I need gas at multiple event locations. Flamora delivers wherever I need them, on time every single event.', rating: 5 },
  { name: 'Faisal Nawaz', role: 'Dairy Farm Owner, Sahiwal', content: 'Our dairy processing unit relies on Flamora for steam generation. Zero downtime since we made the switch. Superb service!', rating: 5 },
  { name: 'Rabia Aslam', role: 'Homemaker, Gujranwala', content: 'The 11.8KG cylinder is perfect for my small family. Lasts a whole month and the price is very reasonable. Happy customer!', rating: 5 },
  { name: 'Nawaz Sharif', role: 'Brick Kiln Operator, Jhang', content: 'Switched our kiln auxiliary heating to Flamora LPG. Cleaner operations and better compliance with environmental standards.', rating: 5 },
  { name: 'Amna Khalid', role: 'School Principal, Peshawar', content: 'We use Flamora for our school kitchen that feeds 500 students daily. Safe, reliable and affordable. Great for institutions.', rating: 5 },
  { name: 'Rizwan Ahmed', role: 'Hotel Chef, Swat', content: 'Cooking for tourists in Swat valley requires top-notch gas supply. Flamora delivers even to remote areas. Truly impressive reach!', rating: 5 },
  { name: 'Shabana Gul', role: 'Homemaker, DI Khan', content: 'I was nervous about gas safety but Flamora provided a free inspection and educated my family. They genuinely care about customers.', rating: 5 },
  { name: 'Imran Qureshi', role: 'Auto Workshop Owner, Lahore', content: 'We use LPG for our paint booth heating system. Flamora commercial supply is consistent and their pricing is unbeatable in the market.', rating: 5 },
  { name: 'Kiran Batool', role: 'Homemaker, Sargodha', content: 'Flamora replaced my old leaky cylinder for free during a routine delivery. That level of customer care is rare these days.', rating: 5 },
  { name: 'Waqas Ali', role: 'Food Truck Owner, Karachi', content: 'My food truck needs portable reliable gas. Flamora 15KG cylinders are perfect. Easy to transport and long-lasting performance.', rating: 5 },
  { name: 'Samina Rafiq', role: 'Boutique Hotel Owner, Nathia Gali', content: 'Running a boutique hotel in the mountains means unpredictable supply chains. Flamora never disappoints regardless of weather or terrain.', rating: 5 },
  { name: 'Zahid Hussain', role: 'Poultry Farm Manager, Chakwal', content: 'Our brooder heating systems run on Flamora LPG. Consistent heat output means healthier chicks and better farm productivity overall.', rating: 5 },
  { name: 'Nasreen Akhtar', role: 'Homemaker, Bahawalpur', content: 'Five years with Flamora and not a single safety incident. Their cylinders are always in perfect condition and properly maintained.', rating: 5 },
  { name: 'Hamza Tariq', role: 'Pizza Restaurant Owner, Islamabad', content: 'Our wood-fired pizza oven backup runs on Flamora. Perfect flame control and the gas burns cleanly. Our pizzas taste even better!', rating: 5 },
  { name: 'Aqsa Mahmood', role: 'Homemaker, Hyderabad', content: 'Flamora WhatsApp ordering is so convenient. I just message them and the cylinder is at my door within 3 hours. Modern and efficient service.', rating: 5 },
  { name: 'Shahbaz Gill', role: 'Construction Site Manager, Gwadar', content: 'Supplying gas to remote construction sites is challenging. Flamora logistics team handles it professionally every single time.', rating: 5 },
  { name: 'Farah Deeba', role: 'Cooking Class Instructor, Lahore', content: 'I run cooking classes for 30 students and need reliable gas. Flamora keeps my kitchen running smoothly session after session.', rating: 5 },
  { name: 'Junaid Akbar', role: 'Greenhouse Operator, Swabi', content: 'Our greenhouse heating depends entirely on Flamora. Even in harsh winters they deliver on schedule. Crops have never been healthier.', rating: 5 },
  { name: 'Rubina Shah', role: 'Homemaker, Kohat', content: 'The delivery boy always checks the regulator and connection before leaving. Such attention to detail sets Flamora apart from competitors.', rating: 5 },
  { name: 'Owais Rauf', role: 'Laundry Business Owner, Rawalpindi', content: 'Our industrial irons and dryers need constant heat. Flamora commercial supply keeps our laundry business running without any interruptions.', rating: 5 },
  { name: 'Tahira Parveen', role: 'Homemaker, Okara', content: 'My neighbor recommended Flamora and now my whole street uses them. Best gas company in Punjab without any doubt at all.', rating: 5 },
  { name: 'Danish Mirza', role: 'Biryani Restaurant Owner, Karachi', content: 'Making biryani for 1000 people daily requires serious gas. Flamora 44.5KG cylinders handle the load easily. Outstanding product quality!', rating: 5 },
  { name: 'Saima Naz', role: 'Homemaker, Mingora', content: 'Even in Swat where supply chains struggle, Flamora delivers on time consistently. They have truly expanded their reach impressively.', rating: 5 },
  { name: 'Amir Sohail', role: 'Ceramics Factory Owner, Gujrat', content: 'Our kilns need precise temperature control and clean fuel. Flamora premium LPG delivers exactly that with consistent quality every batch.', rating: 5 },
  { name: 'Bushra Amin', role: 'Daycare Center Owner, Islamabad', content: 'Safety is my top priority with children around. Flamora cylinders have the best safety certifications. I trust them completely.', rating: 5 },
  { name: 'Raza Khan', role: 'Trucking Company Owner, Quetta', content: 'We converted some fleet vehicles to LPG with Flamora supply. Fuel costs dropped 35% and emissions improved significantly.', rating: 5 },
  { name: 'Nimra Zafar', role: 'Homemaker, Sukkur', content: 'Flamora offers the most transparent pricing I have seen. No hidden charges, no surprises. Just honest fair business every time.', rating: 5 },
  { name: 'Kashif Mehmood', role: 'Banquet Hall Manager, Lahore', content: 'We host events for 2000+ guests regularly. Flamora ensures we never run out of gas during peak service hours. Absolute professionals!', rating: 5 },
  { name: 'Aliya Saeed', role: 'Homemaker, Peshawar', content: 'I love that Flamora sends a reminder when my cylinder is likely running low. Proactive service that shows they truly care.', rating: 5 },
  { name: 'Naveed Anjum', role: 'Ice Cream Factory Owner, Sahiwal', content: 'Our production line needs uninterrupted gas supply. Flamora bulk delivery contract keeps us running 24/7 without a single hiccup.', rating: 5 },
  { name: 'Misbah Urooj', role: 'Homemaker, Larkana', content: 'My mother-in-law was skeptical but after one month of using Flamora she became their biggest fan. Quality speaks for itself.', rating: 5 },
  { name: 'Farhan Saeed', role: 'BBQ Restaurant Owner, Islamabad', content: 'Our live BBQ stations need perfect flame. Flamora gas gives us the cleanest burn and our customers notice the difference in taste.', rating: 5 },
  { name: 'Zara Batool', role: 'Homemaker, Muzaffarabad', content: 'In AJK where winters are brutal, having reliable LPG is essential. Flamora has been our lifeline for three years running.', rating: 5 },
  { name: 'Hassan Raza', role: 'Glass Manufacturing, Sheikhupura', content: 'Glass blowing needs extremely high and consistent temperatures. Flamora industrial-grade LPG exceeds our quality requirements.', rating: 5 },
  { name: 'Sidra Amin', role: 'Homemaker, Mardan', content: 'Switched from firewood to Flamora LPG and our kitchen is cleaner and cooking is faster. Should have done this years ago!', rating: 5 },
  { name: 'Qaiser Abbas', role: 'Fish Farm Owner, Thatta', content: 'We use Flamora LPG for our fish processing unit. Clean fuel means cleaner product. Our export quality has improved dramatically.', rating: 5 },
  { name: 'Parveen Akhtar', role: 'Homemaker, Turbat', content: 'Even in remote Balochistan, Flamora delivers. I never thought premium LPG service would reach our area. Truly grateful for them.', rating: 5 },
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
  const [activeTab, setActiveTab] = useState<'b2c' | 'b2b'>('b2c');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══════════════════════════════════════════
          SECTION 1: HERO
          ═══════════════════════════════════════════ */}
      <section ref={heroRef} id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Parallax Background */}
        <motion.div className="absolute inset-0 z-0" style={{ scale: heroScale }}>
          <img
            src="/images/hero-bg.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e14]/30 via-[#0a0e14]/40 to-[#0a0e14]" />
        </motion.div>

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
        <motion.div className="relative z-20 text-center px-4 max-w-5xl mx-auto" style={{ opacity: heroOpacity, y: heroY }}>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-white/5 border border-white/10 text-white/80 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-[#f8a11b]" />
              Trusted LPG Distribution Partner
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-[0.95] tracking-tight"
          >
            <span className="text-white">Gas Right To</span>
            <br />
            <span className="text-gradient-flamora">Your Doorstep</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Premium LPG cylinder delivery for homes, restaurants & industries.
            Three cylinder types. One trusted name — <strong className="text-white/90">Flamora</strong>.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/shop"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white flame-gradient rounded-2xl shadow-[0_0_30px_rgba(243,101,35,0.3)] hover:shadow-[0_0_50px_rgba(243,101,35,0.5)] transform hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center gap-3">
                <Flame className="w-5 h-5" />
                Order Now
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>

            <Link
              href="/contact"
              className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
            >
              <span className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#f8a11b]" />
                Contact Us
              </span>
            </Link>

            {session && (
              <Link
                href="/dashboard"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/5 border border-white/15 hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                <span className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[#f8a11b]" />
                  Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            )}
          </motion.div>
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
                  src="/images/section-pattern.png"
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
                  className="inline-flex items-center justify-center w-full py-3 px-6 rounded-xl font-bold text-white transition-all duration-300 hover:-translate-y-1"
                  style={{ background: `linear-gradient(135deg, ${cyl.color}, ${cyl.color}cc)` }}
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
                    className="inline-flex items-center gap-2 px-6 py-3 flame-gradient text-white font-bold rounded-xl hover:-translate-y-1 transition-all duration-300"
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
        <div className="absolute inset-0 bg-[url('/images/section-pattern.png')] bg-cover opacity-10 mix-blend-overlay" />

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
              Contact <span className="text-gradient-flamora">Flamora</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Have questions? Need a quote? Reach out to us anytime — we&apos;re here to help.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Phone, title: 'Call Us', info: '+92 300 1234567', sub: 'Mon-Sat, 8AM-10PM' },
              { icon: MessageCircle, title: 'WhatsApp', info: '+92 300 1234567', sub: 'Quick Response' },
              { icon: Mail, title: 'Email', info: 'info@flamora.pk', sub: '24hr Response' },
              { icon: MapPin, title: 'Head Office', info: 'Peshawar, Pakistan', sub: 'Nationwide Delivery' }
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
                <p className="text-[#f8a11b] font-semibold mb-1">{item.info}</p>
                <p className="text-white/30 text-sm">{item.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}