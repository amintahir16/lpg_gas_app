'use client';

import { motion } from 'framer-motion';
import { ChevronRight, Flame, Shield, Zap, Truck, Star, Phone, Mail, MapPin, User } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function LandingPage() {
  const { data: session } = useSession();

  const features = [
    {
      icon: Flame,
      title: "Cook Faster",
      description: "High-quality LPG for efficient cooking and faster meal preparation - perfect for Pakistani cuisine"
    },
    {
      icon: Shield,
      title: "Cleaner & Safer",
      description: "Clean-burning fuel with advanced safety features and regular maintenance - meeting Pakistan's safety standards"
    },
    {
      icon: Zap,
      title: "Cost Effective",
      description: "Affordable energy solution for Pakistani homes and businesses - competitive local pricing"
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "Quick and reliable delivery service across Pakistan - from major cities to rural areas"
    }
  ];

  const services = [
    {
      title: "LPG Refill",
      description: "Quick and safe refilling of your existing cylinders with certified quality gas",
      icon: Flame,
      price: "Starting from PKR 2,500"
    },
    {
      title: "Bulk Deliveries",
      description: "Large quantity orders for restaurants, hotels, and industrial facilities across Pakistan",
      icon: Truck,
      price: "Volume-based pricing"
    },
    {
      title: "Distribution & Marketing",
      description: "Wide network coverage across Pakistan with local marketing support",
      icon: MapPin,
      price: "Contact for details"
    }
  ];

  const testimonials = [
    {
      name: "Ahmed Hassan",
      role: "Restaurant Owner, Karachi",
      content: "Excellent service and reliable delivery. The quality of gas is consistently good for our restaurant operations.",
      rating: 5
    },
    {
      name: "Fatima Ali",
      role: "Home Chef, Lahore",
      content: "Switched to this company last year and never looked back. Great prices and service for Pakistani households!",
      rating: 5
    },
    {
      name: "Mohammed Khan",
      role: "Hotel Manager, Islamabad",
      content: "Professional team and timely deliveries. Highly recommended for bulk orders across Pakistan.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-700 overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')"
          }}
        ></div>

        <div className="relative z-20 text-center text-white px-4 max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            Your Trusted
            <span className="block text-yellow-400">LPG Partner</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl mb-8 text-gray-200"
          >
            Providing clean, safe, and affordable energy solutions across Pakistan since 2005
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            {/* Primary CTA Button - Order Now */}
            <Link
              href="/shop"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent hover:border-yellow-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Flame className="w-6 h-6 text-white" />
                Order Now
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </Link>

            {/* Secondary CTA Button - Contact Us */}
            <Link
              href="/contact"
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out"
            >
              <span className="relative z-10 flex items-center gap-3">
                <Phone className="w-5 h-5 text-white" />
                Contact Us
              </span>
              <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>

            {/* Dashboard Button - Only for authenticated users */}
            {session && (
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <User className="w-5 h-5 text-white" />
                  Go to Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Us?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide the best LPG solutions with unmatched quality, safety, and service across Pakistan
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive LPG solutions tailored to Pakistan's energy needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <service.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  {service.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {service.description}
                </p>
                <p className="text-blue-600 font-semibold mb-6">
                  {service.price}
                </p>
                <Link
                  href="/shop"
                  className={`group relative inline-flex items-center justify-center w-full font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent ${
                    index === 0 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:border-blue-300' 
                      : index === 1 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:border-green-300'
                      : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white hover:border-purple-300'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {index === 0 ? (
                      <Flame className="w-4 h-4 text-white" />
                    ) : index === 1 ? (
                      <Truck className="w-4 h-4 text-white" />
                    ) : (
                      <MapPin className="w-4 h-4 text-white" />
                    )}
                    Shop Now
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Competitive Pricing in Pakistan
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transparent pricing for all your LPG needs with nationwide delivery
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-gray-50 p-8 rounded-lg shadow-lg text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out transform hover:scale-[1.02]"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Flame className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Home Use</h3>
              <div className="mb-6">
                <p className="text-4xl font-bold text-blue-600 mb-2">PKR 2,500</p>
                <p className="text-gray-600">11kg Cylinder</p>
              </div>
              <ul className="text-left text-gray-600 mb-6 space-y-2">
                <li>• Free delivery in major cities</li>
                <li>• Safety inspection included</li>
                <li>• 24-48 hour delivery</li>
                <li>• Quality guaranteed</li>
              </ul>
              <Link
                href="/shop"
                className="group relative inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent hover:border-blue-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-white" />
                  Order Now
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-blue-600 p-8 rounded-lg shadow-lg text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out transform hover:scale-[1.02] scale-105"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Commercial</h3>
              <div className="mb-6">
                <p className="text-4xl font-bold text-yellow-400 mb-2">PKR 4,800</p>
                <p className="text-white">22kg Cylinder</p>
              </div>
              <ul className="text-left text-white mb-6 space-y-2">
                <li>• Priority delivery service</li>
                <li>• Bulk order discounts</li>
                <li>• Dedicated account manager</li>
                <li>• Emergency refill service</li>
              </ul>
              <Link
                href="/contact"
                className="group relative inline-flex items-center justify-center w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent hover:border-yellow-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-black" />
                  Get Quote
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-gray-50 p-8 rounded-lg shadow-lg text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out transform hover:scale-[1.02]"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Industrial</h3>
              <div className="mb-6">
                <p className="text-4xl font-bold text-green-600 mb-2">PKR 8,500</p>
                <p className="text-gray-600">45kg Cylinder</p>
              </div>
              <ul className="text-left text-gray-600 mb-6 space-y-2">
                <li>• Volume-based pricing</li>
                <li>• Custom delivery schedules</li>
                <li>• Technical support included</li>
                <li>• Long-term contracts</li>
              </ul>
              <Link
                href="/contact"
                className="group relative inline-flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent hover:border-green-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-white" />
                  Contact Sales
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              *Prices include delivery within major cities. Rural areas may have additional delivery charges.
            </p>
            <p className="text-gray-600">
              **Bulk orders and long-term contracts receive special pricing. Contact us for custom quotes.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Don't just take our word for it - hear from our satisfied customers across Pakistan
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-8 rounded-lg"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pakistan Market Advantages Section */}
      <section className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why Choose Us in Pakistan?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Local expertise with nationwide coverage and Pakistan-specific benefits
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Nationwide Coverage</h3>
              <p className="text-gray-600">
                Serving all major cities including Karachi, Lahore, Islamabad, Peshawar, Quetta, and rural areas across Pakistan
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pakistan Safety Standards</h3>
              <p className="text-gray-600">
                Compliant with Pakistan's LPG safety regulations and international standards for your peace of mind
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow duration-300"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Local Market Expertise</h3>
              <p className="text-gray-600">
                Understanding of Pakistan's energy needs, pricing, and delivery challenges for optimal service
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready for Bulk Orders Across Pakistan?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Get special pricing and priority delivery for large quantity orders with nationwide coverage
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              {/* Primary CTA - Get Quote */}
              <Link
                href="/contact"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-black bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out border-2 border-transparent hover:border-yellow-300"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Phone className="w-5 h-5 text-black" />
                  Get Quote
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </Link>

              {/* Secondary CTA - Shop Now */}
              <Link
                href="/shop"
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 hover:bg-white/20 hover:border-white/50 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-out"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <Flame className="w-5 h-5 text-white" />
                  Shop Now
                </span>
                <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Contact Us Across Pakistan
            </h2>
            <p className="text-lg text-gray-600">
              Get in touch with our team for all your LPG needs
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">+92 300 1234567</p>
              <p className="text-gray-600">+92 301 9876543</p>
              <p className="text-gray-500 text-sm">WhatsApp Available</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">info@lpgpakistan.com</p>
              <p className="text-gray-600">sales@lpgpakistan.com</p>
              <p className="text-gray-500 text-sm">24/7 Support</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Head Office</h3>
              <p className="text-gray-600">Peshawar, Pakistan</p>
              <p className="text-gray-500 text-sm">Nationwide Coverage</p>
            </div>
          </div>

          {/* Regional Offices */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Regional Offices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-600">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium">Karachi</p>
                <p className="text-sm">+92 300 1234567</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium">Lahore</p>
                <p className="text-sm">+92 300 1234568</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium">Islamabad</p>
                <p className="text-sm">+92 300 1234569</p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium">Peshawar</p>
                <p className="text-sm">+92 300 1234570</p>
              </div>
            </div>
          </div>

          {/* Major Cities Coverage */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Serving Major Cities</h3>
            <div className="flex flex-wrap justify-center gap-4 text-gray-600">
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Karachi</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Lahore</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Islamabad</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Peshawar</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Quetta</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Faisalabad</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Multan</span>
              <span className="px-3 py-1 bg-white rounded-full shadow-sm">Rawalpindi</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 