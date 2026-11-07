import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or guest identifier
  email: text('email').notNull(),
  fighterName: text('fighter_name').notNull(),
  fightingStyle: text('fighting_style').notNull().default('blaze_fist'),
  eloRating: integer('elo_rating').notNull().default(1200),
  wins: integer('wins').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  koCount: integer('ko_count').notNull().default(0),
  winStreak: integer('win_streak').notNull().default(0),
  bio: text('bio').default('Ready to contend in the Grand Championship Arena.'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  matchId: text('match_id').notNull().unique(),
  player1Id: integer('player1_id').references(() => users.id),
  player2Id: integer('player2_id').references(() => users.id),
  player1Name: text('player1_name').notNull(),
  player2Name: text('player2_name').notNull(),
  player1Style: text('player1_style').notNull(),
  player2Style: text('player2_style').notNull(),
  winnerId: integer('winner_id').references(() => users.id),
  winnerName: text('winner_name').notNull(),
  roundsWonP1: integer('rounds_won_p1').notNull().default(0),
  roundsWonP2: integer('rounds_won_p2').notNull().default(0),
  arena: text('arena').notNull().default('cyber_dojo'),
  matchDurationSeconds: integer('match_duration_seconds').notNull().default(60),
  createdAt: timestamp('created_at').defaultNow(),
});

export const friendships = pgTable('friendships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  friendId: integer('friend_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('accepted'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  receiverId: integer('receiver_id').references(() => users.id),
  matchId: text('match_id'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  matchesAsP1: many(matches, { relationName: 'player1Matches' }),
  matchesAsP2: many(matches, { relationName: 'player2Matches' }),
  friends: many(friendships, { relationName: 'userFriends' }),
  sentMessages: many(messages, { relationName: 'senderMessages' }),
  receivedMessages: many(messages, { relationName: 'receiverMessages' }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  player1: one(users, {
    fields: [matches.player1Id],
    references: [users.id],
    relationName: 'player1Matches',
  }),
  player2: one(users, {
    fields: [matches.player2Id],
    references: [users.id],
    relationName: 'player2Matches',
  }),
  winner: one(users, {
    fields: [matches.winnerId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: 'userFriends',
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'senderMessages',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receiverMessages',
  }),
}));
