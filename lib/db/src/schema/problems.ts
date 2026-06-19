import { pgTable, text, serial, timestamp, integer, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  difficulty: difficultyEnum("difficulty").notNull(),
  description: text("description").notNull(),
  constraints: text("constraints"),
  hints: text("hints"),
  tags: text("tags").array().notNull().default([]),
  starterCode: text("starter_code"),
  testCasesJson: text("test_cases_json").notNull().default("[]"),
  solvedCount: integer("solved_count").notNull().default(0),
  totalSubmissions: integer("total_submissions").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true, createdAt: true, updatedAt: true, solvedCount: true, totalSubmissions: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;
