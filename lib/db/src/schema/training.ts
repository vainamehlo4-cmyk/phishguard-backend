import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const trainingModulesTable = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  content: text("content").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainingCompletionsTable = pgTable("training_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  moduleId: integer("module_id").notNull().references(() => trainingModulesTable.id),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModulesTable).omit({ id: true, createdAt: true });
export const insertTrainingCompletionSchema = createInsertSchema(trainingCompletionsTable).omit({ id: true, completedAt: true });

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModulesTable.$inferSelect;
export type InsertTrainingCompletion = z.infer<typeof insertTrainingCompletionSchema>;
export type TrainingCompletion = typeof trainingCompletionsTable.$inferSelect;
