import { Router } from "express";
import { db, problemsTable, submissionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth";

const router = Router();

router.get("/stats/dashboard", requireAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId: number };
  const userId = r.userId;

  const [problemStats] = await db.execute(
    sql`SELECT
      COUNT(*) FILTER (WHERE difficulty = 'easy') as easy_total,
      COUNT(*) FILTER (WHERE difficulty = 'medium') as medium_total,
      COUNT(*) FILTER (WHERE difficulty = 'hard') as hard_total,
      COUNT(*) as total
    FROM problems WHERE is_active = true`
  );
  const ps = (problemStats as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};

  const [userStats] = await db.execute(
    sql`SELECT
      COUNT(DISTINCT problem_id) FILTER (WHERE status = 'accepted') as total_solved,
      COUNT(DISTINCT problem_id) FILTER (WHERE status = 'accepted' AND problem_id IN (SELECT id FROM problems WHERE difficulty = 'easy')) as easy_solved,
      COUNT(DISTINCT problem_id) FILTER (WHERE status = 'accepted' AND problem_id IN (SELECT id FROM problems WHERE difficulty = 'medium')) as medium_solved,
      COUNT(DISTINCT problem_id) FILTER (WHERE status = 'accepted' AND problem_id IN (SELECT id FROM problems WHERE difficulty = 'hard')) as hard_solved,
      COUNT(*) as total_submissions,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count
    FROM submissions WHERE user_id = ${userId}`
  );
  const us = (userStats as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};

  const totalSubs = Number(us.total_submissions ?? 0);
  const acceptedSubs = Number(us.accepted_count ?? 0);
  const acceptanceRate = totalSubs > 0 ? Math.round((acceptedSubs / totalSubs) * 100) / 100 : 0;

  const rankResult = await db.execute(
    sql`SELECT COUNT(*) + 1 as rank FROM (
      SELECT user_id, COUNT(DISTINCT problem_id) as solved
      FROM submissions WHERE status = 'accepted'
      GROUP BY user_id
      HAVING COUNT(DISTINCT problem_id) > ${Number(us.total_solved ?? 0)}
    ) sub`
  );
  const rank = Number(((rankResult as unknown as { rows: Array<Record<string, unknown>> }).rows[0] as Record<string, unknown>)?.rank ?? 1);

  res.json({
    totalSolved: Number(us.total_solved ?? 0),
    easySolved: Number(us.easy_solved ?? 0),
    mediumSolved: Number(us.medium_solved ?? 0),
    hardSolved: Number(us.hard_solved ?? 0),
    totalProblems: Number((ps as Record<string, unknown>).total ?? 0),
    easyTotal: Number((ps as Record<string, unknown>).easy_total ?? 0),
    mediumTotal: Number((ps as Record<string, unknown>).medium_total ?? 0),
    hardTotal: Number((ps as Record<string, unknown>).hard_total ?? 0),
    submissionsCount: totalSubs,
    acceptanceRate,
    rank,
    streak: 0,
  });
});

router.get("/stats/problems", async (_req, res): Promise<void> => {
  const [result] = await db.execute(
    sql`SELECT
      COUNT(*) FILTER (WHERE difficulty = 'easy') as easy,
      COUNT(*) FILTER (WHERE difficulty = 'medium') as medium,
      COUNT(*) FILTER (WHERE difficulty = 'hard') as hard,
      COUNT(*) as total
    FROM problems WHERE is_active = true`
  );
  const r = (result as unknown as { rows: Array<Record<string, unknown>> }).rows[0] ?? {};
  res.json({
    total: Number(r.total ?? 0),
    easy: Number(r.easy ?? 0),
    medium: Number(r.medium ?? 0),
    hard: Number(r.hard ?? 0),
  });
});

export default router;
