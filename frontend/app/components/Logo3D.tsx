'use client';

import { useEffect, useState } from 'react';

export default function Logo3D({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'reveal' | 'done'>('loading');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 2200);
    const t2 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a] transition-opacity duration-700 ${phase === 'done' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: i % 3 === 0 ? '#39ff14' : i % 3 === 1 ? '#007acc' : '#ff6b35',
              opacity: 0.3 + Math.random() * 0.4,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `
          linear-gradient(rgba(57,255,20,0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(57,255,20,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        animation: 'gridScroll 8s linear infinite',
      }} />

      <div className="relative flex flex-col items-center">
        {/* 3D Cube */}
        <div className="perspective-[800px] mb-8">
          <div className="w-28 h-28 relative animate-[cubeRotate_4s_ease-in-out_infinite]" style={{ transformStyle: 'preserve-3d' }}>
            {/* Front */}
            <div className="absolute inset-0 border-2 border-[#39ff14] bg-[#39ff14]/10 flex items-center justify-center" style={{ transform: 'translateZ(56px)', boxShadow: '0 0 30px rgba(57,255,20,0.4), inset 0 0 30px rgba(57,255,20,0.1)' }}>
              <span className="text-[#39ff14] text-4xl font-black">L</span>
            </div>
            {/* Back */}
            <div className="absolute inset-0 border-2 border-[#007acc] bg-[#007acc]/10 flex items-center justify-center" style={{ transform: 'rotateY(180deg) translateZ(56px)', boxShadow: '0 0 30px rgba(0,122,204,0.4)' }}>
              <span className="text-[#007acc] text-4xl font-black">A</span>
            </div>
            {/* Left */}
            <div className="absolute inset-0 border-2 border-[#ff6b35] bg-[#ff6b35]/10 flex items-center justify-center" style={{ transform: 'rotateY(-90deg) translateZ(56px)', boxShadow: '0 0 30px rgba(255,107,53,0.4)' }}>
              <span className="text-[#ff6b35] text-4xl font-black">Z</span>
            </div>
            {/* Right */}
            <div className="absolute inset-0 border-2 border-[#c678dd] bg-[#c678dd]/10 flex items-center justify-center" style={{ transform: 'rotateY(90deg) translateZ(56px)', boxShadow: '0 0 30px rgba(198,120,221,0.4)' }}>
              <span className="text-[#c678dd] text-4xl font-black">&#916;</span>
            </div>
            {/* Top */}
            <div className="absolute inset-0 border-2 border-[#39ff14] bg-[#39ff14]/5" style={{ transform: 'rotateX(90deg) translateZ(56px)' }} />
            {/* Bottom */}
            <div className="absolute inset-0 border-2 border-[#39ff14]/50 bg-[#0a0a0a]" style={{ transform: 'rotateX(-90deg) translateZ(56px)' }} />
          </div>
        </div>

        {/* Title */}
        <div className={`transition-all duration-1000 ${phase === 'loading' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
          <h1 className="text-5xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-[#39ff14] via-[#007acc] to-[#c678dd]">
            LAZARUS
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#39ff14]" />
            <span className="text-[10px] tracking-[0.5em] text-[#39ff14]/70 uppercase">Resurrection Engine</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#39ff14]" />
          </div>
        </div>

        {/* Loading bar */}
        <div className="mt-8 w-80">
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#39ff14] to-[#007acc] rounded-full transition-all ease-out"
              style={{
                width: phase === 'loading' ? '60%' : '100%',
                transitionDuration: phase === 'loading' ? '2200ms' : '800ms',
              }}
            />
          </div>
          <p className="text-[10px] text-[#555] text-center mt-2 tracking-wider">
            {phase === 'loading' ? 'INITIALIZING NEURAL ENGINE...' : 'SYSTEMS ONLINE'}
          </p>
        </div>

        {/* Floating tech tags */}
        <div className={`flex gap-3 mt-6 transition-all duration-700 ${phase === 'reveal' ? 'opacity-100' : 'opacity-0'}`}>
          {['AI-POWERED', 'DEEP ANALYSIS', 'AUTO-MIGRATE', 'ZERO DOWNTIME'].map((tag, i) => (
            <span key={i} className="px-3 py-1 text-[9px] tracking-wider border rounded-full"
              style={{
                borderColor: ['#39ff14', '#007acc', '#ff6b35', '#c678dd'][i],
                color: ['#39ff14', '#007acc', '#ff6b35', '#c678dd'][i],
                animationDelay: `${i * 150}ms`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes cubeRotate {
          0%, 100% { transform: rotateX(-15deg) rotateY(0deg); }
          25% { transform: rotateX(-15deg) rotateY(90deg); }
          50% { transform: rotateX(-15deg) rotateY(180deg); }
          75% { transform: rotateX(-15deg) rotateY(270deg); }
        }
        @keyframes gridScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(60px); }
        }
      `}</style>
    </div>
  );
}
