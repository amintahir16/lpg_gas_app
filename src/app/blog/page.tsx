'use client';

import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight, Clock, Flame, Shield, Zap, Wrench, AlertTriangle, BarChart3 } from 'lucide-react';
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

export default function BlogPage() {
  const blogPosts = [
    {
      id: '1', title: 'The Future of LPG: Sustainable Energy in Pakistan',
      excerpt: 'How LPG is evolving as a sustainable and clean energy solution for Pakistani homes and businesses.',
      author: 'Flamora Team', date: '2024-01-15', readTime: '5 min', category: 'Industry',
      icon: BarChart3, color: '#f8a11b', featured: true
    },
    {
      id: '2', title: 'LPG Safety: Essential Handling Guidelines',
      excerpt: 'Critical safety guidelines every LPG user should know for safe cylinder handling and storage.',
      author: 'Flamora Safety', date: '2024-01-10', readTime: '7 min', category: 'Safety',
      icon: Shield, color: '#e1382b', featured: false
    },
    {
      id: '3', title: 'LPG vs. Natural Gas: Making the Right Choice',
      excerpt: 'A comparison of LPG and piped natural gas to help you choose the best option for your needs.',
      author: 'Flamora Team', date: '2024-01-05', readTime: '6 min', category: 'Guide',
      icon: Zap, color: '#f36523', featured: false
    },
    {
      id: '4', title: 'Commercial LPG Solutions for Restaurants',
      excerpt: 'How restaurants can optimize their kitchen operations with reliable commercial LPG supply.',
      author: 'Flamora B2B', date: '2023-12-28', readTime: '8 min', category: 'Business',
      icon: Flame, color: '#f8a11b', featured: false
    },
    {
      id: '5', title: 'Maintaining Your LPG Cylinder: Complete Guide',
      excerpt: 'Essential maintenance tips to keep your cylinders safe, efficient, and long-lasting.',
      author: 'Flamora Safety', date: '2023-12-20', readTime: '9 min', category: 'Maintenance',
      icon: Wrench, color: '#f36523', featured: false
    },
    {
      id: '6', title: 'LPG Emergencies: What To Do and Who To Call',
      excerpt: 'Step-by-step emergency response procedures for LPG incidents at home or work.',
      author: 'Flamora Safety', date: '2023-12-15', readTime: '6 min', category: 'Safety',
      icon: AlertTriangle, color: '#e1382b', featured: false
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const featured = blogPosts.find(p => p.featured);
  const regular = blogPosts.filter(p => !p.featured);

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0e14] to-[#0a0e14]" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#f8a11b]/5 rounded-full blur-[150px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f8a11b] bg-[#f8a11b]/10 rounded-full mb-6 border border-[#f8a11b]/20">
              Blog
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Flamora <span className="text-gradient-flamora">Insights</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            Industry tips, safety guides, and energy news from the Flamora team.
          </motion.p>
        </div>
      </section>


      {/* ═══ FEATURED POST ═══ */}
      {featured && (
        <section className="py-16 bg-[#0d1117] border-y border-white/5">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mb-10">
              <h2 className="text-2xl font-black text-white">Featured <span className="text-gradient-flamora">Article</span></h2>
            </motion.div>
            <motion.div
              variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="glass-card overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-10 relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-15" style={{ background: featured.color }} />
                  <featured.icon className="w-16 h-16 mb-6 relative z-10" style={{ color: featured.color, opacity: 0.6 }} />
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <span className="text-xs font-bold px-3 py-1 rounded-full border" style={{ color: featured.color, borderColor: `${featured.color}30`, background: `${featured.color}10` }}>
                      {featured.category}
                    </span>
                    <span className="text-white/30 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readTime}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4 relative z-10">{featured.title}</h3>
                  <p className="text-white/50 mb-6 relative z-10">{featured.excerpt}</p>
                  <div className="flex items-center gap-4 mb-6 text-xs text-white/30 relative z-10">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{featured.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(featured.date)}</span>
                  </div>
                  <Link
                    href={`/blog/${featured.id}`}
                    className="inline-flex items-center gap-2 font-bold text-lg hover:translate-x-1 transition-transform"
                    style={{ color: featured.color }}
                  >
                    Read Article <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
                <div className="p-10 flex items-center justify-center bg-white/[0.02]">
                  <featured.icon className="w-40 h-40" style={{ color: featured.color, opacity: 0.1 }} />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}


      {/* ═══ ALL POSTS ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Latest <span className="text-gradient-flamora">Articles</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Explore our guides, safety tips, and energy industry insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regular.map((post, index) => (
              <motion.article
                key={post.id}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={index}
                className="glass-card overflow-hidden group"
              >
                {/* Icon Header */}
                <div className="p-6 relative">
                  <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-[50px] opacity-10" style={{ background: post.color }} />
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500"
                    style={{ background: `${post.color}15`, border: `1px solid ${post.color}20` }}
                  >
                    <post.icon className="w-6 h-6" style={{ color: post.color }} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border" style={{ color: post.color, borderColor: `${post.color}30`, background: `${post.color}10` }}>
                      {post.category}
                    </span>
                    <span className="text-white/25 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-white/40 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between text-xs text-white/25 mb-3">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(post.date)}</span>
                  </div>
                  <Link
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-1 text-sm font-bold hover:translate-x-1 transition-transform"
                    style={{ color: post.color }}
                  >
                    Read More <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ NEWSLETTER CTA ═══ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 flame-gradient animate-gradient opacity-90" />
        <div className="absolute inset-0 bg-[url('/images/section-pattern.png')] bg-cover opacity-10 mix-blend-overlay" />

        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Stay in the Loop
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto">
              Subscribe for the latest LPG industry insights and Flamora updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-4 rounded-xl border-0 bg-white/20 backdrop-blur-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/30 outline-none"
              />
              <button className="px-8 py-4 bg-white text-[#e1382b] font-bold rounded-xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}