'use client';

import { motion } from 'framer-motion';
import {
  Flame, Truck, MapPin, Shield, Clock, Star,
  ChevronRight, CheckCircle2, Zap, ArrowRight,
  Home, Building2, Factory, Phone
} from 'lucide-react';
import Link from 'next/link';

/* ─── Animation Variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] as const }
  })
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' as const }
  })
};

export default function ServicesPage() {
  const services = [
    {
      id: 'refill',
      title: 'LPG Cylinder Refill',
      description: 'Fast, safe refilling of your existing cylinders with premium quality gas — meeting all Pakistani safety standards.',
      longDescription: 'Our trained technicians use advanced equipment to ensure every refill is safe and precise. We handle Domestic 11.8KG, Standard 15KG, and Commercial 44.5KG cylinders with rigorous quality checks on every single unit.',
      icon: Flame,
      color: '#f8a11b',
      features: [
        'Certified safety checks on every cylinder',
        'Premium quality gas guarantee',
        'Quick turnaround — same day service',
        'Competitive transparent pricing',
        '24/7 emergency refill service'
      ],
      cta: 'Order a Refill',
      ctaLink: '/shop'
    },
    {
      id: 'bulk',
      title: 'Bulk & Commercial Delivery',
      description: 'High-volume LPG supply for restaurants, hotels, factories, and industrial facilities across Pakistan.',
      longDescription: 'Designed for businesses that need reliable, large-quantity LPG supply. Get volume-based discounts, flexible schedules, and a dedicated account manager to ensure your operations never run dry.',
      icon: Truck,
      color: '#f36523',
      features: [
        'Volume-based discounts for bulk orders',
        'Flexible delivery schedules',
        'Dedicated account manager',
        'Priority delivery guarantee',
        'Custom solutions for your business'
      ],
      cta: 'Get Business Quote',
      ctaLink: '/contact'
    },
    {
      id: 'distribution',
      title: 'Nationwide Distribution',
      description: 'Comprehensive distribution network covering major cities and rural areas across Pakistan.',
      longDescription: 'Flamora\'s extensive logistics network ensures reliable doorstep delivery from Peshawar to Karachi. Our fleet of trained delivery crews covers all major cities and reaches rural communities that others can\'t.',
      icon: MapPin,
      color: '#e1382b',
      features: [
        'Coverage across all major cities',
        'Rural area delivery network',
        'Real-time delivery tracking',
        'Professional trained delivery crew',
        'Safe handling protocols'
      ],
      cta: 'Check Coverage',
      ctaLink: '/contact'
    }
  ];

  const additionalServices = [
    {
      title: 'Safety Training',
      description: 'Professional training programs for safe LPG handling, storage, and emergency procedures.',
      icon: Shield,
      color: '#f8a11b'
    },
    {
      title: 'Equipment Inspection',
      description: 'Regular maintenance and safety inspection of cylinders, regulators, and gas equipment.',
      icon: CheckCircle2,
      color: '#f36523'
    },
    {
      title: 'Emergency Response',
      description: '24/7 rapid response team for any LPG-related emergencies and urgent refill needs.',
      icon: Clock,
      color: '#e1382b'
    },
    {
      title: 'Business Consultation',
      description: 'Expert consultation for optimizing your LPG usage, system design, and cost efficiency.',
      icon: Star,
      color: '#f8a11b'
    }
  ];

  const cylinderTypes = [
    { name: 'Domestic', weight: '11.8 KG', icon: Home, audience: 'For Homes', color: '#f8a11b' },
    { name: 'Standard', weight: '15 KG', icon: Building2, audience: 'Homes & Business', color: '#f36523' },
    { name: 'Commercial', weight: '44.5 KG', icon: Factory, audience: 'Industries', color: '#e1382b' }
  ];

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0e14] to-[#0a0e14]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f36523]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f8a11b]/5 rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
              Our Services
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Comprehensive <span className="text-gradient-flamora">LPG Solutions</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            From doorstep refills to industrial bulk supply — Flamora delivers safe, certified LPG across Pakistan.
          </motion.p>
        </div>
      </section>


      {/* ═══ CYLINDER TYPES STRIP ═══ */}
      <section className="py-12 bg-[#0d1117] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cylinderTypes.map((cyl, i) => (
              <motion.div
                key={cyl.name}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-6 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: `${cyl.color}15`, border: `1px solid ${cyl.color}25` }}
                >
                  <cyl.icon className="w-7 h-7" style={{ color: cyl.color }} />
                </div>
                <h3 className="text-lg font-bold text-white">{cyl.name}</h3>
                <p className="text-sm font-bold mt-1" style={{ color: cyl.color }}>{cyl.weight}</p>
                <p className="text-white/30 text-xs mt-1">{cyl.audience}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ MAIN SERVICES ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4 space-y-28">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              id={service.id}
              variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            >
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${index % 2 !== 0 ? 'lg:[direction:rtl]' : ''}`}>
                {/* Text Content */}
                <div className={index % 2 !== 0 ? 'lg:[direction:ltr]' : ''}>
                  <div className="flex items-center gap-4 mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `${service.color}15`, border: `1px solid ${service.color}25` }}
                    >
                      <service.icon className="w-7 h-7" style={{ color: service.color }} />
                    </div>
                    <h2 className="text-3xl font-black text-white">{service.title}</h2>
                  </div>

                  <p className="text-white/50 text-lg leading-relaxed mb-8">
                    {service.longDescription}
                  </p>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {service.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${service.color}20` }}>
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: service.color }} />
                        </div>
                        <span className="text-white/60 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href={service.ctaLink}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)` }}
                  >
                    {service.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Visual Card */}
                <div className={`${index % 2 !== 0 ? 'lg:[direction:ltr]' : ''}`}>
                  <div
                    className="glass-card p-10 text-center relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-20"
                      style={{ background: service.color }}
                    />
                    <service.icon className="w-24 h-24 mx-auto mb-6 relative z-10" style={{ color: service.color, opacity: 0.7 }} />
                    <h3 className="text-2xl font-bold text-white relative z-10 mb-2">{service.title}</h3>
                    <p className="text-white/40 text-sm relative z-10">{service.description}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>


      {/* ═══ ADDITIONAL SERVICES ═══ */}
      <section className="py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              More Services
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Supporting <span className="text-gradient-flamora">Services</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              Beyond delivery — we offer training, inspections, and consultation to keep you safe.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalServices.map((service, index) => (
              <motion.div
                key={service.title}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={index}
                className="glass-card p-8 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500"
                  style={{ background: `${service.color}15`, border: `1px solid ${service.color}20` }}
                >
                  <service.icon className="w-7 h-7" style={{ color: service.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{service.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-5">{service.description}</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-colors duration-300 hover:translate-x-1"
                  style={{ color: service.color }}
                >
                  Learn More <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ WHY CHOOSE US ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why Choose <span className="text-gradient-flamora">Flamora</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Safety Certified', desc: 'Every cylinder and delivery complies with Pakistani safety standards. We never cut corners on safety.', color: '#f8a11b' },
              { icon: Zap, title: '24/7 Availability', desc: 'Round-the-clock customer support, emergency refills, and rapid response for any LPG needs.', color: '#f36523' },
              { icon: Star, title: 'Quality Guaranteed', desc: 'Premium grade LPG, professional handling, and certified technicians on every service call.', color: '#e1382b' }
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-8 text-center group"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500"
                  style={{ background: `${item.color}15`, border: `1px solid ${item.color}20` }}
                >
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ CTA ═══ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 flame-gradient animate-gradient opacity-90" />
        <div className="absolute inset-0 bg-[url('/images/section-pattern.png')] bg-cover opacity-10 mix-blend-overlay" />

        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Need a Custom LPG Solution?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
              Whether you need a single cylinder or industrial-scale supply, Flamora has you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold bg-white text-[#e1382b] rounded-2xl shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <span className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  Get a Quote
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              <Link
                href="/shop"
                className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white bg-black/20 border-2 border-white/30 hover:bg-black/30 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                <span className="flex items-center gap-3">
                  <Flame className="w-5 h-5" />
                  Order Now
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}