'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { TERMS_OF_SERVICE_DATA } from '@/components/legal/legal-content';
import { openLegalModal } from '@/components/legal/LegalModal';

export default function TermsOfServicePage() {
  const doc = TERMS_OF_SERVICE_DATA;

  return (
    <div className="min-h-screen bg-[#080b10] text-gray-300">
      {/* Top Utility Header */}
      <div className="border-b border-white/10 bg-[#080b10]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Document Switcher */}
            <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium">
              <Link
                href="/privacy"
                className="px-3 py-1 text-gray-400 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <span className="px-3 py-1 bg-white/10 text-white rounded-md font-semibold">
                Terms
              </span>
            </div>

            {/* Open Modal Trigger */}
            <button
              type="button"
              onClick={() => openLegalModal('terms')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Popup Window</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Document Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
            Legal &amp; Compliance Documentation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {doc.title}
          </h1>
          <p className="text-xs text-gray-500 font-mono mt-2">
            Effective Date: {doc.effectiveDate} • Version {doc.version}
          </p>
          <p className="text-sm sm:text-base text-gray-400 mt-4 leading-relaxed">
            {doc.description}
          </p>
        </div>

        {/* Content Layout: Sticky Table of Contents + Document Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar / Table of Contents */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-24 p-5 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                On this page
              </h3>
              <nav className="space-y-1.5 text-xs">
                {doc.sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-gray-400 hover:text-white py-1 transition-colors leading-snug"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="pt-4 border-t border-white/5">
                <Link
                  href="/privacy"
                  className="text-xs text-gray-400 hover:text-white flex items-center justify-between group"
                >
                  <span>Privacy Policy &amp; Data Protection</span>
                  <span className="text-gray-600 group-hover:text-gray-300">→</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Document Body */}
          <main className="lg:col-span-8 max-w-3xl space-y-10">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-b border-white/5 pb-10 last:border-b-0"
              >
                <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight mb-4">
                  {section.title}
                </h2>
                <div>{section.content}</div>
              </section>
            ))}

            {/* Official Support Footer */}
            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-gray-400">
              <p>© {new Date().getFullYear()} Flamora LPG Gas Distribution. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => openLegalModal('privacy')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  View Privacy Policy
                </button>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                  Contact Support
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
