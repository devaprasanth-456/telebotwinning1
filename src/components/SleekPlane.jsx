import React from 'react';

export default function SleekPlane({ className = "w-28 h-16" }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Sleek Supersonic Red & Glowing Neon Jet SVG */}
      <svg
        viewBox="0 0 520 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_4px_16px_rgba(231,26,35,0.6)] animate-float"
      >
        <defs>
          <linearGradient id="jetBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff1e27" />
            <stop offset="60%" stopColor="#e71a23" />
            <stop offset="100%" stopColor="#99000a" />
          </linearGradient>

          <linearGradient id="wingGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7cff00" />
            <stop offset="100%" stopColor="#39ff14" />
          </linearGradient>

          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Engine Thruster Trail Flame */}
        <path
          d="M 60 140 Q 15 140 5 135 Q 25 145 60 145 Z"
          fill="url(#wingGlow)"
          filter="url(#neonGlow)"
          className="animate-pulse"
        />

        {/* Jet Aeroplane Main Body Structure */}
        <path
          d="M 490 120 
             C 440 90, 360 80, 260 95 
             L 160 30 
             C 145 20, 125 25, 130 45 
             L 155 105 
             L 90 110 
             L 60 85 
             L 40 90 
             L 60 135 
             L 40 180 
             L 60 185 
             L 90 160 
             L 155 165 
             L 130 225 
             C 125 245, 145 250, 160 240 
             L 260 175 
             C 360 190, 440 180, 490 150 
             C 525 135, 525 125, 490 120 Z"
          fill="url(#jetBody)"
          stroke="#ff5e65"
          strokeWidth="3"
        />

        {/* Cockpit Canopy Glass */}
        <path
          d="M 380 115 C 430 115, 470 125, 460 135 C 440 142, 380 140, 360 130 Z"
          fill="#000000"
          opacity="0.85"
          stroke="#7cff00"
          strokeWidth="2"
        />

        {/* Wing Tip Neon Accent Lines */}
        <path
          d="M 160 30 L 260 95"
          stroke="url(#wingGlow)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />
        <path
          d="M 160 240 L 260 175"
          stroke="url(#wingGlow)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#neonGlow)"
        />

        {/* Speed Motion Lines */}
        <line x1="30" y1="100" x2="110" y2="100" stroke="#39ff14" strokeWidth="2" opacity="0.6" strokeDasharray="6 4" />
        <line x1="10" y1="170" x2="100" y2="170" stroke="#e71a23" strokeWidth="2" opacity="0.7" strokeDasharray="8 4" />
      </svg>
    </div>
  );
}
