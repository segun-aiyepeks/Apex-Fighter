import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { GameCanvas } from './components/GameCanvas.tsx';
import { FightHud } from './components/FightHud.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { ProfileDashboard } from './components/ProfileDashboard.tsx';
import { FightingStylesView } from './components/FightingStylesView.tsx';
import { RegisterModal } from './components/RegisterModal.tsx';
import { RoundOverModal } from './components/RoundOverModal.tsx';
import { FriendsChatModal } from './components/FriendsChatModal.tsx';
import { useFighterAuth } from './hooks/useFighterAuth.ts';
import { FightingStyleId, FighterEntity } from './game/combatRules.ts';
import { ChatMessage } from './types/game.ts';
import { playAnnouncerSound, playUiClick } from './utils/audio.ts';

// Verified generated assets
const CYBER_DOJO_BG = '/src/assets/images/arena_cyber_dojo_1794060677376.jpg';
const MAGMA_COLOSSEUM_BG = '/src/assets/images/arena_magma_colosseum_1794060677755.jpg';
const STRIKER_PORTRAIT = '/src/assets/images/hero_fighter_striker_1794060680312.jpg';
const SHINOBI_PORTRAIT = '/src/assets/images/hero_fighter_shinobi_1794060679495.jpg';
const TITAN_PORTRAIT = '/src/assets/images/hero_fighter_titan_1794060679158.jpg';

export default function App() {
  const {
    profile,
    updateProfile,
    loginWithGoogle,
    registerWithEmail,
    refreshProfile,
  } = useFighterAuth();

  const [activeTab, setActiveTab] = useState<'arena' | 'leaderboard' | 'profile' | 'styles'>('arena');
  const [selectedStyle, setSelectedStyle] = useState<FightingStyleId>('blaze_fist');
  const [gameState, setGameState] = useState<'title' | 'playing' | 'gameover'>('title');

  // Match & Combat States
  const [isQueueing, setIsQueueing] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentArena, setCurrentArena] = useState<string>('cyber_dojo');
  const [isAiOpponent, setIsAiOpponent] = useState(true);

  // Opponent details
  const [opponentName, setOpponentName] = useState<string>('Cyber Sensei');
  const [opponentStyle, setOpponentStyle] = useState<FightingStyleId>('void_phantom');
  const [opponentUid, setOpponentUid] = useState<string>('ai_opponent');

  // Live HUD States
  const [p1Health, setP1Health] = useState<number>(100);
  const [p1MaxHealth, setP1MaxHealth] = useState<number>(100);
  const [p1Energy, setP1Energy] = useState<number>(30);
  const [p1RoundsWon, setP1RoundsWon] = useState<number>(0);
  const [p1IsBlocking, setP1IsBlocking] = useState<boolean>(false);

  const [p2Health, setP2Health] = useState<number>(100);
  const [p2MaxHealth, setP2MaxHealth] = useState<number>(100);
  const [p2Energy, setP2Energy] = useState<number>(30);
  const [p2RoundsWon, setP2RoundsWon] = useState<number>(0);
  const [p2IsBlocking, setP2IsBlocking] = useState<boolean>(false);

  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [comboCount, setComboCount] = useState<number>(0);
  const [isFighting, setIsFighting] = useState<boolean>(false);

  // Outcome Modal & Post-Match Chat States
  const [isMatchOverModalOpen, setIsMatchOverModalOpen] = useState(false);
  const [matchWinnerName, setMatchWinnerName] = useState('');
  const [isLocalWinner, setIsLocalWinner] = useState(false);
  const [eloDelta, setEloDelta] = useState(25);
  const [matchMessages, setMatchMessages] = useState<ChatMessage[]>([]);

  // Friends & Direct Chat System
  const [isFriendsChatOpen, setIsFriendsChatOpen] = useState(false);
  const [duelChallengeNotification, setDuelChallengeNotification] = useState<{
    senderName: string;
    lobbyCode: string;
  } | null>(null);

  // Registration Modal & Audio
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (profile?.fightingStyle) {
      setSelectedStyle(profile.fightingStyle);
    }
  }, [profile?.fightingStyle]);

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to Apex Fighter combat server.');
      if (profile?.uid) {
        ws.send(
          JSON.stringify({
            type: 'identify',
            uid: profile.uid,
            fighterName: profile.fighterName,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'queue_status':
            setIsQueueing(msg.status === 'queued');
            break;

          case 'match_found':
            setIsQueueing(false);
            setCurrentRoomId(msg.roomId);
            setCurrentArena(msg.arena);
            setMatchMessages([]);

            const isP1 = msg.p1.uid === profile?.uid;
            const opp = isP1 ? msg.p2 : msg.p1;
            setOpponentName(opp.name);
            setOpponentStyle(opp.style);
            setOpponentUid(opp.uid);
            setIsAiOpponent(false);

            setGameState('playing');
            setP1RoundsWon(0);
            setP2RoundsWon(0);
            setRoundNumber(1);
            setTimeRemaining(60);
            setIsFighting(false);
            playAnnouncerSound('fight');
            break;

          case 'round_start':
            setRoundNumber(msg.round);
            setTimeRemaining(msg.timeRemaining || 60);
            setIsFighting(true);
            playAnnouncerSound('fight');
            break;

          case 'timer_tick':
            setTimeRemaining(msg.timeRemaining);
            break;

          case 'combat_impact':
            if (msg.targetUid === profile?.uid) {
              setP1Health(msg.targetHealth);
            } else {
              setP2Health(msg.targetHealth);
            }
            break;

          case 'round_end':
            setIsFighting(false);
            setP1RoundsWon(msg.p1RoundsWon);
            setP2RoundsWon(msg.p2RoundsWon);
            break;

          case 'match_over':
            setIsFighting(false);
            setGameState('gameover');
            setMatchWinnerName(msg.winnerName);
            const won = msg.winnerUid === profile?.uid;
            setIsLocalWinner(won);
            setEloDelta(msg.eloDelta || 25);
            setIsMatchOverModalOpen(true);
            refreshProfile();
            break;

          case 'chat_match_message':
            setMatchMessages((prev) => [
              ...prev,
              {
                senderUid: msg.senderUid,
                senderName: msg.senderName,
                content: msg.content,
                createdAt: msg.createdAt,
              },
            ]);
            break;

          case 'duel_invite_received':
            setDuelChallengeNotification({
              senderName: msg.senderName,
              lobbyCode: msg.lobbyCode,
            });
            break;

          case 'lobby_created':
            alert(`Custom Lobby Created! Share Code: ${msg.code}`);
            setIsQueueing(true);
            break;

          case 'lobby_error':
            alert(msg.message);
            setIsQueueing(false);
            break;
        }
      } catch (err) {
        console.error('WebSocket receive error:', err);
      }
    };

    ws.onclose = () => {
      console.log('Combat server disconnected.');
    };

    socketRef.current = ws;

    return () => {
      ws.close();
    };
  }, [profile?.uid, profile?.fighterName]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startSparringDojo();
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        const target = e.target as HTMLElement;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        e.preventDefault();
        startPvPMatchmaking();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, profile, selectedStyle]);

  const startPvPMatchmaking = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      startSparringDojo();
      return;
    }
    playUiClick();
    setIsQueueing(true);
    socketRef.current.send(
      JSON.stringify({
        type: 'queue_join',
        uid: profile?.uid || 'fighter_guest',
        fighterName: profile?.fighterName || 'Challenger',
        style: selectedStyle,
        elo: profile?.eloRating || 1200,
      })
    );
  };

  const cancelMatchmaking = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'queue_leave' }));
    }
    setIsQueueing(false);
  };

  const startSparringDojo = () => {
    playUiClick();
    playAnnouncerSound('fight');
    setIsAiOpponent(true);
    const aiStyles: FightingStyleId[] = ['void_phantom', 'titan_vanguard', 'astral_ronin', 'blaze_fist'];
    const botStyle = aiStyles[Math.floor(Math.random() * aiStyles.length)];
    setOpponentStyle(botStyle);
    setOpponentName('Cyber Sensei (AI)');
    setCurrentArena('cyber_dojo');
    setP1RoundsWon(0);
    setP2RoundsWon(0);
    setRoundNumber(1);
    setTimeRemaining(60);
    setGameState('playing');
    setIsFighting(true);
    setMatchMessages([]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'sparring_ai',
          uid: profile?.uid || 'fighter_guest',
          fighterName: profile?.fighterName || 'Challenger',
          style: selectedStyle,
          botStyle,
          arena: 'cyber_dojo',
        })
      );
    }
  };

  const handleCreateLobby = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'lobby_create',
          uid: profile?.uid,
          fighterName: profile?.fighterName,
          style: selectedStyle,
          elo: profile?.eloRating,
          arena: 'cyber_dojo',
        })
      );
    }
  };

  const handleJoinLobby = (code: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'lobby_join',
          code,
          uid: profile?.uid,
          fighterName: profile?.fighterName,
          style: selectedStyle,
          elo: profile?.eloRating,
        })
      );
    }
  };

  const handleInviteToDuel = (friendUid: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    handleCreateLobby();

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'duel_invite',
          senderUid: profile?.uid,
          senderName: profile?.fighterName,
          receiverUid: friendUid,
          lobbyCode: code,
        })
      );
    }
    setIsFriendsChatOpen(false);
  };

  const handleSendMatchMessage = (content: string) => {
    const newMsg: ChatMessage = {
      senderUid: profile?.uid || 'guest_1',
      senderName: profile?.fighterName || 'Challenger',
      content,
      createdAt: new Date().toISOString(),
    };

    setMatchMessages((prev) => [...prev, newMsg]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentRoomId) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat_match',
          roomId: currentRoomId,
          matchId: currentRoomId,
          senderUid: profile?.uid,
          senderName: profile?.fighterName,
          content,
        })
      );
    } else {
      // In solo sparring, generate a spirited bot reaction
      setTimeout(() => {
        const botReactions = [
          'Well fought, warrior!',
          'You have impressive reflexes.',
          'Your discipline is formidable.',
          'Let us clash again soon!',
        ];
        const reaction = botReactions[Math.floor(Math.random() * botReactions.length)];
        setMatchMessages((prev) => [
          ...prev,
          {
            senderUid: 'ai_bot',
            senderName: opponentName,
            content: reaction,
            createdAt: new Date().toISOString(),
          },
        ]);
      }, 800);
    }
  };

  const handleP1StateUpdate = (entity: FighterEntity) => {
    setP1Health(entity.health);
    setP1MaxHealth(entity.maxHealth);
    setP1Energy(entity.energy);
    setP1IsBlocking(entity.state === 'block');
    setComboCount(entity.comboCount);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentRoomId) {
      socketRef.current.send(
        JSON.stringify({
          type: 'player_action',
          roomId: currentRoomId,
          uid: profile?.uid,
          x: entity.x,
          y: entity.y,
          vx: entity.vx,
          vy: entity.vy,
          facing: entity.facing,
          state: entity.state,
          isBlocking: entity.state === 'block',
          energy: entity.energy,
        })
      );
    }
  };

  const handleP2StateUpdate = (entity: FighterEntity) => {
    setP2Health(entity.health);
    setP2MaxHealth(entity.maxHealth);
    setP2Energy(entity.energy);
    setP2IsBlocking(entity.state === 'block');
  };

  const handleCombatHit = (
    attacker: 'p1' | 'p2',
    type: 'light' | 'heavy' | 'special',
    x: number,
    y: number
  ) => {
    const baseDamage = type === 'special' ? 35 : type === 'heavy' ? 20 : 10;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentRoomId) {
      socketRef.current.send(
        JSON.stringify({
          type: 'combat_hit',
          roomId: currentRoomId,
          attackerUid: attacker === 'p1' ? profile?.uid : opponentUid,
          baseDamage,
          hitType: type,
          hitX: x,
          hitY: y,
        })
      );
    } else {
      if (attacker === 'p1') {
        setP2Health((prev) => {
          const next = Math.max(0, prev - baseDamage);
          if (next <= 0) {
            handleLocalRoundFinish('p1');
          }
          return next;
        });
      } else {
        setP1Health((prev) => {
          const next = Math.max(0, prev - baseDamage);
          if (next <= 0) {
            handleLocalRoundFinish('p2');
          }
          return next;
        });
      }
    }
  };

  const handleLocalRoundFinish = (winner: 'p1' | 'p2') => {
    setIsFighting(false);
    if (winner === 'p1') {
      const nextRounds = p1RoundsWon + 1;
      setP1RoundsWon(nextRounds);
      if (nextRounds >= 2) {
        finishMatch('p1');
      } else {
        setTimeout(startNextRound, 2500);
      }
    } else {
      const nextRounds = p2RoundsWon + 1;
      setP2RoundsWon(nextRounds);
      if (nextRounds >= 2) {
        finishMatch('p2');
      } else {
        setTimeout(startNextRound, 2500);
      }
    }
  };

  const startNextRound = () => {
    setRoundNumber((r) => r + 1);
    setTimeRemaining(60);
    setP1Health(p1MaxHealth);
    setP2Health(p2MaxHealth);
    setIsFighting(true);
    playAnnouncerSound('fight');
  };

  const finishMatch = (winner: 'p1' | 'p2') => {
    setGameState('gameover');
    const won = winner === 'p1';
    setIsLocalWinner(won);
    setMatchWinnerName(won ? (profile?.fighterName || 'Challenger') : opponentName);
    setEloDelta(won ? 25 : -15);
    setIsMatchOverModalOpen(true);

    fetch('/api/matches/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId: 'solo_' + Date.now(),
        player1Uid: profile?.uid || 'guest_1',
        player1Name: profile?.fighterName || 'Challenger',
        player2Name: opponentName,
        player1Style: selectedStyle,
        player2Style: opponentStyle,
        winnerUid: won ? (profile?.uid || 'guest_1') : 'ai_bot',
        winnerName: won ? (profile?.fighterName || 'Challenger') : opponentName,
        roundsWonP1: p1RoundsWon + (winner === 'p1' ? 1 : 0),
        roundsWonP2: p2RoundsWon + (winner === 'p2' ? 1 : 0),
        arena: currentArena,
        matchDurationSeconds: 60 - timeRemaining,
        isP1Ko: p1Health <= 0,
        isP2Ko: p2Health <= 0,
      }),
    })
      .then(() => {
        refreshProfile();
      })
      .catch(console.error);
  };

  const getFighterPortrait = (style: FightingStyleId) => {
    switch (style) {
      case 'blaze_fist':
        return STRIKER_PORTRAIT;
      case 'void_phantom':
        return SHINOBI_PORTRAIT;
      case 'titan_vanguard':
        return TITAN_PORTRAIT;
      case 'astral_ronin':
        return SHINOBI_PORTRAIT;
      default:
        return STRIKER_PORTRAIT;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (gameState !== 'title') setGameState('title');
        }}
        fighter={profile}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenFriendsChat={() => setIsFriendsChatOpen(true)}
        inGame={gameState === 'playing'}
      />

      {/* Duel Invitation Notification Toast */}
      {duelChallengeNotification && (
        <div className="fixed top-16 right-6 z-50 bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div>
            <div className="text-xs uppercase font-bold text-amber-400">
              Duel Challenge Received!
            </div>
            <div className="text-sm font-bold text-white">
              {duelChallengeNotification.senderName} challenged you to combat!
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                handleJoinLobby(duelChallengeNotification.lobbyCode);
                setDuelChallengeNotification(null);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
            >
              Accept
            </button>
            <button
              onClick={() => setDuelChallengeNotification(null)}
              className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:text-white cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'arena' && (
          <>
            {gameState === 'title' ? (
              <TitleScreen
                fighter={profile}
                selectedStyle={selectedStyle}
                onSelectStyle={(s) => {
                  setSelectedStyle(s);
                  updateProfile({ fightingStyle: s });
                }}
                onStartMatchmaking={startPvPMatchmaking}
                onStartSparring={startSparringDojo}
                onCreateLobby={handleCreateLobby}
                onJoinLobby={handleJoinLobby}
                onOpenRegister={() => setIsRegisterOpen(true)}
                strikerImgUrl={STRIKER_PORTRAIT}
                shinobiImgUrl={SHINOBI_PORTRAIT}
                titanImgUrl={TITAN_PORTRAIT}
                isQueueing={isQueueing}
                onCancelQueue={cancelMatchmaking}
              />
            ) : (
              <div className="relative flex-1 flex flex-col items-center justify-center p-2 md:p-6">
                <FightHud
                  p1Name={profile?.fighterName || 'Challenger'}
                  p1Style={selectedStyle}
                  p1Health={p1Health}
                  p1MaxHealth={p1MaxHealth}
                  p1Energy={p1Energy}
                  p1RoundsWon={p1RoundsWon}
                  p1IsBlocking={p1IsBlocking}
                  p2Name={opponentName}
                  p2Style={opponentStyle}
                  p2Health={p2Health}
                  p2MaxHealth={p2MaxHealth}
                  p2Energy={p2Energy}
                  p2RoundsWon={p2RoundsWon}
                  p2IsBlocking={p2IsBlocking}
                  roundNumber={roundNumber}
                  timeRemaining={timeRemaining}
                  comboCount={comboCount}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted(!isMuted)}
                  onLeaveMatch={() => {
                    finishMatch('p2');
                  }}
                  p1PortraitUrl={getFighterPortrait(selectedStyle)}
                  p2PortraitUrl={getFighterPortrait(opponentStyle)}
                />

                <GameCanvas
                  arena={currentArena}
                  p1Style={selectedStyle}
                  p2Style={opponentStyle}
                  p1Name={profile?.fighterName || 'Challenger'}
                  p2Name={opponentName}
                  isAiOpponent={isAiOpponent}
                  onP1Update={handleP1StateUpdate}
                  onP2Update={handleP2StateUpdate}
                  onCombatHit={handleCombatHit}
                  cyberDojoImgUrl={CYBER_DOJO_BG}
                  magmaColosseumImgUrl={MAGMA_COLOSSEUM_BG}
                  isFighting={isFighting}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'profile' && (
          <ProfileDashboard
            fighter={profile}
            onUpdateProfile={updateProfile}
            onOpenArena={() => {
              setActiveTab('arena');
              setGameState('title');
            }}
            onOpenRegister={() => setIsRegisterOpen(true)}
            strikerImgUrl={STRIKER_PORTRAIT}
            shinobiImgUrl={SHINOBI_PORTRAIT}
            titanImgUrl={TITAN_PORTRAIT}
          />
        )}

        {activeTab === 'styles' && (
          <FightingStylesView
            currentStyle={selectedStyle}
            onSelectStyle={(style) => {
              setSelectedStyle(style);
              updateProfile({ fightingStyle: style });
            }}
            strikerImgUrl={STRIKER_PORTRAIT}
            shinobiImgUrl={SHINOBI_PORTRAIT}
            titanImgUrl={TITAN_PORTRAIT}
          />
        )}
      </main>

      {/* Match Outcome Modal with Post-Match Opponent Duel Chat */}
      <RoundOverModal
        isOpen={isMatchOverModalOpen}
        isWinner={isLocalWinner}
        winnerName={matchWinnerName}
        eloDelta={eloDelta}
        p1RoundsWon={p1RoundsWon}
        p2RoundsWon={p2RoundsWon}
        onPlayAgain={() => {
          setIsMatchOverModalOpen(false);
          startSparringDojo();
        }}
        onReturnToLobby={() => {
          setIsMatchOverModalOpen(false);
          setGameState('title');
        }}
        matchMessages={matchMessages}
        onSendMatchMessage={handleSendMatchMessage}
        opponentName={opponentName}
        currentFighterName={profile?.fighterName || 'Challenger'}
      />

      {/* Friends & Real-Time Direct Chat Modal */}
      <FriendsChatModal
        isOpen={isFriendsChatOpen}
        onClose={() => setIsFriendsChatOpen(false)}
        currentUser={profile}
        socket={socketRef.current}
        onInviteToDuel={handleInviteToDuel}
        strikerImgUrl={STRIKER_PORTRAIT}
        shinobiImgUrl={SHINOBI_PORTRAIT}
        titanImgUrl={TITAN_PORTRAIT}
      />

      {/* Fighter Email Registration Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterWithEmail={registerWithEmail}
        onLoginWithGoogle={loginWithGoogle}
        currentEmail={profile?.email}
        currentName={profile?.fighterName}
        currentStyle={selectedStyle}
      />
    </div>
  );
}
