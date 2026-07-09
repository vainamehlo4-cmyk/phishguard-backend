import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, phishingActionsTable, trainingCompletionsTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router = Router();

export async function calculateRiskScore(userId: number) {
  const actions = await db.select().from(phishingActionsTable).where(eq(phishingActionsTable.userId, userId));
  const completions = await db.select().from(trainingCompletionsTable).where(eq(trainingCompletionsTable.userId, userId));

  const clickCount = actions.filter(a => a.action === "click").length;
  const reportCount = actions.filter(a => a.action === "report").length;
  const ignoreCount = actions.filter(a => a.action === "ignore").length;
  const trainingCompleted = completions.length;

  let score = 50;
  score += clickCount * 20;
  score -= reportCount * 15;
  score -= trainingCompleted * 10;
  score = Math.max(0, Math.min(100, score));

  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return { userId, score, level, clickCount, reportCount, ignoreCount, trainingCompleted };
}

router.get("/my-score", authMiddleware, async (req: any, res) => {
  const result = await calculateRiskScore(req.userId);
  return res.json(result);
});

router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  const users = await db.select().from(usersTable);
  const results = await Promise.all(
    users.map(async user => {
      const risk = await calculateRiskScore(user.id);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department ?? null,
        riskScore: risk.score,
        riskLevel: risk.level,
        clickCount: risk.clickCount,
        reportCount: risk.reportCount,
        ignoreCount: risk.ignoreCount,
        trainingCompleted: risk.trainingCompleted,
        createdAt: user.createdAt.toISOString(),
      };
    })
  );
  return res.json(results);
});

export default router;
