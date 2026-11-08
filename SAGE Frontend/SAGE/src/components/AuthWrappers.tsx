import React from 'react';

// SAGE Logo mark
export function SageLogo({ size = 48, mono = false }: { size?: number; mono?: boolean }) {
  const cols = 5;
  const rows = 4;
  const gap = 4;
  const cell = Math.floor((size - gap * (cols - 1)) / cols);
  const filled = [[1,0],[2,0],[3,0],[0,1],[4,1],[1,2],[2,2],[3,2],[0,3],[4,3]];
  const empty = [[0,0],[4,0],[1,1],[2,1],[3,1],[0,2],[4,2],[1,3],[2,3],[3,3]];
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {empty.map(([c, r]) => (
        <rect key={`e${c}${r}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={2} fill={mono ? 'rgba(255,255,255,0.12)' : 'rgba(124,92,191,0.1)'} />
      ))}
      {filled.map(([c, r]) => (
        <rect key={`f${c}${r}`} x={c * (cell + gap)} y={r * (cell + gap)} width={cell} height={cell} rx={2} fill={mono ? 'rgba(255,255,255,0.75)' : `url(#grad-${size})`} />
      ))}
      {!mono && (
        <defs>
          <linearGradient id={`grad-${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8173f"/>
            <stop offset="100%" stopColor="#7c5cbf"/>
          </linearGradient>
        </defs>
      )}
    </svg>
  );
}

// Auth Layout Wrapper
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sage-bg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {children}
    </div>
  );
}

// Auth two-column shell
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 900, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 520, borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 80px rgba(26,22,48,0.14)' }}>
      {children}
    </div>
  );
}

// Left panel (logo + brand)
export function AuthLeft() {
  return (
    <div style={{ 
      backgroundImage: "url('/tup-bg.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative', 
      borderRight: '1px solid rgba(255,255,255,0.1)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '3rem', 
      gap: '1rem',
      overflow: 'hidden'
    }}>
      
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(100, 10, 25, 0.75)' }}></div>
      
      <img 
        src="/sage-logo.png" 
        alt="SAGE Official Logo" 
        style={{ position: 'relative', zIndex: 1, width: '130px', height: 'auto', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }} 
      />
      
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '2.8rem', color: '#ffffff', lineHeight: 1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          SAGE
        </div>
        
        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)', marginTop: '0.5rem', letterSpacing: '0.03em', fontWeight: 500, textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
          Scheduling and Generation Engine
        </div>
      </div>
      
    </div>
  );
}