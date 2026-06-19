import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (req, res): Promise<void> => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const rows = await db.execute(
    sql`SELECT u.id as user_id, u.username, u.avatar_url,
        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'accepted') as solved_count,
        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'accepted') * 10 as score,
        MIN(s.runtime) FILTER (WHERE s.status = 'accepted') as runtime
      FROM users u
      LEFT JOIN submissions s ON s.user_id = u.id
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY score DESC, runtime ASC NULLS LAST
      LIMIT ${limitNum} OFFSET ${offset}`
  );

  const entries = (rows.rows as Array<Record<string, unknown>>).map((row, i) => ({
    rank: offset + i + 1,
    userId: Number(row.user_id),
    username: String(row.username),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    score: Number(row.score ?? 0),
    solvedCount: Number(row.solved_count ?? 0),
    runtime: row.runtime ? Number(row.runtime) : null,
  }));

  res.json(entries);
});

export default router;
