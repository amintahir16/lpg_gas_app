'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ExternalLink } from 'lucide-react';
import { PRIVACY_POLICY_DATA, TERMS_OF_SERVICE_DATA } from './legal-content';

export type LegalModalType = 'privacy' | 'terms';

/**
 * Global helper to open the legal modal from anywhere in the application.
 */
export function openLegalModal(type: LegalModalType = 'privacy') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('open-legal-modal', {
        detail: { type },
      })
    );
  }
}

export default function LegalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LegalModalType>('privacy');

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ type?: LegalModalType }>;
      if (customEvent.detail?.type === 'terms') {
        setActiveTab('terms');
      } else {
        setActiveTab('privacy');
      }
      setIsOpen(true);
    };

    window.addEventListener('open-legal-modal', handleOpen);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      window.removeEventListener('open-legal-modal', handleOpen);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDoc = activeTab === 'privacy' ? PRIVACY_POLICY_DATA : TERMS_OF_SERVICE_DATA;
  const fullPageHref = activeTab === 'privacy' ? '/privacy' : '/terms';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      {/* Crisp Dark Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-3xl max-h-[88vh] bg-[#0c1017] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in-0 zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0c1017] shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Segmented Tab Pill */}
            <div className="flex items-center p-0.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'privacy'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'terms'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Terms of Service
              </button>
            </div>

            <span className="text-xs text-gray-500 hidden sm:inline">
              v{currentDoc.version} • {currentDoc.effectiveDate}
            </span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            <Link
              href={fullPageHref}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Open full document in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Document Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 space-y-8 text-gray-300">
          <div>
            <h1 id="legal-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {currentDoc.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-2 leading-relaxed">
              {currentDoc.description}
            </p>
          </div>

          <div className="divide-y divide-white/5 space-y-6 pt-2">
            {currentDoc.sections.map((section, idx) => (
              <div key={section.id} className={idx === 0 ? '' : 'pt-6'}>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight mb-2.5">
                  {section.title}
                </h2>
                <div>{section.content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#090d14] shrink-0 flex items-center justify-between text-xs text-gray-400">
          <span>Flamora Energy Solutions • Regulatory Compliance</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-3.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
