import React from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-white/95 backdrop-blur-sm border-t border-gray-200 mt-auto ${className}`}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-4 md:mb-0 font-medium">
            © 2024 LPG Gas Cylinder Business App. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a 
              href="#" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Privacy Policy
            </a>
            <a 
              href="#" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Terms of Service
            </a>
            <a 
              href="#" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
} 