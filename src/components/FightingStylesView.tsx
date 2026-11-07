import React from 'react';
import { Flame, Sparkles, Shield, Zap, Check } from 'lucide-react';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';

interface FightingStylesViewProps {
  currentStyle: FightingStyleId;
  onSelectStyle: (style: FightingStyleId) => void;
  strikerImgUrl: string;
  shinobiImgUrl: string;
  titanImgUrl: string;
}

export const FightingStylesView: React.FC<FightingStylesViewProps> = ({
  currentStyle,
  onSelectStyle,
  strikerImgUrl,
  shinobiImgUrl,
  titanImgUrl,
}) => {
  const styles: FightingStyleId[] = ['blaze_fist', 'void_phantom', 'titan_vanguard', 'astral_ronin'];

  const getStyleAvatar = (styleId: FightingStyleId) => {
    switch (styleId) {
      case 'blaze_fist':
        return strikerImgUrl;
      case 'void_phantom':
        return shinobiImgUrl;
      case 'titan_vanguard':
        return titanImgUrl;
      case 'astral_ronin':
        return shinobiImgUrl;
      default:
        return strikerImgUrl;
    }
  };

  const styleDetails: Record<FightingStyleId, { lore: string; strengths: string; comboGuide: string }> = {
    blaze_fist: {
      lore: 'Forged in the underground rooftop dojos of neo-Tokyo. Practitioners channel kinetic friction into roaring flames wrapped around their fists.',
      strengths: 'Fastest jab windup, explosive heavy roundhouse, high combo damage chaining.',
      comboGuide: 'A/D Dash -> J (Light) -> J (Light) -> K (Heavy Roundhouse) -> L (Dragon Fire Fist)',
    },
    void_phantom: {
      lore: 'Netherveil assassins who slip between dimensional folds. Unrivaled aerial mobility and blinding teleportation strikes.',
      strengths: 'Highest jump height, fastest base movement, blink gap-closer signature attack.',
      comboGuide: 'W (Jump) -> J (Air Kunai) -> Land -> L (Void Rift Flurry) -> K (Shadow Kick)',
    },
    titan_vanguard: {
      lore: 'Cybernetic gladiators encrusted in reinforced titanium armor plates with a plasma molten reactor core.',
      strengths: '22% inherent damage reduction armor, massive HP pool, devastating seismic earthquake blast.',
      comboGuide: 'S (Block chip damage) -> J (Heavy Fist) -> K (Rocket Punch) -> L (Seismic Ground Slam)',
    },
    astral_ronin: {
      lore: 'Wandering swordmasters wielding celestial edge katanas capable of cleaving through steel and dimensions alike.',
      strengths: 'Extended weapon reach, lethal mid-range zoning, precision crescent wave slashes.',
      comboGuide: 'D (Mid-range spacing) -> J (Katana Slash) -> K (Crescent Arc) -> L (Dimensional Cross Slash)',
    },
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Flame className="w-3.5 h-3.5" />
          Combat Arts Encyclopedia
        </div>
        <h1 className="font-cinzel text-3xl md:text-5xl font-black text-slate-100">
          Championship Fighting Disciplines
        </h1>
        <p className="text-slate-400 text-xs md:text-sm max-w-xl mx-auto mt-2">
          Each fighting style grants unique passive defenses, kinetic movement speeds, and devastating signature finishing moves.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {styles.map((styleId) => {
          const cfg = FIGHTING_STYLES[styleId];
          const details = styleDetails[styleId];
          const isEquipped = currentStyle === styleId;

          return (
            <div
              key={styleId}
              className={`bg-slate-900/90 border rounded-2xl p-6 shadow-2xl flex flex-col justify-between transition-all ${
                isEquipped ? 'border-amber-400 shadow-amber-500/10' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                    <img
                      src={getStyleAvatar(styleId)}
                      alt={cfg.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="font-cinzel text-xl font-bold text-slate-100">
                        {cfg.name}
                      </h2>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                    <div className="text-xs text-amber-400 font-semibold tracking-wide">
                      {cfg.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Signature: {cfg.signatureMove}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  {details.lore}
                </p>

                {/* Stat Grid */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/80 mb-4 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Speed</div>
                    <div className="font-mono-nums font-bold text-slate-100 text-xs">
                      {cfg.speed}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Armor</div>
                    <div className="font-mono-nums font-bold text-cyan-400 text-xs">
                      {Math.round(cfg.armor * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Special</div>
                    <div className="font-mono-nums font-bold text-red-400 text-xs">
                      {cfg.specialDmg} DMG
                    </div>
                  </div>
                </div>

                {/* Combo Guide */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Recommended Combo Chain:
                  </div>
                  <div className="font-mono text-xs text-amber-300">
                    {details.comboGuide}
                  </div>
                </div>
              </div>

              {/* Equip Button */}
              <button
                onClick={() => onSelectStyle(styleId)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isEquipped
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isEquipped ? (
                  <>
                    <Check className="w-4 h-4" /> Equipped Fighting Discipline
                  </>
                ) : (
                  'Equip Fighting Discipline'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
