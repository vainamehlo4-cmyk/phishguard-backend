import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password_hash: varchar("password_hash", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  fullName: varchar("fullName", { length: 255 }),
  role: varchar("role", { length: 50 }).default("user"),
  department: varchar("department", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
});

export * from "./users";
export * from "./phishing";
export * from "./training";