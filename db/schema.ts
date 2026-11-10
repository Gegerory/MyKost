import { pgTable, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
export const accounts = pgTable('accounts', {
 id: text('id').primaryKey(), username: text('username').notNull().unique(), name: text('name').notNull(),
 email: text('email').notNull(), phone: text('phone').notNull(), passwordHash: text('password_hash').notNull(),
 role: text('role').notNull(), active: boolean('active').notNull().default(true), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const sessions = pgTable('sessions', { hash: text('hash').primaryKey(), userId: text('user_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull() });
export const authLimits = pgTable('auth_limits', { key: text('key').primaryKey(), count: integer('count').notNull(), resetAt: timestamp('reset_at', { withTimezone: true }).notNull() });
export const rooms = pgTable('rooms', { id: text('id').primaryKey(), status: text('status').notNull() });
export const bookings = pgTable('bookings', { id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => accounts.id), roomId: text('room_id').notNull(), status: text('status').notNull().default('Pending'), details: jsonb('details').$type<Record<string, string | number>>().notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() });
export const complaints = pgTable('complaints', { id: text('id').primaryKey(), userId: text('user_id').notNull().references(() => accounts.id), status: text('status').notNull().default('Pending'), details: jsonb('details').$type<Record<string, string>>().notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() });
