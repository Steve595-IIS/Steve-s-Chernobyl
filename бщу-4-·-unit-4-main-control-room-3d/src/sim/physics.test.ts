import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BETA_PCM,
  CORE_CELLS,
  T_TEST,
  buildDebriefSummary,
  computeOrmRods,
  createInitialState,
  formatClock,
  stepReactor,
} from './physics';

const noopLog = () => {};

test('initial state matches Unit 4 00:28:00 xenon pit startup', () => {
  const s = createInitialState();
  assert.equal(formatClock(s.t), '00:28:00');
  assert.equal(s.P, 30);
  assert.equal(s.r, 70);
  assert.equal(computeOrmRods(s.r), 42);
  assert.equal(s.ph, 0);
  assert.ok(CORE_CELLS.length > 200);
});

test('survives idle without immediate catastrophe', () => {
  const s = createInitialState();
  for (let i = 0; i < 60; i++) {
    stepReactor(s, 0.05, 25, 0, noopLog);
  }
  assert.equal(s.over, 0);
  assert.equal(s.exploded, false);
});

test('withdrawing rods increases power and lowers ORM', () => {
  const s = createInitialState();
  for (let i = 0; i < 40; i++) {
    stepReactor(s, 0.05, 25, -1, noopLog);
  }
  assert.ok(s.r < 70, 'rods should withdraw');
  assert.ok(s.P > 30, 'power should rise after rod withdrawal');
  assert.ok(computeOrmRods(s.r) < 42, 'ORM rods should decrease');
});

test('AZ-5 from low insertion (<40%) triggers positive graphite tip spike', () => {
  const s = createInitialState();
  s.r = 15;
  s.rt = 15;
  s.P = 260;
  s.scram = 1;
  s.rP = 15;
  s.sT = 0;
  stepReactor(s, 0.05, 25, 0, noopLog);
  assert.ok(s.rc[5] > 400, `expected tip spike > 400 pcm, got ${s.rc[5]}`);
});

test('AZ-5 from safe margin (>=40%) has zero tip spike and shuts down safely', () => {
  const s = createInitialState();
  s.r = 55;
  s.rt = 55;
  s.P = 220;
  s.scram = 1;
  s.rP = 55;
  s.sT = 0;
  for (let i = 0; i < 200 && !s.over; i++) {
    stepReactor(s, 0.1, 25, 0, noopLog);
  }
  assert.equal(s.rc[5], 0);
  assert.equal(s.over, 1);
  assert.equal(s.exploded, false);
});

test('test starts automatically at 01:23:04 when power >= 200 MWt and turbine is online', () => {
  const s = createInitialState();
  s.P = 240;
  s.C = 14400;
  s.r = 46;
  s.rt = 46;
  s.turb = 1;
  s.t = T_TEST - 1;
  stepReactor(s, 0.05, 25, 0, noopLog);
  assert.equal(s.ph, 1);
  assert.equal(s.turb, 0);
  assert.equal(s.lock, 1);
});

test('fuel overheating past 2800 C triggers explosion debrief', () => {
  const s = createInitialState();
  s.Tf = 2950;
  stepReactor(s, 0.05, 25, 0, noopLog);
  assert.equal(s.over, 1);
  assert.equal(s.exploded, true);
  const summary = buildDebriefSummary(s);
  assert.equal(summary.exploded, true);
  assert.ok(summary.title.includes('exploded'));
  assert.ok(BETA_PCM === 480);
});
