//path: src/components/ui/bndy-badge.tsx
import React from 'react';
import badgeImage from '@/assets/images/BndyBeatBadge.png';

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

  // Use imported badge image

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-transparent">
        <img 
          src={badgeImage} 
          alt={altText} 
          className={`${sizeMap[size]} w-auto`} 
          data-testid="bndy-badge"
        />
      </div>
      
      {withTagline && (
        <p className="mt-2 text-sm text-center" data-testid="badge-tagline">
          Keeping <span className="text-cyan-500 font-bold">LIVE</span> music <span className="text-orange-500 font-bold">ALIVE</span>
          <br />
          <span className="text-slate-600 dark:text-slate-400">Community-driven event discovery</span>
        </p>
      )}
    </div>
  );
};

export default BndyBadge;