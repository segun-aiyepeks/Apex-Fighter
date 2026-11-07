import React, { useState, useEffect } from 'react';
import { User, Award, Flame, Swords, Shield, History, Edit3, Check } from 'lucide-react';
import { FighterProfile, MatchRecord } from '../types/game.ts';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';

interface ProfileDashboardProps {
  fighter: FighterProfile | null;
  onUpdateProfile: (updates: { fighterName?: string; fightingStyle?: FightingStyleId; bio?: string }) => Promise<void>;
  onOpenArena: () => void;
  onOpenRegister: () => void;
  strikerImgUrl: string;
  shinobiImgUrl: string;
  titanImgUrl: string;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  fighter,
  onUpdateProfile,
  onOpenArena,
  onOpenRegister,
  strikerImgUrl,
  shinobiImgUrl,
  titanImgUrl,
}) => {
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(fighter?.fighterName || '');
  const [editStyle, setEditStyle] = useState<FightingStyleId>(fighter?.fightingStyle || 'blaze_fist');
  const [editBio, setEditBio] = useState(fighter?.bio || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (fighter?.fighterName) setEditName(fighter.fighterName);
    if (fighter?.fightingStyle) setEditStyle(fighter.fightingStyle);
    if (fighter?.bio) setEditBio(fighter.bio);
  }, [fighter]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!fighter?.uid) return;
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/fighter/${fighter.uid}`);
        if (res.ok) {
          const data = await res.json();
          setMatchHistory(data.matchHistory || []);
        }
      } catch (err) {
        console.error('Failed to load match history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [fighter?.uid]);

  const totalMatches = (fighter?.wins || 0) + (fighter?.losses || 0);
  const winRate = totalMatches > 0 ? Math.round(((fighter?.wins || 0) / totalMatches) * 100) : 0;
  const currentStyleCfg = FIGHTING_STYLES[fighter?.fightingStyle || 'blaze_fist'];

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProfile({
      fighterName: editName.trim() || fighter?.fighterName,
      fightingStyle: editStyle,
      bio: editBio.trim(),
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          {/* Avatar & Fighter Identity */}
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-2 border-amber-500/80 shadow-xl bg-slate-950 shrink-0">
              <img
                src={getStyleAvatar(fighter?.fightingStyle || 'blaze_fist')}
                alt={fighter?.fighterName || 'Fighter'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-cinzel text-2xl md:text-3xl font-black text-slate-100">
                  {fighter?.fighterName || 'Challenger'}
                </h1>
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{fighter?.email}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-semibold">{currentStyleCfg.name}</span>
                <span aria-hidden="true">·</span>
                <span>Active Combatant</span>
              </div>

              <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-xl italic">
                "{fighter?.bio || 'Contender ready for combat in the Grand Championship Arena.'}"
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditing ? 'Close Editor' : 'Edit Profile'}
            </button>
            <button
              onClick={onOpenArena}
              className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Enter Arena
            </button>
          </div>
        </div>

        {/* Profile Editor Drawer */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Fighter Ring Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Preferred Fighting Style
              </label>
              <select
                value={editStyle}
                onChange={(e) => setEditStyle(e.target.value as FightingStyleId)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="blaze_fist">Blaze Fist (Flame Striker)</option>
                <option value="void_phantom">Void Phantom (Shadow Ninja)</option>
                <option value="titan_vanguard">Titan Vanguard (Cyber Juggernaut)</option>
                <option value="astral_ronin">Astral Ronin (Dimensional Blade)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Fighter Battle Catchphrase / Bio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Win-Loss Ratio & Performance Metrics KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Win-Loss Ratio */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Win-Loss Ratio
          </div>
          <div className="font-mono-nums font-black text-3xl text-slate-100">
            {winRate}%
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-mono mt-2">
            <span className="text-emerald-400">{fighter?.wins || 0} Wins</span>
            <span className="text-red-400">{fighter?.losses || 0} Losses</span>
          </div>
        </div>

        {/* ELO Rating */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Global Rating
          </div>
          <div className="font-mono-nums font-black text-3xl text-amber-400">
            {fighter?.eloRating || 1200}
          </div>
          <div className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Ranked Competitive Tier
          </div>
        </div>

        {/* Current Win Streak */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Win Streak
          </div>
          <div className="font-mono-nums font-black text-3xl text-cyan-400">
            {fighter?.winStreak || 0}
          </div>
          <div className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            Consecutive Victories
          </div>
        </div>

        {/* Total Knockouts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Total Knockouts (K.O.)
          </div>
          <div className="font-mono-nums font-black text-3xl text-red-400">
            {fighter?.koCount || 0}
          </div>
          <div className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            Decisive Finishes
          </div>
        </div>
      </div>

      {/* Match History Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-base text-slate-100">
              Combat History Log
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {matchHistory.length} Recorded Matches
          </span>
        </div>

        {isLoadingHistory ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Querying match records from PostgreSQL...
          </div>
        ) : matchHistory.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 text-sm mb-3">
              No battle matches recorded yet on your record.
            </p>
            <button
              onClick={onOpenArena}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              Fight Your First Duel
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Result</th>
                  <th className="py-3 px-4">Opponent</th>
                  <th className="py-3 px-4">Styles Matched</th>
                  <th className="py-3 px-4">Round Score</th>
                  <th className="py-3 px-4">Arena</th>
                  <th className="py-3 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {matchHistory.map((m) => {
                  const isWinner = m.winnerName === fighter?.fighterName;
                  const opponentName =
                    m.player1Name === fighter?.fighterName ? m.player2Name : m.player1Name;
                  const opponentStyle =
                    m.player1Name === fighter?.fighterName ? m.player2Style : m.player1Style;
                  const myStyle =
                    m.player1Name === fighter?.fighterName ? m.player1Style : m.player2Style;

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6 font-bold">
                        {isWinner ? (
                          <span className="text-emerald-400 font-mono font-bold">VICTORY</span>
                        ) : (
                          <span className="text-red-400 font-mono font-bold">DEFEAT</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {opponentName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <span>{myStyle}</span> vs <span>{opponentStyle}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono-nums font-bold text-slate-300">
                        {m.roundsWonP1} - {m.roundsWonP2}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 capitalize">
                        {m.arena.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-6 text-right text-slate-500 font-mono">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
