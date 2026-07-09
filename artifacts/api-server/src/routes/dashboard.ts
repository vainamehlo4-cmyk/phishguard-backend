import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, phishingEmailsTable, phishingActionsTable, trainingModulesTable, trainingCompletionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";
import { calculateRiskScore } from "./risk";

const router = Router();

router.get("/user", authMiddleware, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  const riskScore = await calculateRiskScore(req.userId);

  const recentActionsRaw = await db
    .select({
      id: phishingActionsTable.id,
      userId: phishingActionsTable.userId,
      phishingEmailId: phishingActionsTable.phishingEmailId,
      action: phishingActionsTable.action,
      createdAt: phishingActionsTable.createdAt,
      username: usersTable.username,
      emailSubject: phishingEmailsTable.subject,
    })
    .from(phishingActionsTable)
    .leftJoin(usersTable, eq(phishingActionsTable.userId, usersTable.id))
    .leftJoin(phishingEmailsTable, eq(phishingActionsTable.phishingEmailId, phishingEmailsTable.id))
    .where(eq(phishingActionsTable.userId, req.userId));

  const recentActions = recentActionsRaw.slice(-5).map(a => ({
    id: a.id,
    userId: a.userId,
    username: a.username ?? null,
    phishingEmailId: a.phishingEmailId,
    emailSubject: a.emailSubject ?? null,
    action: a.action,
    createdAt: a.createdAt.toISOString(),
  }));

  const allModules = await db.select().from(trainingModulesTable);
  const completions = await db
    .select()
    .from(trainingCompletionsTable)
    .where(eq(trainingCompletionsTable.userId, req.userId));

  const allEmails = await db.select().from(phishingEmailsTable);
  const myActionIds = new Set(recentActionsRaw.map(a => a.phishingEmailId));
  const pendingEmails = allEmails.filter(e => !myActionIds.has(e.id)).length;

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    riskScore,
    recentActions,
    trainingProgress: {
      completed: completions.length,
      total: allModules.length,
    },
    pendingEmails,
  });
});

router.get("/admin", authMiddleware, adminMiddleware, async (_req, res) => {
  const users = await db.select().from(usersTable);
  const simulations = await db.select().from(phishingEmailsTable);
  const actions = await db
    .select({
      id: phishingActionsTable.id,
      userId: phishingActionsTable.userId,
      phishingEmailId: phishingActionsTable.phishingEmailId,
      action: phishingActionsTable.action,
      createdAt: phishingActionsTable.createdAt,
      username: usersTable.username,
      emailSubject: phishingEmailsTable.subject,
    })
    .from(phishingActionsTable)
    .leftJoin(usersTable, eq(phishingActionsTable.userId, usersTable.id))
    .leftJoin(phishingEmailsTable, eq(phishingActionsTable.phishingEmailId, phishingEmailsTable.id));

  const riskScores = await Promise.all(users.map(u => calculateRiskScore(u.id)));
  const highRiskCount = riskScores.filter(r => r.level === "high").length;
  const mediumRiskCount = riskScores.filter(r => r.level === "medium").length;
  const lowRiskCount = riskScores.filter(r => r.level === "low").length;

  const totalClicks = actions.filter(a => a.action === "click").length;
  const totalReports = actions.filter(a => a.action === "report").length;
  const totalIgnores = actions.filter(a => a.action === "ignore").length;

  const recentActions = actions
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
    .map(a => ({
      id: a.id,
      userId: a.userId,
      username: a.username ?? null,
      phishingEmailId: a.phishingEmailId,
      emailSubject: a.emailSubject ?? null,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
    }));

  return res.json({
    totalUsers: users.length,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    totalSimulations: simulations.length,
    totalClicks,
    totalReports,
    totalIgnores,
    recentActions,
    riskDistribution: [
      { level: "low", count: lowRiskCount },
      { level: "medium", count: mediumRiskCount },
      { level: "high", count: highRiskCount },
    ],
  });
});

export default router;
