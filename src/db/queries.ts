import { db } from './index.ts';
import { users, matches, friendships, messages } from './schema.ts';
import { and, asc, desc, eq, or, sql } from 'drizzle-orm';

export interface RegisterFighterParams {
  uid: string;
  email: string;
  fighterName: string;
  fightingStyle?: string;
  bio?: string;
}

export async function getOrCreateFighter(params: RegisterFighterParams) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        fighterName: params.fighterName || 'Challenger',
        fightingStyle: params.fightingStyle || 'blaze_fist',
        bio: params.bio || 'New contender in the Grand Championship Arena.',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('getOrCreateFighter query error:', error);
    throw new Error('Failed to synchronize fighter profile.', { cause: error });
  }
}

export async function getFighterByUid(uid: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('getFighterByUid query error:', error);
    throw new Error('Failed to query fighter profile.', { cause: error });
  }
}

export async function findFighterByEmailOrName(query: string) {
  try {
    const lower = query.toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(${users.email}) = ${lower}`,
          sql`LOWER(${users.fighterName}) = ${lower}`,
          sql`LOWER(${users.fighterName}) LIKE ${'%' + lower + '%'}`
        )
      )
      .limit(5);

    return rows;
  } catch (error) {
    console.error('findFighterByEmailOrName query error:', error);
    throw new Error('Failed to search fighters.', { cause: error });
  }
}

export async function updateFighter(
  uid: string,
  updates: { fighterName?: string; fightingStyle?: string; bio?: string }
) {
  try {
    const updated = await db
      .update(users)
      .set({
        ...(updates.fighterName ? { fighterName: updates.fighterName } : {}),
        ...(updates.fightingStyle ? { fightingStyle: updates.fightingStyle } : {}),
        ...(updates.bio ? { bio: updates.bio } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();

    return updated.length > 0 ? updated[0] : null;
  } catch (error) {
    console.error('updateFighter query error:', error);
    throw new Error('Failed to update fighter profile.', { cause: error });
  }
}

export async function getLeaderboard(style?: string, limit = 50) {
  try {
    let query = db
      .select({
        id: users.id,
        uid: users.uid,
        fighterName: users.fighterName,
        email: users.email,
        fightingStyle: users.fightingStyle,
        eloRating: users.eloRating,
        wins: users.wins,
        losses: users.losses,
        koCount: users.koCount,
        winStreak: users.winStreak,
        bio: users.bio,
      })
      .from(users);

    if (style && style !== 'all') {
      const results = await query
        .where(eq(users.fightingStyle, style))
        .orderBy(desc(users.eloRating), desc(users.wins))
        .limit(limit);
      return results;
    }

    const results = await query
      .orderBy(desc(users.eloRating), desc(users.wins))
      .limit(limit);

    return results;
  } catch (error) {
    console.error('getLeaderboard query error:', error);
    throw new Error('Failed to retrieve global leaderboard.', { cause: error });
  }
}

export interface RecordMatchParams {
  matchId: string;
  player1Uid: string;
  player2Uid?: string;
  player1Name: string;
  player2Name: string;
  player1Style: string;
  player2Style: string;
  winnerUid: string;
  winnerName: string;
  roundsWonP1: number;
  roundsWonP2: number;
  arena: string;
  matchDurationSeconds: number;
  isP1Ko: boolean;
  isP2Ko: boolean;
}

export async function recordMatchOutcome(params: RecordMatchParams) {
  try {
    const p1 = await getFighterByUid(params.player1Uid);
    const p2 = params.player2Uid ? await getFighterByUid(params.player2Uid) : null;

    const winnerId =
      params.winnerUid === params.player1Uid
        ? p1?.id ?? null
        : params.player2Uid && params.winnerUid === params.player2Uid
        ? p2?.id ?? null
        : null;

    await db.insert(matches).values({
      matchId: params.matchId,
      player1Id: p1?.id ?? null,
      player2Id: p2?.id ?? null,
      player1Name: params.player1Name,
      player2Name: params.player2Name,
      player1Style: params.player1Style,
      player2Style: params.player2Style,
      winnerId,
      winnerName: params.winnerName,
      roundsWonP1: params.roundsWonP1,
      roundsWonP2: params.roundsWonP2,
      arena: params.arena,
      matchDurationSeconds: params.matchDurationSeconds,
    });

    if (p1) {
      const isP1Winner = params.winnerUid === params.player1Uid;
      const eloDelta = isP1Winner ? 25 : -15;
      const newRating = Math.max(800, p1.eloRating + eloDelta);

      await db
        .update(users)
        .set({
          wins: isP1Winner ? p1.wins + 1 : p1.wins,
          losses: isP1Winner ? p1.losses : p1.losses + 1,
          winStreak: isP1Winner ? p1.winStreak + 1 : 0,
          koCount: isP1Winner && params.isP2Ko ? p1.koCount + 1 : p1.koCount,
          eloRating: newRating,
          updatedAt: new Date(),
        })
        .where(eq(users.id, p1.id));
    }

    if (p2) {
      const isP2Winner = params.winnerUid === params.player2Uid;
      const eloDelta = isP2Winner ? 25 : -15;
      const newRating = Math.max(800, p2.eloRating + eloDelta);

      await db
        .update(users)
        .set({
          wins: isP2Winner ? p2.wins + 1 : p2.wins,
          losses: isP2Winner ? p2.losses : p2.losses + 1,
          winStreak: isP2Winner ? p2.winStreak + 1 : 0,
          koCount: isP2Winner && params.isP1Ko ? p2.koCount + 1 : p2.koCount,
          eloRating: newRating,
          updatedAt: new Date(),
        })
        .where(eq(users.id, p2.id));
    }

    return { success: true };
  } catch (error) {
    console.error('recordMatchOutcome query error:', error);
    throw new Error('Failed to record match outcome.', { cause: error });
  }
}

export async function getFighterMatchHistory(uid: string, limit = 20) {
  try {
    const fighter = await getFighterByUid(uid);
    if (!fighter) return [];

    const rows = await db
      .select()
      .from(matches)
      .where(or(eq(matches.player1Id, fighter.id), eq(matches.player2Id, fighter.id)))
      .orderBy(desc(matches.createdAt))
      .limit(limit);

    return rows;
  } catch (error) {
    console.error('getFighterMatchHistory query error:', error);
    throw new Error('Failed to query match history.', { cause: error });
  }
}

// --- Friend List Queries ---

export async function addFriendRelation(userUid: string, targetIdentifier: string) {
  try {
    let user = await getFighterByUid(userUid);
    if (!user) {
      user = await getOrCreateFighter({
        uid: userUid,
        email: `${userUid}@apexarena.gg`,
        fighterName: `Contender ${userUid.slice(-4)}`,
        fightingStyle: 'blaze_fist',
      });
    }

    const targets = await findFighterByEmailOrName(targetIdentifier);
    if (targets.length === 0) {
      throw new Error('Fighter with that email or name was not found.');
    }
    const target = targets[0];
    if (target.id === user.id) {
      throw new Error('You cannot add yourself as a friend.');
    }

    // Check if friendship already exists
    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, user.id), eq(friendships.friendId, target.id)),
          and(eq(friendships.userId, target.id), eq(friendships.friendId, user.id))
        )
      );

    if (existing.length > 0) {
      return { success: true, friend: target, message: 'Already friends' };
    }

    await db.insert(friendships).values([
      { userId: user.id, friendId: target.id, status: 'accepted' },
      { userId: target.id, friendId: user.id, status: 'accepted' },
    ]);

    return { success: true, friend: target };
  } catch (error) {
    console.error('addFriendRelation query error:', error);
    throw new Error((error as any).message || 'Failed to add friend.');
  }
}

export async function removeFriendRelation(userUid: string, friendUid: string) {
  try {
    const user = await getFighterByUid(userUid);
    const friend = await getFighterByUid(friendUid);
    if (!user || !friend) return { success: false };

    await db
      .delete(friendships)
      .where(
        or(
          and(eq(friendships.userId, user.id), eq(friendships.friendId, friend.id)),
          and(eq(friendships.userId, friend.id), eq(friendships.friendId, user.id))
        )
      );

    return { success: true };
  } catch (error) {
    console.error('removeFriendRelation query error:', error);
    throw new Error('Failed to remove friend.');
  }
}

export async function getFriendsList(userUid: string) {
  try {
    let user = await getFighterByUid(userUid);
    if (!user) {
      user = await getOrCreateFighter({
        uid: userUid,
        email: `${userUid}@apexarena.gg`,
        fighterName: `Contender ${userUid.slice(-4)}`,
        fightingStyle: 'blaze_fist',
      });
    }

    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fighterName: users.fighterName,
        fightingStyle: users.fightingStyle,
        eloRating: users.eloRating,
        wins: users.wins,
        losses: users.losses,
        koCount: users.koCount,
        winStreak: users.winStreak,
        bio: users.bio,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(eq(friendships.userId, user.id))
      .orderBy(desc(users.eloRating));

    return rows;
  } catch (error) {
    console.error('getFriendsList query error:', error);
    throw new Error('Failed to fetch friend list.');
  }
}

// --- Chat Messages Queries ---

export async function saveChatMessage(
  senderUid: string,
  receiverUid: string | null,
  matchId: string | null,
  content: string
) {
  try {
    let sender = await getFighterByUid(senderUid);
    if (!sender) {
      sender = await getOrCreateFighter({
        uid: senderUid,
        email: `${senderUid}@apexarena.gg`,
        fighterName: `Contender ${senderUid.slice(-4)}`,
        fightingStyle: 'blaze_fist',
      });
    }

    const receiver = receiverUid ? await getFighterByUid(receiverUid) : null;

    const inserted = await db
      .insert(messages)
      .values({
        senderId: sender.id,
        receiverId: receiver?.id ?? null,
        matchId: matchId ?? null,
        content: content.trim(),
      })
      .returning();

    return {
      ...inserted[0],
      senderUid: sender.uid,
      senderName: sender.fighterName,
      receiverUid: receiver?.uid ?? null,
    };
  } catch (error) {
    console.error('saveChatMessage query error:', error);
    throw new Error('Failed to save chat message.');
  }
}

export async function getDirectChatHistory(userUid: string, friendUid: string, limit = 40) {
  try {
    const user = await getFighterByUid(userUid);
    const friend = await getFighterByUid(friendUid);
    if (!user || !friend) return [];

    const rows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, user.id), eq(messages.receiverId, friend.id)),
          and(eq(messages.senderId, friend.id), eq(messages.receiverId, user.id))
        )
      )
      .orderBy(asc(messages.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      ...r,
      isSender: r.senderId === user.id,
      senderUid: r.senderId === user.id ? user.uid : friend.uid,
      senderName: r.senderId === user.id ? user.fighterName : friend.fighterName,
    }));
  } catch (error) {
    console.error('getDirectChatHistory query error:', error);
    throw new Error('Failed to fetch chat history.');
  }
}

export async function getMatchChatHistory(matchId: string, limit = 30) {
  try {
    const rows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: users.fighterName,
        senderUid: users.uid,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.matchId, matchId))
      .orderBy(asc(messages.createdAt))
      .limit(limit);

    return rows;
  } catch (error) {
    console.error('getMatchChatHistory query error:', error);
    throw new Error('Failed to fetch match chat history.');
  }
}
