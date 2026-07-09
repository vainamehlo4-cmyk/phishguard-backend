import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";

const router = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "phishguard-secret-key";

type UserRecord = {
  id: number;
  username: string;
  email: string;
  passwordHash?: string | null;
  password_hash?: string | null;
  role?: string | null;
  department?: string | null;
  createdAt?: Date | string | null;
  created_at?: Date | string | null;
};

function normalizeUser(row: UserRecord | undefined) {
  if (!row) {
    return null;
  }

  const passwordHash = (row.passwordHash ?? row.password_hash ?? "") as string;
  const createdAtValue = row.createdAt ?? row.created_at;

  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash,
    role: String(row.role ?? "user"),
    department: (row.department as string | null) ?? null,
    createdAt: createdAtValue ? new Date(createdAtValue as string | Date) : new Date(),
  };
}

async function findUserByUsername(username: string) {
  const { rows } = await pool.query<UserRecord>("SELECT * FROM users WHERE username = $1 LIMIT 1", [username]);
  return normalizeUser(rows[0]);
}

async function findUserById(id: number) {
  const { rows } = await pool.query<UserRecord>("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
  return normalizeUser(rows[0]);
}

async function getPasswordColumnName() {
  const { rows } = await pool.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'users' AND column_name IN ('password_hash', 'passwordHash')
     ORDER BY column_name ASC
     LIMIT 1`,
  );

  return rows[0]?.column_name ?? "password_hash";
}

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

  try {
    const user = await findUserByUsername(username);
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
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({ error: "Unable to sign in right now" });
  }
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

  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 10);
    const passwordColumn = await getPasswordColumnName();
    await pool.query(`UPDATE users SET ${passwordColumn} = $1 WHERE id = $2`, [newHash, req.userId]);
    return res.json({ success: true });
  } catch (error) {
    console.error("Change password failed", error);
    return res.status(500).json({ error: "Unable to change password right now" });
  }
});

router.get("/me", authMiddleware, async (req: any, res) => {
  try {
    const user = await findUserById(req.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    return res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department ?? null,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Get current user failed", error);
    return res.status(500).json({ error: "Unable to load user profile right now" });
  }
});

export default router;
