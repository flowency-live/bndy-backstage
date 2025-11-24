//path: src/pages/public/LandingPage.tsx

import React from 'react';
import PublicLayout from '../../components/public/PublicLayout';
import BndyLogo from '../../components/public/BndyLogo';
import { MapPin, Calendar, ExternalLink } from 'lucide-react';

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Background Image with gradient fade - fixed but limited height */}
      <div className="fixed top-0 left-0 right-0 h-[80vh] z-0 overflow-hidden pointer-events-none">
        {/* Mobile background */}
        <div
          className="absolute inset-0 opacity-20 bg-contain bg-no-repeat bg-top md:hidden"
          style={{
            backgroundImage: 'url(/assets/public/bndy_landing_banner_mobile.jpg)',
          }}
        />
        {/* Desktop background */}
        <div
          className="absolute inset-0 opacity-20 bg-cover bg-[center_30%] hidden md:block"
          style={{
            backgroundImage: 'url(/assets/public/bndy_landing_banner.jpg)',
          }}
        />
        {/* Gradient fade from transparent to solid */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900" />
      </div>

      {/* Content - above background */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-16 pb-16 px-4 text-white z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mx-auto mb-8">
              <BndyLogo
                className="mx-auto w-48 md:w-64"
                color="#f97316"
              />
            </div>

            {/* Desktop: Single line */}
            <h1 className="hidden md:block text-4xl md:text-5xl font-bold mb-6 leading-tight md:whitespace-nowrap">
              <span className="text-white">Keeping </span>
              <span className="text-cyan-500">LIVE</span>
              <span className="text-white"> Music </span>
              <span className="text-orange-500">ALIVE</span>
            </h1>

            {/* Mobile: Grid layout with left/right alignment */}
            <div className="block md:hidden font-bold mb-6 text-3xl leading-tight">
              <div className="grid grid-cols-[max-content_max-content] gap-x-2 justify-center items-center">
                <span className="text-white text-left">Keeping</span>
                <span className="text-cyan-500 text-right">LIVE</span>
                <span className="text-white text-left">Music</span>
                <span className="text-orange-500 text-right">ALIVE</span>
              </div>
            </div>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              A community-driven platform connecting people to grassroots live music events.
              No ads, no clutter, just the music you love.
            </p>
          </div>
        </section>

        {/* Live Music Discovery Section */}
        <section className="relative py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">
              Live Music Discovery
            </h2>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Live Event Discovery */}
              <div className="bg-slate-800/60 backdrop-blur-sm p-8 rounded-xl border border-slate-700">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mr-4">
                    <MapPin className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Live Event Discovery</h3>
                </div>

                <p className="text-gray-300 mb-6">
                  Our bndy LIVE map helps you discover authentic live music events near you without scrolling through social media. Filter by genre, venue, and more - all without ads or algorithmic manipulation.
                </p>

                <ul className="space-y-3 mb-6 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 mr-3"></div>
                    Interactive map of local events
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 mr-3"></div>
                    Follow your favorite artists and venues
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-cyan-500 mr-3"></div>
                    No ads, no noise, just music
                  </li>
                </ul>

                <a
                  href="https://bndy.live"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-orange-500 hover:text-orange-400 font-medium transition-colors"
                >
                  Explore Live Music
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>

              {/* bndy Stage */}
              <div className="bg-slate-800/60 backdrop-blur-sm p-8 rounded-xl border border-slate-700">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mr-4">
                    <Calendar className="w-6 h-6 text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white">bndy Stage</h3>
                </div>

                <p className="text-gray-300 mb-6">
                  Artist, venue, and studio management solution. Simplify your music journey with collaborative tools built by musicians, for musicians.
                </p>

                <ul className="space-y-3 mb-6 text-gray-300">
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-orange-500 mr-3"></div>
                    Collaborative setlist builder
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-orange-500 mr-3"></div>
                    Song repertoire management
                  </li>
                  <li className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-orange-500 mr-3"></div>
                    Gig & event promotion tools
                  </li>
                </ul>

                <a
                  href="/stage"
                  className="inline-flex items-center text-cyan-500 hover:text-cyan-400 font-medium transition-colors"
                >
                  Manage Your Music
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Community Section */}
        <section className="relative z-10 py-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12 text-white">A Community-Driven Platform</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/20 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <div className="w-12 h-12 rounded-full mx-auto bg-orange-500 flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Supporting Grassroots</h3>
                <p className="text-gray-300">
                  Built specifically for independent artists, specialist venues, and passionate music fans.
                </p>
              </div>

              <div className="bg-slate-800/20 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <div className="w-12 h-12 rounded-full mx-auto bg-orange-500 flex items-center justify-center mb-4">
                  <span className="text-white text-lg">⚡</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">No Ads, No Noise</h3>
                <p className="text-gray-300">
                  We don't sell your data or attention. Just pure, direct connections to the music you love.
                </p>
              </div>

              <div className="bg-slate-800/20 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <div className="w-12 h-12 rounded-full mx-auto bg-cyan-500 flex items-center justify-center mb-4">
                  <span className="text-white text-lg">👥</span>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">By Musicians, For Everyone</h3>
                <p className="text-gray-300">
                  Created by musicians who understand the challenges of the live music scene.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="relative z-10 py-16 px-4 text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-white">Ready to experience live music differently?</h2>
            <p className="text-xl text-white mb-8">Join thousands in our community discovering and supporting live music every day.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://bndy.live"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-full bg-white text-orange-600 hover:bg-gray-100 font-medium text-lg transition-colors"
              >
                Explore Live Events
              </a>

              <a
                href="/stage"
                className="px-8 py-3 rounded-full bg-transparent hover:bg-orange-600 text-white border border-white font-medium text-lg transition-colors"
              >
                Manage Your Music
              </a>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
