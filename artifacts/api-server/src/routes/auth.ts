import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, requireAuth } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { username, email, password } = req.body as { username: string; email: string; password: string };
  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email, and password are required" });
    return;
  }
  if (username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const existingUsername = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);
  if (existingUsername.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ username, email, passwordHash })
    .returning();

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt.toISOString() },
    token,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const r = req as typeof req & { userId: number };
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, r.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, username: user.username, email: user.email, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt.toISOString() });
});

router.get("/users/:username", async (req, res): Promise<void> => {
  const { username } = req.params;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username as string))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Count solved problems for user
  const solvedResult = await db.execute(
    sql`SELECT COUNT(DISTINCT problem_id) as count FROM submissions WHERE user_id = ${user.id} AND status = 'accepted'`
  );
  const solvedCount = Number((solvedResult.rows[0] as { count: string }).count ?? 0);

  // Simple rank: position by solved count
  const rankResult = await db.execute(
    sql`SELECT COUNT(*) + 1 as rank FROM (
      SELECT user_id, COUNT(DISTINCT problem_id) as solved
      FROM submissions WHERE status = 'accepted'
      GROUP BY user_id
      HAVING COUNT(DISTINCT problem_id) > ${solvedCount}
    ) sub`
  );
  const rank = Number((rankResult.rows[0] as { rank: string }).rank ?? 1);

  res.json({ id: user.id, username: user.username, role: user.role, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt.toISOString(), solvedCount, rank });
});

export default router;
