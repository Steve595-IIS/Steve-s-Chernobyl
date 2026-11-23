import { ChevronDown, ChevronUp } from 'lucide-react';
import { computeOrmRods } from '../sim/physics';
import type { ReactorState } from '../sim/types';

export interface ControlDockProps {
  snapshot: ReactorState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onRodHold: (dir: number) => void;
  onTogglePumpA: () => void;
  onTogglePumpB: () => void;
  onToggleTurbine: () => void;
  onChangeValve: (val: number) => void;
  onTriggerBoron: () => void;
  onTriggerEccs: () => void;
  onLiftCover: () => void;
  onPressScram: () => void;
}

export function ControlDock({
  snapshot,
  collapsed,
  onToggleCollapse,
  onRodHold,
  onTogglePumpA,
  onTogglePumpB,
  onToggleTurbine,
  onChangeValve,
  onTriggerBoron,
  onTriggerEccs,
  onLiftCover,
  onPressScram,
}: ControlDockProps) {
  const orm = computeOrmRods(snapshot.r);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-2 z-20 flex flex-col items-center px-2">
      <div className="pointer-events-auto flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleCollapse();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-0.5 text-xs font-bold bg-[#141812] text-[#e9e5d3] border border-[#4e5645] rounded-t hover:bg-[#1f251c] whitespace-nowrap"
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{collapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>

        {/* Compact mobile/tablet readout bar so narrow screens always see key numbers */}
        <div className="flex lg:hidden items-center gap-2.5 px-2.5 py-0.5 bg-[#120b00]/95 border border-[#464234] font-led text-base text-[#e8a317] tabular-nums">
          <span>{Math.round(snapshot.P)} MWt</span>
          <span>{Math.round(snapshot.p)} bar</span>
          <span className={orm < 15 ? 'text-[#ff5a4a]' : ''}>ОЗР {orm}</span>
        </div>
      </div>

      {!collapsed && (
        <section
          aria-label="Reactor Control Desk"
          className="pointer-events-auto bshu-plate w-full max-w-[980px] rounded-sm p-2 shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 items-stretch">
            {/* RODS */}
            <div className="bg-[#9aa38c] border border-[#5b6350] p-1.5 rounded-sm flex flex-col justify-between text-center">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span>СТЕРЖНИ · RODS</span>
                <span className={`font-led text-base tabular-nums ${orm < 15 ? 'text-[#a01010]' : ''}`}>ОЗР {orm}</span>
              </div>
              <div className="led-box text-2xl leading-none py-0.5 my-1 tabular-nums">{Math.round(snapshot.r)}%</div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onRodHold(-1);
                  }}
                  onPointerUp={() => onRodHold(0)}
                  onPointerLeave={() => onRodHold(0)}
                  onPointerCancel={() => onRodHold(0)}
                  className="bshu-btn py-1.5 px-1 text-xs font-bold rounded whitespace-nowrap"
                >
                  ▲ OUT
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    onRodHold(1);
                  }}
                  onPointerUp={() => onRodHold(0)}
                  onPointerLeave={() => onRodHold(0)}
                  onPointerCancel={() => onRodHold(0)}
                  className="bshu-btn py-1.5 px-1 text-xs font-bold rounded whitespace-nowrap"
                >
                  ▼ IN
                </button>
              </div>
            </div>

            {/* PUMPS */}
            <div className="bg-[#9aa38c] border border-[#5b6350] p-1.5 rounded-sm flex flex-col justify-between text-center">
              <div className="text-[11px] font-bold">ГЦН · PUMPS ({Math.round(snapshot.flow)}%)</div>
              <div className="flex justify-around items-center my-1">
                <button
                  type="button"
                  aria-label="Pump A"
                  onClick={onTogglePumpA}
                  className="flex flex-col items-center gap-1 px-2 py-1 rounded border border-[#141712] bg-[#d9d6c3] hover:brightness-105"
                >
                  <span className="text-[11px] font-bold">ГЦН-A</span>
                  <span
                    className={`w-8 h-4 rounded-sm border border-[#111] relative block ${
                      snapshot.pa ? 'bg-[#2f9e5a]' : 'bg-[#333]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-2.5 bg-[#e9e5d3] transition-all ${
                        snapshot.pa ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Pump B"
                  onClick={onTogglePumpB}
                  className="flex flex-col items-center gap-1 px-2 py-1 rounded border border-[#141712] bg-[#d9d6c3] hover:brightness-105"
                >
                  <span className="text-[11px] font-bold">ГЦН-B</span>
                  <span
                    className={`w-8 h-4 rounded-sm border border-[#111] relative block ${
                      snapshot.pb ? 'bg-[#2f9e5a]' : 'bg-[#333]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-3 h-2.5 bg-[#e9e5d3] transition-all ${
                        snapshot.pb ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              </div>
              <div className="text-[10px] font-bold text-[#222]">Click switch or 3D pump</div>
            </div>

            {/* TURBINE & STEAM DUMP */}
            <div className="bg-[#9aa38c] border border-[#5b6350] p-1.5 rounded-sm flex flex-col justify-between text-center">
              <div className="text-[11px] font-bold">ТГ-8 · БРУ-К</div>
              <button
                type="button"
                aria-label="Turbine key"
                onClick={onToggleTurbine}
                className={`bshu-btn py-1 px-2 text-xs font-bold rounded flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  snapshot.turb ? 'bg-[#2f9e5a] text-white' : ''
                }`}
              >
                <span>ТГ-8:</span>
                <span>{snapshot.turb ? `ONLINE ${Math.round(snapshot.out)}MW` : snapshot.ph >= 1 ? 'COASTING' : 'OFFLINE'}</span>
              </button>
              <label className="flex flex-col text-[10px] font-bold mt-1">
                <span>БРУ-К STEAM DUMP ({Math.round(snapshot.valve)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={snapshot.valve}
                  onChange={(e) => onChangeValve(Number(e.target.value))}
                  aria-label="Steam dump valve BRU-K"
                  className="w-full h-5 accent-[#141712] cursor-pointer"
                />
              </label>
            </div>

            {/* BORON & ECCS */}
            <div className="bg-[#9aa38c] border border-[#5b6350] p-1.5 rounded-sm flex flex-col justify-between text-center">
              <div className="text-[11px] font-bold">БОР · САОР</div>
              <button
                type="button"
                disabled={!snapshot.bc}
                onClick={onTriggerBoron}
                className="bshu-btn py-1.5 px-2 text-xs font-bold rounded bg-[#c9b6f0] whitespace-nowrap"
              >
                BORON ({snapshot.bc})
              </button>
              <button
                type="button"
                disabled={Boolean(snapshot.lock) || !snapshot.ec}
                onClick={onTriggerEccs}
                className="bshu-btn py-1.5 px-2 text-xs font-bold rounded bg-[#a8d4ee] whitespace-nowrap mt-1"
              >
                {snapshot.lock
                  ? 'ECCS BLOCKED'
                  : snapshot.ec
                    ? 'ECCS READY'
                    : snapshot.eccs > 0
                      ? 'ECCS ACTIVE'
                      : 'ECCS USED'}
              </button>
            </div>

            {/* АЗ-5 EMERGENCY */}
            <div className="col-span-2 sm:col-span-1 bg-[#9aa38c] border border-[#5b6350] p-1.5 rounded-sm flex flex-col justify-between text-center">
              <div className="text-[11px] font-bold text-[#610b06]">АЗ-5 · EMERGENCY</div>
              <div className="relative h-[58px] mt-1">
                <button
                  type="button"
                  onClick={onPressScram}
                  disabled={!snapshot.coverOpen || Boolean(snapshot.scram)}
                  className="w-full h-full rounded border-[3px] border-[#300] bg-radial from-[#ff5a4a] to-[#8a0f0a] text-white font-bold text-base shadow-[0_3px_0_#200] active:translate-y-0.5 disabled:opacity-60"
                >
                  АЗ-5 SCRAM
                </button>
                {!snapshot.coverOpen && (
                  <button
                    type="button"
                    onClick={onLiftCover}
                    className="absolute inset-0 bg-[#ebb928] border-2 border-[#7a5d00] rounded font-bold text-sm text-[#241900] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] hover:bg-[#f5c738]"
                  >
                    LIFT COVER
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
