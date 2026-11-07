import React from 'react';
import { Swords, Trophy, User, Flame, Users, MessageSquare } from 'lucide-react';
import { FighterProfile } from '../types/game.ts';

interface HeaderProps {
  activeTab: 'arena' | 'leaderboard' | 'profile' | 'styles';
  setActiveTab: (tab: 'arena' | 'leaderboard' | 'profile' | 'styles') => void;
  fighter: FighterProfile | null;
  onOpenRegister: () => void;
  onOpenFriendsChat: () => void;
  inGame: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  fighter,
  onOpenRegister,
  onOpenFriendsChat,
  inGame,
}) => {
  if (inGame) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 px-6 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setActiveTab('arena')}
          className="text-left flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Swords className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-cinzel text-xl font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0 group-hover:text-amber-400 transition-colors">
            APEX FIGHTER
          </span>
        </button>

        {/* Zone 2: Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('arena')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 ${
              activeTab === 'arena'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Battle Arena
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'leaderboard'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Global Rankings
          </button>
          <button
            onClick={() => setActiveTab('styles')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'styles'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Fighting Styles
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Fighter Profile
          </button>
          <button
            onClick={onOpenFriendsChat}
            className="whitespace-nowrap shrink-0 transition-colors cursor-pointer py-1 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Friends & Chat
          </button>
        </nav>

        {/* Zone 3: Primary Action & Quick Chat Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenFriendsChat}
            title="Open Friends & Chat"
            className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenRegister}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            {fighter?.email && !fighter.email.includes('contender@apexarena.gg')
              ? fighter.fighterName
              : 'Register Fighter'}
          </button>
        </div>
      </div>
    </header>
  );
};
