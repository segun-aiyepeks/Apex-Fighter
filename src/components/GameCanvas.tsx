import React, { useEffect, useRef } from 'react';
import {
  FighterEntity,
  FightingStyleId,
  FIGHTING_STYLES,
  updatePhysics,
  checkHitboxCollision,
} from '../game/combatRules.ts';
import { playHitSound, playWhooshSound } from '../utils/audio.ts';

interface GameCanvasProps {
  arena: string;
  p1Style: FightingStyleId;
  p2Style: FightingStyleId;
  p1Name: string;
  p2Name: string;
  isAiOpponent: boolean;
  onP1Update: (entity: FighterEntity) => void;
  onP2Update: (entity: FighterEntity) => void;
  onCombatHit: (attacker: 'p1' | 'p2', type: 'light' | 'heavy' | 'special', x: number, y: number) => void;
  cyberDojoImgUrl: string;
  magmaColosseumImgUrl: string;
  isFighting: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  arena,
  p1Style,
  p2Style,
  p1Name,
  p2Name,
  isAiOpponent,
  onP1Update,
  onP2Update,
  onCombatHit,
  cyberDojoImgUrl,
  magmaColosseumImgUrl,
  isFighting,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Entities stored in refs to avoid React re-render churn during 60FPS loop
  const p1Ref = useRef<FighterEntity>({
    x: 240,
    y: 460,
    vx: 0,
    vy: 0,
    width: 64,
    height: 110,
    facing: 'right',
    isGrounded: true,
    health: 100,
    maxHealth: 100,
    energy: 30,
    maxEnergy: 100,
    state: 'idle',
    stateTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    style: p1Style,
  });

  const p2Ref = useRef<FighterEntity>({
    x: 720,
    y: 460,
    vx: 0,
    vy: 0,
    width: 64,
    height: 110,
    facing: 'left',
    isGrounded: true,
    health: 100,
    maxHealth: 100,
    energy: 30,
    maxEnergy: 100,
    state: 'idle',
    stateTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    style: p2Style,
  });

  const keysPressed = useRef<Set<string>>(new Set());
  const particles = useRef<Particle[]>([]);
  const screenShake = useRef<number>(0);
  const bgImage = useRef<HTMLImageElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTime = useRef<number>(performance.now());
  const aiDecisionTimer = useRef<number>(0);

  // Load arena background image
  useEffect(() => {
    const img = new Image();
    img.src = arena === 'magma_colosseum' ? magmaColosseumImgUrl : cyberDojoImgUrl;
    img.onload = () => {
      bgImage.current = img;
    };
  }, [arena, cyberDojoImgUrl, magmaColosseumImgUrl]);

  // Sync fighting styles
  useEffect(() => {
    const c1 = FIGHTING_STYLES[p1Style] || FIGHTING_STYLES.blaze_fist;
    const c2 = FIGHTING_STYLES[p2Style] || FIGHTING_STYLES.blaze_fist;
    p1Ref.current.style = p1Style;
    p1Ref.current.maxHealth = c1.maxHealth;
    p1Ref.current.health = c1.maxHealth;
    p2Ref.current.style = p2Style;
    p2Ref.current.maxHealth = c2.maxHealth;
    p2Ref.current.health = c2.maxHealth;
  }, [p1Style, p2Style]);

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      keysPressed.current.add(e.code.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code.toLowerCase());
    };

    const handleBlur = () => {
      keysPressed.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color,
        size: 3 + Math.random() * 4,
        life: 0,
        maxLife: 15 + Math.random() * 15,
      });
    }
  };

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let syncThrottle = 0;

    const gameLoop = (now: number) => {
      const rawDt = (now - lastTime.current) / 1000;
      lastTime.current = now;
      const dt = Math.min(rawDt, 0.05);

      const p1 = p1Ref.current;
      const p2 = p2Ref.current;
      const c1 = FIGHTING_STYLES[p1.style] || FIGHTING_STYLES.blaze_fist;
      const c2 = FIGHTING_STYLES[p2.style] || FIGHTING_STYLES.blaze_fist;

      if (isFighting && p1.state !== 'ko' && p2.state !== 'ko') {
        // --- 1. PLAYER 1 INPUT HANDLING ---
        const keys = keysPressed.current;
        const canAct = !['attack_light', 'attack_heavy', 'attack_special', 'hurt', 'ko'].includes(p1.state);

        if (canAct) {
          if (keys.has('keys') || keys.has('arrowdown')) {
            // Guard / Block
            p1.state = 'block';
            p1.vx = 0;
          } else {
            p1.state = 'idle';

            if (keys.has('keya') || keys.has('arrowleft')) {
              p1.vx = -c1.speed;
              p1.facing = 'left';
              p1.state = 'walk';
            } else if (keys.has('keyd') || keys.has('arrowright')) {
              p1.vx = c1.speed;
              p1.facing = 'right';
              p1.state = 'walk';
            }

            if ((keys.has('keyw') || keys.has('arrowup') || keys.has('space')) && p1.isGrounded) {
              p1.vy = -c1.jumpForce;
              p1.isGrounded = false;
              p1.state = 'jump';
              playWhooshSound();
            }

            // Light Attack (J)
            if (keys.has('keyj')) {
              p1.state = 'attack_light';
              p1.stateTimer = 0.22;
              playWhooshSound();
              checkAttackHit('p1', 'light', c1.lightAttackDmg);
            }
            // Heavy Attack (K)
            else if (keys.has('keyk')) {
              p1.state = 'attack_heavy';
              p1.stateTimer = 0.38;
              playWhooshSound();
              checkAttackHit('p1', 'heavy', c1.heavyAttackDmg);
            }
            // Special Attack (L)
            else if (keys.has('keyl') && p1.energy >= c1.specialEnergyCost) {
              p1.state = 'attack_special';
              p1.stateTimer = 0.55;
              p1.energy -= c1.specialEnergyCost;
              playWhooshSound();
              checkAttackHit('p1', 'special', c1.specialDmg);
            }
          }
        }

        // --- 2. AI OPPONENT LOGIC (If Playing Solo / Training) ---
        if (isAiOpponent) {
          aiDecisionTimer.current += dt;
          if (aiDecisionTimer.current > 0.12) {
            aiDecisionTimer.current = 0;
            const dist = Math.abs(p1.x - p2.x);
            p2.facing = p1.x < p2.x ? 'left' : 'right';

            const aiCanAct = !['attack_light', 'attack_heavy', 'attack_special', 'hurt'].includes(p2.state);
            if (aiCanAct) {
              if (dist > 120) {
                // Advance towards player
                p2.vx = p1.x < p2.x ? -c2.speed * 0.8 : c2.speed * 0.8;
                p2.state = 'walk';
              } else {
                // In melee range: randomize offensive actions
                const roll = Math.random();
                if (roll < 0.35) {
                  // Light strike
                  p2.state = 'attack_light';
                  p2.stateTimer = 0.25;
                  checkAttackHit('p2', 'light', c2.lightAttackDmg);
                } else if (roll < 0.55) {
                  // Heavy strike
                  p2.state = 'attack_heavy';
                  p2.stateTimer = 0.4;
                  checkAttackHit('p2', 'heavy', c2.heavyAttackDmg);
                } else if (roll < 0.72 && p2.energy >= c2.specialEnergyCost) {
                  // Special strike
                  p2.state = 'attack_special';
                  p2.stateTimer = 0.6;
                  p2.energy -= c2.specialEnergyCost;
                  checkAttackHit('p2', 'special', c2.specialDmg);
                } else if (roll < 0.88) {
                  // Guard
                  p2.state = 'block';
                  p2.stateTimer = 0.4;
                } else {
                  // Jump back
                  if (p2.isGrounded) {
                    p2.vy = -c2.jumpForce * 0.9;
                    p2.vx = p1.x < p2.x ? c2.speed : -c2.speed;
                    p2.isGrounded = false;
                  }
                }
              }
            }
          }
        }
      }

      // Helper for attack hit verification
      function checkAttackHit(attackerId: 'p1' | 'p2', attackType: 'light' | 'heavy' | 'special', damage: number) {
        const attacker = attackerId === 'p1' ? p1 : p2;
        const defender = attackerId === 'p1' ? p2 : p1;
        const reach = attackType === 'special' ? 140 : attackType === 'heavy' ? 100 : 75;

        const attackBox = {
          x: attacker.facing === 'right' ? attacker.x : attacker.x - reach,
          y: attacker.y - attacker.height + 20,
          width: reach,
          height: 60,
        };

        const defenderBox = {
          x: defender.x - defender.width / 2,
          y: defender.y - defender.height,
          width: defender.width,
          height: defender.height,
        };

        if (checkHitboxCollision(attackBox, defenderBox)) {
          const isBlocked = defender.state === 'block';
          playHitSound(isBlocked ? 'block' : attackType);

          // Impact pushback
          const pushbackDir = attacker.facing === 'right' ? 1 : -1;
          defender.vx = pushbackDir * (attackType === 'special' ? 9 : attackType === 'heavy' ? 7 : 4);
          defender.state = isBlocked ? 'block' : 'hurt';
          defender.stateTimer = 0.25;

          // Screen shake & particles
          screenShake.current = attackType === 'special' ? 10 : attackType === 'heavy' ? 6 : 3;
          const hitColor = isBlocked ? '#60a5fa' : attacker.style === 'blaze_fist' ? '#f97316' : attacker.style === 'void_phantom' ? '#c084fc' : '#38bdf8';
          spawnParticles(defender.x, defender.y - 50, hitColor, attackType === 'special' ? 24 : 12);

          // Notify parent of combat hit
          onCombatHit(attackerId, attackType, defender.x, defender.y - 50);

          if (attackerId === 'p1') {
            attacker.comboCount += 1;
            attacker.comboTimer = 2.0;
          }
        }
      }

      // Update physics for both entities
      updatePhysics(p1, dt, 960, 460);
      updatePhysics(p2, dt, 960, 460);

      // Throttled notification back to HUD/parent
      syncThrottle += dt;
      if (syncThrottle >= 0.05) {
        syncThrottle = 0;
        onP1Update({ ...p1 });
        onP2Update({ ...p2 });
      }

      // --- 3. RENDER SCENE ---
      ctx.save();

      // Screen shake offset
      if (screenShake.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake.current;
        const shakeY = (Math.random() - 0.5) * screenShake.current;
        ctx.translate(shakeX, shakeY);
        screenShake.current = Math.max(0, screenShake.current - dt * 25);
      }

      // Clear & Draw Backdrop
      ctx.clearRect(0, 0, 960, 540);
      if (bgImage.current && bgImage.current.complete) {
        ctx.drawImage(bgImage.current, 0, 0, 960, 540);
      } else {
        // Fallback atmospheric arena gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 540);
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(0.7, '#0f172a');
        bgGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 960, 540);
      }

      // Arena Floor & Mat Lighting
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, 460, 960, 80);

      // Neon rim edge on floor
      ctx.strokeStyle = arena === 'magma_colosseum' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, 460);
      ctx.lineTo(930, 460);
      ctx.stroke();
      ctx.restore();

      // Draw Fighter Shadows
      [p1, p2].forEach((f) => {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(f.x, 460, f.width * 0.7, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw Fighters
      drawFighter(ctx, p1, true);
      drawFighter(ctx, p2, false);

      // Update & Draw Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life += 1;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life >= p.maxLife) {
          particles.current.splice(i, 1);
        }
      }

      ctx.restore();

      animFrameId.current = requestAnimationFrame(gameLoop);
    };

    animFrameId.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isFighting, isAiOpponent, onCombatHit, onP1Update, onP2Update]);

  // Stylized procedural fighter sprite drawing
  function drawFighter(ctx: CanvasRenderingContext2D, f: FighterEntity, isP1: boolean) {
    ctx.save();
    ctx.translate(f.x, f.y);
    const facingMultiplier = f.facing === 'left' ? -1 : 1;
    ctx.scale(facingMultiplier, 1);

    const time = performance.now() * 0.005;
    const idleBob = f.state === 'idle' ? Math.sin(time) * 3 : 0;
    const walkBob = f.state === 'walk' ? Math.sin(time * 3) * 5 : 0;
    const hurtOffset = f.state === 'hurt' ? -6 : 0;

    const styleConfig = FIGHTING_STYLES[f.style] || FIGHTING_STYLES.blaze_fist;

    // Body flash if hurt
    if (f.state === 'hurt') {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
    }

    // 1. Legs / Stance
    ctx.fillStyle = isP1 ? '#1e293b' : '#334155';
    // Back leg
    ctx.fillRect(-18, -40 + idleBob, 12, 40);
    // Front leg
    ctx.fillRect(4, -42 + walkBob, 12, 42);

    // 2. Torso / Gi / Armor
    ctx.fillStyle = isP1 ? '#09090b' : '#18181b';
    ctx.fillRect(-18 + hurtOffset, -85 + idleBob, 36, 48);

    // Style-specific chest accent
    ctx.fillStyle = styleConfig.color;
    if (f.style === 'titan_vanguard') {
      // Molten core
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0 + hurtOffset, -62 + idleBob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (f.style === 'blaze_fist') {
      // Golden Dragon Sash
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-12 + hurtOffset, -70 + idleBob, 24, 6);
    } else if (f.style === 'void_phantom') {
      // Purple void harness
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-14 + hurtOffset, -68 + idleBob, 28, 4);
    } else {
      // Astral blade strap
      ctx.fillStyle = '#10b981';
      ctx.fillRect(-14 + hurtOffset, -74 + idleBob, 28, 5);
    }

    // 3. Head & Mask/Hair
    ctx.fillStyle = '#e2e8f0';
    // Head shape
    ctx.beginPath();
    ctx.arc(0 + hurtOffset, -98 + idleBob, 13, 0, Math.PI * 2);
    ctx.fill();

    // Mask / Eyes
    ctx.fillStyle = styleConfig.accentColor;
    ctx.fillRect(2 + hurtOffset, -100 + idleBob, 7, 4);

    // Hair or Helm
    ctx.fillStyle = isP1 ? '#18181b' : '#475569';
    ctx.fillRect(-14 + hurtOffset, -112 + idleBob, 28, 12);

    // 4. Arms & Weapons
    if (f.state === 'attack_light') {
      // Extended punch
      ctx.fillStyle = styleConfig.color;
      ctx.fillRect(8, -75 + idleBob, 38, 10);
      // Hand flare
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(46, -70 + idleBob, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.state === 'attack_heavy') {
      // High strike / kick
      ctx.fillStyle = styleConfig.accentColor;
      ctx.fillRect(10, -88 + idleBob, 48, 14);
      ctx.shadowColor = styleConfig.accentColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(58, -81 + idleBob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (f.state === 'attack_special') {
      // Big signature energy beam / slash
      ctx.fillStyle = styleConfig.color;
      ctx.fillRect(15, -78 + idleBob, 70, 18);
      ctx.shadowColor = styleConfig.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(25, -74 + idleBob, 60, 10);
      ctx.shadowBlur = 0;
    } else if (f.state === 'block') {
      // Guard shield
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(20, -65 + idleBob, 28, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    } else {
      // Idle arms
      ctx.fillStyle = isP1 ? '#1e293b' : '#334155';
      ctx.fillRect(6, -72 + idleBob, 10, 26);
    }

    ctx.restore();
  }

  return (
    <div className="relative w-full max-w-[960px] aspect-[16/9] mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
      <canvas
        ref={canvasRef}
        width={960}
        height={540}
        data-testid="game-canvas"
        className="w-full h-full object-contain block"
      />
    </div>
  );
};
