'use client';

import { motion } from 'framer-motion';
import { Award, Users, Target, Heart, Shield, Zap, Truck, Star, ChevronRight, Flame } from 'lucide-react';
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

export default function AboutPage() {
  const values = [
    { icon: Shield, title: 'Safety First', description: 'Every operation follows strict Pakistani safety standards', color: '#f8a11b' },
    { icon: Heart, title: 'Customer Focus', description: 'Our customers are at the heart of everything we do', color: '#f36523' },
    { icon: Zap, title: 'Innovation', description: 'Continuously improving our services and delivery', color: '#e1382b' },
    { icon: Truck, title: 'Reliability', description: 'Consistent, on-time delivery you can count on', color: '#f8a11b' }
  ];

  const achievements = [
    { title: 'Safety Excellence', description: 'Pakistan Standards Authority', icon: Award, color: '#f8a11b' },
    { title: 'Certified Provider', description: 'Licensed LPG Distributor', icon: Shield, color: '#f36523' },
    { title: 'Best Service Award', description: 'Customer Satisfaction 2024', icon: Star, color: '#e1382b' },
    { title: '98% Satisfaction', description: 'Consistent 5-Year Rating', icon: Heart, color: '#f8a11b' }
  ];

  const stats = [
    { value: '10+', label: 'Years of Service' },
    { value: '5,000+', label: 'Happy Customers' },
    { value: '3', label: 'Cylinder Types' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0e14] to-[#0a0e14]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#f36523]/5 rounded-full blur-[150px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              About Flamora
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Powering Pakistan with <span className="text-gradient-flamora">Clean Energy</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            Your trusted LPG distribution partner since 2015 — delivering safe, affordable energy to homes and businesses across Pakistan.
          </motion.p>
        </div>
      </section>


      {/* ═══ STATS STRIP ═══ */}
      <section className="py-10 bg-[#0d1117] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-black text-gradient-flamora">{stat.value}</p>
                <p className="text-white/30 text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ OUR STORY ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
                Our Story
              </span>
              <h2 className="text-4xl font-black text-white mb-6">
                Built on Trust, Fueled by <span className="text-gradient-flamora">Dedication</span>
              </h2>
              <p className="text-white/50 text-lg leading-relaxed mb-6">
                Flamora started with a simple belief: every home and business in Pakistan deserves
                reliable, safe, and affordable access to clean LPG energy. What began as a small
                local operation in Peshawar has grown into a trusted name across the region.
              </p>
              <p className="text-white/40 leading-relaxed mb-8">
                Today, we serve thousands of customers — from families cooking daily meals to
                restaurants and factories running large-scale operations — with the same care
                and commitment to safety that defined us from day one.
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-[#f8a11b] font-semibold hover:translate-x-1 transition-transform"
              >
                Explore Our Services <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="glass-card p-10 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#f36523]/10 rounded-full blur-[80px]" />
              <Flame className="w-24 h-24 mx-auto mb-6 text-[#f36523]/60 relative z-10" />
              <h3 className="text-2xl font-bold text-white relative z-10 mb-2">Flamora LPG</h3>
              <p className="text-white/40 text-sm relative z-10">Premium Energy Distribution</p>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══ MISSION / VISION / PROMISE ═══ */}
      <section className="py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              What Drives <span className="text-gradient-flamora">Flamora</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Our Mission', icon: Target, desc: 'To provide clean, safe, and affordable energy solutions while maintaining the highest standards of safety and customer service.', color: '#f8a11b' },
              { title: 'Our Vision', icon: Users, desc: 'To become the leading LPG distributor in Pakistan, known for innovation, reliability, and exceptional customer experience.', color: '#f36523' },
              { title: 'Our Promise', icon: Heart, desc: 'We promise reliable service, certified safety, and real value to every customer — from the first delivery to the thousandth.', color: '#e1382b' }
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


      {/* ═══ VALUES ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Our Core <span className="text-gradient-flamora">Values</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-8 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500"
                  style={{ background: `${value.color}15`, border: `1px solid ${value.color}20` }}
                >
                  <value.icon className="w-7 h-7" style={{ color: value.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{value.title}</h3>
                <p className="text-white/40 text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ ACHIEVEMENTS ═══ */}
      <section className="py-24 bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Recognition
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Certificates & <span className="text-gradient-flamora">Achievements</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((a, i) => (
              <motion.div
                key={a.title}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-8 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-500"
                  style={{ background: `${a.color}15`, border: `1px solid ${a.color}20` }}
                >
                  <a.icon className="w-7 h-7" style={{ color: a.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{a.title}</h3>
                <p className="text-white/40 text-sm">{a.description}</p>
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
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to Partner with Flamora?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
              Join thousands of satisfied customers who trust us with their energy needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center px-10 py-5 text-lg font-bold bg-white text-[#e1382b] rounded-2xl shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                Get Started <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-white bg-black/20 border-2 border-white/30 hover:bg-black/30 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
              >
                Our Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}