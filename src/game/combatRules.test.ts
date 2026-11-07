import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  checkHitboxCollision,
  checkWinCondition,
  calculateEloDelta,
  updatePhysics,
  FIGHTING_STYLES,
  FighterEntity,
} from './combatRules.ts';

test('checkHitboxCollision correctly detects overlapping hitboxes', () => {
  const boxA = { x: 100, y: 100, width: 50, height: 80 };
  const boxB = { x: 130, y: 120, width: 50, height: 80 };
  const boxC = { x: 250, y: 100, width: 50, height: 80 };

  assert.equal(checkHitboxCollision(boxA, boxB), true);
  assert.equal(checkHitboxCollision(boxA, boxC), false);
});

test('calculateDamage applies blocking chip damage and armor reduction', () => {
  const normalHit = calculateDamage(20, false, 0.0);
  assert.equal(normalHit.damage, 20);
  assert.equal(normalHit.wasBlocked, false);

  const blockedHit = calculateDamage(20, true, 0.0);
  assert.equal(blockedHit.damage, 5); // 25% of 20
  assert.equal(blockedHit.wasBlocked, true);

  const armoredHit = calculateDamage(20, false, 0.22); // Titan armor
  assert.ok(armoredHit.damage < 20);
});

test('checkWinCondition identifies knockout and time-out decisions', () => {
  assert.equal(checkWinCondition(100, 100, 45), 'ongoing');
  assert.equal(checkWinCondition(0, 50, 30), 'p2_win');
  assert.equal(checkWinCondition(75, 0, 20), 'p1_win');
  assert.equal(checkWinCondition(80, 40, 0), 'p1_win'); // timeout P1 higher HP
  assert.equal(checkWinCondition(50, 50, 0), 'draw');
});

test('calculateEloDelta grants positive points on win and deducts on loss', () => {
  const winDelta = calculateEloDelta(1200, 1200, true);
  const lossDelta = calculateEloDelta(1200, 1200, false);

  assert.ok(winDelta > 0);
  assert.ok(lossDelta < 0);
  assert.equal(winDelta, -lossDelta);
});

test('updatePhysics handles gravity, landing on floor, and boundary clamping', () => {
  const dummy: FighterEntity = {
    x: 100,
    y: 200,
    vx: 5,
    vy: 0,
    width: 60,
    height: 100,
    facing: 'right',
    isGrounded: false,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    state: 'jump',
    stateTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    style: 'blaze_fist',
  };

  updatePhysics(dummy, 0.016, 960, 460);
  assert.ok(dummy.vy > 0, 'Gravity should accelerate downward velocity');
  assert.ok(dummy.y > 200, 'Fighter position should move downward');

  // Place fighter on or past floor
  dummy.y = 480;
  updatePhysics(dummy, 0.016, 960, 460);
  assert.equal(dummy.y, 460, 'Fighter should clamp to floor');
  assert.equal(dummy.isGrounded, true, 'Fighter should be grounded');
  assert.equal(dummy.vy, 0, 'Vertical velocity should zero upon landing');
});

test('all fighting styles have valid configurations', () => {
  const styles = ['blaze_fist', 'void_phantom', 'titan_vanguard', 'astral_ronin'] as const;
  for (const styleId of styles) {
    const config = FIGHTING_STYLES[styleId];
    assert.ok(config, `Config for ${styleId} should exist`);
    assert.ok(config.speed > 0);
    assert.ok(config.maxHealth >= 80);
    assert.ok(config.specialDmg > config.heavyAttackDmg);
  }
});
