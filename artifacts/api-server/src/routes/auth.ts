import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "phishguard-secret-key";

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
}

export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function adminMiddleware(req: any, res: any, next: any) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  return res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/logout", (_req, res) => {
  return res.json({ success: true });
});

router.put("/change-password", authMiddleware, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword required" });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters" });
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId));
  return res.json({ success: true });
});

router.get("/me", authMiddleware, async (req: any, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId));
  if (!user) return res.status(401).json({ error: "User not found" });
  return res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    department: user.department ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
