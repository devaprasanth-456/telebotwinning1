import React, { useEffect, useRef } from 'react';

/**
 * AviatorFlightArena.jsx
 * 
 * Hyper-Realistic Aviator Flight Simulator & Live Stream Visualizer
 * Accurately replicates the Spribe / 1win Aviator interface observed in WhatsApp Video:
 *   - Radial sunburst dark arena background
 *   - Red propeller aeroplane climbing along dynamic red exponential bezier curve
 *   - Filled glowing red trajectory under-area
 *   - Animated smoke particles / exhaust jet stream
 *   - Bold Aviator multiplier typography (White climbing -> Red 'FLEW AWAY!' on crash)
 *   - Authentic "Waiting for next round" standby overlay
 */

export default function AviatorFlightArena({
  multiplier = 1.00,
  status = 'RUNNING', // 'WAITING' | 'RUNNING' | 'CRASHED'
  predictedCrash = 2.82,
  previousRounds = [1.23, 1.54, 1.14, 6.80, 1.11, 2.67, 1.99, 2.43],
  isLiveStream = false,
  onStartSimulation,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);

  // Setup animated particles and canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let planeAngle = 0;
    let propellerSpin = 0;

    const render = () => {
      const width = canvas.width = canvas.offsetWidth;
      const height = canvas.height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);

      // 1. Radial Sunburst Background Rays (Identical to Video)
      const centerX = width * 0.5;
      const centerY = height * 0.55;
      const numRays = 18;
      const radius = Math.max(width, height) * 1.2;

      ctx.save();
      ctx.translate(centerX, centerY);
      for (let i = 0; i < numRays; i++) {
        ctx.beginPath();
        const angle1 = (i * 2 * Math.PI) / numRays;
        const angle2 = ((i * 2 + 1) * Math.PI) / numRays;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, angle1, angle2);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 20, 40, 0.04)' : 'rgba(0, 0, 0, 0.35)';
        ctx.fill();
      }
      ctx.restore();

      // 2. Flight Trajectory Curve & Area
      if (status === 'RUNNING' || status === 'CRASHED') {
        const mult = typeof multiplier === 'number' && !isNaN(multiplier) ? Math.max(1.0, multiplier) : 1.0;
        
        // Progress mapping: 1.0x at bottom left, 10x+ towards top right
        const progress = Math.min(1.0, Math.max(0.02, Math.log(mult) / Math.log(8.0)));
        
        const startX = width * 0.06;
        const startY = height * 0.88;
        const endX = startX + progress * (width * 0.82);
        const endY = startY - Math.pow(progress, 0.82) * (height * 0.68);

        // Control point for authentic upward curved trajectory
        const cpX = startX + (endX - startX) * 0.55;
        const cpY = startY - 8;

        // Draw Filled Red Trajectory Gradient Area Under Curve
        const grad = ctx.createLinearGradient(0, endY, 0, startY);
        grad.addColorStop(0, 'rgba(231, 26, 35, 0.45)');
        grad.addColorStop(0.5, 'rgba(180, 10, 20, 0.25)');
        grad.addColorStop(1, 'rgba(100, 0, 10, 0.02)');

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.lineTo(endX, startY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Thick Glowing Red Contour Curve
        ctx.save();
        ctx.shadowColor = '#ff1e27';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.strokeStyle = '#ff1e27';
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.restore();

        // Calculate Plane Flight Angle from Curve Tangent
        const t = 0.98;
        const tangentX = 2 * (1 - t) * (cpX - startX) + 2 * t * (endX - cpX);
        const tangentY = 2 * (1 - t) * (cpY - startY) + 2 * t * (endY - cpY);
        planeAngle = Math.atan2(tangentY, tangentX);

        // 3. Smoke Particles Behind Plane
        if (status === 'RUNNING') {
          if (Math.random() < 0.6) {
            particlesRef.current.push({
              x: endX - Math.cos(planeAngle) * 20,
              y: endY - Math.sin(planeAngle) * 20,
              vx: (Math.random() - 0.5) * 1.5 - Math.cos(planeAngle) * 2,
              vy: (Math.random() - 0.5) * 1.5 - Math.sin(planeAngle) * 2,
              size: Math.random() * 4 + 2,
              alpha: 0.8,
              decay: 0.025,
            });
          }
        }

        // Draw & Update Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          p.size += 0.15;

          if (p.alpha <= 0) {
            particlesRef.current.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 60, 60, ${p.alpha * 0.5})`;
          ctx.fill();
        }

        // 4. Draw Red Aeroplane (If not crashed away)
        if (status === 'RUNNING') {
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(planeAngle);

          // Aeroplane Body
          ctx.shadowColor = '#ff2b34';
          ctx.shadowBlur = 10;

          // Main Wing
          ctx.fillStyle = '#ff1e27';
          ctx.beginPath();
          ctx.ellipse(-4, -2, 24, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          // Fuselage
          ctx.fillStyle = '#e71a23';
          ctx.beginPath();
          ctx.ellipse(0, 0, 32, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tail Wing
          ctx.fillStyle = '#cc0010';
          ctx.beginPath();
          ctx.moveTo(-24, 0);
          ctx.lineTo(-34, -14);
          ctx.lineTo(-28, -14);
          ctx.lineTo(-18, 0);
          ctx.closePath();
          ctx.fill();

          // Cockpit
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(8, -3, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Spinning Propeller
          propellerSpin += 0.45;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const pLength = 12 * Math.sin(propellerSpin);
          ctx.moveTo(34, -pLength);
          ctx.lineTo(34, pLength);
          ctx.stroke();

          ctx.restore();
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [multiplier, status]);

  // Color helper for top odds pill
  const getOddsPillColor = (val) => {
    const num = typeof val === 'number' ? val : parseFloat(val) || 1.0;
    if (num >= 10.0) return 'text-[#ff3399] bg-[#ff3399]/15 border-[#ff3399]/40';
    if (num >= 2.0) return 'text-[#9966ff] bg-[#9966ff]/15 border-[#9966ff]/40';
    return 'text-[#3399ff] bg-[#3399ff]/15 border-[#3399ff]/40';
  };

  return (
    <div className="relative w-full h-[340px] sm:h-[380px] bg-gradient-to-b from-[#140204] via-[#090102] to-black rounded-3xl overflow-hidden border border-red-500/30 shadow-[0_0_40px_rgba(231,26,35,0.25)] flex flex-col justify-between select-none">
      
      {/* 1. Top Recent Multiplier History Bar (Matching exact Aviator top bar) */}
      <div className="relative z-20 px-3 py-2.5 bg-black/60 backdrop-blur-md border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase shrink-0 mr-1">
          HISTORY:
        </span>
        {previousRounds.slice(0, 10).map((r, i) => (
          <span
            key={i}
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-black border ${getOddsPillColor(r)} shrink-0 transition-transform hover:scale-105`}
          >
            {typeof r === 'number' ? r.toFixed(2) : r}x
          </span>
        ))}
      </div>

      {/* 2. Interactive Canvas Arena (Sunburst + Parabolic Curve + Red Jet) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Center Multiplier Typography Display */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center pointer-events-none">
          {status === 'RUNNING' && (
            <div className="animate-pulse">
              <span className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                {multiplier.toFixed(2)}x
              </span>
            </div>
          )}

          {status === 'CRASHED' && (
            <div className="space-y-1 animate-bounce">
              <span className="text-sm sm:text-base font-black tracking-widest text-[#ff2a34] uppercase drop-shadow-[0_0_15px_rgba(255,42,52,0.8)] block">
                FLEW AWAY!
              </span>
              <span className="text-5xl sm:text-6xl font-black font-mono text-[#ff2a34] drop-shadow-[0_0_20px_rgba(255,42,52,0.9)]">
                {multiplier.toFixed(2)}x
              </span>
            </div>
          )}

          {status === 'WAITING' && (
            <div className="bg-black/80 backdrop-blur-md border border-red-500/40 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(231,26,35,0.3)]">
              <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin mb-1" />
              <span className="text-xs font-black tracking-widest text-zinc-300 uppercase">
                WAITING FOR NEXT ROUND
              </span>
              <span className="text-[10px] font-mono text-[#39ff14] bg-[#00ff66]/10 px-2.5 py-0.5 rounded-full border border-[#00ff66]/30">
                PREDICTED: ~{predictedCrash.toFixed(2)}x ({predictedCrash >= 2.00 ? '🟢 OVER 2X' : '🔴 UNDER 2X'})
              </span>
            </div>
          )}
        </div>

        {/* Brand Watermark (Official Aviator Style) */}
        <div className="absolute left-4 bottom-3 z-10 opacity-30 flex items-center gap-2 pointer-events-none">
          <span className="text-xs font-black font-chakra tracking-widest text-white italic">
            AVIATOR PRO
          </span>
        </div>
      </div>

      {/* 3. Bottom Controls / Real-Site Sync Status */}
      <div className="relative z-20 px-3 py-2 bg-black/80 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isLiveStream ? 'bg-[#39ff14] animate-ping' : 'bg-amber-400'}`} />
          <span className="font-bold text-zinc-300">
            {isLiveStream ? 'SYNCED WITH REAL SITE' : 'SIMULATED PHYSICS ARENA'}
          </span>
        </div>

        {!isLiveStream && (
          <button
            onClick={onStartSimulation}
            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs uppercase transition-all shadow-[0_0_12px_rgba(231,26,35,0.4)]"
          >
            Launch Round
          </button>
        )}
      </div>

    </div>
  );
}
