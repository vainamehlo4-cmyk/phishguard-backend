import express, { Request, Response } from 'express';
import cors from 'cors';
import * as sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join } from 'path';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ============ HEALTH CHECK ============
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'PhishGuard backend is running!' });
});

// ============ GET ALL USERS ============
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    const users = await db.all('SELECT id, username, email, createdAt FROM users');
    await db.close();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET USER BY ID ============
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    const user = await db.get('SELECT id, username, email, createdAt FROM users WHERE id = ?', [req.params.id]);
    await db.close();
    user ? res.json(user) : res.status(404).json({ error: 'User not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET USER QUIZ HISTORY ============
app.get('/api/users/:id/results', async (req: Request, res: Response) => {
  try {
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    const results = await db.all(
      'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    await db.close();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET USER STATS ============
app.get('/api/users/:id/stats', async (req: Request, res: Response) => {
  try {
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    const stats = await db.get(
      `SELECT 
        AVG(score) as averageScore,
        COUNT(*) as totalQuizzes,
        SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) as passedCount
      FROM quiz_results WHERE user_id = ?`,
      [req.params.id]
    );
    await db.close();
    res.json({
      averageScore: Math.round(stats.averageScore || 0),
      totalQuizzes: stats.totalQuizzes || 0,
      passedCount: stats.passedCount || 0,
      failCount: (stats.totalQuizzes || 0) - (stats.passedCount || 0)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LOGIN ============
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    await db.close();
    
    if (user) {
      res.json({ 
        user: { id: user.id, username: user.username, email: user.email },
        token: 'fake-jwt-token'
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SAVE QUIZ RESULT ============
app.post('/api/quiz/submit', async (req: Request, res: Response) => {
  try {
    const { userId, quizId, answers } = req.body;
    const totalQuestions = answers.length;
    const correctCount = answers.filter((a: any) => a.isCorrect).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70 ? 1 : 0;

    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    await db.run(
      `INSERT INTO quiz_results (user_id, quiz_id, score, passed, answers)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, quizId, score, passed, JSON.stringify(answers)]
    );
    await db.close();
    res.json({ success: true, score, passed: passed === 1 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REGISTER NEW USER ============
app.post('/api/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const db = await open({
      filename: join(process.cwd(), 'phishguard.db'),
      driver: sqlite3.Database
    });
    await db.run(
      'INSERT INTO users (username, email, passwordHash) VALUES (?, ?, ?)',
      [username, email, password]
    );
    await db.close();
    res.json({ success: true, message: 'User created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ START SERVER ============
app.listen(port, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`🚀 PHISHGUARD BACKEND IS RUNNING!`);
  console.log(`🚀 ========================================`);
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`💚 Health: http://localhost:${port}/health`);
  console.log(`👥 Users:  http://localhost:${port}/api/users`);
  console.log(`========================================\n`);
});