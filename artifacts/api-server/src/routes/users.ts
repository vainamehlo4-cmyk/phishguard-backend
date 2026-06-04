import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";
import { calculateRiskScore } from "./risk";

const router = Router();

router.get("/", authMiddleware, adminMiddleware, async (_req, res) => {
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

router.get("/:id", authMiddleware, async (req: any, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  if (req.userRole !== "admin" && req.userId !== id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  const risk = await calculateRiskScore(user.id);
  return res.json({
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
  });
});

export default router;
