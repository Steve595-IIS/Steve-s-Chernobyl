import { createCrewRuntime, onceLog, stepCrewDialogue, type LogFn } from './dialogue';
import type { AnnunciatorDef, DebriefSummary, ReactorState } from './types';

export const T_TEST = 4984; // 01:23:04
export const TLEN = 36;     // 36-second turbine rundown test
export const BETA_PCM = 480;

export const CORE_CELLS: Array<[number, number]> = (() => {
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < 17; y++) {
    for (let x = 0; x < 17; x++) {
      if ((x - 8) ** 2 + (y - 8) ** 2 <= 69) cells.push([x, y]);
    }
  }
  return cells;
})();

export const ANNUNCIATORS: AnnunciatorDef[] = [
  { id: 'orm', ru: 'ОЗР < 15', en: 'RODS MARGIN', level: (s) => (Math.round(s.r * 0.6) < 15 ? 2 : 0) },
  { id: 'press', ru: 'ДАВЛЕНИЕ', en: 'PRESSURE', level: (s) => (s.p > 80 ? 2 : s.p > 50 ? 1 : 0) },
  { id: 'void', ru: 'ПАРОСОДЕРЖ.', en: 'STEAM VOIDS', level: (s) => (s.V > 0.6 ? 2 : s.V > 0.3 ? 1 : 0) },
  { id: 'fuel', ru: 'ТЕМП. ТОПЛИВА', en: 'FUEL TEMP', level: (s) => (s.Tf > 1800 ? 2 : s.Tf > 1000 ? 1 : 0) },
  { id: 'flow', ru: 'РАСХОД ГЦН', en: 'COOLANT FLOW', level: (s) => (s.flow < 30 ? 2 : s.flow < 60 ? 1 : 0) },
  { id: 'xe', ru: 'ОТРАВЛЕНИЕ Xe', en: 'XENON', level: (s) => (s.X > 0.7 ? 1 : 0) },
  { id: 'pwr', ru: 'МОЩНОСТЬ', en: 'POWER HIGH', level: (s) => (s.P > 3200 ? 2 : s.P > 2400 ? 1 : 0) },
  { id: 'cont', ru: 'ОБОЛОЧКА', en: 'CONTAINMENT', level: (s) => (s.co < 70 ? 2 : s.co < 90 ? 1 : 0) },
  { id: 'turb', ru: 'ТГ-8', en: 'TURBINE ONLINE', level: (s) => (s.turb ? 3 : 0) },
  { id: 'test', ru: 'ИСПЫТАНИЕ', en: 'TEST ACTIVE', level: (s) => (s.ph === 1 ? 1 : 0) },
  { id: 'eccs', ru: 'САОР', en: 'ECCS BLOCKED', level: (s) => (s.lock ? 1 : 0) },
  { id: 'az5', ru: 'АЗ-5', en: 'SCRAM', level: (s) => (s.scram ? 2 : 0) },
  { id: 'per', ru: 'ПЕРИОД', en: 'SHORT PERIOD', level: (s) => (s.per < 5 ? 2 : s.per < 20 ? 1 : 0) },
  { id: 'pc', ru: 'ρ > β', en: 'PROMPT CRITICAL', level: (s) => (s.rho > 480 ? 2 : 0) },
];

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function formatClock(t: number): string {
  const sec = Math.floor(t);
  return [Math.floor(sec / 3600) % 24, Math.floor(sec / 60) % 60, sec % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export function createInitialState(): ReactorState {
  return {
    P: 30,
    i: 0.35,
    x: 0.25,
    C: 1800,
    rho: 0,
    rc: [0, 0, 0, 0, 0, 0],
    per: 999,
    dps: 0,
    hist: [],
    maxRho: -9999,
    pkT: 1680,
    pkSc: 0,
    pc: 0,
    ormT: 0,
    ha: 0,
    X: 0.85,
    V: 0,
    maxV: 0,
    Tc: 30,
    Tf: 318,
    p: 1,
    r: 70,
    rt: 70,
    flow: 100,
    pa: 1,
    pb: 1,
    valve: 0,
    turb: 0,
    turbRpm: 0.15,
    B: 0,
    bc: 2,
    ec: 1,
    eccs: 0,
    lock: 0,
    fh: 100,
    co: 100,
    mwh: 0,
    out: 0,
    t: 1680, // 00:28:00
    ph: 0,
    tt: 0,
    testP: 0,
    scram: 0,
    sT: 0,
    rP: 0,
    coverOpen: false,
    over: 0,
    exploded: false,
    peak: 30,
    orm: 1,
    crew: createCrewRuntime(),
  };
}

export function computeOrmRods(r: number): number {
  return Math.round(r * 0.6);
}

export function getObjectiveText(s: ReactorState): string {
  if (s.scram) return 'AZ-5 pressed. Rods dropping. Watch the power.';
  if (s.ph === 0) {
    if (s.P < 200) return 'TASK: raise power above 200 MW (withdraw rods). Keep ОЗР at 15 or more.';
    if (s.turb) return 'Hold 200+ MW until 01:23:04. The test starts by itself.';
    return 'TASK: connect the turbine (150+ MW) and hold 200+ MW.';
  }
  if (s.ph === 1) {
    return `TEST: ${Math.max(0, Math.ceil(TLEN - s.tt))}s. Pumps failing. Use rods, steam dump, boron.`;
  }
  return 'Test over. Insert rods to 40%+, lift cover, press АЗ-5.';
}

export function stepReactor(
  s: ReactorState,
  dt: number,
  rodSpeed: number,
  holdDir: number,
  log: LogFn,
): void {
  if (s.over) return;

  if (!s.scram && holdDir !== 0) {
    s.rt = clamp(s.rt + holdDir * rodSpeed * dt, 0, 100);
  }

  const cap = s.ph >= 1 ? Math.max(0.2, 1 - s.tt * 0.022) : 1;
  if (s.eccs > 0) s.eccs -= dt;
  const ft = ((s.pa ? 0.5 : 0) + (s.pb ? 0.5 : 0)) * 100 * cap + (s.eccs > 0 ? 60 : 0);
  s.flow += (ft - s.flow) * Math.min(1, dt * 2);
  s.B = Math.max(0, s.B - dt * 0.04);

  if (s.scram) {
    s.sT += dt;
    s.r = Math.min(100, s.r + (100 / 18) * dt);
  } else {
    const d = s.rt - s.r;
    s.r += Math.sign(d) * Math.min(Math.abs(d), rodSpeed * dt);
  }

  const B = 0.0048;
  const LA = 0.08;
  const LM = 0.001;
  const spk = s.scram && s.sT < 5 ? 900 * clamp((40 - s.rP) / 40, 0, 1) : 0;
  const P0 = s.P;

  const rc: [number, number, number, number, number, number] = [
    (60 - s.r) * 20,
    -2000 * s.x,
    1800 * s.V,
    -0.47 * (s.Tf - 300),
    -1000 * s.B,
    spk,
  ];
  s.rc = rc;
  s.rho = rc[0] + rc[1] + rc[2] + rc[3] + rc[4] + rc[5];
  const rho = s.rho / 1e5;

  for (let k = 0; k < 10; k++) {
    const h = dt / 10;
    const dP = (((rho - B) / LM) * s.P + LA * s.C + 0.3) * h;
    const dC = ((B / LM) * s.P - LA * s.C) * h;
    s.P = clamp(s.P + dP, 20, 2e5);
    s.C += dC;
  }

  s.dps += ((s.P - P0) / Math.max(dt, 1e-4) - s.dps) * 0.2;
  s.per = s.dps > 0.01 * s.P ? s.P / s.dps : 999;

  if (s.rho > s.maxRho) {
    s.maxRho = s.rho;
    s.pkT = s.t;
    s.pkSc = s.scram;
  }
  s.maxV = Math.max(s.maxV, s.V);
  if (s.rho > 480) s.pc += dt;
  if (computeOrmRods(s.r) < 15) s.ormT += dt;
  if ((s.ha += dt) > 0.5) {
    s.ha = 0;
    s.hist.push([s.P, s.rho, s.r]);
  }

  s.Tc += (30 + (170 * s.P) / (Math.max(s.flow, 5) * 32) - s.Tc) * 0.25 * dt;
  s.V = clamp((s.Tc - 60) / 60, 0, 1);
  s.Tf += (300 + s.P * 0.6 - s.Tf) * 0.5 * dt;

  const sp = s.P / 3200;
  const sink = (s.turb ? 0.8 : 0) + (s.valve / 100) * 0.8;
  const net = Math.max(0, sp - sink);
  s.p += (1 + 12 * sp + 200 * net - s.p) * 0.3 * dt;

  if (s.turb && s.P < 120) {
    s.turb = 0;
    log('Turbine tripped: not enough steam.', 'w');
  }

  // Turbine visual rotor speed (online = 1.0, coasting down = decays smoothly)
  const targetRpm = s.turb ? 1.0 : s.ph >= 1 ? Math.max(0.06, 0.9 - s.tt * 0.024) : s.P > 80 ? 0.25 : 0.05;
  s.turbRpm += (targetRpm - s.turbRpm) * Math.min(1, dt * 1.8);

  s.out = s.turb ? Math.min(s.P, 3200) * 0.31 : 0;
  if (s.p > 100) s.co -= (s.p - 100) * 0.3 * dt;
  if (s.Tf > 1400) s.fh -= ((s.Tf - 1400) / 100) * dt;
  s.peak = Math.max(s.peak, s.P);

  const t0 = s.t;
  if (s.ph === 0) {
    const ready = s.P >= 200 && Boolean(s.turb);
    if (s.t < T_TEST - 5 || ready) s.t += dt * 40;
    if (s.t >= T_TEST - 5 && !ready) {
      s.t = T_TEST - 5;
      onceLog(
        s,
        'hold',
        s.turb
          ? 'Dyatlov: reactor must be above 200 MW for the test.'
          : 'Dyatlov: connect the turbine and hold 200 MW. The test waits for no one.',
        'd',
        log,
      );
    }
    if (s.t >= T_TEST && ready && !s.scram) {
      s.t = T_TEST;
      s.ph = 1;
      s.turb = 0;
      s.lock = 1;
      s.testP = s.P;
      log('01:23:04 TEST BEGINS. Turbine 8 rundown. ECCS disabled per test program.', 'w');
    }
  } else {
    s.t += dt;
    s.tt += dt;
    if (s.ph === 1 && s.tt >= TLEN) {
      s.ph = 2;
      log('Test complete. Dyatlov: shut the reactor down. Now.', 'd');
    }
  }

  s.mwh += (s.out * (s.t - t0)) / 3600;
  {
    const g = s.t - t0;
    const p = s.P / 3200;
    const lI = 2.93e-5;
    const lX = 2.1e-5;
    s.i += lI * (p - s.i) * g;
    s.x += (lX * (0.955 * s.i + 0.045 * p - s.x) - lX * 6 * p * s.x) * g;
    s.X = s.x * 3.4;
  }

  if (s.P > 100) onceLog(s, 'a', 'Akimov: power is climbing.', 'q', log);
  if (s.ph === 1 && s.tt > 10) onceLog(s, 'c', 'Coolant flow falling. Steam voids forming.', 'w', log);
  if (s.ph === 1 && s.tt > 24) onceLog(s, 'e', 'Dyatlov: "Hurry up. Everyone is waiting."', 'd', log);

  const on = computeOrmRods(s.r);
  if (on < 15 && !s.scram) {
    if (s.orm) {
      s.orm = 0;
      log('ОЗР BELOW 15 RODS. Rules say shut down. Dyatlov says continue.', 'd');
    }
  } else if (on >= 15) {
    s.orm = 1;
  }

  if (s.P / 400 > 3.6) {
    onceLog(s, 'dose', 'Dosimeter reads 3.6 R/h. The dial stops there. Not great, not terrible.', 'd', log);
  }
  if (s.scram && s.sT < 1 && s.rP < 40) {
    onceLog(s, 'tip', 'Graphite tips entering the core bottom... power surging!', 'd', log);
  }
  if (s.scram && s.sT >= 1 && s.rP >= 40) {
    onceLog(s, 'safe', 'Rods dropping from a safe margin. Power falling.', 'q', log);
  }

  stepCrewDialogue(s, dt, holdDir, log);

  if (s.Tf > 2800 || s.co <= 0 || s.fh <= 0) {
    s.over = 1;
    s.exploded = true;
    return;
  }
  if (s.scram && s.P < 60) {
    s.over = 1;
    s.exploded = false;
  }
}

export function buildDebriefSummary(s: ReactorState): DebriefSummary {
  const b = s.exploded;
  const spk = s.scram && s.rP < 40 ? Math.round(900 * clamp((40 - s.rP) / 40, 0, 1)) : 0;

  const quipPool = b
    ? s.ph === 0
      ? [
          'Dyatlov: "It was a sensor error."',
          'Akimov: "Someone tell Moscow we were very busy."',
          'Stolyarov: "At least I can still beat Anatoly Karpov."',
        ]
      : s.pkSc && spk
        ? [
            'Dyatlov: "The button is not supposed to do that."',
            'Toptunov: "Nobody told us the button had a personality."',
          ]
        : [
            'Dyatlov: "The reactor is intact. Probably."',
            'Akimov: "I will write this in the report as weather."',
          ]
    : s.maxRho < 480 && s.ph === 2
      ? [
          'Akimov frames your debrief and hangs it next to the broken window.',
          'Comrade Whiskers approves. He yawns.',
          'Stolyarov: "I can beat Anatoly Karpov, but you can beat a reactor."',
        ]
      : [
          'Dyatlov asks for a written explanation. Nobody has a pen.',
          'Toptunov: "We did not explode. Statistically, a success."',
        ];

  const quip = quipPool[Math.floor(Math.random() * quipPool.length)];
  const hit = s.maxRho > 480;
  const pcl = hit
    ? `Net reactivity exceeded β for ${s.pc.toFixed(1)} s (peak at ${formatClock(s.pkT)}, ${
        s.pkSc ? 'during АЗ-5 insertion' : 'before any АЗ-5'
      }). ${b ? 'It ended only when the fuel passed its limit.' : 'Your rod moves and Doppler feedback brought it back before the fuel overheated.'}`
    : s.maxRho < 0
      ? 'Net reactivity never went positive: the reactor stayed subcritical.'
      : 'Net reactivity stayed below β: delayed neutrons set the rate.';

  const cause = !b
    ? ''
    : s.pkSc && spk
      ? 'Likely cause: АЗ-5 pressed with the rods out. The graphite tips pushed reactivity past β.'
      : s.ph === 0
        ? 'Likely cause: rods withdrawn too fast, so the reactor went prompt critical before the test even started.'
        : 'Likely cause: steam-void runaway during the test, as flow fell and voids added reactivity.';

  const analysisLines = [
    `Peak net reactivity: ${Math.round(s.maxRho)} pcm (${(s.maxRho / 480).toFixed(2)}$). ${pcl}`,
    ...(cause ? [cause] : []),
    ...(s.testP
      ? [`Test began at ${Math.round(s.testP)} MWt. The real program called for 700–1,000 MWt; the real crew started near 200.`]
      : []),
    `Time with ОЗР under 15 rods: ${Math.round(s.ormT)} s. Peak void: ${Math.round(s.maxV * 100)}%. Void at end: ${Math.round(s.V * 100)}% (${Math.round(1800 * s.V)} pcm).`,
    ...(spk ? [`АЗ-5 pressed at ${Math.round(s.rP)}% inserted: graphite displacers added up to +${spk} pcm.`] : []),
    'Real event: АЗ-5 at 01:23:40, power estimated near 30,000 MWt (~10× nominal) within seconds.',
  ];

  const title = b
    ? 'Oh no, Chernobyl exploded. Call Valery Legasov!'
    : s.ph === 2
      ? 'Reactor shut down safely.'
      : 'Test cancelled. Reactor safe.';

  const subtitle = b
    ? `${formatClock(s.t)} · Unit 4 reactor hall destroyed`
    : s.ph === 2
      ? 'Turbine rundown test completed without incident.'
      : 'Safe call, though Dyatlov wants an explanation.';

  const body = b
    ? 'Upper biological shield Elena has blown off its seating. Graphite burns on the roof. Helicopters are loading sand and boron. The dosimeter maxed out at 3.6.'
    : s.ph === 2
      ? 'The turbine test was completed and the core was brought subcritical from a safe rod margin. Legasov goes home. Pripyat lives.'
      : 'You stopped before the test finished. Safe, and honestly the correct call, though Dyatlov is furious. Pripyat lives.';

  return {
    exploded: b,
    title,
    subtitle,
    body,
    quip,
    analysisLines,
    peakPower: Math.round(s.peak),
    totalMwh: Number(s.mwh.toFixed(1)),
    peakRho: Math.round(s.maxRho),
    peakDollars: Number((s.maxRho / 480).toFixed(2)),
    timePromptCritical: Number(s.pc.toFixed(1)),
    ormViolationSec: Math.round(s.ormT),
    peakVoidPct: Math.round(s.maxV * 100),
    endVoidPct: Math.round(s.V * 100),
    tipSpikePcm: spk,
    history: s.hist.slice(),
  };
}
