import React, { useState } from 'react';
import { X, Mail, Shield, User, Sparkles } from 'lucide-react';
import { FightingStyleId, FIGHTING_STYLES } from '../game/combatRules.ts';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterWithEmail: (email: string, fighterName: string, style: FightingStyleId, bio?: string) => Promise<any>;
  onLoginWithGoogle: () => Promise<void>;
  currentEmail?: string;
  currentName?: string;
  currentStyle?: FightingStyleId;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onRegisterWithEmail,
  onLoginWithGoogle,
  currentEmail,
  currentName,
  currentStyle,
}) => {
  const [email, setEmail] = useState(currentEmail && !currentEmail.includes('contender@apexarena.gg') ? currentEmail : '');
  const [fighterName, setFighterName] = useState(currentName || '');
  const [style, setStyle] = useState<FightingStyleId>(currentStyle || 'blaze_fist');
  const [bio, setBio] = useState('Challenger contending in the Grand Championship Arena.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please provide a valid email address.');
      return;
    }
    if (!fighterName.trim()) {
      setFormError('Please provide a fighter ring name.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await onRegisterWithEmail(email.trim(), fighterName.trim(), style, bio.trim());
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
          <Sparkles className="w-4 h-4" />
          Fighter Registration
        </div>
        <h2 className="font-cinzel text-2xl font-black text-slate-100 mb-1">
          Join the Grand Arena
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Register with your email to track your win-loss ratio, record match outcomes in PostgreSQL, and rise on the global leaderboard.
        </p>

        {formError && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fighter Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="champion@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fighter Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                placeholder="e.g. Ryuu 'Dragon' Ken"
                value={fighterName}
                onChange={(e) => setFighterName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Initial Fighting Style
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as FightingStyleId)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="blaze_fist">Blaze Fist (Flame Combos)</option>
              <option value="void_phantom">Void Phantom (Shadow Ninja)</option>
              <option value="titan_vanguard">Titan Vanguard (Armored Juggernaut)</option>
              <option value="astral_ronin">Astral Ronin (Dimensional Blade)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Registering Fighter...' : 'Complete Fighter Registration'}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-500 font-medium">OR QUICK AUTH</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button
          onClick={async () => {
            try {
              await onLoginWithGoogle();
              onClose();
            } catch {
              // Handled in auth
            }
          }}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Sign In with Google Account
        </button>
      </div>
    </div>
  );
};
