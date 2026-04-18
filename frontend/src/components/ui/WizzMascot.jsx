import React from 'react';

const WizzMascot = ({ className = '', style = {}, expression = 'default' }) => (
  <svg width="100%" viewBox="0 0 680 900" role="img" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <title>Nex – mascot for student learning webapp</title>
    <desc>A friendly, expressive ghost-like character named Nex holding a glowing question mark, designed for a student doubt-solving platform</desc>

    <style>
      {`
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      @keyframes blink { 0%,90%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.08)} }
      @keyframes glow { 0%,100%{opacity:0.7} 50%{opacity:1} }
      @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0.5)} 50%{opacity:1;transform:scale(1)} }
      .floaty { animation: float 3s ease-in-out infinite; transform-origin: center; }
      .eye { animation: blink 4s ease-in-out infinite; transform-origin: center; }
      .glowy { animation: glow 2s ease-in-out infinite; }
      .sp1 { animation: sparkle 2s ease-in-out infinite 0s; }
      .sp2 { animation: sparkle 2s ease-in-out infinite 0.6s; }
      .sp3 { animation: sparkle 2s ease-in-out infinite 1.2s; }
      .sp4 { animation: sparkle 2s ease-in-out infinite 1.8s; }
      `}
    </style>



    <g className="floaty">

      <path d="
        M220,340
        C220,240 260,180 340,175
        C420,180 460,240 460,340
        L460,540
        C460,555 450,562 440,555
        C425,545 415,538 400,548
        C385,558 375,565 360,555
        C348,547 338,542 328,548
        C315,557 305,562 290,555
        C272,546 258,542 244,555
        C232,562 220,558 220,540
        Z
      " fill="#6C4FD4"/>

      <path d="
        M235,310
        C235,255 262,215 300,200
        C275,225 258,268 258,330
        L258,430
        Z
      " fill="#8B72E8" opacity="0.5"/>

      <ellipse cx="340" cy="400" rx="80" ry="100" fill="#7D62DC" opacity="0.4"/>

      <ellipse cx="300" cy="310" rx="36" ry="40" fill="white"/>
      <ellipse cx="380" cy="310" rx="36" ry="40" fill="white"/>

      <g className="eye">
        {expression === 'happy' ? (
          <>
            <path d="M285 320 Q306 290 327 320" stroke="#1A1060" strokeWidth="12" strokeLinecap="round" fill="none" />
            <path d="M365 320 Q386 290 407 320" stroke="#1A1060" strokeWidth="12" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <circle cx="306" cy="314" r="22" fill="#1A1060"/>
            <circle cx="386" cy="314" r="22" fill="#1A1060"/>
          </>
        )}
      </g>

      {expression !== 'happy' && (
        <>
          <circle cx="314" cy="304" r="8" fill="white"/>
          <circle cx="394" cy="304" r="8" fill="white"/>
          <circle cx="298" cy="322" r="4" fill="white" opacity="0.6"/>
          <circle cx="378" cy="322" r="4" fill="white" opacity="0.6"/>
        </>
      )}

      <ellipse cx="268" cy="352" rx="22" ry="14" fill="#E879A0" opacity="0.35"/>
      <ellipse cx="412" cy="352" rx="22" ry="14" fill="#E879A0" opacity="0.35"/>

      <path d="M295 365 Q340 408 385 365" stroke="#1A1060" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M296 366 Q340 404 384 366 Q340 420 296 366Z" fill="#1A1060" opacity="0.15"/>

      <path d="M308 375 Q340 405 372 375 L372 385 Q340 413 308 385 Z" fill="white" opacity="0.9"/>

      <path d="M230,380 C195,350 170,320 180,290 C188,265 210,268 220,290 C230,312 232,340 232,360" fill="#6C4FD4" stroke="#5A3EC0" strokeWidth="1"/>
      <ellipse cx="178" cy="282" rx="20" ry="16" fill="#7D62DC"/>

      <path d="M450,370 C490,335 520,300 510,268 C502,242 480,248 472,272 C464,295 460,330 458,355" fill="#6C4FD4" stroke="#5A3EC0" strokeWidth="1"/>



      <g className="sp1">
        <path d="M155,230 L160,218 L165,230 L177,235 L165,240 L160,252 L155,240 L143,235 Z" fill="#FFD166"/>
      </g>
      <g className="sp2">
        <path d="M510,160 L514,151 L518,160 L527,164 L518,168 L514,177 L510,168 L501,164 Z" fill="#A78BFA"/>
      </g>
      <g className="sp3">
        <path d="M175,480 L178,473 L181,480 L188,483 L181,486 L178,493 L175,486 L168,483 Z" fill="#34D399"/>
      </g>
      <g className="sp4">
        <path d="M530,420 L533,413 L536,420 L543,423 L536,426 L533,433 L530,426 L523,423 Z" fill="#F472B6"/>
      </g>

      <circle cx="195" cy="310" r="5" fill="#A78BFA" opacity="0.6"/>
      <circle cx="490" cy="260" r="4" fill="#34D399" opacity="0.55"/>
      <circle cx="480" cy="460" r="6" fill="#FFD166" opacity="0.5"/>
      <circle cx="185" cy="420" r="4" fill="#F472B6" opacity="0.5"/>

    </g>

    <rect x="240" y="710" width="200" height="54" rx="27" fill="#6C4FD4"/>
    <text x="340" y="743" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="700" fill="white" letterSpacing="3">NEX</text>

    <path d="M222,730 L225,723 L228,730 L235,733 L228,736 L225,743 L222,736 L215,733 Z" fill="#FFD166"/>
    <path d="M452,730 L455,723 L458,730 L465,733 L458,736 L455,743 L452,736 L445,733 Z" fill="#FFD166"/>

  </svg>
);

export default WizzMascot;
