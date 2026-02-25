'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle, Flame } from 'lucide-react';

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

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', subject: '', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  const contactInfo = [
    { icon: Phone, title: 'Phone', details: ['+92 300 1234567', '+92 301 9876543'], color: '#f8a11b' },
    { icon: Mail, title: 'Email', details: ['info@flamora.pk', 'support@flamora.pk'], color: '#f36523' },
    { icon: MapPin, title: 'Address', details: ['193 Industrial Estate Rd, Hayatabad', 'Peshawar, Pakistan'], color: '#e1382b' },
    { icon: Clock, title: 'Hours', details: ['Mon – Fri: 8:00 AM – 6:00 PM', 'Sat: 9:00 AM – 4:00 PM'], color: '#f8a11b' }
  ];

  const subjects = ['General Inquiry', 'LPG Refill', 'Bulk Order Quote', 'Safety Training', 'Equipment Maintenance', 'Emergency Support', 'Other'];

  return (
    <div className="landing-page min-h-screen bg-[#0a0e14]">

      {/* ═══ HERO ═══ */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0e14] to-[#0a0e14]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#f36523]/5 rounded-full blur-[150px]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-block px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f36523] bg-[#f36523]/10 rounded-full mb-6 border border-[#f36523]/20">
              Get In Touch
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
          >
            Contact <span className="text-gradient-flamora">Flamora</span>
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto"
          >
            Have questions or need a quote? We&apos;re here to help with all your LPG needs.
          </motion.p>
        </div>
      </section>


      {/* ═══ CONTACT INFO CARDS ═══ */}
      <section className="py-12 bg-[#0d1117] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, i) => (
              <motion.div
                key={info.title}
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                className="glass-card p-6 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500"
                  style={{ background: `${info.color}15`, border: `1px solid ${info.color}20` }}
                >
                  <info.icon className="w-7 h-7" style={{ color: info.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{info.title}</h3>
                <div className="space-y-1">
                  {info.details.map((detail, di) => (
                    <p key={di} className="text-white/40 text-sm">{detail}</p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ FORM + MAP ═══ */}
      <section className="py-24 bg-[#0a0e14]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Contact Form */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <h3 className="text-3xl font-black text-white mb-3">
                Send Us a <span className="text-gradient-flamora">Message</span>
              </h3>
              <p className="text-white/40 mb-8">
                Fill out the form below and we&apos;ll get back to you within 24 hours.
              </p>

              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-8 text-center"
                >
                  <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">Message Sent!</h4>
                  <p className="text-white/50">Thank you for reaching out. We&apos;ll respond soon.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-white/60 mb-2">Full Name *</label>
                      <input
                        type="text" id="name" name="name" value={formData.name}
                        onChange={handleInputChange} required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-[#f36523]/50 focus:border-[#f36523]/30 transition-all outline-none"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-white/60 mb-2">Email *</label>
                      <input
                        type="email" id="email" name="email" value={formData.email}
                        onChange={handleInputChange} required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-[#f36523]/50 focus:border-[#f36523]/30 transition-all outline-none"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-white/60 mb-2">Phone</label>
                      <input
                        type="tel" id="phone" name="phone" value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-[#f36523]/50 focus:border-[#f36523]/30 transition-all outline-none"
                        placeholder="+92 3XX XXXXXXX"
                      />
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-white/60 mb-2">Subject *</label>
                      <select
                        id="subject" name="subject" value={formData.subject}
                        onChange={handleInputChange} required
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#f36523]/50 focus:border-[#f36523]/30 transition-all outline-none appearance-none"
                      >
                        <option value="" className="bg-[#0d1117]">Select subject</option>
                        {subjects.map(s => (
                          <option key={s} value={s} className="bg-[#0d1117]">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-white/60 mb-2">Message *</label>
                    <textarea
                      id="message" name="message" value={formData.message}
                      onChange={handleInputChange} required rows={5}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 focus:ring-2 focus:ring-[#f36523]/50 focus:border-[#f36523]/30 transition-all outline-none resize-none"
                      placeholder="Tell us about your LPG needs..."
                    />
                  </div>
                  <button
                    type="submit" disabled={isSubmitting}
                    className="w-full py-4 px-8 flame-gradient text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-[0_0_25px_rgba(243,101,35,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />Sending...</>
                    ) : (
                      <><Send className="w-5 h-5" />Send Message</>
                    )}
                  </button>
                </form>
              )}
            </motion.div>

            {/* Map */}
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}>
              <h3 className="text-3xl font-black text-white mb-3">
                Our <span className="text-gradient-flamora">Location</span>
              </h3>
              <p className="text-white/40 mb-8">Visit our office or find us on the map below.</p>
              <div className="w-full h-[420px] rounded-2xl overflow-hidden border border-white/10">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3308.1234567890123!2d71.4309233!3d33.9763911!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38d9108a64127615%3A0x6d377cbefcb04e67!2s193%20Industrial%20Estate%20Rd%2C%20Phase-1%20Hayatabad%2C%20Peshawar%2C%20Pakistan!5e0!3m2!1sen!2spk!4v1234567890123"
                  width="100%" height="100%" style={{ border: 0 }}
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                  title="Flamora - 193 Industrial Estate Rd, Phase-1 Hayatabad, Peshawar"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* ═══ EMERGENCY ═══ */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e1382b]/15 to-[#0d1117]" />
        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Flame className="w-12 h-12 text-[#e1382b] mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Emergency Support
            </h2>
            <p className="text-white/50 mb-8 max-w-lg mx-auto">
              For urgent LPG-related emergencies, our 24/7 response team is always ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:+923001234567"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#e1382b] text-white font-bold rounded-xl hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(225,56,43,0.3)] transition-all duration-300"
              >
                <Phone className="w-5 h-5" /> Emergency: +92 300 1234567
              </a>
              <a
                href="mailto:emergency@flamora.pk"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-[#e1382b] font-bold border-2 border-[#e1382b]/30 rounded-xl hover:bg-[#e1382b]/10 transition-all duration-300"
              >
                <Mail className="w-5 h-5" /> Emergency Email
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="https://wa.me/923001234567?text=Hi, I'm interested in your LPG services"
          target="_blank" rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
          aria-label="Contact us on WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}