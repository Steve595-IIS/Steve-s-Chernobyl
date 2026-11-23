import { useEffect, useRef } from 'react';
import { ANNUNCIATORS, CORE_CELLS, clamp, computeOrmRods } from '../sim/physics';
import type { ReactorState, ShiftLogEntry } from '../sim/types';

export interface TelemetryWingsProps {
  visible: boolean;
  snapshot: ReactorState;
  recorderHistory: Array<[number, number]>;
  logs: ShiftLogEntry[];
}

function dialPoint(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [50 + radius * Math.sin(rad), 55 - radius * Math.cos(rad)];
}

interface AnalogGaugeProps {
  label: string;
  value: number;
  max: number;
  step: number;
  zones: Array<[number, number, string]>;
}

function AnalogGauge({ label, value, max, step, zones }: AnalogGaugeProps) {
  const angle = clamp(value / max, 0, 1) * 250 - 125;
  const ticks: number[] = [];
  for (let v = 0; v <= max; v += step / 2) ticks.push(v);

  return (
    <div className="w-full">
      <svg viewBox="0 3 100 102" className="w-full h-auto">
        <circle cx="50" cy="55" r="47" fill="#f3f1e4" stroke="#111" strokeWidth="3" />
        {zones.map(([start, end, color], idx) => {
          const a = (start / max) * 250 - 125;
          const b = (end / max) * 250 - 125;
          const p1 = dialPoint(a, 40);
          const p2 = dialPoint(b, 40);
          return (
            <path
              key={idx}
              d={`M${p1[0]} ${p1[1]}A40 40 0 ${b - a > 180 ? 1 : 0} 1 ${p2[0]} ${p2[1]}`}
              stroke={color}
              strokeWidth="4"
              fill="none"
            />
          );
        })}
        {ticks.map((v) => {
          const a = (v / max) * 250 - 125;
          const major = v % step === 0;
          const p = dialPoint(a, major ? 35 : 38);
          const q = dialPoint(a, 43);
          const t = dialPoint(a, 27);
          return (
            <g key={v}>
              <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} stroke="#111" strokeWidth={major ? 1.4 : 0.6} />
              {major && (
                <text x={t[0]} y={t[1] + 2} fontSize="6" textAnchor="middle" fill="#111" fontWeight="700">
                  {v}
                </text>
              )}
            </g>
          );
        })}
        <text x="50" y="80" fontSize="6.2" textAnchor="middle" fontWeight="700" fill="#111">
          {label}
        </text>
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '50px 55px', transition: 'transform 0.2s ease-out' }}>
          <line x1="50" y1="55" x2="50" y2="17" stroke="#c0281d" strokeWidth="1.8" />
        </g>
        <circle cx="50" cy="55" r="4" fill="#222" />
      </svg>
    </div>
  );
}

export function TelemetryWings({ visible, snapshot, recorderHistory, logs }: TelemetryWingsProps) {
  const recorderRef = useRef<HTMLCanvasElement | null>(null);
  const cartoRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = recorderRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#e9e4cc';
    ctx.fillRect(0, 0, 240, 108);
    ctx.strokeStyle = '#c9c2a0';
    ctx.lineWidth = 1;
    const offset = recorderHistory.length % 18;
    for (let x = -offset; x < 240; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 108);
      ctx.stroke();
    }
    for (let y = 0; y < 108; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(240, y);
      ctx.stroke();
    }

    const series: Array<[0 | 1, string, number]> = [
      [0, '#b01818', 4000],
      [1, '#1b4f9c', 120],
    ];
    for (const [k, color, maxVal] of series) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      recorderHistory.forEach((pt, idx) => {
        const x = 240 - (recorderHistory.length - idx) * 1.1;
        const y = 105 - clamp(pt[k] / maxVal, 0, 1) * 102;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    ctx.fillStyle = '#b01818';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('POWER 0-4000 MW', 4, 10);
    ctx.fillStyle = '#1b4f9c';
    ctx.fillText('PRESSURE 0-120 bar', 4, 21);
  }, [visible, recorderHistory]);

  useEffect(() => {
    if (!visible) return;
    const canvas = cartoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0b0f0b';
    ctx.fillRect(0, 0, 154, 154);
    CORE_CELLS.forEach(([x, y], i) => {
      const dist = Math.hypot(x - 8, y - 8);
      const frac = clamp((snapshot.r / 100) * 1.08 - dist * 0.004, 0, 1);
      ctx.fillStyle = '#1d3a24';
      ctx.fillRect(x * 9 + 1, y * 9 + 1, 7.5, 7.5);
      ctx.fillStyle = snapshot.scram ? '#ff6a5a' : '#9fd8a8';
      ctx.fillRect(x * 9 + 1, y * 9 + 1, 7.5, 7.5 * frac);
      if (i % 9 === 0) {
        ctx.strokeStyle = '#e8a317';
        ctx.strokeRect(x * 9 + 1.2, y * 9 + 1.2, 7, 7);
      }
    });
  }, [visible, snapshot.r, snapshot.scram]);

  if (!visible) return null;

  const dose = snapshot.P / 400;
  const ormRods = computeOrmRods(snapshot.r);
  const fmtPcm = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[76px] bottom-[118px] z-10 flex justify-between px-2.5">
      {/* LEFT INSTRUMENT WING */}
      <aside
        aria-label="Instruments and Reactivity Budget"
        className="pointer-events-auto hidden lg:flex flex-col gap-1.5 w-[256px] max-h-full overflow-y-auto bshu-panel p-1.5 rounded-sm"
      >
        <div className="bshu-plate p-1.5 rounded-sm">
          <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-2 py-0.5 mb-1 inline-block">
            ПРИБОРЫ · INSTRUMENTS
          </div>
          <div className="grid grid-cols-2 gap-1">
            <AnalogGauge label="МОЩНОСТЬ MWt" value={snapshot.P} max={4000} step={1000} zones={[[3200, 4000, '#c0281d']]} />
            <AnalogGauge label="ДАВЛЕНИЕ bar" value={snapshot.p} max={120} step={40} zones={[[80, 120, '#c0281d']]} />
            <AnalogGauge label="РАСХОД %" value={snapshot.flow} max={120} step={40} zones={[[0, 30, '#c0281d'], [30, 60, '#e8a317']]} />
            <AnalogGauge label="ТЕМП. °C" value={snapshot.Tf} max={3000} step={1000} zones={[[1000, 1800, '#e8a317'], [1800, 3000, '#c0281d']]} />
          </div>

          <div className="grid grid-cols-3 gap-1 mt-1.5">
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">OUT MW</div>
              <div className="text-xl tabular-nums">{Math.round(snapshot.out)}</div>
            </div>
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">MWh</div>
              <div className="text-xl tabular-nums">{snapshot.mwh.toFixed(1)}</div>
            </div>
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">ОЗР</div>
              <div className={`text-xl tabular-nums ${ormRods < 15 ? 'text-[#ff5a4a]' : ''}`}>{ormRods}</div>
            </div>
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">RODS %</div>
              <div className="text-xl tabular-nums">{Math.round(snapshot.r)}</div>
            </div>
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">Xe ppm</div>
              <div className="text-xl tabular-nums">{Math.round(snapshot.X * 1000)}</div>
            </div>
            <div className="led-box px-1 py-0.5 text-center leading-tight">
              <div className="text-[9px] font-sans font-bold text-[#a39a80]">R/h</div>
              <div className={`text-xl tabular-nums ${dose >= 3.6 ? 'text-[#ff5a4a]' : ''}`}>
                {dose >= 3.6 ? '3.6' : dose.toFixed(1)}
              </div>
            </div>
          </div>

          {dose >= 3.6 && (
            <div className="mt-1 text-[11px] font-bold text-[#7a0d06] leading-tight">
              DOSIMETER OFF SCALE (3.6 R/h). Not great, not terrible.
            </div>
          )}
        </div>

        <div className="bshu-plate p-1.5 rounded-sm">
          <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-2 py-0.5 mb-1 inline-block">
            РЕАКТИВНОСТЬ · BUDGET (pcm)
          </div>
          <table className="w-full border-collapse bg-[#e9e4cc] text-[#111] text-xs font-bold">
            <tbody>
              <tr>
                <td className="border border-[#111] px-1">Rods</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[0])}</td>
                <td className="border border-[#111] px-1">Xenon</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[1])}</td>
              </tr>
              <tr>
                <td className="border border-[#111] px-1">Voids</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[2])}</td>
                <td className="border border-[#111] px-1">Doppler</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[3])}</td>
              </tr>
              <tr>
                <td className="border border-[#111] px-1">Boron</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[4])}</td>
                <td className="border border-[#111] px-1">Tip</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">{fmtPcm(snapshot.rc[5])}</td>
              </tr>
              <tr>
                <td className="border border-[#111] px-1">Net ρ</td>
                <td className={`border border-[#111] px-1 text-right font-led text-base tabular-nums ${snapshot.rho > 480 ? 'text-[#c0281d]' : ''}`}>
                  {fmtPcm(snapshot.rho)} ({(snapshot.rho / 480).toFixed(2)}$)
                </td>
                <td className="border border-[#111] px-1">Period</td>
                <td className="border border-[#111] px-1 text-right font-led text-base tabular-nums">
                  {snapshot.per >= 999 ? '∞' : `${snapshot.per.toFixed(1)}s`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bshu-plate p-1.5 rounded-sm">
          <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-2 py-0.5 mb-1 inline-block">
            САМОПИСЕЦ · STRIP RECORDER
          </div>
          <canvas ref={recorderRef} width={240} height={108} className="w-full border border-[#111] bg-[#e9e4cc]" />
        </div>
      </aside>

      {/* RIGHT ANNUNCIATOR & SHIFT LOG WING */}
      <aside
        aria-label="Annunciator and Shift Log"
        className="pointer-events-auto hidden lg:flex flex-col gap-2 w-[274px] max-h-full overflow-y-auto bshu-panel p-2 rounded-sm"
      >
        <div className="bshu-plate p-1.5 rounded-sm">
          <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-2 py-0.5 mb-1 inline-block">
            ТАБЛО · ANNUNCIATOR
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ANNUNCIATORS.map((a) => {
              const lvl = a.level(snapshot);
              const cls =
                lvl === 2
                  ? 'bg-[#d83a2e] text-white alarm-blink border-[#5c0e08]'
                  : lvl === 1
                    ? 'bg-[#e8a317] text-[#2a1a00] border-[#734e00]'
                    : lvl === 3
                      ? 'bg-[#2f9e5a] text-white border-[#134727]'
                      : 'bg-[#2b2c26] text-[#7c7e71] border-[#0b0b09]';
              return (
                <div key={a.id} className={`border px-1.5 py-0.5 text-center rounded-[2px] leading-tight ${cls}`}>
                  <div className="text-[11px] font-bold truncate">{a.ru}</div>
                  <div className="text-[9px] truncate">{a.en}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bshu-plate p-1.5 rounded-sm flex items-center gap-2">
          <canvas ref={cartoRef} width={154} height={154} className="w-[96px] h-[96px] shrink-0 border border-[#111]" />
          <div className="text-xs leading-snug">
            <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-1.5 py-0.5 mb-1 inline-block">
              КАРТОГРАММА
            </div>
            <div className="font-bold">211 Core Channels</div>
            <div className="text-[11px]">Rods {Math.round(snapshot.r)}% in</div>
            <div className="text-[11px]">Voids {Math.round(snapshot.V * 100)}%</div>
            <div className="text-[11px]">Fuel {Math.round(snapshot.Tf)}°C</div>
          </div>
        </div>

        <div className="bshu-plate p-1.5 rounded-sm flex-1 min-h-[160px] flex flex-col">
          <div className="bg-[#17191a] text-[#e9e5d3] text-[10px] font-bold tracking-wider px-2 py-0.5 mb-1 inline-block self-start">
            ЖУРНАЛ СМЕНЫ · SHIFT LOG
          </div>
          <div className="shift-log-scroll flex-1 bg-[#e9e4cc] border border-[#111] p-1.5 overflow-y-auto font-led text-[16px] leading-[1.12] space-y-1">
            {logs.map((entry) => {
              const color =
                entry.tone === 'd'
                  ? 'text-[#a01010] font-bold'
                  : entry.tone === 'w'
                    ? 'text-[#7a4a00]'
                    : entry.tone === 'q'
                      ? 'text-[#1b3d8a]'
                      : entry.tone === 'f'
                        ? 'text-[#5a2e86] italic'
                        : 'text-[#143d1d]';
              return (
                <div key={entry.id} className={color}>
                  <span className="text-[#555] mr-1.5 text-sm">{entry.time} </span>
                  <span>{entry.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
