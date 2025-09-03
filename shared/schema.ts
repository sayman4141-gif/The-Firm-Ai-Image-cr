import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const imageGenerations = pgTable("image_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  telegramUserId: text("telegram_user_id").notNull(),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertImageGenerationSchema = createInsertSchema(imageGenerations).pick({
  telegramUserId: true,
  prompt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertImageGeneration = z.infer<typeof insertImageGenerationSchema>;
export type ImageGeneration = typeof imageGenerations.$inferSelect;
