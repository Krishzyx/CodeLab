import { Router } from "express";
import { db, contestsTable, contestRegistrationsTable, submissionsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin, optionalAuth } from "../lib/auth";

const router = Router();

function getContestStatus(startTime: Date, endTime: Date): "upcoming" | "active" | "ended" {
  const now = new Date();
  if (now < startTime) return "upcoming";
  if (now > endTime) return "ended";
  return "active";
}

router.get("/contests", optionalAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId?: number };
  const { status } = req.query as { status?: string };

  const allContests = await db
    .select()
    .from(contestsTable)
    .orderBy(sql`${contestsTable.startTime} DESC`);

  const registrationCounts = await db
    .select({ contestId: contestRegistrationsTable.contestId, count: sql<number>`count(*)` })
    .from(contestRegistrationsTable)
    .groupBy(contestRegistrationsTable.contestId);
  const regCountMap = new Map(registrationCounts.map((r) => [r.contestId, Number(r.count)]));

  let userRegSet = new Set<number>();
  if (r.userId) {
    const regs = await db
      .select({ contestId: contestRegistrationsTable.contestId })
      .from(contestRegistrationsTable)
      .where(eq(contestRegistrationsTable.userId, r.userId));
    userRegSet = new Set(regs.map((reg) => reg.contestId));
  }

  const contests = allContests
    .map((c) => {
      const contestStatus = getContestStatus(c.startTime, c.endTime);
      const problemIds: number[] = JSON.parse(c.problemIdsJson ?? "[]");
      return {
        id: c.id, title: c.title, description: c.description,
        startTime: c.startTime.toISOString(), endTime: c.endTime.toISOString(),
        status: contestStatus, problemCount: problemIds.length,
        participantCount: regCountMap.get(c.id) ?? 0,
        problemIds, isRegistered: userRegSet.has(c.id),
        createdAt: c.createdAt.toISOString(),
      };
    })
    .filter((c) => !status || c.status === status);

  res.json(contests);
});

router.post("/contests", requireAdmin, async (req, res): Promise<void> => {
  const { title, description, startTime, endTime, problemIds } = req.body;
  if (!title || !description || !startTime || !endTime) {
    res.status(400).json({ error: "title, description, startTime, and endTime are required" });
    return;
  }

  const [contest] = await db
    .insert(contestsTable)
    .values({ title, description, startTime: new Date(startTime), endTime: new Date(endTime), problemIdsJson: JSON.stringify(problemIds ?? []) })
    .returning();

  const contestStatus = getContestStatus(contest.startTime, contest.endTime);
  const pIds: number[] = JSON.parse(contest.problemIdsJson);
  res.status(201).json({
    id: contest.id, title: contest.title, description: contest.description,
    startTime: contest.startTime.toISOString(), endTime: contest.endTime.toISOString(),
    status: contestStatus, problemCount: pIds.length, participantCount: 0,
    problemIds: pIds, isRegistered: false, createdAt: contest.createdAt.toISOString(),
  });
});

router.get("/contests/:id", optionalAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId?: number };
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [contest] = await db.select().from(contestsTable).where(eq(contestsTable.id, id)).limit(1);
  if (!contest) { res.status(404).json({ error: "Contest not found" }); return; }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contestRegistrationsTable)
    .where(eq(contestRegistrationsTable.contestId, id));

  let isRegistered = false;
  if (r.userId) {
    const [reg] = await db
      .select()
      .from(contestRegistrationsTable)
      .where(and(eq(contestRegistrationsTable.contestId, id), eq(contestRegistrationsTable.userId, r.userId)))
      .limit(1);
    isRegistered = !!reg;
  }

  const contestStatus = getContestStatus(contest.startTime, contest.endTime);
  const problemIds: number[] = JSON.parse(contest.problemIdsJson);
  res.json({
    id: contest.id, title: contest.title, description: contest.description,
    startTime: contest.startTime.toISOString(), endTime: contest.endTime.toISOString(),
    status: contestStatus, problemCount: problemIds.length,
    participantCount: Number(count), problemIds, isRegistered,
    createdAt: contest.createdAt.toISOString(),
  });
});

router.patch("/contests/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, description, startTime, endTime, problemIds } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (startTime !== undefined) updates.startTime = new Date(startTime);
  if (endTime !== undefined) updates.endTime = new Date(endTime);
  if (problemIds !== undefined) updates.problemIdsJson = JSON.stringify(problemIds);

  const [contest] = await db.update(contestsTable).set(updates).where(eq(contestsTable.id, id)).returning();
  if (!contest) { res.status(404).json({ error: "Contest not found" }); return; }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contestRegistrationsTable)
    .where(eq(contestRegistrationsTable.contestId, id));

  const contestStatus = getContestStatus(contest.startTime, contest.endTime);
  const pIds: number[] = JSON.parse(contest.problemIdsJson);
  res.json({
    id: contest.id, title: contest.title, description: contest.description,
    startTime: contest.startTime.toISOString(), endTime: contest.endTime.toISOString(),
    status: contestStatus, problemCount: pIds.length,
    participantCount: Number(count), problemIds: pIds, isRegistered: false,
    createdAt: contest.createdAt.toISOString(),
  });
});

router.delete("/contests/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(contestsTable).where(eq(contestsTable.id, id));
  res.sendStatus(204);
});

router.post("/contests/:id/register", requireAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId: number };
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const existing = await db
    .select()
    .from(contestRegistrationsTable)
    .where(and(eq(contestRegistrationsTable.contestId, id), eq(contestRegistrationsTable.userId, r.userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(contestRegistrationsTable).values({ contestId: id, userId: r.userId });
  }

  res.json({ message: "Registered for contest" });
});

router.get("/contests/:id/leaderboard", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.execute(
    sql`SELECT u.id as user_id, u.username, u.avatar_url,
        COUNT(DISTINCT s.problem_id) FILTER (WHERE s.status = 'accepted') as solved_count,
        SUM(CASE WHEN s.status = 'accepted' THEN 100 ELSE 0 END) as score,
        MIN(s.runtime) FILTER (WHERE s.status = 'accepted') as runtime
      FROM contest_registrations cr
      JOIN users u ON u.id = cr.user_id
      LEFT JOIN submissions s ON s.user_id = cr.user_id AND s.contest_id = ${id}
      WHERE cr.contest_id = ${id}
      GROUP BY u.id, u.username, u.avatar_url
      ORDER BY score DESC, runtime ASC NULLS LAST
      LIMIT 100`
  );

  const entries = (rows.rows as Array<Record<string, unknown>>).map((row, i) => ({
    rank: i + 1,
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
