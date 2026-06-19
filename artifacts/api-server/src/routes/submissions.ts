import { Router } from "express";
import { db, submissionsTable, problemsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth";
import { submitToJudge0, LANGUAGE_IDS } from "../lib/judge0";
import { logger } from "../lib/logger";

const router = Router();

router.get("/submissions", requireAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId: number };
  const { problemId, language, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(submissionsTable.userId, r.userId)];
  if (problemId) conditions.push(eq(submissionsTable.problemId, parseInt(problemId, 10)));
  if (language) conditions.push(eq(submissionsTable.language, language));
  if (status) conditions.push(eq(submissionsTable.status, status as "pending"));

  const rows = await db
    .select({
      submission: submissionsTable,
      problemTitle: problemsTable.title,
    })
    .from(submissionsTable)
    .leftJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .where(and(...conditions))
    .orderBy(sql`${submissionsTable.createdAt} DESC`)
    .limit(limitNum)
    .offset(offset);

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(submissionsTable)
    .where(and(...conditions));
  const total = Number(totalResult[0].count);

  const submissions = rows.map(({ submission: s, problemTitle }) => ({
    id: s.id, problemId: s.problemId, userId: s.userId, language: s.language, code: s.code,
    status: s.status, runtime: s.runtime, memory: s.memory, output: s.output,
    errorMessage: s.errorMessage, createdAt: s.createdAt.toISOString(), problemTitle: problemTitle ?? null,
  }));

  res.json({ submissions, total, page: pageNum, limit: limitNum });
});

router.post("/submissions/run", optionalAuth, async (req, res): Promise<void> => {
  const { language, code, input } = req.body as { language: string; code: string; input: string };
  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" });
    return;
  }

  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    res.status(400).json({ error: `Unsupported language: ${language}` });
    return;
  }

  const result = await submitToJudge0(code, langId, input ?? "");
  res.json({
    status: result.status,
    output: result.output,
    stderr: result.stderr,
    runtime: result.runtime,
    memory: result.memory,
  });
});

router.post("/submissions", requireAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId: number };
  const { problemId, language, code, contestId } = req.body as { problemId: number; language: string; code: string; contestId?: number };

  if (!problemId || !language || !code) {
    res.status(400).json({ error: "problemId, language, and code are required" });
    return;
  }

  const langId = LANGUAGE_IDS[language.toLowerCase()];
  if (!langId) {
    res.status(400).json({ error: `Unsupported language: ${language}` });
    return;
  }

  const [problem] = await db.select().from(problemsTable).where(eq(problemsTable.id, problemId)).limit(1);
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  // Create submission record as pending
  const [submission] = await db
    .insert(submissionsTable)
    .values({ userId: r.userId, problemId, language, code, status: "pending", contestId: contestId ?? null })
    .returning();

  // Return immediately, process async
  res.status(202).json({
    id: submission.id, problemId: submission.problemId, userId: submission.userId,
    language: submission.language, code: submission.code, status: submission.status,
    runtime: null, memory: null, output: null, errorMessage: null,
    createdAt: submission.createdAt.toISOString(), problemTitle: problem.title,
  });

  // Run code asynchronously
  setImmediate(async () => {
    try {
      const testCases: Array<{ input: string; expectedOutput: string }> = JSON.parse(problem.testCasesJson ?? "[]");

      // Increment total submissions
      await db.update(problemsTable)
        .set({ totalSubmissions: sql`${problemsTable.totalSubmissions} + 1` })
        .where(eq(problemsTable.id, problemId));

      if (testCases.length === 0) {
        // No test cases — just run and return output
        const result = await submitToJudge0(code, langId, "");
        await db.update(submissionsTable)
          .set({ status: result.status as "accepted", runtime: result.runtime, memory: result.memory, output: result.output, errorMessage: result.stderr })
          .where(eq(submissionsTable.id, submission.id));
        return;
      }

      // Run against all test cases
      let allPassed = true;
      let firstFailOutput: string | null = null;
      let firstFailExpected: string | null = null;
      let totalRuntime = 0;
      let maxMemory = 0;
      let finalStatus = "accepted";

      for (const tc of testCases) {
        const result = await submitToJudge0(code, langId, tc.input, tc.expectedOutput);
        if (result.runtime) totalRuntime += result.runtime;
        if (result.memory && result.memory > maxMemory) maxMemory = result.memory;

        if (result.status !== "accepted") {
          allPassed = false;
          finalStatus = result.status;
          firstFailOutput = result.output;
          firstFailExpected = tc.expectedOutput;
          break;
        }
      }

      if (allPassed) {
        await db.update(problemsTable)
          .set({ solvedCount: sql`${problemsTable.solvedCount} + 1` })
          .where(eq(problemsTable.id, problemId));
      }

      await db.update(submissionsTable)
        .set({
          status: finalStatus as "accepted",
          runtime: totalRuntime || null,
          memory: maxMemory || null,
          output: firstFailOutput,
          errorMessage: firstFailExpected ? `Expected: ${firstFailExpected}` : null,
        })
        .where(eq(submissionsTable.id, submission.id));

    } catch (err) {
      logger.error({ err }, "Async submission processing failed");
      await db.update(submissionsTable)
        .set({ status: "runtime_error", errorMessage: "Internal error processing submission" })
        .where(eq(submissionsTable.id, submission.id));
    }
  });
});

router.get("/submissions/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ submission: submissionsTable, problemTitle: problemsTable.title })
    .from(submissionsTable)
    .leftJoin(problemsTable, eq(submissionsTable.problemId, problemsTable.id))
    .where(eq(submissionsTable.id, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Submission not found" }); return; }
  const s = row.submission;

  res.json({
    id: s.id, problemId: s.problemId, userId: s.userId, language: s.language, code: s.code,
    status: s.status, runtime: s.runtime, memory: s.memory, output: s.output,
    errorMessage: s.errorMessage, createdAt: s.createdAt.toISOString(), problemTitle: row.problemTitle ?? null,
  });
});

export default router;
