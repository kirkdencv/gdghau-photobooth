import React, { useState, useEffect } from 'react';

export default function HomeView({ onStart }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="crt-overlay noise-bg grid-bg min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col overflow-hidden relative" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
      
      {/* Ambient Glows */}
      <div className="ambient-glow ambient-tl"></div>
      <div className="ambient-glow ambient-tr"></div>
      <div className="ambient-glow ambient-bl"></div>
      <div className="ambient-glow ambient-br"></div>

      {/* Top nav bar - Minimal */}
      <header className="relative z-20 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#00f5ff] rec-dot" />
          <span className="text-sm md:text-base font-bold text-[#00f5ff] tracking-[0.4em] uppercase">SYS.NODE.00</span>
        </div>
        <div className="flex items-center gap-4 text-[#888] text-xs md:text-sm font-bold tracking-widest uppercase">
          <span className="text-[#555]">[</span>
          <span className={tick % 2 === 0 ? 'text-[#00ff41]' : 'text-[#333]'}>STATUS: ONLINE</span>
          <span className="text-[#555]">]</span>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 text-center">

        {/* Scan line sweep */}
        <div className="scan-line" />

        <div className="mb-4 text-[#ff003c] text-xs md:text-sm font-bold tracking-[0.5em] uppercase">
          // INITIALIZE SEQUENCE
        </div>

        {/* Main title */}
        <h1
          className="glitch text-[clamp(4rem,12vw,10rem)] leading-none text-white mb-2 drop-shadow-[0_0_15px_rgba(0,245,255,0.3)]"
          data-text="PHOTOBOOTH"
          style={{ fontFamily: "'VT323', monospace", letterSpacing: '0.05em' }}
        >
          PHOTOBOOTH
        </h1>

        <div className="text-[#00f5ff] text-sm md:text-lg font-bold tracking-[0.4em] uppercase mb-16 opacity-80" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          GDG ON CAMPUS HAU
        </div>

        {/* Minimal CTA */}
        <button
          onClick={onStart}
          className="relative group overflow-hidden border-2 border-[#00f5ff] text-[#00f5ff] px-12 py-4 uppercase tracking-[0.3em] font-bold text-lg md:text-xl transition-all duration-300 hover:bg-[rgba(0,245,255,0.1)] hover:shadow-[0_0_30px_rgba(0,245,255,0.4)]"
          style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))' }}
        >
          <span className="relative z-10 group-hover:text-white transition-colors duration-300">EXECUTE</span>
          {/* Button inner glow/scan effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(0,245,255,0.2)] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
        </button>

        <div className="mt-8 text-[#444] text-[10px] md:text-xs font-bold tracking-widest uppercase">
          [ WAITING FOR USER INPUT ]
        </div>

      </main>

      {/* Bottom Footer - Minimal */}
      <footer className="relative z-20 px-8 py-6 flex items-center justify-between text-[#444] text-xs font-bold tracking-widest uppercase">
        <div>V 2.0.26</div>
        <div>SECURE CONNECTION</div>
      </footer>
    </div>
  );
}
