import React from 'react';
import { Volume2, VolumeX, Pause, LogOut, Shield } from 'lucide-react';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';

interface FightHudProps {
  p1Name: string;
  p1Style: FightingStyleId;
  p1Health: number;
  p1MaxHealth: number;
  p1Energy: number;
  p1RoundsWon: number;
  p1IsBlocking: boolean;

  p2Name: string;
  p2Style: FightingStyleId;
  p2Health: number;
  p2MaxHealth: number;
  p2Energy: number;
  p2RoundsWon: number;
  p2IsBlocking: boolean;

  roundNumber: number;
  timeRemaining: number;
  comboCount: number;

  isMuted: boolean;
  onToggleMute: () => void;
  onLeaveMatch: () => void;

  p1PortraitUrl: string;
  p2PortraitUrl: string;
}

export const FightHud: React.FC<FightHudProps> = ({
  p1Name,
  p1Style,
  p1Health,
  p1MaxHealth,
  p1Energy,
  p1RoundsWon,
  p1IsBlocking,
  p2Name,
  p2Style,
  p2Health,
  p2MaxHealth,
  p2Energy,
  p2RoundsWon,
  p2IsBlocking,
  roundNumber,
  timeRemaining,
  comboCount,
  isMuted,
  onToggleMute,
  onLeaveMatch,
  p1PortraitUrl,
  p2PortraitUrl,
}) => {
  const p1StyleCfg = FIGHTING_STYLES[p1Style] || FIGHTING_STYLES.blaze_fist;
  const p2StyleCfg = FIGHTING_STYLES[p2Style] || FIGHTING_STYLES.blaze_fist;

  const p1HealthPercent = Math.max(0, Math.min(100, (p1Health / p1MaxHealth) * 100));
  const p2HealthPercent = Math.max(0, Math.min(100, (p2Health / p2MaxHealth) * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 md:p-6 select-none">
      {/* Top HUD: Health Bars, Timer, Round Indicators */}
      <div className="w-full max-w-5xl mx-auto flex items-start justify-between gap-4">
        {/* Player 1 Health & Profile */}
        <div className="flex-1 flex items-start gap-3">
          <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 border-amber-500/80 shadow-lg bg-slate-900 shrink-0">
            <img
              src={p1PortraitUrl}
              alt={p1Name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {p1IsBlocking && (
              <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-200 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm md:text-base text-slate-100 tracking-wide truncate max-w-[160px]">
                {p1Name}
              </span>
              <div className="flex items-center gap-1">
                {[0, 1].map((r) => (
                  <div
                    key={r}
                    className={`w-3 h-3 rounded-full border border-amber-400 ${
                      r < p1RoundsWon
                        ? 'bg-amber-400 shadow-sm shadow-amber-400/80'
                        : 'bg-slate-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* P1 Health Bar */}
            <div className="w-full h-5 md:h-6 bg-slate-900/90 rounded border border-slate-700/80 overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 transition-all duration-150 ease-out"
                style={{ width: `${p1HealthPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center px-2 text-[10px] md:text-xs font-mono font-bold text-slate-200">
                {Math.round(p1Health)} / {p1MaxHealth}
              </div>
            </div>

            {/* P1 Energy / Super Bar */}
            <div className="w-full h-2 bg-slate-900/90 rounded-sm mt-1 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-cyan-400 transition-all duration-150"
                style={{ width: `${p1Energy}%` }}
              />
            </div>
            <div className="text-[10px] text-amber-400/90 font-medium tracking-wider mt-0.5">
              {p1StyleCfg.name}
            </div>
          </div>
        </div>

        {/* Center: Round & Timer */}
        <div className="flex flex-col items-center shrink-0 px-2">
          <span className="text-[10px] md:text-xs tracking-widest uppercase font-bold text-amber-400">
            ROUND {roundNumber}
          </span>
          <div className="font-mono-nums font-black text-3xl md:text-4xl text-slate-100 tracking-tight bg-slate-950/80 border border-slate-700/80 px-4 py-1 rounded-lg shadow-xl mt-0.5">
            {timeRemaining < 10 ? `0${timeRemaining}` : timeRemaining}
          </div>
        </div>

        {/* Player 2 Health & Profile */}
        <div className="flex-1 flex items-start gap-3 flex-row-reverse">
          <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 border-red-500/80 shadow-lg bg-slate-900 shrink-0">
            <img
              src={p2PortraitUrl}
              alt={p2Name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {p2IsBlocking && (
              <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-200 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex-1 text-right">
            <div className="flex items-center justify-between mb-1 flex-row-reverse">
              <span className="font-bold text-sm md:text-base text-slate-100 tracking-wide truncate max-w-[160px]">
                {p2Name}
              </span>
              <div className="flex items-center gap-1 flex-row-reverse">
                {[0, 1].map((r) => (
                  <div
                    key={r}
                    className={`w-3 h-3 rounded-full border border-red-400 ${
                      r < p2RoundsWon
                        ? 'bg-red-400 shadow-sm shadow-red-400/80'
                        : 'bg-slate-900'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* P2 Health Bar */}
            <div className="w-full h-5 md:h-6 bg-slate-900/90 rounded border border-slate-700/80 overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-l from-red-600 via-amber-500 to-emerald-400 transition-all duration-150 ease-out ml-auto"
                style={{ width: `${p2HealthPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-end px-2 text-[10px] md:text-xs font-mono font-bold text-slate-200">
                {Math.round(p2Health)} / {p2MaxHealth}
              </div>
            </div>

            {/* P2 Energy / Super Bar */}
            <div className="w-full h-2 bg-slate-900/90 rounded-sm mt-1 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-purple-400 transition-all duration-150 ml-auto"
                style={{ width: `${p2Energy}%` }}
              />
            </div>
            <div className="text-[10px] text-red-400/90 font-medium tracking-wider mt-0.5">
              {p2StyleCfg.name}
            </div>
          </div>
        </div>
      </div>

      {/* Center Combo Popups */}
      {comboCount > 1 && (
        <div className="absolute left-8 top-28 md:top-32 pointer-events-none animate-bounce">
          <div className="font-cinzel text-3xl md:text-4xl font-black text-amber-400 drop-shadow-[0_4px_12px_rgba(245,158,11,0.6)]">
            {comboCount} HITS!
          </div>
          <div className="text-xs font-mono tracking-widest text-slate-300 uppercase">
            Combo Chain
          </div>
        </div>
      )}

      {/* Bottom HUD: Control Guide & Utility Actions */}
      <div className="w-full max-w-5xl mx-auto flex items-end justify-between gap-4">
        {/* Controls Pill Bar */}
        <div className="bg-slate-950/85 border border-slate-800/80 px-4 py-2 rounded-xl text-xs text-slate-300 flex items-center gap-4 shadow-lg backdrop-blur-sm">
          <span className="font-semibold text-amber-400">Controls:</span>
          <span className="font-mono"><span className="text-amber-400">A / D</span> Move</span>
          <span className="font-mono"><span className="text-amber-400">W</span> Jump</span>
          <span className="font-mono"><span className="text-amber-400">S</span> Guard</span>
          <span className="font-mono"><span className="text-amber-400">J</span> Light</span>
          <span className="font-mono"><span className="text-amber-400">K</span> Heavy</span>
          <span className="font-mono"><span className="text-amber-400">L</span> Special</span>
        </div>

        {/* Audio & Match Utilities */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="w-10 h-10 rounded-lg bg-slate-950/85 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onLeaveMatch}
            aria-label="Leave Battle"
            className="px-3.5 h-10 rounded-lg bg-red-950/70 border border-red-800/80 hover:bg-red-900/80 text-red-200 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Forfeit
          </button>
        </div>
      </div>
    </div>
  );
};
