import React, { useState, useEffect } from 'react';

export default function HomeView({ onStart }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="crt-overlay noise-bg grid-bg min-h-screen bg-[#080808] text-[#e0e0e0] flex flex-col overflow-hidden" style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      {/* Top nav bar */}
      <header className="relative z-20 border-b-2 border-[#1a1a1a] px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-[#00f5ff] rec-dot" />
          <span className="text-lg md:text-xl font-bold text-[#00f5ff] tracking-[0.3em] uppercase">GDG ON CAMPUS HAU</span>
        </div>
        <div className="flex items-center gap-4 text-[#888] text-sm md:text-lg font-bold tracking-widest uppercase">
          <span>NODE 00</span>
          <span className="text-[#555]">//</span>
          <span>SYSTEM ACCESS</span>
          <span className="text-[#555]">//</span>
          <span className="text-[#00ff41]">ONLINE</span>
        </div>
        <button
          onClick={onStart}
          className="cyber-btn text-lg md:text-xl font-bold px-8 py-3"
        >
          OPEN BOOTH
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 text-center py-20">

        {/* Scan line sweep */}
        <div className="scan-line" />

        {/* Node label */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-1 w-24 bg-[#00f5ff] opacity-40" />
          <span className="text-sm md:text-xl font-bold tracking-[0.4em] text-[#00f5ff] uppercase">Node 00: System Initialization</span>
          <div className="h-1 w-24 bg-[#00f5ff] opacity-40" />
        </div>

        {/* Main title */}
        <h1
          className="glitch text-[clamp(5rem,15vw,12rem)] leading-none text-white mb-6 drop-shadow-2xl"
          data-text="PHOTOBOOTH"
          style={{ fontFamily: "'VT323', monospace", letterSpacing: '0.05em' }}
        >
          PHOTOBOOTH
        </h1>
        <div className="text-[#ff003c] text-lg md:text-2xl font-bold tracking-[0.3em] uppercase mb-6" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          &gt;&gt; GDG ON CAMPUS HAU — OVERRIDE 2026 &lt;&lt;
        </div>
        <p className="text-[#aaa] text-lg md:text-2xl font-bold tracking-widest mt-6 mb-16 max-w-2xl leading-relaxed">
          INITIALIZE YOUR ENTRY. CHOOSE FILTER. CAPTURE DATA. EXTRACT OUTPUT.
        </p>

        {/* CTA */}
        <button
          onClick={onStart}
          className="cyber-btn-yellow cyber-btn text-xl md:text-3xl font-bold px-16 py-6 mb-6 shadow-[0_0_30px_rgba(245,230,66,0.5)]"
        >
          [ EXECUTE BOOTH SEQUENCE ]
        </button>
        <div className="text-[#777] text-sm md:text-lg font-bold tracking-widest mt-4">
          PRESS TO BEGIN &bull; CAMERA ACCESS REQUIRED
        </div>

        {/* Status ticker */}
        <div className="mt-20 border-2 border-[#1a1a1a] px-10 py-5 flex flex-wrap justify-center items-center gap-6 text-sm md:text-lg font-bold text-[#666] tracking-widest uppercase">
          <span className="text-[#00f5ff]">SYS</span>
          <span className="text-[#333]">|</span>
          <span className={tick % 2 === 0 ? 'text-[#00ff41]' : 'text-[#555]'}>CAMERA READY</span>
          <span className="text-[#333]">|</span>
          <span>FILTERS: 5</span>
          <span className="text-[#333]">|</span>
          <span>SHOTS: 3×</span>
        </div>
      </main>

      {/* How it works */}
      <section className="relative z-10 border-t border-[#1a1a1a] bg-[#0a0a0a] px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[#00f5ff] text-lg font-bold tracking-[0.4em] uppercase mb-4">// PROTOCOL SEQUENCE</div>
            <h2 className="text-6xl md:text-7xl text-white" style={{ fontFamily: "'VT323', monospace", letterSpacing: '0.05em' }}>HOW IT WORKS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { num: '01', title: 'SELECT FILTER', body: 'Navigate to the camera node. Activate a retro or color filter on the live feed before the sequence begins.' },
              { num: '02', title: 'CAPTURE × 3', body: 'The system fires a 10-second countdown. Strike a pose. Three shots will be captured automatically.' },
              { num: '03', title: 'EXTRACT OUTPUT', body: 'Edit your strip. Add face overlays. Download the compiled vertical photo strip to your device.' },
            ].map(item => (
              <div key={item.num} className="cyber-panel p-10 relative">
                <div className="text-[#ff003c] text-sm font-bold tracking-[0.3em] mb-4 uppercase">NODE {item.num}</div>
                <h3 className="text-[#f5e642] text-3xl mb-6 font-bold" style={{ fontFamily: "'VT323', monospace", letterSpacing: '0.05em' }}>{item.title}</h3>
                <p className="text-[#aaa] text-lg leading-relaxed tracking-wide font-bold">{item.body}</p>
                <div className="absolute bottom-4 right-4 text-sm font-bold text-[#444]">{item.num}/03</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 border-t border-[#1a1a1a] bg-[#080808] px-8 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          {[
            { val: '150+', label: 'ENTITIES CAPTURED' },
            { val: '5', label: 'FILTER MODES' },
            { val: '3×', label: 'SHOTS PER SESSION' },
            { val: '1-TAP', label: 'INSTANT DOWNLOAD' },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-6xl text-[#00f5ff] mb-2 flicker font-bold" style={{ fontFamily: "'VT323', monospace" }}>{stat.val}</div>
              <div className="text-[#666] text-sm md:text-base font-bold tracking-[0.3em] uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 border-t-2 border-[#1a1a1a] py-32 text-center bg-[#0a0a0a]">
        <div className="text-[#00f5ff] text-lg font-bold tracking-[0.4em] uppercase mb-6">// READY FOR DEPLOYMENT</div>
        <h2 className="text-[clamp(4rem,10vw,8rem)] text-white mb-12 leading-tight" style={{ fontFamily: "'VT323', monospace", letterSpacing: '0.05em' }}>
          THINK YOU CAN<br />KEEP UP?
        </h2>
        <button
          onClick={onStart}
          className="cyber-btn text-2xl font-bold px-16 py-6"
        >
          INITIALIZE YOUR ENTRY
        </button>
        <div className="mt-6 text-[#555] text-sm font-bold tracking-widest uppercase">BUILD. LEAD. TRANSFORM.</div>
      </section>

      <footer className="border-t-2 border-[#1a1a1a] py-10 text-center">
        <p className="text-[#555] text-sm font-bold tracking-[0.4em] uppercase">
          GDG ON CAMPUS HAU &copy; 2026 &bull; ALL NODES ACTIVE &bull; <span className="text-[#00ff41]">SYS ONLINE</span>
        </p>
      </footer>
    </div>
  );
}
