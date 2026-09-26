'use client';

import React from 'react';

interface FlowdeskLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const FlowdeskLogo: React.FC<FlowdeskLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-6 h-6', icon: 24, font: 'text-sm' },
    md: { box: 'w-7 h-7', icon: 28, font: 'text-base font-extrabold' },
    lg: { box: 'w-10 h-10', icon: 40, font: 'text-xl font-extrabold' },
    xl: { box: 'w-12 h-12', icon: 48, font: 'text-2xl font-black' },
  };

  const { box, font } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Flowdesk Ribbon Icon */}
      <div
        className={`${box} rounded-xl bg-linear-to-tr from-[#6366F1] via-[#7B68EE] to-[#06B6D4] p-1 flex items-center justify-center shadow-xs transition-transform hover:scale-105`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
        >
          <defs>
            <linearGradient id="flowGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="flowAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          {/* Top flowing ribbon bar */}
          <path
            d="M8 8.5C8 7.67 8.67 7 9.5 7H22.5C23.88 7 25 8.12 25 9.5C25 10.88 23.88 12 22.5 12H13.5V14.5H19.5C20.88 14.5 22 15.62 22 17C22 18.38 20.88 19.5 19.5 19.5H13.5V24C13.5 24.83 12.83 25.5 12 25.5C11.17 25.5 10.5 24.83 10.5 24V9.5C10.5 8.95 9.28 8.5 8 8.5Z"
            fill="url(#flowGlow)"
          />

          {/* Dynamic flowing wave fold */}
          <path
            d="M9 16C12.5 13 17.5 13 22 15.5C19.5 18 15 18.5 11.5 16.5L9 16Z"
            fill="url(#flowAccent)"
            fillOpacity="0.85"
          />
        </svg>
      </div>

      {/* Brand Name Typography */}
      {showText && (
        <span
          className={`tracking-tight text-slate-900 flex items-center font-bold ${font} ${textClassName}`}
        >
          Flow<span className="text-[#7B68EE]">desk</span>
        </span>
      )}
    </div>
  );
};
