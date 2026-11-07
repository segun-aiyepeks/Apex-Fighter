export type FightingStyleId = 'blaze_fist' | 'void_phantom' | 'titan_vanguard' | 'astral_ronin';

export interface FightingStyleConfig {
  id: FightingStyleId;
  name: string;
  title: string;
  speed: number;
  jumpForce: number;
  armor: number; // 0.0 to 0.3 damage reduction
  maxHealth: number;
  maxEnergy: number;
  lightAttackDmg: number;
  heavyAttackDmg: number;
  specialDmg: number;
  specialEnergyCost: number;
  color: string;
  accentColor: string;
  description: string;
  signatureMove: string;
}

export const FIGHTING_STYLES: Record<FightingStyleId, FightingStyleConfig> = {
  blaze_fist: {
    id: 'blaze_fist',
    name: 'Blaze Fist',
    title: 'Flaming Martial Champion',
    speed: 6.2,
    jumpForce: 14.5,
    armor: 0.05,
    maxHealth: 100,
    maxEnergy: 100,
    lightAttackDmg: 9,
    heavyAttackDmg: 20,
    specialDmg: 34,
    specialEnergyCost: 40,
    color: '#f97316',
    accentColor: '#ef4444',
    description: 'Blistering martial combo chains and explosive flame-infused strikes.',
    signatureMove: 'Dragon Fire Fist',
  },
  void_phantom: {
    id: 'void_phantom',
    name: 'Void Phantom',
    title: 'Netherveil Shadow Ninja',
    speed: 7.4,
    jumpForce: 16.0,
    armor: 0.0,
    maxHealth: 90,
    maxEnergy: 100,
    lightAttackDmg: 8,
    heavyAttackDmg: 17,
    specialDmg: 29,
    specialEnergyCost: 35,
    color: '#a855f7',
    accentColor: '#c084fc',
    description: 'Lightning speed, shadow blink dashes, and ethereal void energy.',
    signatureMove: 'Void Rift Flurry',
  },
  titan_vanguard: {
    id: 'titan_vanguard',
    name: 'Titan Vanguard',
    title: 'Armored Cyber-Juggernaut',
    speed: 4.8,
    jumpForce: 13.0,
    armor: 0.22,
    maxHealth: 125,
    maxEnergy: 100,
    lightAttackDmg: 13,
    heavyAttackDmg: 27,
    specialDmg: 44,
    specialEnergyCost: 50,
    color: '#64748b',
    accentColor: '#38bdf8',
    description: 'Heavy armor plating, high damage resistance, and cataclysmic ground slams.',
    signatureMove: 'Seismic Earth Breaker',
  },
  astral_ronin: {
    id: 'astral_ronin',
    name: 'Astral Ronin',
    title: 'Dimensional Blade Duelist',
    speed: 6.0,
    jumpForce: 14.0,
    armor: 0.08,
    maxHealth: 95,
    maxEnergy: 100,
    lightAttackDmg: 10,
    heavyAttackDmg: 22,
    specialDmg: 36,
    specialEnergyCost: 45,
    color: '#10b981',
    accentColor: '#34d399',
    description: 'Long-range katana slashes, precision parries, and astral wave slices.',
    signatureMove: 'Dimensional Cross Slash',
  },
};

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function checkHitboxCollision(a: Hitbox, b: Hitbox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function calculateDamage(
  baseDamage: number,
  isBlocking: boolean,
  armor: number,
  isComboCounter = false
): { damage: number; wasBlocked: boolean } {
  const armorMultiplier = Math.max(0.4, 1 - armor);
  if (isBlocking) {
    // 75% damage reduction on block (chip damage)
    const chipDamage = Math.max(1, Math.round(baseDamage * 0.25 * armorMultiplier));
    return { damage: chipDamage, wasBlocked: true };
  }

  const comboBonus = isComboCounter ? 1.15 : 1.0;
  const damage = Math.round(baseDamage * armorMultiplier * comboBonus);
  return { damage: Math.max(2, damage), wasBlocked: false };
}

export interface FighterEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 'left' | 'right';
  isGrounded: boolean;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  state: 'idle' | 'walk' | 'jump' | 'attack_light' | 'attack_heavy' | 'attack_special' | 'block' | 'hurt' | 'ko';
  stateTimer: number;
  comboCount: number;
  comboTimer: number;
  style: FightingStyleId;
}

export function updatePhysics(
  entity: FighterEntity,
  dt: number,
  arenaWidth = 960,
  floorY = 460,
  gravity = 34
): void {
  // Apply gravity if airborne
  if (!entity.isGrounded) {
    entity.vy += gravity * dt;
  }

  // Update position
  entity.x += entity.vx * (dt * 60);
  entity.y += entity.vy * (dt * 60);

  // Apply friction when grounded
  if (entity.isGrounded) {
    entity.vx *= Math.pow(0.82, dt * 60);
    if (Math.abs(entity.vx) < 0.1) entity.vx = 0;
  }

  // Check floor collision
  if (entity.y >= floorY) {
    entity.y = floorY;
    entity.vy = 0;
    entity.isGrounded = true;
    if (entity.state === 'jump') {
      entity.state = 'idle';
      entity.stateTimer = 0;
    }
  } else {
    entity.isGrounded = false;
  }

  // Arena boundary constraints
  const halfW = entity.width / 2;
  if (entity.x - halfW < 30) {
    entity.x = 30 + halfW;
    entity.vx = 0;
  } else if (entity.x + halfW > arenaWidth - 30) {
    entity.x = arenaWidth - 30 - halfW;
    entity.vx = 0;
  }

  // Update combo timeout
  if (entity.comboTimer > 0) {
    entity.comboTimer -= dt;
    if (entity.comboTimer <= 0) {
      entity.comboCount = 0;
    }
  }

  // Update state timer
  if (entity.stateTimer > 0) {
    entity.stateTimer -= dt;
    if (entity.stateTimer <= 0) {
      if (['attack_light', 'attack_heavy', 'attack_special', 'hurt'].includes(entity.state)) {
        entity.state = entity.isGrounded ? 'idle' : 'jump';
      }
    }
  }
}

export function checkWinCondition(
  p1Health: number,
  p2Health: number,
  timeRemaining: number
): 'ongoing' | 'p1_win' | 'p2_win' | 'draw' {
  if (p1Health <= 0 && p2Health <= 0) {
    return 'draw';
  }
  if (p1Health <= 0) {
    return 'p2_win';
  }
  if (p2Health <= 0) {
    return 'p1_win';
  }
  if (timeRemaining <= 0) {
    if (p1Health > p2Health) return 'p1_win';
    if (p2Health > p1Health) return 'p2_win';
    return 'draw';
  }
  return 'ongoing';
}

export function calculateEloDelta(
  playerRating: number,
  opponentRating: number,
  isWinner: boolean
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = isWinner ? 1 : 0;
  const kFactor = 32;
  const delta = Math.round(kFactor * (actual - expected));
  return delta;
}
