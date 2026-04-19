import { pgTable, uuid, text, timestamp, integer, jsonb, index, foreignKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  mustChangePassword: text("must_change_password").notNull().default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("users_email_idx").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Neue Fokusgruppe"),
  problemBrief: text("problem_brief"),
  status: text("status").notNull().default("discovery"),
  rigidityScore: integer("rigidity_score").notNull().default(5),
  personaCount: integer("persona_count").notNull().default(0),
  currentRound: integer("current_round").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  slot: integer("slot").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  corePerspective: text("core_perspective").notNull(),
  profile: text("profile").notNull(),
  positionSummary: text("position_summary"),
  round1Response: text("round_1_response"),
  round2Response: text("round_2_response"),
  round3Response: text("round_3_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("personas_session_idx").on(t.sessionId)]);

export const syntheses = pgTable("syntheses", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  synthesisText: text("synthesis_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("syntheses_session_idx").on(t.sessionId)]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  personaSlot: integer("persona_slot"),
  personaName: text("persona_name"),
  content: text("content").notNull(),
  roundNumber: integer("round_number"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("messages_session_idx").on(t.sessionId)]);

export const audienceMessages = pgTable("audience_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  personaSlot: integer("persona_slot").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("audience_session_persona_idx").on(t.sessionId, t.personaSlot)]);

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  summary: text("summary"),
  sizeBytes: integer("size_bytes").notNull(),
  category: text("category").notNull().default("panel"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (t) => [index("files_session_idx").on(t.sessionId)]);

export const personaImages = pgTable("persona_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  slot: integer("slot").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  status: text("status").notNull().default("ready"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
