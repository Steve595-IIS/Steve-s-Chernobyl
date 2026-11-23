import { useEffect, useRef } from 'react';
import { clamp } from '../sim/physics';
import type { DebriefSummary, GameMode } from '../sim/types';

export interface OverlaysProps {
  mode: GameMode;
  showHelp: boolean;
  debrief: DebriefSummary | null;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onCloseHelp: () => void;
  onSkipExplosion: () => void;
}

export function Overlays({
  mode,
  showHelp,
  debrief,
  onStart,
  onResume,
  onRestart,
  onReturnTitle,
  onCloseHelp,
  onSkipExplosion,
}: OverlaysProps) {
  const debriefCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (mode !== 'gameover' || !debrief) return;
    const canvas = debriefCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const H = debrief.history;
    const n = H.length || 1;
    ctx.fillStyle = '#0b0f0b';
    ctx.fillRect(0, 0, 560, 160);

    const series: Array<[0 | 1 | 2, string, (v: number) => number]> = [
      [0, '#ffb000', (v) => (Math.log10(Math.max(v, 10)) - 1) / 4.3],
      [1, '#ff6a5a', (v) => (v + 1500) / 4000],
      [2, '#7fb4e0', (v) => v / 100],
    ];
    for (const [k, col, fn] of series) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      H.forEach((pt, idx) => {
        const x = (idx / n) * 556 + 2;
        const y = 156 - clamp(fn(pt[k]), 0, 1) * 150;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.setLineDash([4, 4]);
    const yb = 156 - ((480 + 1500) / 4000) * 150;
    ctx.beginPath();
    ctx.moveTo(0, yb);
    ctx.lineTo(560, yb);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#d3d8c7';
    ctx.font = '11px sans-serif';
    ctx.fillText('amber: power (log) · red: net reactivity · blue: rods inserted · dashed: β = 480 pcm', 6, 13);
  }, [mode, debrief]);

  if (mode === 'title') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 sm:p-10 pointer-events-none bg-gradient-to-r from-[#090c08]/90 via-[#090c08]/45 via-45% to-transparent">
        <div className="max-w-[540px] my-auto pointer-events-auto">
          {/* Bespoke inline SVG Unit 4 BShU-4 Title Lockup */}
          <svg viewBox="0 0 540 112" className="w-full max-w-[500px] h-auto mb-4" aria-hidden="true">
            <rect x="2" y="4" width="96" height="96" rx="4" fill="#141812" stroke="#e8a317" strokeWidth="2.5" />
            <circle cx="50" cy="52" r="34" fill="none" stroke="#a9b29b" strokeWidth="2" strokeDasharray="4 3" />
            {[
              [50, 26],
              [34, 40],
              [66, 40],
              [50, 52],
              [34, 64],
              [66, 64],
              [50, 78],
            ].map(([cx, cy], idx) => (
              <rect key={idx} x={cx - 4} y={cy - 4} width="8" height="8" fill={idx === 3 ? '#d83a2e' : '#e8a317'} />
            ))}
            <text x="114" y="50" fill="#e8a317" fontFamily="VT323, monospace" fontSize="54" letterSpacing="1.5">
              НОЧНАЯ СМЕНА
            </text>
            <text x="116" y="76" fill="#e9e5d3" fontFamily="PT Sans Narrow, sans-serif" fontSize="18" fontWeight="700" letterSpacing="2">
              БЩУ-4 · RBMK-1000 CONTROL ROOM 3D
            </text>
            <line x1="116" y1="88" x2="520" y2="88" stroke="#4e5645" strokeWidth="2" />
          </svg>

          <h1 className="sr-only">БЩУ-4 · Unit 4 Main Control Room 3D</h1>

          <p className="text-base sm:text-lg text-[#d7dac9] leading-snug mb-3 max-w-[48ch]">
            26 April 1986 · 00:28. Step into the 3D Unit 4 reactor hall and BShU-4 control desk as Senior Reactor
            Control Engineer. Raise power out of the xenon pit, complete the 36-second turbine rundown test, and scram
            from a safe rod margin.
          </p>

          <ul className="text-sm text-[#b7bda9] space-y-1 mb-6 list-disc pl-5 max-w-[46ch]">
            <li>Inspect the live 3D RBMK-1000 core cutaway, graphite rod tips, pumps, and Turbine 8.</li>
            <li>Keep ОЗР at 15+ rods and watch net reactivity against prompt critical (β = 480 pcm).</li>
            <li>Operate controls on the bottom desk, keyboard, or directly inside the 3D scene.</li>
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-7 py-3 text-lg font-bold bg-[#e8a317] text-[#111] rounded-sm border-2 border-[#ffcf66] shadow-[0_4px_0_#7a5200] hover:brightness-105 active:translate-y-0.5 cursor-pointer"
            >
              Take your seat
            </button>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-[#9aa38c] font-bold tracking-wide">
          ↑ / ↓ Rods · 1–4 Camera Views · Drag Orbit · Scroll Zoom · H Hide HUD · P Pause
        </div>
      </div>
    );
  }

  if (mode === 'paused') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
        <div className="bshu-panel max-w-md w-full p-6 rounded-sm text-center">
          <h2 className="font-led text-4xl text-[#e8a317] mb-1">SHIFT PAUSED</h2>
          <p className="text-sm text-[#c6cdb8] mb-5">Reactor simulation halted. All control loops are frozen.</p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="py-2.5 px-5 font-bold text-base bg-[#e8a317] text-[#111] rounded-sm hover:brightness-105"
            >
              Resume Shift
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="py-2 px-5 font-bold text-sm bg-[#272c22] text-[#e9e5d3] border border-[#5b6350] rounded-sm hover:bg-[#33392c]"
            >
              Restart from 00:28
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="py-2 px-5 font-bold text-sm bg-[#191d16] text-[#9aa38c] border border-[#3a4033] rounded-sm hover:text-[#e9e5d3]"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showHelp && mode === 'playing') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
        <div className="bshu-panel max-w-xl w-full p-6 rounded-sm text-[#e9e5d3] max-h-[90vh] overflow-y-auto">
          <h2 className="font-led text-4xl text-[#e8a317] mb-2">OPERATING BRIEFING · БЩУ-4</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm sm:text-base text-[#d7dac9] mb-5">
            <li>
              <b>Rods:</b> hold <b>▲ OUT</b> (or ↑) to withdraw rods and raise power from 30 MWt. Aim for 200+ MWt with
              period above 30s. Keep <b>ОЗР ≥ 15</b> if you can.
            </li>
            <li>
              <b>Turbine ТГ-8:</b> connect the turbine once power reaches 150+ MWt. At 01:23:04 with 200+ MWt and ТГ-8
              online, the 36-second rundown test begins automatically.
            </li>
            <li>
              <b>Test (36 s):</b> pumps coast down, steam voids grow (+1800 pcm max). Use rods, <b>БРУ-К</b> steam dump,
              and <b>Boron</b> to prevent prompt criticality (net ρ &gt; β = 480 pcm).
            </li>
            <li>
              <b>Safe Shutdown:</b> insert rods to <b>40%+</b>, lift the yellow safety cover, and press <b>АЗ-5</b>.
              Scramming from &lt;40% plunges the black graphite tips into the core bottom, causing a positive reactivity
              surge!
            </li>
            <li>
              <b>3D Interaction:</b> orbit freely with drag + scroll, switch views with <b>[1]–[4]</b>, and click 3D
              pumps, turbine key, or the АЗ-5 cover/button directly in the reactor hall.
            </li>
          </ol>
          <div className="text-right">
            <button
              type="button"
              onClick={onCloseHelp}
              className="py-2 px-6 font-bold bg-[#e8a317] text-[#111] rounded-sm hover:brightness-105"
            >
              Return to Console
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'exploding') {
    return (
      <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
        <div className="self-center bg-[#2a0503]/92 border-2 border-[#ff5a4a] px-4 py-2 rounded-sm shadow-lg text-center">
          <div className="font-led text-2xl sm:text-3xl tracking-wider text-[#ff7366] leading-none">
            ⚠ UNIT 4 CONTAINMENT FAILURE · STEAM &amp; PROMPT EXPLOSION
          </div>
          <div className="text-xs sm:text-sm font-bold text-[#ffd27a] mt-0.5">
            Upper Biological Shield &ldquo;Elena&rdquo; unseated · Dosimeter maxed at 3.6 R/h
          </div>
        </div>

        <div className="self-end pointer-events-auto">
          <button
            type="button"
            onClick={onSkipExplosion}
            className="px-4 py-2 text-xs sm:text-sm font-bold bg-[#18120e]/90 text-[#ffd27a] border border-[#e8a317] rounded-sm hover:bg-[#2a1f16] cursor-pointer"
          >
            Skip to Defeat Screen →
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'gameover' && debrief) {
    return (
      <div
        className={`fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto ${
          debrief.exploded
            ? 'bg-radial from-[#9d1405]/92 via-[#2b0402]/95 to-[#0d0000]/98'
            : 'bg-[#080b07]/92'
        }`}
      >
        <div className="bshu-panel max-w-2xl w-full p-6 rounded-sm text-[#e9e5d3] my-auto">
          <div
            className={`inline-block px-2.5 py-0.5 mb-2 text-xs font-bold tracking-widest uppercase border rounded-sm ${
              debrief.exploded
                ? 'bg-[#6e0f09] border-[#ff6b5e] text-[#ffd4cf]'
                : 'bg-[#1f4226] border-[#63b374] text-[#d9f5de]'
            }`}
          >
            {debrief.exploded ? 'DEFEAT · REACTOR DESTROYED' : 'SHIFT COMPLETE · CORE SAFE'}
          </div>
          <h2 className={`font-led text-4xl sm:text-5xl leading-none mb-1 ${debrief.exploded ? 'text-white' : 'text-[#e8a317]'}`}>
            {debrief.title}
          </h2>
          <p className="text-sm font-bold text-[#c6cdb8] mb-3">{debrief.subtitle}</p>
          <p className="text-base text-[#e9e5d3] mb-3">{debrief.body}</p>
          <p className="text-sm italic text-[#ffd27a] mb-4">{debrief.quip}</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="led-box p-2 text-center">
              <div className="text-[10px] font-sans font-bold text-[#a39a80]">PEAK POWER</div>
              <div className="text-2xl tabular-nums">{debrief.peakPower} MWt</div>
            </div>
            <div className="led-box p-2 text-center">
              <div className="text-[10px] font-sans font-bold text-[#a39a80]">PEAK REACTIVITY</div>
              <div className="text-2xl tabular-nums">
                {debrief.peakRho} pcm ({debrief.peakDollars}$)
              </div>
            </div>
            <div className="led-box p-2 text-center">
              <div className="text-[10px] font-sans font-bold text-[#a39a80]">TOTAL OUTPUT</div>
              <div className="text-2xl tabular-nums">{debrief.totalMwh} MWh</div>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-[#d7dac9] space-y-1 mb-3 bg-[#10130e] border border-[#3a4033] p-3">
            <div className="font-bold text-[#e8a317]">ENGINEERING DEBRIEF</div>
            {debrief.analysisLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          <canvas ref={debriefCanvasRef} width={560} height={160} className="w-full h-auto border border-[#444] mb-4" />

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onReturnTitle}
              className="py-2.5 px-5 font-bold bg-[#21251d] text-[#d3d8c7] border border-[#4b5342] rounded-sm hover:bg-[#2d3328]"
            >
              Title Screen
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="py-2.5 px-6 font-bold bg-[#e8a317] text-[#111] rounded-sm hover:brightness-105"
            >
              {debrief.exploded ? 'Try again, comrade' : 'Run another shift'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
