import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Flame, Shield, Zap, Search } from 'lucide-react';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';

interface LeaderboardEntry {
  id: number;
  uid: string;
  fighterName: string;
  email: string;
  fightingStyle: FightingStyleId;
  eloRating: number;
  wins: number;
  losses: number;
  koCount: number;
  winStreak: number;
  bio?: string;
}

export const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchBoard = async (style = 'all') => {
    setIsLoading(true);
    try {
      const url = style === 'all' ? '/api/leaderboard' : `/api/leaderboard?style=${style}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(selectedStyle);
  }, [selectedStyle]);

  const filtered = leaderboard.filter((f) =>
    f.fighterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTier = (elo: number) => {
    if (elo >= 1800) return { label: 'Grandmaster', color: 'text-amber-400' };
    if (elo >= 1600) return { label: 'Diamond', color: 'text-cyan-400' };
    if (elo >= 1400) return { label: 'Platinum', color: 'text-indigo-400' };
    if (elo >= 1200) return { label: 'Gold', color: 'text-yellow-500' };
    return { label: 'Silver', color: 'text-slate-400' };
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
            <Trophy className="w-4 h-4" />
            PostgreSQL Live Database
          </div>
          <h1 className="font-cinzel text-3xl md:text-4xl font-black text-slate-100">
            Global Championship Rankings
          </h1>
          <p className="text-slate-400 text-xs md:text-sm mt-1">
            Real-time standings tracked across all ranked matches and combat disciplines.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search fighters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Style Filter Tabs (Functional segmented buttons) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {[
          { id: 'all', label: 'All Styles' },
          { id: 'blaze_fist', label: 'Blaze Fist' },
          { id: 'void_phantom', label: 'Void Phantom' },
          { id: 'titan_vanguard', label: 'Titan Vanguard' },
          { id: 'astral_ronin', label: 'Astral Ronin' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStyle(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
              selectedStyle === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
            <span className="text-xs text-slate-400">Loading championship standings...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No registered fighters found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">Rank</th>
                  <th className="py-3.5 px-4">Fighter & Identity</th>
                  <th className="py-3.5 px-4">Discipline</th>
                  <th className="py-3.5 px-4">ELO Rating</th>
                  <th className="py-3.5 px-4">Record (W-L)</th>
                  <th className="py-3.5 px-4">Win Rate</th>
                  <th className="py-3.5 px-4 text-right">K.O. Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filtered.map((fighter, idx) => {
                  const styleCfg = FIGHTING_STYLES[fighter.fightingStyle] || FIGHTING_STYLES.blaze_fist;
                  const tier = getTier(fighter.eloRating);
                  const totalMatches = fighter.wins + fighter.losses;
                  const winRate = totalMatches > 0 ? Math.round((fighter.wins / totalMatches) * 100) : 0;

                  return (
                    <tr
                      key={fighter.id || fighter.uid}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 font-mono-nums font-bold">
                        {idx === 0 ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Medal className="w-4 h-4" /> 1
                          </span>
                        ) : idx === 1 ? (
                          <span className="text-slate-300 flex items-center gap-1">
                            <Medal className="w-4 h-4" /> 2
                          </span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <Medal className="w-4 h-4" /> 3
                          </span>
                        ) : (
                          <span className="text-slate-500">#{idx + 1}</span>
                        )}
                      </td>

                      {/* Fighter Name & Info */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                          {fighter.fighterName}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className={tier.color}>{tier.label}</span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[200px]">{fighter.email}</span>
                        </div>
                      </td>

                      {/* Fighting Discipline */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: styleCfg.color }}
                          />
                          <span className="text-xs font-medium text-slate-300">
                            {styleCfg.name}
                          </span>
                        </div>
                      </td>

                      {/* ELO Rating */}
                      <td className="py-4 px-4 font-mono-nums font-bold text-amber-400">
                        {fighter.eloRating}
                      </td>

                      {/* Record */}
                      <td className="py-4 px-4 font-mono-nums text-xs">
                        <span className="text-emerald-400 font-bold">{fighter.wins}W</span>
                        <span className="text-slate-500 mx-1">/</span>
                        <span className="text-red-400">{fighter.losses}L</span>
                      </td>

                      {/* Win Rate */}
                      <td className="py-4 px-4 font-mono-nums text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-bold">{winRate}%</span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* KO Count */}
                      <td className="py-4 px-4 text-right font-mono-nums font-bold text-slate-200">
                        {fighter.koCount}
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
