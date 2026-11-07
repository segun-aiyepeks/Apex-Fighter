import React, { useState } from 'react';
import { Swords, Bot, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';
import { FighterProfile } from '../types/game.ts';

interface TitleScreenProps {
  fighter: FighterProfile | null;
  selectedStyle: FightingStyleId;
  onSelectStyle: (style: FightingStyleId) => void;
  onStartMatchmaking: () => void;
  onStartSparring: () => void;
  onCreateLobby: () => void;
  onJoinLobby: (code: string) => void;
  onOpenRegister: () => void;
  strikerImgUrl: string;
  shinobiImgUrl: string;
  titanImgUrl: string;
  isQueueing: boolean;
  onCancelQueue: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  fighter,
  selectedStyle,
  onSelectStyle,
  onStartMatchmaking,
  onStartSparring,
  onCreateLobby,
  onJoinLobby,
  onOpenRegister,
  strikerImgUrl,
  shinobiImgUrl,
  titanImgUrl,
  isQueueing,
  onCancelQueue,
}) => {
  const [lobbyCodeInput, setLobbyCodeInput] = useState('');
  const [showJoinLobbyModal, setShowJoinLobbyModal] = useState(false);

  const styleList: FightingStyleId[] = ['blaze_fist', 'void_phantom', 'titan_vanguard', 'astral_ronin'];
  const currentConfig = FIGHTING_STYLES[selectedStyle];

  const getStyleAvatar = (styleId: FightingStyleId) => {
    switch (styleId) {
      case 'blaze_fist':
        return strikerImgUrl;
      case 'void_phantom':
        return shinobiImgUrl;
      case 'titan_vanguard':
        return titanImgUrl;
      case 'astral_ronin':
        return shinobiImgUrl; // high quality thematic avatar
      default:
        return strikerImgUrl;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center">
      {/* Hero Title Lockup */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Real-Time 2D Combat Arena · Low-Latency Engine
        </div>

        <h1 className="font-cinzel text-4xl md:text-6xl font-black text-slate-100 tracking-tight leading-none mb-3">
          APEX FIGHTER
        </h1>

        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto text-balance">
          Master diverse fighting disciplines, duel fighters worldwide in low-latency 1v1 combat, and claim your place on the global leaderboard.
        </p>
      </div>

      {/* Fighter Card Showcase & Style Selector */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-stretch">
        {/* Left: Active Fighter Card & Style Portrait */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Your Registered Fighter
              </span>
              <h2 className="text-xl font-bold text-slate-100 mt-0.5">
                {fighter?.fighterName || 'Challenger'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Rating
              </span>
              <div className="font-mono-nums font-bold text-amber-400 text-lg">
                {fighter?.eloRating || 1200} ELO
              </div>
            </div>
          </div>

          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-800 my-2 group">
            <img
              src={getStyleAvatar(selectedStyle)}
              alt={currentConfig.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-4">
              <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                {currentConfig.title}
              </span>
              <span className="font-bold text-lg text-white">
                Signature: {currentConfig.signatureMove}
              </span>
            </div>
          </div>

          {/* Fighter Stats Overview */}
          <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-800 text-center">
            <div>
              <div className="text-xs text-slate-400 font-medium">Record</div>
              <div className="font-mono-nums font-bold text-slate-200 text-sm">
                {fighter?.wins || 0}W - {fighter?.losses || 0}L
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Win Rate</div>
              <div className="font-mono-nums font-bold text-slate-200 text-sm">
                {(fighter?.wins || 0) + (fighter?.losses || 0) > 0
                  ? Math.round(((fighter?.wins || 0) / ((fighter?.wins || 0) + (fighter?.losses || 0))) * 100)
                  : 0}
                %
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">K.O.s</div>
              <div className="font-mono-nums font-bold text-slate-200 text-sm">
                {fighter?.koCount || 0}
              </div>
            </div>
          </div>

          <button
            onClick={onOpenRegister}
            className="w-full mt-2 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Edit Fighter Identity & Email
          </button>
        </div>

        {/* Right: Fighting Styles Selector & Combat Attributes */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <h3 className="text-base font-bold text-slate-200 mb-1">
              Select Fighting Discipline
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Each discipline alters speed, strike reach, damage reduction, and signature techniques.
            </p>

            {/* Discipline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {styleList.map((styleId) => {
                const cfg = FIGHTING_STYLES[styleId];
                const isSelected = selectedStyle === styleId;
                return (
                  <button
                    key={styleId}
                    onClick={() => onSelectStyle(styleId)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400/90 shadow-md shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-100">{cfg.name}</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{cfg.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected Discipline Attributes */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                {currentConfig.name} Metrics
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Agility & Movement Speed</span>
                    <span className="font-mono font-bold text-slate-100">{currentConfig.speed} / 8.0</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${(currentConfig.speed / 8) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Damage Reduction / Armor</span>
                    <span className="font-mono font-bold text-slate-100">
                      {Math.round(currentConfig.armor * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${(currentConfig.armor / 0.3) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Special Attack Power</span>
                    <span className="font-mono font-bold text-slate-100">
                      {currentConfig.specialDmg} DMG
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{ width: `${(currentConfig.specialDmg / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matchmaking Actions */}
          <div className="space-y-2.5 pt-2">
            {isQueueing ? (
              <div className="w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <span className="text-sm font-semibold text-amber-300">
                    Finding Low-Latency Opponent...
                  </span>
                </div>
                <button
                  onClick={onCancelQueue}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                data-start="true"
                onClick={onStartMatchmaking}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Swords className="w-5 h-5" />
                FIND MATCH (REAL-TIME 1v1 PvP)
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={onStartSparring}
                className="py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800/90 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-cyan-400" />
                Sparring Dojo (vs AI)
              </button>

              <button
                onClick={() => setShowJoinLobbyModal(true)}
                className="py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-200 bg-slate-800/90 hover:bg-slate-800 hover:text-white border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-purple-400" />
                Custom Room Lobby
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Control Hint Footer */}
      <div className="text-xs text-slate-400 font-mono tracking-wide text-center">
        WASD Move · Space Jump · S Guard · J Light Strike · K Heavy Strike · L Special
      </div>

      {/* Custom Room Modal */}
      {showJoinLobbyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-lg text-slate-100 mb-1">Custom Private Duel</h3>
            <p className="text-xs text-slate-400 mb-4">
              Create a custom battle lobby code or enter a code shared by your rival.
            </p>

            <button
              onClick={() => {
                setShowJoinLobbyModal(false);
                onCreateLobby();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mb-4 cursor-pointer"
            >
              Generate New Lobby Room Code
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500 font-medium">OR JOIN WITH CODE</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="6-digit room code"
                value={lobbyCodeInput}
                onChange={(e) => setLobbyCodeInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => {
                  if (lobbyCodeInput.trim()) {
                    onJoinLobby(lobbyCodeInput.trim());
                    setShowJoinLobbyModal(false);
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl cursor-pointer"
              >
                Join Duel
              </button>
            </div>

            <button
              onClick={() => setShowJoinLobbyModal(false)}
              className="w-full mt-4 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
