// src/components/public/FullFooter.tsx

import React from 'react';
import { Link } from 'wouter';
import { SocialIcon, SocialPlatform } from './SocialIcons';

type FooterProps = {
  className?: string;
  badgePath: string;
};

export const FullFooter: React.FC<FooterProps> = ({
  className = '',
  badgePath
}) => {
  // Social links
  const socialLinks: { platform: SocialPlatform; url: string }[] = [
    { platform: 'facebook', url: 'https://facebook.com/bndy.live' },
    { platform: 'instagram', url: 'https://instagram.com/bndy.app' },
    { platform: 'x', url: 'https://x.com/bndy_live' }
  ];

  return (
    <footer className={`relative z-10 py-6 border-t border-slate-700 bg-slate-900 ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Main 4-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          {/* Logo and tagline column */}
          <div className="text-center">
            <Link
              href="/"
              aria-label="Visit BNDY home"
              className="block mb-2"
            >
              <img
                src={badgePath}
                alt="BNDY"
                className="h-12 w-auto mx-auto"
              />
            </Link>

            <p className="text-sm text-center text-white">
              Keeping <span className="text-cyan-500 font-bold">LIVE</span> music <span className="text-orange-500 font-bold">ALIVE</span>
              <br />
              <span className="text-gray-400">Community-driven event discovery</span>
            </p>
          </div>

          {/* Platform column */}
          <div className="text-center">
            <h3 className="font-medium mb-3 text-white">Platform</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://bndy.live"
                  className="text-gray-300 hover:text-orange-500 text-sm transition-colors"
                >
                  bndy.live events
                </a>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-cyan-500 text-sm transition-colors"
                >
                  bndy.app
                </Link>
              </li>
              <li>
                <a
                  href="https://bndy.co.uk/privacy"
                  className="text-gray-300 hover:text-orange-500 text-sm transition-colors"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="https://bndy.co.uk/terms"
                  className="text-gray-300 hover:text-cyan-500 text-sm transition-colors"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>

          {/* Connect column */}
          <div className="text-center">
            <h3 className="font-medium mb-3 text-white">Connect</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-cyan-500 text-sm transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <a
                  href="https://bndy.co.uk/contact"
                  className="text-gray-300 hover:text-orange-500 text-sm transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-300 hover:text-cyan-500 text-sm transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us column */}
          <div className="text-center">
            <h3 className="font-medium mb-3 text-white">Follow Us</h3>
            <div className="flex justify-center gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform"
                  aria-label={`${link.platform} link`}
                >
                  <SocialIcon platform={link.platform} size={24} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright section */}
        <div className="flex flex-col md:flex-row justify-between items-center border-t border-slate-700 pt-4 gap-2">
          <div className="text-gray-400 text-xs">
            © {new Date().getFullYear()} BNDY. All rights reserved.
          </div>
          <div>
            <p className="text-gray-400 text-xs">
              Made with <span className="text-red-500">❤️</span> by musicians for musicians
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FullFooter;
