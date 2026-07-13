import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const phishingEmailsTable = pgTable("phishing_emails", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  previewText: text("preview_text").notNull(),
  body: text("body").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export const phishingActionsTable = pgTable("phishing_actions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  phishingEmailId: integer("phishing_email_id").notNull().references(() => phishingEmailsTable.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPhishingEmailSchema = createInsertSchema(phishingEmailsTable).omit({ id: true, sentAt: true });
export const insertPhishingActionSchema = createInsertSchema(phishingActionsTable).omit({ id: true, createdAt: true });

export type InsertPhishingEmail = z.infer<typeof insertPhishingEmailSchema>;
export type PhishingEmail = typeof phishingEmailsTable.$inferSelect;
export type InsertPhishingAction = z.infer<typeof insertPhishingActionSchema>;
export type PhishingAction = typeof phishingActionsTable.$inferSelect;
