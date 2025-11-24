// src/pages/public/AboutPage.tsx

import React from 'react';
import PublicLayout from '../../components/public/PublicLayout';
import { Music, Users, Star, Target } from 'lucide-react';

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="pt-16 pb-12 px-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About BNDY</h1>
          <p className="text-xl text-gray-300">
            A community-driven platform built by musicians, for everyone who loves live music.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full mx-auto bg-orange-500/20 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-white">Our Mission</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              To keep live music alive by connecting communities to grassroots events and empowering
              artists with the tools they need to succeed - all without ads, algorithms, or data exploitation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto bg-cyan-500/20 flex items-center justify-center mb-4">
                <Music className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">For Artists</h3>
              <p className="text-gray-300">
                Free tools to manage gigs, setlists, and repertoires. Built by musicians who understand your needs.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto bg-orange-500/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">For Fans</h3>
              <p className="text-gray-300">
                Discover authentic live music events without scrolling through social media feeds.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 rounded-full mx-auto bg-cyan-500/20 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-cyan-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">For Venues</h3>
              <p className="text-gray-300">
                Promote your events directly to music lovers in your area. No middleman, no fees.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">Our Values</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">🎵 Community First</h3>
              <p className="text-gray-300">
                We believe in the power of local music communities. BNDY is built to strengthen connections
                between artists, venues, and fans at the grassroots level.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">🔒 Privacy Matters</h3>
              <p className="text-gray-300">
                We don't sell your data. We don't track you across the web. Your information stays yours.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">✨ No Ads, No Noise</h3>
              <p className="text-gray-300">
                Experience music discovery without advertisements or algorithmic manipulation. Just pure,
                organic connections to the music you love.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">🤝 Built Together</h3>
              <p className="text-gray-300">
                BNDY is shaped by feedback from musicians, venue owners, and music fans. We're building
                this platform together, for all of us.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-white">Get In Touch</h2>
          <p className="text-lg text-white mb-8">
            Have questions, suggestions, or want to get involved? We'd love to hear from you.
          </p>
          <a
            href="https://bndy.co.uk/contact"
            className="inline-flex items-center px-6 py-3 rounded-full bg-white text-orange-600 hover:bg-gray-100 font-medium transition-colors"
          >
            Contact Us
          </a>
        </div>
      </section>
    </PublicLayout>
  );
}
