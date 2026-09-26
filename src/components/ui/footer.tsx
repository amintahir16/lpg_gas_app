'use client';

import React from 'react';
import Link from 'next/link';
import { openLegalModal } from '@/components/legal/LegalModal';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-white/95 backdrop-blur-sm border-t border-gray-200 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-4 md:mb-0 font-medium">
            © {currentYear} Flamora Business App. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link 
              href="/privacy" 
              onClick={(e) => {
                e.preventDefault();
                openLegalModal('privacy');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms" 
              onClick={(e) => {
                e.preventDefault();
                openLegalModal('terms');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Terms of Service
            </Link>
            <Link 
              href="/contact" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 