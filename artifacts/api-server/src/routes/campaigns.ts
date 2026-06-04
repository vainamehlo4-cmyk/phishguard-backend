import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { authMiddleware, adminMiddleware } from "./auth";

const router = Router();

router.get("/", authMiddleware, adminMiddleware, async (_req, res) => {
  const result = await db.execute(sql`
    SELECT c.id, c.name, c.description, c.status, c.target_department, c.scheduled_at, c.created_at,
      u.username as created_by_name,
      (SELECT COUNT(*) FROM campaign_emails ce WHERE ce.campaign_id = c.id) as email_count
    FROM phishing_campaigns c
    LEFT JOIN users u ON c.created_by_id = u.id
    ORDER BY c.created_at DESC
  `);
  return res.json(
    result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      targetDepartment: r.target_department ?? null,
      scheduledAt: r.scheduled_at,
      emailCount: parseInt(r.email_count),
      createdByName: r.created_by_name ?? null,
      createdAt: r.created_at,
    }))
  );
});

router.post("/", authMiddleware, adminMiddleware, async (req: any, res) => {
  const { name, description, targetDepartment, scheduledAt, emailIds } = req.body;
  if (!name || !scheduledAt) {
    return res.status(400).json({ error: "Name and scheduledAt are required" });
  }

  const dept = targetDepartment && targetDepartment !== "all" ? targetDepartment : null;

  const campaignResult = await db.execute(sql`
    INSERT INTO phishing_campaigns (name, description, status, target_department, scheduled_at, created_by_id)
    VALUES (${name}, ${description ?? ""}, 'scheduled', ${dept}, ${new Date(scheduledAt)}, ${req.userId})
    RETURNING *
  `);
  const campaign = campaignResult.rows[0] as any;

  if (Array.isArray(emailIds) && emailIds.length > 0) {
    for (const emailId of emailIds) {
      await db.execute(sql`
        INSERT INTO campaign_emails (campaign_id, phishing_email_id) VALUES (${campaign.id}, ${emailId})
        ON CONFLICT DO NOTHING
      `);
    }
  }

  const emailCountResult = await db.execute(sql`
    SELECT COUNT(*) as count FROM campaign_emails WHERE campaign_id = ${campaign.id}
  `);

  return res.status(201).json({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    targetDepartment: campaign.target_department ?? null,
    scheduledAt: campaign.scheduled_at,
    emailCount: parseInt((emailCountResult.rows[0] as any).count),
    createdByName: null,
    createdAt: campaign.created_at,
  });
});

router.get("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await db.execute(sql`
    SELECT c.id, c.name, c.description, c.status, c.target_department, c.scheduled_at, c.created_at,
      u.username as created_by_name,
      (SELECT COUNT(*) FROM campaign_emails ce WHERE ce.campaign_id = c.id) as email_count
    FROM phishing_campaigns c
    LEFT JOIN users u ON c.created_by_id = u.id
    WHERE c.id = ${id}
  `);
  if (!result.rows.length) return res.status(404).json({ error: "Campaign not found" });
  const r = result.rows[0] as any;
  return res.json({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    targetDepartment: r.target_department ?? null,
    scheduledAt: r.scheduled_at,
    emailCount: parseInt(r.email_count),
    createdByName: r.created_by_name ?? null,
    createdAt: r.created_at,
  });
});

router.put("/:id/launch", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await db.execute(sql`
    UPDATE phishing_campaigns SET status = 'active' WHERE id = ${id} RETURNING *
  `);
  if (!result.rows.length) return res.status(404).json({ error: "Campaign not found" });
  const r = result.rows[0] as any;
  return res.json({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    targetDepartment: r.target_department ?? null,
    scheduledAt: r.scheduled_at,
    emailCount: 0,
    createdByName: null,
    createdAt: r.created_at,
  });
});

router.put("/:id/cancel", authMiddleware, adminMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const result = await db.execute(sql`
    UPDATE phishing_campaigns SET status = 'cancelled' WHERE id = ${id} RETURNING *
  `);
  if (!result.rows.length) return res.status(404).json({ error: "Campaign not found" });
  const r = result.rows[0] as any;
  return res.json({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    targetDepartment: r.target_department ?? null,
    scheduledAt: r.scheduled_at,
    emailCount: 0,
    createdByName: null,
    createdAt: r.created_at,
  });
});

export default router;
