import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contestsTable = pgTable("contests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  problemIdsJson: text("problem_ids_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const contestRegistrationsTable = pgTable("contest_registrations", {
  id: serial("id").primaryKey(),
  contestId: integer("contest_id").notNull().references(() => contestsTable.id),
  userId: integer("user_id").notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertContestSchema = createInsertSchema(contestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContest = z.infer<typeof insertContestSchema>;
export type Contest = typeof contestsTable.$inferSelect;
