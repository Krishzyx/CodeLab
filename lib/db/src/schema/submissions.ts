import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { problemsTable } from "./problems";

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "running",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "runtime_error",
  "compilation_error",
]);

export const submissionsTable = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  problemId: integer("problem_id").notNull().references(() => problemsTable.id),
  language: text("language").notNull(),
  code: text("code").notNull(),
  status: submissionStatusEnum("status").notNull().default("pending"),
  runtime: integer("runtime"),
  memory: integer("memory"),
  output: text("output"),
  errorMessage: text("error_message"),
  contestId: integer("contest_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSubmissionSchema = createInsertSchema(submissionsTable).omit({ id: true, createdAt: true });
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissionsTable.$inferSelect;
