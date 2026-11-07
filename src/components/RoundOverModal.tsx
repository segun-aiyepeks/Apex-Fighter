import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Swords, RotateCcw, Home, MessageSquare, Send, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playAnnouncerSound } from '../utils/audio.ts';
import { ChatMessage } from '../types/game.ts';

interface RoundOverModalProps {
  isOpen: boolean;
  isWinner: boolean;
  winnerName: string;
  eloDelta: number;
  p1RoundsWon: number;
  p2RoundsWon: number;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;

  // Post-match duel chat
  matchMessages: ChatMessage[];
  onSendMatchMessage: (content: string) => void;
  opponentName: string;
  currentFighterName: string;
}

export const RoundOverModal: React.FC<RoundOverModalProps> = ({
  isOpen,
  isWinner,
  winnerName,
  eloDelta,
  p1RoundsWon,
  p2RoundsWon,
  onPlayAgain,
  onReturnToLobby,
  matchMessages,
  onSendMatchMessage,
  opponentName,
  currentFighterName,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const quickGGs = [
    'Good Game (GG)!',
    'Run it back!',
    'Brutal combos!',
    'That was close!',
    'Respect.',
  ];

  useEffect(() => {
    if (isOpen) {
      if (isWinner) {
        playAnnouncerSound('victory');
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore
        }
      } else {
        playAnnouncerSound('ko');
      }
    }
  }, [isOpen, isWinner]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchMessages]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;
    onSendMatchMessage(text);
    if (!textToSend) setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 select-none overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isWinner ? 'bg-amber-500/20' : 'bg-red-500/20'
          }`}
        />

        {/* Outcome Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
          {isWinner ? (
            <>
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Victory Recorded
            </>
          ) : (
            <>
              <Swords className="w-3.5 h-3.5 text-red-400" />
              Duel Concluded
            </>
          )}
        </div>

        <h2
          className={`font-cinzel text-3xl md:text-4xl font-black tracking-tight mb-1 ${
            isWinner ? 'text-amber-400' : 'text-slate-200'
          }`}
        >
          {isWinner ? 'CHAMPION!' : 'DEFEATED'}
        </h2>

        <p className="text-xs md:text-sm font-semibold text-slate-300 mb-4">
          {isWinner ? `${winnerName} wins the match!` : `${winnerName} secured the victory.`}
        </p>

        {/* Round Score & ELO Impact */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 mb-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Round Score</div>
            <div className="font-mono-nums font-black text-xl text-slate-100 mt-0.5">
              {p1RoundsWon} - {p2RoundsWon}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Rating Delta</div>
            <div
              className={`font-mono-nums font-black text-xl mt-0.5 ${
                isWinner ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {isWinner ? `+${eloDelta}` : `-${Math.abs(eloDelta)}`}
            </div>
          </div>
        </div>

        {/* Post-Match Opponent Chat */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 mb-5 text-left">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Post-Match Duel Banter
            </span>
            <span className="text-[10px] text-slate-500">Live with {opponentName}</span>
          </div>

          {/* Messages list */}
          <div className="h-28 overflow-y-auto space-y-2 mb-2 pr-1 text-xs">
            {matchMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[11px] text-slate-500">
                Send a post-match salute to your rival!
              </div>
            ) : (
              matchMessages.map((m, idx) => {
                const isMe = m.senderName === currentFighterName;
                return (
                  <div
                    key={m.id || idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`px-2.5 py-1.5 rounded-xl max-w-[85%] text-xs ${
                        isMe
                          ? 'bg-amber-500 text-slate-950 font-medium'
                          : 'bg-slate-800 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <span className="font-bold block text-[10px] opacity-80 mb-0.5">
                        {m.senderName}
                      </span>
                      {m.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick GG Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 scrollbar-none">
            {quickGGs.map((gg) => (
              <button
                key={gg}
                onClick={() => handleSend(gg)}
                className="text-[10px] whitespace-nowrap px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {gg}
              </button>
            ))}
          </div>

          {/* Custom Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-1.5"
          >
            <input
              type="text"
              placeholder={`Message ${opponentName}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2">
          <button
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-3 px-6 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Rematch / Queue Next Duel
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Return to Arena Roster
          </button>
        </div>
      </div>
    </div>
  );
};
