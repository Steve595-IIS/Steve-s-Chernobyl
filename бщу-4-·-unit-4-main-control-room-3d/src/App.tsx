import { useCallback, useEffect, useRef, useState } from 'react';
import { ControlRoomAudio } from './audio/soundEngine';
import { ControlDock } from './components/ControlDock';
import { Overlays } from './components/Overlays';
import { TelemetryWings } from './components/TelemetryWings';
import { TopBar } from './components/TopBar';
import { triggerActionReaction } from './sim/dialogue';
import {
  ANNUNCIATORS,
  buildDebriefSummary,
  computeOrmRods,
  createInitialState,
  formatClock,
  getObjectiveText,
  stepReactor,
} from './sim/physics';
import type {
  CameraPreset,
  DebriefSummary,
  GameMode,
  InspectTargetId,
  LogTone,
  ReactorState,
  ShiftLogEntry,
} from './sim/types';
import { ReactorScene } from './three/ReactorScene';

const TARGET_TOOLTIPS: Record<InspectTargetId, { title: string; detail: string }> = {
  core: { title: 'Active Zone (211 Channels)', detail: 'Uranium dioxide fuel channels inside graphite moderator blocks.' },
  elena: { title: 'Upper Shield "Elena" (Схема Е)', detail: '2,000-ton steel & serpentinite biological shield cap.' },
  rods: { title: 'SUZ Control Rods', detail: 'Boron-carbide absorbers with black graphite displacer tips.' },
  boris: { title: 'Rod "Boris"', detail: 'Toptunov’s stubborn control rod. Moves slowly when asked.' },
  pumpA: { title: 'ГЦН-A Coolant Pump', detail: 'Click in 3D to toggle Main Circulation Pump A.' },
  pumpB: { title: 'ГЦН-B Coolant Pump', detail: 'Click in 3D to toggle Main Circulation Pump B.' },
  turbine: { title: 'Turbine-Generator ТГ-8', detail: 'Click in 3D to synchronize or disconnect Turbine 8 (150+ MW).' },
  separators: { title: 'Steam Separators (БС)', detail: 'Twin horizontal drums separating steam from primary coolant.' },
  bruK: { title: 'БРУ-К Steam Dump', detail: 'Click in 3D to step valve (+25%) and vent steam pressure.' },
  az5Cover: { title: 'АЗ-5 Safety Cover', detail: 'Click in 3D to lift yellow protective cover.' },
  az5Button: { title: 'АЗ-5 Emergency Scram', detail: 'Click in 3D (cover lifted) to drop all rods (18 s).' },
  boronTank: { title: 'Boron Injection Tank', detail: 'Click in 3D to inject neutron-absorbing boron.' },
  eccsPipe: { title: 'САОР ECCS Manifold', detail: 'Click in 3D to flood core with emergency coolant.' },
  whiskers: { title: 'Comrade Whiskers', detail: 'Click to pet. Official Unit 4 pipe-warmer; clearance unlimited.' },
};

function getTargetLiveReadout(id: InspectTargetId, s: ReactorState): string {
  const orm = computeOrmRods(s.r);
  switch (id) {
    case 'core':
      return `${Math.round(s.P)} MWt · Fuel ${Math.round(s.Tf)}°C · Voids ${Math.round(s.V * 100)}%`;
    case 'rods':
      return `${Math.round(s.r)}% inserted · ОЗР ${orm} rods`;
    case 'boris':
      return `Lagging at ${Math.max(0, Math.round(s.r - 6))}% · Target ${Math.round(s.rt)}%`;
    case 'elena':
      return s.exploded ? 'BREACHED · LID UNSEATED' : `Seated · Pressure ${Math.round(s.p)} bar`;
    case 'pumpA':
      return s.pa ? `RUNNING · Total flow ${Math.round(s.flow)}%` : 'STOPPED · Click to start';
    case 'pumpB':
      return s.pb ? `RUNNING · Total flow ${Math.round(s.flow)}%` : 'STOPPED · Click to start';
    case 'turbine':
      return s.turb ? `ONLINE · ${Math.round(s.out)} MW` : s.ph >= 1 ? 'COASTING DOWN (TEST)' : 'OFFLINE · Need 150+ MW';
    case 'separators':
      return `Drum Pressure ${Math.round(s.p)} bar · ${Math.round(s.V * 100)}% void`;
    case 'bruK':
      return `Valve ${Math.round(s.valve)}% open · ${Math.round(s.p)} bar`;
    case 'boronTank':
      return `${s.bc} injection charges remaining`;
    case 'eccsPipe':
      return s.lock ? 'BLOCKED FOR TEST' : s.ec ? 'READY' : s.eccs > 0 ? 'FLOODING CORE' : 'EXPENDED';
    case 'az5Cover':
      return s.coverOpen ? 'COVER OPEN' : 'COVER LATCHED · Click to lift';
    case 'az5Button':
      return s.r < 40 ? 'WARNING: <40% rod tip spike risk!' : s.coverOpen ? 'ARMED · Ready to scram' : 'Lift yellow cover first';
    case 'whiskers':
      return 'Purring · 0.1 R/h (nap optimal)';
  }
}

export default function App() {
  const autostart =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  const initialMode: GameMode = autostart ? 'playing' : 'title';

  const simRef = useRef<ReactorState>(createInitialState());
  const modeRef = useRef<GameMode>(initialMode);
  const holdDirRef = useRef<number>(0);
  const rodSpeedRef = useRef<number>(25);
  const audioRef = useRef<ControlRoomAudio | null>(null);
  const logIdRef = useRef<number>(1);
  const logsRef = useRef<ShiftLogEntry[]>([]);
  const recorderRef = useRef<Array<[number, number]>>([]);
  const recTimerRef = useRef<number>(0);
  const alarmAckRef = useRef<boolean>(false);
  const redCountRef = useRef<number>(0);
  const alarmTimerRef = useRef<number>(0);
  const explodeTimerRef = useRef<number>(0);

  const [mode, setMode] = useState<GameMode>(initialMode);
  const [snapshot, setSnapshot] = useState<ReactorState>(() => ({ ...simRef.current }));
  const [logs, setLogs] = useState<ShiftLogEntry[]>([]);
  const [recorderHistory, setRecorderHistory] = useState<Array<[number, number]>>([]);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [showTelemetry, setShowTelemetry] = useState<boolean>(true);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [rodSpeed, setRodSpeed] = useState<number>(25);
  const [muted, setMuted] = useState<boolean>(false);
  const [alarmAcked, setAlarmAcked] = useState<boolean>(false);
  const [hasActiveAlarm, setHasActiveAlarm] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [debrief, setDebrief] = useState<DebriefSummary | null>(null);
  const [hoverTip, setHoverTip] = useState<{
    id: InspectTargetId;
    x: number;
    y: number;
  } | null>(null);

  const pushLog = useCallback((text: string, tone: LogTone = '') => {
    const entry: ShiftLogEntry = {
      id: logIdRef.current++,
      time: formatClock(simRef.current.t).slice(0, 5),
      text,
      tone,
    };
    const next = [entry, ...logsRef.current].slice(0, 50);
    logsRef.current = next;
    setLogs(next);
  }, []);

  const syncHudSnapshot = useCallback(() => {
    setSnapshot({ ...simRef.current });
  }, []);

  const finishExplosionToDefeat = useCallback(() => {
    window.clearTimeout(explodeTimerRef.current);
    explodeTimerRef.current = 0;
    if (modeRef.current !== 'exploding') return;
    modeRef.current = 'gameover';
    setMode('gameover');
    document.body.dataset.state = 'gameover';
  }, []);

  const resetSimulation = useCallback(
    (nextMode: GameMode) => {
      window.clearTimeout(explodeTimerRef.current);
      explodeTimerRef.current = 0;
      const fresh = createInitialState();
      simRef.current = fresh;
      holdDirRef.current = 0;
      recorderRef.current = [];
      recTimerRef.current = 0;
      redCountRef.current = 0;
      alarmAckRef.current = false;
      logsRef.current = [];
      setLogs([]);
      setRecorderHistory([]);
      setDebrief(null);
      setShowHelp(false);
      setAlarmAcked(false);
      setHasActiveAlarm(false);

      pushLog('Reactor startup. Power collapsed to 30 MW (xenon pit). Dyatlov insists on the test.', 'd');
      pushLog('Bring power above 200 MW, then connect the turbine.', 'q');

      modeRef.current = nextMode;
      setMode(nextMode);
      document.body.dataset.state = nextMode;
      syncHudSnapshot();
    },
    [pushLog, syncHudSnapshot],
  );

  useEffect(() => {
    audioRef.current = new ControlRoomAudio();
    document.body.dataset.state = initialMode;
    pushLog('Reactor startup. Power collapsed to 30 MW (xenon pit). Dyatlov insists on the test.', 'd');
    pushLog('Bring power above 200 MW, then connect the turbine.', 'q');
    return () => {
      window.clearTimeout(explodeTimerRef.current);
      audioRef.current?.dispose();
    };
  }, [initialMode, pushLog]);

  const startShift = useCallback(() => {
    audioRef.current?.ensureStarted();
    audioRef.current?.resumeLoops();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (modeRef.current === 'gameover') {
      resetSimulation('playing');
      return;
    }
    modeRef.current = 'playing';
    setMode('playing');
    document.body.dataset.state = 'playing';
    holdDirRef.current = 0;
  }, [resetSimulation]);

  // Actions
  const togglePumpA = useCallback(() => {
    const s = simRef.current;
    if (s.over) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(240);
    s.pa ^= 1;
    pushLog(`ГЦН-A ${s.pa ? 'started.' : 'stopped.'}`, 'w');
    const now = performance.now() / 1000;
    if (!s.pa && !s.pb) triggerActionReaction(s, 'p0', now, pushLog);
    else if (!s.pa) triggerActionReaction(s, 'p1', now, pushLog);
    else triggerActionReaction(s, 'p2', now, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const togglePumpB = useCallback(() => {
    const s = simRef.current;
    if (s.over) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(240);
    s.pb ^= 1;
    pushLog(`ГЦН-B ${s.pb ? 'started.' : 'stopped.'}`, 'w');
    const now = performance.now() / 1000;
    if (!s.pa && !s.pb) triggerActionReaction(s, 'p0', now, pushLog);
    else if (!s.pb) triggerActionReaction(s, 'p1', now, pushLog);
    else triggerActionReaction(s, 'p2', now, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const toggleTurbine = useCallback(() => {
    const s = simRef.current;
    if (s.over) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(310);
    if (s.ph >= 1) {
      pushLog('Turbine 8 is coasting down for the test.', 'w');
      return;
    }
    const now = performance.now() / 1000;
    if (s.turb) {
      s.turb = 0;
      pushLog('Turbine disconnected.', 'w');
      triggerActionReaction(s, 't0', now, pushLog);
    } else if (s.P >= 150) {
      s.turb = 1;
      pushLog('Turbine synchronized to the grid.', 'q');
      triggerActionReaction(s, 't1', now, pushLog);
    } else {
      pushLog('Not enough steam. Need 150+ MW.', 'w');
    }
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const changeValve = useCallback(
    (val: number) => {
      const s = simRef.current;
      if (s.over) return;
      audioRef.current?.ensureStarted();
      s.valve = val;
      const now = performance.now() / 1000;
      if (val > 60) triggerActionReaction(s, 'v2', now, pushLog);
      else if (val === 0) triggerActionReaction(s, 'v0', now, pushLog);
      else triggerActionReaction(s, 'v1', now, pushLog);
      syncHudSnapshot();
    },
    [pushLog, syncHudSnapshot],
  );

  const triggerBoron = useCallback(() => {
    const s = simRef.current;
    if (s.over || s.bc <= 0) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(180);
    s.bc--;
    s.B = 1;
    pushLog('Boron injected into the core.', 'q');
    triggerActionReaction(s, 'bo', performance.now() / 1000, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const triggerEccs = useCallback(() => {
    const s = simRef.current;
    if (s.over || !s.ec || s.lock) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(170);
    s.ec--;
    s.eccs = 25;
    pushLog('САОР flooding the core with cold water.', 'q');
    triggerActionReaction(s, 'ec', performance.now() / 1000, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const liftCover = useCallback(() => {
    const s = simRef.current;
    if (s.over || s.coverOpen) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playSwitchClick(420);
    s.coverOpen = true;
    triggerActionReaction(s, 'cv', performance.now() / 1000, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const pressScram = useCallback(() => {
    const s = simRef.current;
    if (s.over || s.scram || !s.coverOpen) return;
    audioRef.current?.ensureStarted();
    audioRef.current?.playScram();
    s.scram = 1;
    s.rP = s.r;
    s.sT = 0;
    pushLog('АЗ-5 PRESSED. Emergency rods dropping (18 s).', 'd');
    triggerActionReaction(s, 'sc', performance.now() / 1000, pushLog);
    syncHudSnapshot();
  }, [pushLog, syncHudSnapshot]);

  const handle3DSelect = useCallback(
    (id: InspectTargetId) => {
      if (modeRef.current !== 'playing') return;
      switch (id) {
        case 'pumpA':
          togglePumpA();
          break;
        case 'pumpB':
          togglePumpB();
          break;
        case 'turbine':
          toggleTurbine();
          break;
        case 'az5Cover':
          liftCover();
          break;
        case 'az5Button':
          if (!simRef.current.coverOpen) liftCover();
          else pressScram();
          break;
        case 'boronTank':
          triggerBoron();
          break;
        case 'eccsPipe':
          triggerEccs();
          break;
        case 'bruK': {
          const s = simRef.current;
          if (!s.over) {
            const nextValve = s.valve >= 100 ? 0 : Math.min(100, Math.round(s.valve / 25) * 25 + 25);
            audioRef.current?.ensureStarted();
            audioRef.current?.playValveTurn();
            changeValve(nextValve);
            pushLog(`БРУ-К steam dump adjusted to ${nextValve}%.`, 'q');
          }
          break;
        }
        case 'whiskers':
          audioRef.current?.ensureStarted();
          audioRef.current?.playPurr();
          pushLog('Comrade Whiskers purrs quietly beside the desk lamp.', 'f');
          break;
        case 'boris':
          pushLog('Toptunov: "That is Boris. Please do not upset Boris."', 'q');
          break;
        default:
          pushLog(`Inspection: ${TARGET_TOOLTIPS[id].title} — ${TARGET_TOOLTIPS[id].detail}`, 'q');
      }
    },
    [changeValve, liftCover, pressScram, pushLog, togglePumpA, togglePumpB, toggleTurbine, triggerBoron, triggerEccs],
  );

  // Main 60Hz Reactor Simulation Loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let hudTimer = 0;

    const frame = (ts: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
      lastTs = ts;

      if (modeRef.current === 'playing') {
        const s = simRef.current;
        const prevOver = s.over;
        stepReactor(s, dt, rodSpeedRef.current, holdDirRef.current, pushLog);

        // Strip recorder sampling
        recTimerRef.current += dt;
        if (recTimerRef.current > 0.25) {
          recTimerRef.current = 0;
          const nextRec = [...recorderRef.current, [s.P, s.p] as [number, number]];
          if (nextRec.length > 220) nextRec.shift();
          recorderRef.current = nextRec;
        }

        // Alarm horn tracking
        let redCount = 0;
        for (const a of ANNUNCIATORS) {
          if (a.level(s) === 2) redCount++;
        }
        if (redCount > redCountRef.current) {
          alarmAckRef.current = false;
          setAlarmAcked(false);
          audioRef.current?.playAlarmBeep(ts / 1000);
        }
        redCountRef.current = redCount;
        alarmTimerRef.current += dt;
        if (redCount > 0 && !alarmAckRef.current && alarmTimerRef.current > 1.4) {
          alarmTimerRef.current = 0;
          audioRef.current?.playAlarmBeep(ts / 1000);
        }

        audioRef.current?.updateContinuous(ts / 1000, s.P / 400, s.valve, s.p, !s.over);

        if (!prevOver && s.over) {
          audioRef.current?.silenceLoops();
          holdDirRef.current = 0;
          setShowHelp(false);
          setHoverTip(null);
          setDebrief(buildDebriefSummary(s));
          setSnapshot({ ...s });
          setRecorderHistory(recorderRef.current);

          if (s.exploded) {
            audioRef.current?.playExplosion();
            modeRef.current = 'exploding';
            setMode('exploding');
            document.body.dataset.state = 'exploding';
            window.clearTimeout(explodeTimerRef.current);
            explodeTimerRef.current = window.setTimeout(finishExplosionToDefeat, 4000);
          } else {
            modeRef.current = 'gameover';
            setMode('gameover');
            document.body.dataset.state = 'gameover';
          }
        } else {
          hudTimer += dt;
          if (hudTimer >= 0.085) {
            hudTimer = 0;
            setHasActiveAlarm(redCount > 0);
            setSnapshot({ ...s });
            setRecorderHistory(recorderRef.current);
          }
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [finishExplosionToDefeat, pushLog]);

  // Unified Keyboard & Focus-Loss Hygiene
  useEffect(() => {
    const clearHeld = () => {
      holdDirRef.current = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startShift();
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        if (modeRef.current === 'playing') {
          clearHeld();
          audioRef.current?.silenceLoops();
          modeRef.current = 'paused';
          setMode('paused');
          document.body.dataset.state = 'paused';
        } else if (modeRef.current === 'paused') {
          audioRef.current?.resumeLoops();
          modeRef.current = 'playing';
          setMode('playing');
          document.body.dataset.state = 'playing';
        }
        return;
      }

      if (modeRef.current !== 'playing') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        audioRef.current?.ensureStarted();
        holdDirRef.current = -1;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        audioRef.current?.ensureStarted();
        holdDirRef.current = 1;
      } else if (e.key === 'h' || e.key === 'H') {
        setZenMode((z) => !z);
      } else if (e.key === 'i' || e.key === 'I') {
        setShowTelemetry((t) => !t);
      } else if (e.key === 'm' || e.key === 'M') {
        setMuted((m) => {
          const next = !m;
          audioRef.current?.setMuted(next);
          return next;
        });
      } else if (e.key === '1') {
        setCameraPreset('overview');
      } else if (e.key === '2') {
        setCameraPreset('core');
      } else if (e.key === '3') {
        setCameraPreset('turbine');
      } else if (e.key === '4') {
        setCameraPreset('console');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        holdDirRef.current = 0;
      }
    };

    const onVisibility = () => {
      if (document.hidden) clearHeld();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearHeld);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearHeld);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showHelp, startShift]);

  const handleHover3D = useCallback((id: InspectTargetId | null, x: number, y: number) => {
    if (!id) {
      setHoverTip(null);
    } else {
      setHoverTip({ id, x, y });
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0a0d09] select-none">
      {/* Isolated Full-Viewport 3D WebGL Scene */}
      <ReactorScene
        simRef={simRef}
        modeRef={modeRef}
        cameraPreset={cameraPreset}
        onSelect3DTarget={handle3DSelect}
        onHover3DTarget={handleHover3D}
      />

      {/* 3D Hover Inspection Tooltip */}
      {mode === 'playing' && hoverTip && (
        <div
          className="pointer-events-none fixed z-30 bg-[#0e120c]/95 border border-[#e8a317] px-2.5 py-1.5 rounded-sm shadow-lg max-w-[260px]"
          style={{
            left: Math.min(window.innerWidth - 274, hoverTip.x + 14),
            top: Math.max(82, hoverTip.y - 12),
          }}
        >
          <div className="text-xs font-bold text-[#e8a317]">{TARGET_TOOLTIPS[hoverTip.id].title}</div>
          <div className="text-[11px] text-[#d7dac9] leading-tight mt-0.5">{TARGET_TOOLTIPS[hoverTip.id].detail}</div>
          <div className="mt-1 pt-1 border-t border-[#2d3326] font-led text-sm text-[#a6f29b] leading-none">
            {getTargetLiveReadout(hoverTip.id, snapshot)}
          </div>
        </div>
      )}

      {/* Playing HUD (hidden on Title and during the 3D Explosion sequence) */}
      {mode !== 'title' && mode !== 'exploding' && (
        <>
          <TopBar
            clock={formatClock(snapshot.t)}
            objective={getObjectiveText(snapshot)}
            cameraPreset={cameraPreset}
            onSelectCamera={setCameraPreset}
            showTelemetry={showTelemetry}
            onToggleTelemetry={() => setShowTelemetry((t) => !t)}
            zenMode={zenMode}
            onToggleZen={() => setZenMode((z) => !z)}
            rodSpeed={rodSpeed}
            onToggleRodSpeed={() => {
              const next = rodSpeedRef.current === 25 ? 6 : 25;
              rodSpeedRef.current = next;
              setRodSpeed(next);
            }}
            muted={muted}
            onToggleMute={() => {
              setMuted((m) => {
                const next = !m;
                audioRef.current?.setMuted(next);
                return next;
              });
            }}
            hasActiveAlarm={hasActiveAlarm}
            alarmAcked={alarmAcked}
            onAckHorn={() => {
              alarmAckRef.current = true;
              setAlarmAcked(true);
            }}
            onPause={() => {
              holdDirRef.current = 0;
              audioRef.current?.silenceLoops();
              modeRef.current = 'paused';
              setMode('paused');
              document.body.dataset.state = 'paused';
            }}
            onHelp={() => setShowHelp(true)}
          />

          <TelemetryWings
            visible={showTelemetry && !zenMode}
            snapshot={snapshot}
            recorderHistory={recorderHistory}
            logs={logs}
          />

          {!zenMode && (
            <ControlDock
              snapshot={snapshot}
              collapsed={dockCollapsed}
              onToggleCollapse={() => setDockCollapsed((c) => !c)}
              onRodHold={(dir) => {
                audioRef.current?.ensureStarted();
                holdDirRef.current = dir;
              }}
              onTogglePumpA={togglePumpA}
              onTogglePumpB={togglePumpB}
              onToggleTurbine={toggleTurbine}
              onChangeValve={changeValve}
              onTriggerBoron={triggerBoron}
              onTriggerEccs={triggerEccs}
              onLiftCover={liftCover}
              onPressScram={pressScram}
            />
          )}
        </>
      )}

      {/* Title, Pause, Help, and Debrief Modals */}
      <Overlays
        mode={mode}
        showHelp={showHelp}
        debrief={debrief}
        onStart={startShift}
        onResume={() => {
          audioRef.current?.resumeLoops();
          modeRef.current = 'playing';
          setMode('playing');
          document.body.dataset.state = 'playing';
        }}
        onRestart={() => resetSimulation('playing')}
        onReturnTitle={() => resetSimulation('title')}
        onCloseHelp={() => setShowHelp(false)}
        onSkipExplosion={finishExplosionToDefeat}
      />
    </main>
  );
}
