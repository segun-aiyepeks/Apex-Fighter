import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getLeaderboard,
  getOrCreateFighter,
  getFighterByUid,
  updateFighter,
  recordMatchOutcome,
  getFighterMatchHistory,
  addFriendRelation,
  removeFriendRelation,
  getFriendsList,
  saveChatMessage,
  getDirectChatHistory,
  getMatchChatHistory,
  findFighterByEmailOrName,
} from './src/db/queries.ts';
import {
  calculateDamage,
  checkHitboxCollision,
  checkWinCondition,
  calculateEloDelta,
  FightingStyleId,
  FIGHTING_STYLES,
} from './src/game/combatRules.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req: Request, res: Response) => {
  try {
    const style = req.query.style as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const board = await getLeaderboard(style, limit);
    res.json({ leaderboard: board });
  } catch (error: any) {
    console.error('API /api/leaderboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
  }
});

// Fighter profile endpoint
app.get('/api/fighter/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const fighter = await getFighterByUid(uid);
    if (!fighter) {
      return res.json({ fighter: null, matchHistory: [] });
    }
    const history = await getFighterMatchHistory(uid, 15);
    res.json({ fighter, matchHistory: history });
  } catch (error: any) {
    console.error('API /api/fighter/:uid error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch fighter' });
  }
});

// Search fighters by email or name
app.get('/api/fighters/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      return res.json({ fighters: [] });
    }
    const fighters = await findFighterByEmailOrName(query);
    res.json({ fighters });
  } catch (error: any) {
    console.error('API /api/fighters/search error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// Fighter registration / sync endpoint
app.post('/api/fighter/register', async (req: Request, res: Response) => {
  try {
    const { uid, email, fighterName, fightingStyle, bio } = req.body;
    if (!uid || !email || !fighterName) {
      return res.status(400).json({ error: 'uid, email, and fighterName are required' });
    }
    const fighter = await getOrCreateFighter({
      uid,
      email,
      fighterName,
      fightingStyle: fightingStyle || 'blaze_fist',
      bio,
    });
    res.json({ fighter });
  } catch (error: any) {
    console.error('API /api/fighter/register error:', error);
    res.status(500).json({ error: error.message || 'Failed to register fighter' });
  }
});

// Update fighter profile
app.put('/api/fighter/profile', async (req: Request, res: Response) => {
  try {
    const { uid, fighterName, fightingStyle, bio } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }
    const updated = await updateFighter(uid, { fighterName, fightingStyle, bio });
    if (!updated) {
      return res.status(404).json({ error: 'Fighter not found' });
    }
    res.json({ fighter: updated });
  } catch (error: any) {
    console.error('API /api/fighter/profile error:', error);
    res.status(500).json({ error: error.message || 'Failed to update fighter profile' });
  }
});

// Friends Endpoints
app.get('/api/friends/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const friends = await getFriendsList(uid);
    // Annotate with online status from connectedUsers map
    const annotated = friends.map((f) => ({
      ...f,
      isOnline: connectedUsers.has(f.uid),
    }));
    res.json({ friends: annotated });
  } catch (error: any) {
    console.error('API /api/friends/:uid error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch friends' });
  }
});

app.post('/api/friends/add', async (req: Request, res: Response) => {
  try {
    const { userUid, targetIdentifier } = req.body;
    if (!userUid || !targetIdentifier) {
      return res.status(400).json({ error: 'userUid and targetIdentifier are required' });
    }
    const result = await addFriendRelation(userUid, targetIdentifier);
    res.json(result);
  } catch (error: any) {
    console.error('API /api/friends/add error:', error);
    res.status(400).json({ error: error.message || 'Failed to add friend' });
  }
});

app.delete('/api/friends/:uid/:friendUid', async (req: Request, res: Response) => {
  try {
    const { uid, friendUid } = req.params;
    const result = await removeFriendRelation(uid, friendUid);
    res.json(result);
  } catch (error: any) {
    console.error('API /api/friends delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove friend' });
  }
});

// Chat Messages Endpoints
app.get('/api/messages/direct/:uid/:friendUid', async (req: Request, res: Response) => {
  try {
    const { uid, friendUid } = req.params;
    const chat = await getDirectChatHistory(uid, friendUid);
    res.json({ messages: chat });
  } catch (error: any) {
    console.error('API /api/messages/direct error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch direct messages' });
  }
});

app.get('/api/messages/match/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;
    const chat = await getMatchChatHistory(matchId);
    res.json({ messages: chat });
  } catch (error: any) {
    console.error('API /api/messages/match error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch match messages' });
  }
});

// Record completed match
app.post('/api/matches/record', async (req: Request, res: Response) => {
  try {
    const result = await recordMatchOutcome(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API /api/matches/record error:', error);
    res.status(500).json({ error: error.message || 'Failed to record match' });
  }
});

// Real-Time Matchmaking, Battles & Chat Management
interface QueuedPlayer {
  ws: WebSocket;
  uid: string;
  fighterName: string;
  style: FightingStyleId;
  elo: number;
  joinedAt: number;
}

interface RoomPlayer {
  ws?: WebSocket;
  uid: string;
  fighterName: string;
  style: FightingStyleId;
  elo: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  facing: 'left' | 'right';
  state: string;
  isBlocking: boolean;
  roundsWon: number;
  isAi?: boolean;
}

interface BattleRoom {
  roomId: string;
  p1: RoomPlayer;
  p2: RoomPlayer;
  arena: string;
  status: 'countdown' | 'fighting' | 'round_end' | 'match_end';
  round: number;
  roundTimeRemaining: number;
  timerInterval?: NodeJS.Timeout;
}

const matchmakingQueue: QueuedPlayer[] = [];
const activeRooms = new Map<string, BattleRoom>();
const customLobbies = new Map<string, { p1: QueuedPlayer; arena: string }>();
const connectedUsers = new Map<string, { ws: WebSocket; fighterName: string }>();

function broadcastToRoom(room: BattleRoom, message: object) {
  const data = JSON.stringify(message);
  if (room.p1.ws && room.p1.ws.readyState === WebSocket.OPEN) {
    room.p1.ws.send(data);
  }
  if (room.p2.ws && room.p2.ws.readyState === WebSocket.OPEN) {
    room.p2.ws.send(data);
  }
}

function createBattleRoom(
  p1Data: QueuedPlayer,
  p2Data: QueuedPlayer | { isAi: true; style: FightingStyleId; name: string; elo: number },
  arena = 'cyber_dojo'
): BattleRoom {
  const roomId = 'room_' + Math.random().toString(36).substring(2, 9);

  const styleConfig1 = FIGHTING_STYLES[p1Data.style] || FIGHTING_STYLES.blaze_fist;
  const styleConfig2 = FIGHTING_STYLES[p2Data.style] || FIGHTING_STYLES.blaze_fist;

  const room: BattleRoom = {
    roomId,
    arena,
    status: 'countdown',
    round: 1,
    roundTimeRemaining: 60,
    p1: {
      ws: p1Data.ws,
      uid: p1Data.uid,
      fighterName: p1Data.fighterName,
      style: p1Data.style,
      elo: p1Data.elo,
      x: 240,
      y: 460,
      vx: 0,
      vy: 0,
      health: styleConfig1.maxHealth,
      maxHealth: styleConfig1.maxHealth,
      energy: 30,
      maxEnergy: styleConfig1.maxEnergy,
      facing: 'right',
      state: 'idle',
      isBlocking: false,
      roundsWon: 0,
      isAi: false,
    },
    p2: {
      ws: 'ws' in p2Data ? p2Data.ws : undefined,
      uid: 'uid' in p2Data ? p2Data.uid : 'ai_bot_' + Math.random().toString(36).substring(2, 7),
      fighterName: 'name' in p2Data ? p2Data.name : p2Data.fighterName,
      style: p2Data.style,
      elo: p2Data.elo,
      x: 720,
      y: 460,
      vx: 0,
      vy: 0,
      health: styleConfig2.maxHealth,
      maxHealth: styleConfig2.maxHealth,
      energy: 30,
      maxEnergy: styleConfig2.maxEnergy,
      facing: 'left',
      state: 'idle',
      isBlocking: false,
      roundsWon: 0,
      isAi: 'isAi' in p2Data ? p2Data.isAi : false,
    },
  };

  activeRooms.set(roomId, room);

  // Notify clients match found
  broadcastToRoom(room, {
    type: 'match_found',
    roomId,
    arena,
    p1: {
      uid: room.p1.uid,
      name: room.p1.fighterName,
      style: room.p1.style,
      elo: room.p1.elo,
      maxHealth: room.p1.maxHealth,
    },
    p2: {
      uid: room.p2.uid,
      name: room.p2.fighterName,
      style: room.p2.style,
      elo: room.p2.elo,
      maxHealth: room.p2.maxHealth,
    },
  });

  // Start round countdown
  setTimeout(() => {
    if (!activeRooms.has(roomId)) return;
    room.status = 'fighting';
    broadcastToRoom(room, {
      type: 'round_start',
      round: room.round,
      timeRemaining: room.roundTimeRemaining,
    });

    room.timerInterval = setInterval(() => {
      if (room.status !== 'fighting') return;
      room.roundTimeRemaining -= 1;
      broadcastToRoom(room, {
        type: 'timer_tick',
        timeRemaining: room.roundTimeRemaining,
      });

      if (room.roundTimeRemaining <= 0) {
        handleRoundEnd(room, 'timeout');
      }
    }, 1000);
  }, 2500);

  return room;
}

function handleRoundEnd(room: BattleRoom, reason: 'ko' | 'timeout') {
  if (room.timerInterval) clearInterval(room.timerInterval);
  room.status = 'round_end';

  let roundWinner: 'p1' | 'p2' | 'draw' = 'draw';
  if (room.p1.health > room.p2.health) {
    roundWinner = 'p1';
    room.p1.roundsWon += 1;
  } else if (room.p2.health > room.p1.health) {
    roundWinner = 'p2';
    room.p2.roundsWon += 1;
  }

  const isMatchOver = room.p1.roundsWon >= 2 || room.p2.roundsWon >= 2;

  broadcastToRoom(room, {
    type: 'round_end',
    round: room.round,
    roundWinner,
    reason,
    p1RoundsWon: room.p1.roundsWon,
    p2RoundsWon: room.p2.roundsWon,
    isMatchOver,
  });

  if (isMatchOver) {
    room.status = 'match_end';
    const matchWinner = room.p1.roundsWon >= 2 ? room.p1 : room.p2;
    const matchLoser = room.p1.roundsWon >= 2 ? room.p2 : room.p1;

    const eloDelta = calculateEloDelta(matchWinner.elo, matchLoser.elo, true);

    recordMatchOutcome({
      matchId: room.roomId,
      player1Uid: room.p1.uid,
      player2Uid: room.p2.isAi ? undefined : room.p2.uid,
      player1Name: room.p1.fighterName,
      player2Name: room.p2.fighterName,
      player1Style: room.p1.style,
      player2Style: room.p2.style,
      winnerUid: matchWinner.uid,
      winnerName: matchWinner.fighterName,
      roundsWonP1: room.p1.roundsWon,
      roundsWonP2: room.p2.roundsWon,
      arena: room.arena,
      matchDurationSeconds: 120 - room.roundTimeRemaining,
      isP1Ko: room.p1.health <= 0,
      isP2Ko: room.p2.health <= 0,
    }).catch((err) => console.error('Error saving match outcome:', err));

    setTimeout(() => {
      broadcastToRoom(room, {
        type: 'match_over',
        matchId: room.roomId,
        winnerUid: matchWinner.uid,
        winnerName: matchWinner.fighterName,
        eloDelta,
        p1RoundsWon: room.p1.roundsWon,
        p2RoundsWon: room.p2.roundsWon,
      });
      // Keep active room in map slightly longer so post-match chat can route
      setTimeout(() => {
        activeRooms.delete(room.roomId);
      }, 60000);
    }, 2000);
  } else {
    // Next round
    setTimeout(() => {
      if (!activeRooms.has(room.roomId)) return;
      room.round += 1;
      room.roundTimeRemaining = 60;
      room.status = 'fighting';
      const c1 = FIGHTING_STYLES[room.p1.style] || FIGHTING_STYLES.blaze_fist;
      const c2 = FIGHTING_STYLES[room.p2.style] || FIGHTING_STYLES.blaze_fist;
      room.p1.health = c1.maxHealth;
      room.p2.health = c2.maxHealth;
      room.p1.x = 240;
      room.p2.x = 720;
      room.p1.energy = 40;
      room.p2.energy = 40;

      broadcastToRoom(room, {
        type: 'round_start',
        round: room.round,
        timeRemaining: 60,
      });

      room.timerInterval = setInterval(() => {
        if (room.status !== 'fighting') return;
        room.roundTimeRemaining -= 1;
        broadcastToRoom(room, {
          type: 'timer_tick',
          timeRemaining: room.roundTimeRemaining,
        });
        if (room.roundTimeRemaining <= 0) {
          handleRoundEnd(room, 'timeout');
        }
      }, 1000);
    }, 3200);
  }
}

function processMatchmakingQueue() {
  if (matchmakingQueue.length < 2) return;

  const p1 = matchmakingQueue.shift()!;
  const p2 = matchmakingQueue.shift()!;

  const arenas = ['cyber_dojo', 'magma_colosseum'];
  const arena = arenas[Math.floor(Math.random() * arenas.length)];
  createBattleRoom(p1, p2, arena);
}

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket) => {
  let playerUid = '';
  let currentRoomId = '';

  ws.on('message', async (messageRaw: string) => {
    try {
      const msg = JSON.parse(messageRaw);

      switch (msg.type) {
        case 'identify': {
          playerUid = msg.uid;
          connectedUsers.set(playerUid, { ws, fighterName: msg.fighterName || 'Fighter' });
          break;
        }

        case 'queue_join': {
          playerUid = msg.uid;
          connectedUsers.set(playerUid, { ws, fighterName: msg.fighterName || 'Fighter' });

          const idx = matchmakingQueue.findIndex((p) => p.uid === playerUid);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);

          const queued: QueuedPlayer = {
            ws,
            uid: msg.uid,
            fighterName: msg.fighterName || 'Contender',
            style: msg.style || 'blaze_fist',
            elo: msg.elo || 1200,
            joinedAt: Date.now(),
          };
          matchmakingQueue.push(queued);

          ws.send(JSON.stringify({ type: 'queue_status', status: 'queued', queueLength: matchmakingQueue.length }));
          processMatchmakingQueue();
          break;
        }

        case 'queue_leave': {
          const idx = matchmakingQueue.findIndex((p) => p.uid === playerUid);
          if (idx !== -1) matchmakingQueue.splice(idx, 1);
          ws.send(JSON.stringify({ type: 'queue_status', status: 'idle' }));
          break;
        }

        case 'sparring_ai': {
          playerUid = msg.uid;
          connectedUsers.set(playerUid, { ws, fighterName: msg.fighterName || 'Fighter' });

          const queued: QueuedPlayer = {
            ws,
            uid: msg.uid,
            fighterName: msg.fighterName || 'Contender',
            style: msg.style || 'blaze_fist',
            elo: msg.elo || 1200,
            joinedAt: Date.now(),
          };

          const aiStyles: FightingStyleId[] = ['blaze_fist', 'void_phantom', 'titan_vanguard', 'astral_ronin'];
          const botStyle = msg.botStyle || aiStyles[Math.floor(Math.random() * aiStyles.length)];
          const botNames = ['Cyber Sensei', 'Ronin Phantom', 'Goliath V2', 'Adept Shadow'];
          const botName = botNames[Math.floor(Math.random() * botNames.length)];

          const room = createBattleRoom(
            queued,
            { isAi: true, style: botStyle, name: botName, elo: 1300 },
            msg.arena || 'cyber_dojo'
          );
          currentRoomId = room.roomId;
          break;
        }

        case 'lobby_create': {
          playerUid = msg.uid;
          connectedUsers.set(playerUid, { ws, fighterName: msg.fighterName || 'Host' });

          const code = Math.floor(100000 + Math.random() * 900000).toString();
          customLobbies.set(code, {
            p1: {
              ws,
              uid: msg.uid,
              fighterName: msg.fighterName || 'Host',
              style: msg.style || 'blaze_fist',
              elo: msg.elo || 1200,
              joinedAt: Date.now(),
            },
            arena: msg.arena || 'cyber_dojo',
          });
          ws.send(JSON.stringify({ type: 'lobby_created', code }));
          break;
        }

        case 'lobby_join': {
          playerUid = msg.uid;
          connectedUsers.set(playerUid, { ws, fighterName: msg.fighterName || 'Challenger' });

          const lobby = customLobbies.get(msg.code);
          if (!lobby) {
            ws.send(JSON.stringify({ type: 'lobby_error', message: 'Lobby code not found' }));
            return;
          }
          customLobbies.delete(msg.code);
          const p2: QueuedPlayer = {
            ws,
            uid: msg.uid,
            fighterName: msg.fighterName || 'Challenger',
            style: msg.style || 'blaze_fist',
            elo: msg.elo || 1200,
            joinedAt: Date.now(),
          };
          const room = createBattleRoom(lobby.p1, p2, lobby.arena);
          currentRoomId = room.roomId;
          break;
        }

        case 'player_action': {
          const room = activeRooms.get(msg.roomId);
          if (!room || room.status !== 'fighting') return;

          const isP1 = room.p1.uid === msg.uid;
          const player = isP1 ? room.p1 : room.p2;
          const opponent = isP1 ? room.p2 : room.p1;

          if (msg.x !== undefined) player.x = msg.x;
          if (msg.y !== undefined) player.y = msg.y;
          if (msg.vx !== undefined) player.vx = msg.vx;
          if (msg.vy !== undefined) player.vy = msg.vy;
          if (msg.facing) player.facing = msg.facing;
          if (msg.state) player.state = msg.state;
          if (msg.isBlocking !== undefined) player.isBlocking = msg.isBlocking;
          if (msg.energy !== undefined) player.energy = msg.energy;

          if (opponent.ws && opponent.ws.readyState === WebSocket.OPEN) {
            opponent.ws.send(
              JSON.stringify({
                type: 'opponent_update',
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy,
                facing: player.facing,
                state: player.state,
                isBlocking: player.isBlocking,
                energy: player.energy,
              })
            );
          }
          break;
        }

        case 'combat_hit': {
          const room = activeRooms.get(msg.roomId);
          if (!room || room.status !== 'fighting') return;

          const isAttackerP1 = room.p1.uid === msg.attackerUid;
          const target = isAttackerP1 ? room.p2 : room.p1;
          const attacker = isAttackerP1 ? room.p1 : room.p2;

          const targetConfig = FIGHTING_STYLES[target.style] || FIGHTING_STYLES.blaze_fist;
          const { damage, wasBlocked } = calculateDamage(
            msg.baseDamage || 10,
            target.isBlocking,
            targetConfig.armor,
            msg.isCombo || false
          );

          target.health = Math.max(0, target.health - damage);
          attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 8);

          broadcastToRoom(room, {
            type: 'combat_impact',
            attackerUid: attacker.uid,
            targetUid: target.uid,
            damage,
            wasBlocked,
            targetHealth: target.health,
            attackerEnergy: attacker.energy,
            hitType: msg.hitType || 'light',
            hitX: msg.hitX ?? target.x,
            hitY: msg.hitY ?? target.y - 40,
          });

          if (target.health <= 0) {
            handleRoundEnd(room, 'ko');
          }
          break;
        }

        // --- Real-Time Chat: Post-Match Duel Chat ---
        case 'chat_match': {
          const { roomId, matchId, senderUid, senderName, content } = msg;
          if (!content || !content.trim()) return;

          // Save to database
          try {
            await saveChatMessage(senderUid, null, matchId || roomId, content);
          } catch (err) {
            console.error('Failed to save match chat message:', err);
          }

          const room = activeRooms.get(roomId);
          if (room) {
            broadcastToRoom(room, {
              type: 'chat_match_message',
              matchId: matchId || roomId,
              senderUid,
              senderName,
              content: content.trim(),
              createdAt: new Date().toISOString(),
            });
          }
          break;
        }

        // --- Real-Time Chat: Direct Friend Chat ---
        case 'chat_direct': {
          const { senderUid, receiverUid, senderName, content } = msg;
          if (!content || !content.trim() || !receiverUid) return;

          let savedMsg: any = null;
          try {
            savedMsg = await saveChatMessage(senderUid, receiverUid, null, content);
          } catch (err) {
            console.error('Failed to save direct chat message:', err);
          }

          const payload = {
            type: 'chat_direct_message',
            id: savedMsg?.id || Date.now(),
            senderUid,
            receiverUid,
            senderName: senderName || 'Fighter',
            content: content.trim(),
            createdAt: savedMsg?.createdAt || new Date().toISOString(),
          };

          // Deliver to receiver if online
          const receiverConn = connectedUsers.get(receiverUid);
          if (receiverConn && receiverConn.ws.readyState === WebSocket.OPEN) {
            receiverConn.ws.send(JSON.stringify(payload));
          }

          // Acknowledge back to sender
          ws.send(
            JSON.stringify({
              ...payload,
              type: 'chat_direct_ack',
              isSender: true,
            })
          );
          break;
        }

        // --- Duel Challenge to Friend ---
        case 'duel_invite': {
          const { senderUid, receiverUid, senderName, lobbyCode } = msg;
          const receiverConn = connectedUsers.get(receiverUid);
          if (receiverConn && receiverConn.ws.readyState === WebSocket.OPEN) {
            receiverConn.ws.send(
              JSON.stringify({
                type: 'duel_invite_received',
                senderUid,
                senderName,
                lobbyCode,
              })
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error('WS message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (playerUid) {
      connectedUsers.delete(playerUid);
    }

    const idx = matchmakingQueue.findIndex((p) => p.ws === ws);
    if (idx !== -1) matchmakingQueue.splice(idx, 1);

    if (currentRoomId) {
      const room = activeRooms.get(currentRoomId);
      if (room) {
        broadcastToRoom(room, { type: 'opponent_disconnected' });
        activeRooms.delete(currentRoomId);
      }
    }
  });
});

// Vite Middleware for Development / Static serving for Production
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist/index.html'));
  });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Apex Fighter Server running on port ${PORT}`);
});
