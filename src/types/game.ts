import { FightingStyleId } from '../game/combatRules.ts';

export interface FighterProfile {
  id?: number;
  uid: string;
  email: string;
  fighterName: string;
  fightingStyle: FightingStyleId;
  eloRating: number;
  wins: number;
  losses: number;
  koCount: number;
  winStreak: number;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatchRecord {
  id: number;
  matchId: string;
  player1Name: string;
  player2Name: string;
  player1Style: string;
  player2Style: string;
  winnerName: string;
  roundsWonP1: number;
  roundsWonP2: number;
  arena: string;
  matchDurationSeconds: number;
  createdAt: string;
}

export interface MatchPlayerInfo {
  uid: string;
  name: string;
  style: FightingStyleId;
  elo: number;
  maxHealth: number;
}

export interface Friend {
  id: number;
  uid: string;
  email: string;
  fighterName: string;
  fightingStyle: FightingStyleId;
  eloRating: number;
  wins: number;
  losses: number;
  koCount?: number;
  winStreak?: number;
  bio?: string;
  isOnline: boolean;
}

export interface ChatMessage {
  id?: number;
  senderUid: string;
  senderName: string;
  receiverUid?: string | null;
  matchId?: string | null;
  content: string;
  createdAt: string;
  isSender?: boolean;
}
