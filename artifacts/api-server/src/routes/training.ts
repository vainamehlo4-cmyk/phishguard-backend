import { Router } from "express";
import { db } from "@workspace/db";
import { trainingModulesTable, trainingCompletionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "./auth";

const router = Router();

router.get("/modules", authMiddleware, async (req: any, res) => {
  const modules = await db.select().from(trainingModulesTable).orderBy(trainingModulesTable.id);
  const completions = await db
    .select()
    .from(trainingCompletionsTable)
    .where(eq(trainingCompletionsTable.userId, req.userId));

  const completionMap = new Map(completions.map(c => [c.moduleId, c.completedAt]));

  const result = modules.map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    category: m.category,
    content: m.content,
    durationMinutes: m.durationMinutes,
    completed: completionMap.has(m.id),
    completedAt: completionMap.get(m.id)?.toISOString() ?? null,
  }));

  return res.json(result);
});

router.post("/modules/:id/complete", authMiddleware, async (req: any, res) => {
  const moduleId = parseInt(req.params.id);
  if (isNaN(moduleId)) return res.status(400).json({ error: "Invalid module id" });

  const [module] = await db.select().from(trainingModulesTable).where(eq(trainingModulesTable.id, moduleId));
  if (!module) return res.status(404).json({ error: "Module not found" });

  const [existing] = await db
    .select()
    .from(trainingCompletionsTable)
    .where(
      and(
        eq(trainingCompletionsTable.userId, req.userId),
        eq(trainingCompletionsTable.moduleId, moduleId)
      )
    );

  if (existing) {
    return res.json({
      id: existing.id,
      userId: existing.userId,
      moduleId: existing.moduleId,
      moduleTitle: module.title,
      completedAt: existing.completedAt.toISOString(),
    });
  }

  const [completion] = await db
    .insert(trainingCompletionsTable)
    .values({ userId: req.userId, moduleId })
    .returning();

  return res.json({
    id: completion.id,
    userId: completion.userId,
    moduleId: completion.moduleId,
    moduleTitle: module.title,
    completedAt: completion.completedAt.toISOString(),
  });
});

router.get("/my-completions", authMiddleware, async (req: any, res) => {
  const completions = await db
    .select({
      id: trainingCompletionsTable.id,
      userId: trainingCompletionsTable.userId,
      moduleId: trainingCompletionsTable.moduleId,
      completedAt: trainingCompletionsTable.completedAt,
      moduleTitle: trainingModulesTable.title,
    })
    .from(trainingCompletionsTable)
    .leftJoin(trainingModulesTable, eq(trainingCompletionsTable.moduleId, trainingModulesTable.id))
    .where(eq(trainingCompletionsTable.userId, req.userId));

  return res.json(
    completions.map(c => ({
      id: c.id,
      userId: c.userId,
      moduleId: c.moduleId,
      moduleTitle: c.moduleTitle ?? null,
      completedAt: c.completedAt.toISOString(),
    }))
  );
});

export default router;
