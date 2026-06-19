import { Router } from "express";
import { db, problemsTable, submissionsTable } from "@workspace/db";
import { eq, sql, ilike, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin, optionalAuth } from "../lib/auth";

const router = Router();

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

router.get("/problems", optionalAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId?: number };
  const { difficulty, tag, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(problemsTable.isActive, true)];
  if (difficulty) conditions.push(eq(problemsTable.difficulty, difficulty as "easy" | "medium" | "hard"));
  if (search) conditions.push(ilike(problemsTable.title, `%${search}%`));

  const whereClause = and(...conditions);
  const allProblems = await db
    .select()
    .from(problemsTable)
    .where(whereClause)
    .orderBy(problemsTable.id)
    .limit(limitNum)
    .offset(offset);

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(problemsTable)
    .where(whereClause);
  const total = Number(totalResult[0].count);

  let solvedIds = new Set<number>();
  let attemptedIds = new Set<number>();
  if (r.userId) {
    const userSubs = await db
      .select({ problemId: submissionsTable.problemId, status: submissionsTable.status })
      .from(submissionsTable)
      .where(eq(submissionsTable.userId, r.userId));
    for (const s of userSubs) {
      if (s.status === "accepted") solvedIds.add(s.problemId);
      else attemptedIds.add(s.problemId);
    }
  }

  // Filter by status after fetch if requested
  let filtered = allProblems;
  const { status } = req.query as { status?: string };
  if (status === "solved" && r.userId) {
    filtered = allProblems.filter((p) => solvedIds.has(p.id));
  } else if (status === "unsolved" && r.userId) {
    filtered = allProblems.filter((p) => !solvedIds.has(p.id));
  } else if (status === "attempted" && r.userId) {
    filtered = allProblems.filter((p) => !solvedIds.has(p.id) && attemptedIds.has(p.id));
  }

  const problems = filtered
    .filter((p) => !tag || (p.tags ?? []).includes(tag))
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      description: p.description,
      constraints: p.constraints,
      hints: p.hints,
      tags: p.tags ?? [],
      starterCode: p.starterCode,
      testCases: JSON.parse(p.testCasesJson ?? "[]"),
      createdAt: p.createdAt.toISOString(),
      solvedCount: p.solvedCount,
      acceptanceRate: p.totalSubmissions > 0 ? Math.round((p.solvedCount / p.totalSubmissions) * 100) / 100 : 0,
      userStatus: r.userId ? (solvedIds.has(p.id) ? "solved" : attemptedIds.has(p.id) ? "attempted" : null) : null,
    }));

  res.json({ problems, total, page: pageNum, limit: limitNum });
});

router.post("/problems", requireAdmin, async (req, res): Promise<void> => {
  const { title, difficulty, description, constraints, hints, tags, starterCode, testCases } = req.body;
  if (!title || !difficulty || !description) {
    res.status(400).json({ error: "title, difficulty, and description are required" });
    return;
  }

  const slug = slugify(title);
  const [problem] = await db
    .insert(problemsTable)
    .values({
      title,
      slug,
      difficulty,
      description,
      constraints,
      hints,
      tags: tags ?? [],
      starterCode,
      testCasesJson: JSON.stringify(testCases ?? []),
    })
    .returning();

  res.status(201).json({
    id: problem.id, title: problem.title, slug: problem.slug, difficulty: problem.difficulty,
    description: problem.description, constraints: problem.constraints, hints: problem.hints,
    tags: problem.tags ?? [], starterCode: problem.starterCode,
    testCases: JSON.parse(problem.testCasesJson ?? "[]"),
    createdAt: problem.createdAt.toISOString(), solvedCount: problem.solvedCount, acceptanceRate: 0, userStatus: null,
  });
});

router.get("/problems/:id", optionalAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId?: number };
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, id)).limit(1);
  if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }

  let userStatus: string | null = null;
  if (r.userId) {
    const subs = await db
      .select({ status: submissionsTable.status })
      .from(submissionsTable)
      .where(and(eq(submissionsTable.userId, r.userId), eq(submissionsTable.problemId, id)));
    if (subs.some((s) => s.status === "accepted")) userStatus = "solved";
    else if (subs.length > 0) userStatus = "attempted";
  }

  res.json({
    id: problem.id, title: problem.title, slug: problem.slug, difficulty: problem.difficulty,
    description: problem.description, constraints: problem.constraints, hints: problem.hints,
    tags: problem.tags ?? [], starterCode: problem.starterCode,
    testCases: JSON.parse(problem.testCasesJson ?? "[]"),
    createdAt: problem.createdAt.toISOString(), solvedCount: problem.solvedCount,
    acceptanceRate: problem.totalSubmissions > 0 ? Math.round((problem.solvedCount / problem.totalSubmissions) * 100) / 100 : 0,
    userStatus,
  });
});

router.patch("/problems/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, difficulty, description, constraints, hints, tags, starterCode, testCases } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) { updates.title = title; updates.slug = slugify(title); }
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (description !== undefined) updates.description = description;
  if (constraints !== undefined) updates.constraints = constraints;
  if (hints !== undefined) updates.hints = hints;
  if (tags !== undefined) updates.tags = tags;
  if (starterCode !== undefined) updates.starterCode = starterCode;
  if (testCases !== undefined) updates.testCasesJson = JSON.stringify(testCases);

  const [problem] = await db.update(problemsTable).set(updates).where(eq(problemsTable.id, id)).returning();
  if (!problem) { res.status(404).json({ error: "Problem not found" }); return; }

  res.json({
    id: problem.id, title: problem.title, slug: problem.slug, difficulty: problem.difficulty,
    description: problem.description, constraints: problem.constraints, hints: problem.hints,
    tags: problem.tags ?? [], starterCode: problem.starterCode,
    testCases: JSON.parse(problem.testCasesJson ?? "[]"),
    createdAt: problem.createdAt.toISOString(), solvedCount: problem.solvedCount,
    acceptanceRate: problem.totalSubmissions > 0 ? Math.round((problem.solvedCount / problem.totalSubmissions) * 100) / 100 : 0,
    userStatus: null,
  });
});

router.delete("/problems/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.update(problemsTable).set({ isActive: false }).where(eq(problemsTable.id, id));
  res.sendStatus(204);
});

export default router;
