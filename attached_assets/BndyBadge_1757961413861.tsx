//path: src/components/logos/BndyBadge.tsx
'use client';

import React from 'react';

interface BndyBadgeProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  withTagline?: boolean;
  altText?: string;
}

/**
 * BndyBadge component that displays the BNDY badge logo
 * This component requires the BndyBeatBadge.png to be available in your assets
 */
const BndyBadge: React.FC<BndyBadgeProps> = ({
  className = '',
  size = 'medium',
  withTagline = false,
  altText = 'BNDY'
}) => {
  // Map sizes to height values
  const sizeMap = {
    small: 'h-5',
    medium: 'h-10',
    large: 'h-16'
  };

  // Handle imports based on your project's setup
  // Option 1: Direct path to the image file
  const badgePath = '/src/assets/images/BndyBeatBadge.png';
  
  // Option 2: Use an import (uncomment if your build system supports it)
  // import badgeImage from '../../assets/images/BndyBeatBadge.png';
  // const badgePath = badgeImage;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-transparent">
        <img 
          src={badgePath} 
          alt={altText} 
          className={`${sizeMap[size]} w-auto`} 
        />
      </div>
      
      {withTagline && (
        <p className="mt-2 text-sm text-center">
          Keeping <span className="text-cyan-500 font-bold">LIVE</span> music <span className="text-orange-500 font-bold">ALIVE</span>
          <br />
          <span className="text-slate-600 dark:text-slate-400">Community-driven event discovery</span>
        </p>
      )}
    </div>
  );
};

export default BndyBadge;