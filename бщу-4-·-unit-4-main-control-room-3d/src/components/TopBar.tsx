import { Eye, EyeOff, HelpCircle, Pause, Volume2, VolumeX } from 'lucide-react';
import type { CameraPreset } from '../sim/types';

export interface TopBarProps {
  clock: string;
  objective: string;
  cameraPreset: CameraPreset;
  onSelectCamera: (preset: CameraPreset) => void;
  showTelemetry: boolean;
  onToggleTelemetry: () => void;
  zenMode: boolean;
  onToggleZen: () => void;
  rodSpeed: number;
  onToggleRodSpeed: () => void;
  muted: boolean;
  onToggleMute: () => void;
  hasActiveAlarm: boolean;
  alarmAcked: boolean;
  onAckHorn: () => void;
  onPause: () => void;
  onHelp: () => void;
}

const CAMERAS: Array<{ id: CameraPreset; label: string; keyHint: string }> = [
  { id: 'overview', label: 'Hall', keyHint: '1' },
  { id: 'core', label: 'Core 3D', keyHint: '2' },
  { id: 'turbine', label: 'Turbine', keyHint: '3' },
  { id: 'console', label: 'Desk', keyHint: '4' },
];

export function TopBar({
  clock,
  objective,
  cameraPreset,
  onSelectCamera,
  showTelemetry,
  onToggleTelemetry,
  zenMode,
  onToggleZen,
  rodSpeed,
  onToggleRodSpeed,
  muted,
  onToggleMute,
  hasActiveAlarm,
  alarmAcked,
  onAckHorn,
  onPause,
  onHelp,
}: TopBarProps) {
  return (
    <header className="pointer-events-auto relative z-20 flex flex-col border-b-2 border-[#3a4033] bg-[#0b0e09]/95 text-[#e9e5d3]">
      <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
        <div className="flex items-baseline gap-2 pr-2">
          <span className="text-base font-bold tracking-wider text-[#e9e5d3] whitespace-nowrap">
            БЩУ-4 · БЛОК №4
          </span>
          <span className="hidden text-xs text-[#9aa38c] xl:inline whitespace-nowrap">
            V.I. Lenin NPP · Senior Reactor Control Engineer (СИУР)
          </span>
        </div>

        <div className="led-box px-2.5 py-0 text-2xl leading-none" aria-label="Shift clock">
          {clock}
        </div>

        <nav className="flex items-center gap-1 bg-[#161a13] p-0.5 rounded border border-[#3a4033]" aria-label="3D Camera Views">
          {CAMERAS.map((cam) => {
            const active = cameraPreset === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectCamera(cam.id);
                }}
                className={`px-2 py-1 text-xs font-bold rounded-sm transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#e8a317] text-[#141108]'
                    : 'text-[#c6cdb8] hover:bg-[#262c21] hover:text-white'
                }`}
              >
                [{cam.keyHint}] {cam.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onAckHorn();
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-sm border whitespace-nowrap shrink-0 ${
              hasActiveAlarm && !alarmAcked
                ? 'bg-[#d83a2e] border-[#ff897f] text-white'
                : 'bg-[#21251d] border-[#4b5342] text-[#d3d8c7] hover:bg-[#2d3328]'
            }`}
          >
            Ack Horn
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleRodSpeed();
            }}
            className="px-2.5 py-1 text-xs font-bold rounded-sm border border-[#4b5342] bg-[#21251d] text-[#d3d8c7] hover:bg-[#2d3328] whitespace-nowrap shrink-0"
          >
            {rodSpeed === 25 ? 'Rods: Fast' : 'Rods: Real (6%/s)'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleTelemetry();
            }}
            className={`px-2.5 py-1 text-xs font-bold rounded-sm border whitespace-nowrap shrink-0 ${
              showTelemetry && !zenMode
                ? 'bg-[#2f4531] border-[#537856] text-[#e9e5d3]'
                : 'bg-[#21251d] border-[#4b5342] text-[#d3d8c7] hover:bg-[#2d3328]'
            }`}
          >
            Instruments [I]
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleZen();
            }}
            aria-label={zenMode ? 'Show HUD' : 'Hide HUD for 3D view'}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm border border-[#4b5342] bg-[#21251d] text-[#d3d8c7] hover:bg-[#2d3328] whitespace-nowrap shrink-0"
          >
            {zenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{zenMode ? 'Show HUD [H]' : '3D View [H]'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm border border-[#4b5342] bg-[#21251d] text-[#d3d8c7] hover:bg-[#2d3328] whitespace-nowrap shrink-0"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{muted ? 'Muted [M]' : 'Sound [M]'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause simulation"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm border border-[#4b5342] bg-[#21251d] text-[#d3d8c7] hover:bg-[#2d3328] whitespace-nowrap shrink-0"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pause [P]</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onHelp();
            }}
            aria-label="Open operating manual"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-sm border border-[#4b5342] bg-[#21251d] text-[#d3d8c7] hover:bg-[#2d3328] whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help</span>
          </button>
        </div>
      </div>

      <div className="border-t border-[#292d23] bg-[#140f00]/95 px-3 py-0.5 font-led text-lg tracking-wide text-[#e8a317] truncate">
        {'> '}
        {objective}
      </div>
    </header>
  );
}
