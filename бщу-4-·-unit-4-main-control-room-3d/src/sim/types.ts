export type GameMode = 'title' | 'playing' | 'paused' | 'exploding' | 'gameover';

export type CameraPreset = 'overview' | 'core' | 'turbine' | 'console';

export type LogTone = '' | 'w' | 'd' | 'q' | 'f';

export interface ShiftLogEntry {
  id: number;
  time: string;
  text: string;
  tone: LogTone;
}

export interface CrewRuntime {
  flags: Record<string, number>;
  tick: number;
  q: string[];
  qt: number;
  ct: number;
  used: number[];
  cd: Record<string, number>;
  gap: number;
  idle: number;
  hd: number;
  wasPC: boolean;
  rn: number;
  li: number;
  pq: string[];
  pt: number;
  pcd: Record<string, number>;
  lastSay: Record<string, number>;
}

export interface ReactorState {
  P: number;          // Thermal power (MWt)
  i: number;          // Iodine-135
  x: number;          // Xenon-135
  C: number;          // Delayed neutron precursors
  rho: number;        // Net reactivity (pcm)
  rc: [number, number, number, number, number, number]; // Rods, Xenon, Voids, Doppler, Boron, Tip spike
  per: number;        // Reactor period (s)
  dps: number;        // dP/dt smoothed
  hist: Array<[number, number, number]>; // [P, rho, r]
  maxRho: number;
  pkT: number;
  pkSc: number;
  pc: number;         // Time spent prompt critical (s)
  ormT: number;       // Time spent below ORM 15 rods (s)
  ha: number;
  X: number;          // Xenon scaled
  V: number;          // Steam void fraction (0..1)
  maxV: number;
  Tc: number;         // Coolant temp proxy
  Tf: number;         // Fuel temp (C)
  p: number;          // Separator pressure (bar)
  r: number;          // Rod insertion % (0 = all out, 100 = all in)
  rt: number;         // Target rod insertion %
  flow: number;       // Coolant flow %
  pa: number;         // Pump A (0 | 1)
  pb: number;         // Pump B (0 | 1)
  valve: number;      // Steam dump БРУ-К % (0..100)
  turb: number;       // Turbine TG-8 online (0 | 1)
  turbRpm: number;    // Normalized turbine rotor speed (0..1) for 3D visual
  B: number;          // Boron concentration in core
  bc: number;         // Boron charges remaining
  ec: number;         // ECCS charges remaining
  eccs: number;       // ECCS active countdown (s)
  lock: number;       // ECCS blocked by test program (0 | 1)
  fh: number;         // Fuel integrity %
  co: number;         // Containment integrity %
  mwh: number;        // Total electrical MWh generated
  out: number;        // Electrical output MWe
  t: number;          // Shift clock (seconds since 00:00:00)
  ph: number;         // 0 = pre-test, 1 = test active, 2 = test complete
  tt: number;         // Test elapsed seconds
  testP: number;      // Power when test began
  scram: number;      // AZ-5 active (0 | 1)
  sT: number;         // Time since AZ-5 pressed
  rP: number;         // Rod insertion % when AZ-5 was pressed
  coverOpen: boolean; // AZ-5 safety cover lifted
  over: number;       // 0 = running, 1 = ended
  exploded: boolean;  // true = meltdown/explosion, false = safe shutdown
  peak: number;       // Peak power MWt
  orm: number;        // ORM warning edge tracker
  crew: CrewRuntime;
}

export type AnnunciatorLevel = 0 | 1 | 2 | 3; // 0=off, 1=amber, 2=red, 3=green

export interface AnnunciatorDef {
  id: string;
  ru: string;
  en: string;
  level: (s: ReactorState) => AnnunciatorLevel;
}

export interface DebriefSummary {
  exploded: boolean;
  title: string;
  subtitle: string;
  body: string;
  quip: string;
  analysisLines: string[];
  peakPower: number;
  totalMwh: number;
  peakRho: number;
  peakDollars: number;
  timePromptCritical: number;
  ormViolationSec: number;
  peakVoidPct: number;
  endVoidPct: number;
  tipSpikePcm: number;
  history: Array<[number, number, number]>;
}

export type InspectTargetId =
  | 'core'
  | 'elena'
  | 'rods'
  | 'boris'
  | 'pumpA'
  | 'pumpB'
  | 'turbine'
  | 'separators'
  | 'bruK'
  | 'az5Cover'
  | 'az5Button'
  | 'boronTank'
  | 'eccsPipe'
  | 'whiskers';
