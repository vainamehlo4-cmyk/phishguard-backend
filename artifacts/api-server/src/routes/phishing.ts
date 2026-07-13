import { Router } from "express";
import { db, pool } from "@workspace/db";
import { phishingEmailsTable, phishingActionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router = Router();

router.get("/emails", authMiddleware, async (req: any, res) => {
  const emails = await db.select().from(phishingEmailsTable).orderBy(phishingEmailsTable.sentAt);
  const myActions = await db
    .select()
    .from(phishingActionsTable)
    .where(eq(phishingActionsTable.userId, req.userId));

  const actionMap = new Map(myActions.map(a => [a.phishingEmailId, a.action]));

  const result = emails.map(e => ({
    id: e.id,
    subject: e.subject,
    sender: e.sender,
    previewText: e.previewText,
    body: e.body,
    difficulty: e.difficulty,
    sentAt: e.sentAt.toISOString(),
    myAction: actionMap.get(e.id) ?? null,
  }));

  return res.json(result);
});

router.post("/emails", authMiddleware, adminMiddleware, async (req: any, res) => {
  const { subject, sender, previewText, body, difficulty } = req.body;
  if (!subject || !sender || !previewText || !body) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const [email] = await db
    .insert(phishingEmailsTable)
    .values({ subject, sender, previewText, body, difficulty: difficulty ?? "medium", createdById: req.userId })
    .returning();
  return res.status(201).json({
    id: email.id,
    subject: email.subject,
    sender: email.sender,
    previewText: email.previewText,
    body: email.body,
    difficulty: email.difficulty,
    sentAt: email.sentAt.toISOString(),
    myAction: null,
  });
});

router.post("/emails/:id/action", authMiddleware, async (req: any, res) => {
  const emailId = parseInt(req.params.id);
  if (isNaN(emailId)) return res.status(400).json({ error: "Invalid id" });

  const { action } = req.body;
  if (!["click", "report", "ignore"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" });
  }

  const [email] = await db.select().from(phishingEmailsTable).where(eq(phishingEmailsTable.id, emailId));
  if (!email) return res.status(404).json({ error: "Email not found" });

  const [existing] = await db
    .select()
    .from(phishingActionsTable)
    .where(
      and(
        eq(phishingActionsTable.userId, req.userId),
        eq(phishingActionsTable.phishingEmailId, emailId)
      )
    );

  if (existing) {
    const [updated] = await db
      .update(phishingActionsTable)
      .set({ action })
      .where(eq(phishingActionsTable.id, existing.id))
      .returning();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
    return res.json({
      id: updated.id,
      userId: updated.userId,
      username: user?.username ?? null,
      phishingEmailId: updated.phishingEmailId,
      emailSubject: email.subject,
      action: updated.action,
      createdAt: updated.createdAt.toISOString(),
    });
  }

  const [newAction] = await db
    .insert(phishingActionsTable)
    .values({ userId: req.userId, phishingEmailId: emailId, action })
    .returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  return res.json({
    id: newAction.id,
    userId: newAction.userId,
    username: user?.username ?? null,
    phishingEmailId: newAction.phishingEmailId,
    emailSubject: email.subject,
    action: newAction.action,
    createdAt: newAction.createdAt.toISOString(),
  });
});

router.get("/actions", authMiddleware, adminMiddleware, async (_req, res) => {
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
    .leftJoin(phishingEmailsTable, eq(phishingActionsTable.phishingEmailId, phishingEmailsTable.id))
    .orderBy(phishingActionsTable.createdAt);

  return res.json(
    actions.map(a => ({
      id: a.id,
      userId: a.userId,
      username: a.username ?? null,
      phishingEmailId: a.phishingEmailId,
      emailSubject: a.emailSubject ?? null,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.get("/my-actions", authMiddleware, async (req: any, res) => {
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
    .leftJoin(phishingEmailsTable, eq(phishingActionsTable.phishingEmailId, phishingEmailsTable.id))
    .where(eq(phishingActionsTable.userId, req.userId))
    .orderBy(phishingActionsTable.createdAt);

  return res.json(
    actions.map(a => ({
      id: a.id,
      userId: a.userId,
      username: a.username ?? null,
      phishingEmailId: a.phishingEmailId,
      emailSubject: a.emailSubject ?? null,
      action: a.action,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

// Submit quiz results
router.post('/submit-quiz', authMiddleware, async (req: any, res) => {
  const { score, totalQuestions, answers } = req.body;
  const userId = req.userId;

  if (!score || !totalQuestions) {
    return res.status(400).json({ error: 'Missing score or totalQuestions' });
  }

  try {
    // Use the pool from @workspace/db (we need to import it)
    const { pool } = await import('@workspace/db');
    await pool.query(
      `INSERT INTO quiz_results (user_id, score, total_questions, answers, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, score, totalQuestions, answers ? JSON.stringify(answers) : null]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Error saving quiz:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
