import React from 'react';

export default function FlamoraAnimatedLogo({ className = '' }: { className?: string }) {
    // ======= TWEAK THESE TO MOVE THE FLAME AS A WHOLE =======
    const flameOffsetX = -23;   // positive = right, negative = left
    const flameOffsetY = -5;   // positive = down,  negative = up
    const flameScale = 1.3;     // 1.0 = normal, 1.5 = 50% bigger, 0.8 = 20% smaller

    // ======= TWEAK THIS TO RESIZE THE 'O' AS A WHOLE =======
    const oScale = 1.0;         // 1.0 = normal, 1.2 = 20% bigger, 0.8 = 20% smaller
    // =========================================================

    return (
        <div className={`flex items-center justify-center w-full ${className}`}>
            <svg viewBox="0 -30 560 230" className="w-full h-auto drop-shadow-sm px-4">
                <style>{`
          .anim-flame {
            transform-origin: 266px 140px;
            animation: flame-flutter 1.5s infinite ease-in-out;
          }
          @keyframes flame-flutter {
            0%, 100% { transform: scaleY(1) skewX(0deg); }
            25% { transform: scaleY(1.04) skewX(1deg); }
            50% { transform: scaleY(0.96) skewX(-1deg); }
            75% { transform: scaleY(1.02) skewX(0.5deg); }
          }
        `}</style>

                <defs>
                    {/* Flame Gradient matched to the logo photo */}
                    <linearGradient id="fireGrad" x1="0%" y1="100%" x2="50%" y2="0%">
                        <stop offset="0%" stopColor="#e1382b" />
                        <stop offset="50%" stopColor="#f36523" />
                        <stop offset="100%" stopColor="#f8a11b" />
                    </linearGradient>
                </defs>

                {/* Flame Background - wrapped in translate for easy repositioning */}
                <g transform={`translate(${flameOffsetX}, ${flameOffsetY}) translate(266, 140) scale(${flameScale}) translate(-266, -140)`}>
                    {/* Mask to cut the white swoosh slit */}
                    <mask id="flameSlit">
                        <rect x="0" y="-50" width="560" height="300" fill="white" />
                        <path d="M 266 140 C 281 120, 284 90, 281 70 C 274 90, 266 110, 256 130 Z" fill="black" />
                    </mask>

                    <g className="anim-flame" mask="url(#flameSlit)">
                        <path
                            d="M 256 140 
               C 206 140, 196 100, 211 80 
               C 216 70, 236 45, 241 40 
               C 231 65, 241 80, 251 90 
               C 241 70, 251 30, 266 15 
               C 271 50, 281 70, 276 90 
               C 291 75, 301 60, 311 50 
               C 321 70, 316 100, 296 125 
               C 286 135, 271 140, 256 140 Z"
                            fill="url(#fireGrad)"
                        />
                    </g>
                </g>

                {/* FLAMORA Text Base Styling */}
                <g
                    fontFamily='"Montserrat", "Arial Black", "Impact", sans-serif'
                    fontSize="78"
                    fontWeight="900"
                    fill="#1d2932"
                >
                    {/* Text FLAM - ends right before the O ring */}
                    <text x="291" y="142" textAnchor="end" textLength="210" lengthAdjust="spacingAndGlyphs">
                        FLAM
                    </text>

                    {/* Text RA - starts right after the O ring */}
                    <text x="350" y="142" textAnchor="start" textLength="109" lengthAdjust="spacingAndGlyphs">
                        RA
                    </text>
                </g>

                {/* ========== THE 'O' - GAS CYLINDER IN RING ========== */}
                <g transform={`translate(321, 115) scale(${oScale})`}>
                    {/* Thick outer ring - matches letter cap height */}
                    <circle cx="0" cy="0" r="25" fill="none" stroke="#1d2932" strokeWidth="8" />

                    {/* Gas cylinder inside the ring */}
                    {/* Handle/Guard arch on top */}
                    <path
                        d="M -7 -8 L -7 -15 C -7 -20, 7 -20, 7 -15 L 7 -8"
                        fill="none"
                        stroke="#1d2932"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                    {/* Valve block on top */}
                    <rect x="-3" y="-16" width="6" height="5" rx="1" fill="#1d2932" />

                    {/* Main cylinder body (pill shape) */}
                    <rect x="-10" y="-6" width="20" height="24" rx="7" fill="#1d2932" />

                    {/* Horizontal stripe cutouts on body */}
                    <line x1="-8" y1="2" x2="8" y2="2" stroke="#F0F4F8" strokeWidth="1.5" />
                    <line x1="-8" y1="7" x2="8" y2="7" stroke="#F0F4F8" strokeWidth="1.5" />

                    {/* Base/foot stand */}
                    <path d="M -6 18 L -8 22 H 8 L 6 18 Z" fill="#1d2932" />
                </g>

                {/* Subtitle Slogan */}
                <text
                    x="274" y="165"
                    fontFamily='"Montserrat", "Arial", sans-serif'
                    fontSize="15"
                    fontWeight="bold"
                    fill="#1d2932"
                    textAnchor="middle"
                    letterSpacing="5"
                    textLength="378"
                    lengthAdjust="spacing"
                >
                    GAS RIGHT TO YOUR DOORSTEP
                </text>

                {/* LPG DISTRIBUTION Badge Area */}
                <g transform="translate(270, 186)">
                    {/* Black Background */}
                    <rect x="-120" y="-14" width="240" height="20" rx="4" fill="#1d2932" />
                    {/* White Text */}
                    <text
                        x="3" y="0"
                        fontFamily='"Montserrat", "Arial", sans-serif'
                        fontSize="11"
                        fontWeight="bold"
                        fill="#ffffff"
                        textAnchor="middle"
                        letterSpacing="8"
                    >
                        LPG DISTRIBUTION
                    </text>
                </g>

            </svg>
        </div>
    );
}
