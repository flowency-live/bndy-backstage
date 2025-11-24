// src/pages/public/StagePage.tsx

import React from 'react';
import BndyLogo from '../../components/public/BndyLogo';

export default function StagePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center mx-auto">
            <BndyLogo
              className="w-48 h-48 md:w-64 md:h-64"
              color="#f97316"
            />
          </div>
        </div>

        {/* Strapline - Responsive Layout */}
        <div className="max-w-2xl md:max-w-none mx-auto mb-12">
          {/* Desktop: Single line - force no wrap */}
          <h1 className="hidden md:block text-4xl lg:text-6xl font-bold mb-6 leading-tight md:whitespace-nowrap">
            <span className="text-white">Keeping </span>
            <span className="text-cyan-500">LIVE </span>
            <span className="text-white">Music </span>
            <span className="text-orange-500">ALIVE</span>
          </h1>

          {/* Mobile: K/M left-aligned, E's right-aligned, whole block centered */}
          <div className="block md:hidden font-bold mb-6 text-3xl leading-tight">
            <div className="grid grid-cols-[max-content_max-content] gap-x-2 justify-center items-center">
              <span className="text-white text-left">Keeping</span>
              <span className="text-cyan-500 text-right">LIVE</span>
              <span className="text-white text-left">Music</span>
              <span className="text-orange-500 text-right">ALIVE</span>
            </div>
          </div>

          <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
            The invite-only platform for bands who take their music seriously.
            Coordinate practices, manage gigs, and track song progress with your bandmates.
          </p>

          <div className="space-y-4">
            <a
              href="/login"
              className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Sign In to Your Band
            </a>

            <p className="text-white/70 text-sm">
              Invitation required • UK bands only
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-white/80 text-sm">
              Coordinate practices and gigs with conflict detection and availability tracking.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Song Management</h3>
            <p className="text-white/80 text-sm">
              Track song readiness with integrated Spotify search and progress monitoring.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Band Collaboration</h3>
            <p className="text-white/80 text-sm">
              Keep everyone in sync with member roles, availability, and practice notes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
