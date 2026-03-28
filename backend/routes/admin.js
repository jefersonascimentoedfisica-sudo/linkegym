// ══════════════════════════════════════════════════
// LINKEGYM — ROTAS ADMIN
// ══════════════════════════════════════════════════
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { saveToFile } from '../db.js';
import { authenticate } from './auth.js';

const router = express.Router();

// ── Middleware: só admins ─────────────────────────
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  next();
}

// ── GET /api/admin/users ──────────────────────────
router.get('/users', authenticate, adminOnly, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/users ─────────────────────────
router.post('/users', authenticate, adminOnly, async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!name || !email || !phone || !password || !role) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'E-mail já cadastrado.' });

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const now = Math.floor(Date.now() / 1000);
  db.prepare('INSERT INTO users (id, name, email, phone, password, role, email_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)')
    .run(id, name, email, phone, hash, role, now);
  saveToFile();
  res.json({ user: { id, name, email, phone, role } });
});

// ── PUT /api/admin/users/:id/block ────────────────
router.put('/users/:id/block', authenticate, adminOnly, (req, res) => {
  const { locked } = req.body;
  const until = locked ? Math.floor(Date.now() / 1000) + 99999999 : null;
  db.prepare('UPDATE users SET locked_until = ? WHERE id = ?').run(until, req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── PUT /api/admin/users/:id/verify ──────────────
router.put('/users/:id/verify', authenticate, adminOnly, (req, res) => {
  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── DELETE /api/admin/users/:id ──────────────────
router.delete('/users/:id', authenticate, adminOnly, (req, res) => {
  db.prepare('DELETE FROM trainers WHERE user_id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── GET /api/admin/trainers ───────────────────────
router.get('/trainers', authenticate, adminOnly, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT t.*, u.name, u.email, u.phone, u.email_verified
      FROM trainers t
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY t.created_at DESC
    `).all();
    res.json({ trainers: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/admin/trainer-profile ──────────────
// Cria perfil trainer para usuário existente (ex: admin que também é personal)
router.post('/trainer-profile', authenticate, adminOnly, (req, res) => {
  const { user_id, cref, bio, specialty, price, plan, city, neighborhood } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id obrigatório.' });

  const existing = db.prepare('SELECT id FROM trainers WHERE user_id = ?').get(user_id);
  if (existing) return res.status(409).json({ error: 'Perfil de trainer já existe para este usuário.' });

  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  db.prepare(`
    INSERT INTO trainers (id, user_id, cref, bio, specialty, price, plan, rating, total_sessions, active, city, neighborhood, cref_verified, trainer_status, created_at)
    VALUES (?,?,?,?,?,?,?,5.0,0,1,?,?,1,'verified',?)
  `).run(id, user_id, cref || '', bio || '', specialty || '', Number(price) || 0, plan || 'elite', city || '', neighborhood || '', now);
  saveToFile();
  res.json({ ok: true, trainer_id: id });
});

// ── PUT /api/admin/trainers/:id/plan ─────────────
router.put('/trainers/:id/plan', authenticate, adminOnly, (req, res) => {
  const { plan } = req.body;
  if (!['free','pro','elite'].includes(plan)) {
    return res.status(400).json({ error: 'Plano inválido.' });
  }
  db.prepare('UPDATE trainers SET plan = ? WHERE id = ?').run(plan, req.params.id);
  saveToFile();
  res.json({ ok: true, plan });
});

// ── PUT /api/admin/trainers/:id/cref ─────────────
router.put('/trainers/:id/cref', authenticate, adminOnly, (req, res) => {
  const { cref_verified } = req.body;
  db.prepare('UPDATE trainers SET cref_verified = ? WHERE id = ?').run(cref_verified ? 1 : 0, req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── PUT /api/admin/trainers/:id/active ───────────
router.put('/trainers/:id/active', authenticate, adminOnly, (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE trainers SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── GET /api/admin/sessions ───────────────────────
router.get('/sessions', authenticate, adminOnly, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT s.*,
        us.name AS student_name,
        ut.name AS trainer_name
      FROM sessions s
      LEFT JOIN users us ON us.id = s.student_id
      LEFT JOIN trainers tr ON tr.id = s.trainer_id
      LEFT JOIN users ut ON ut.id = tr.user_id
      ORDER BY s.created_at DESC
      LIMIT 200
    `).all();
    res.json({ sessions: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/admin/sessions/:id/status ───────────
router.put('/sessions/:id/status', authenticate, adminOnly, (req, res) => {
  const { status } = req.body;
  const valid = ['pending','confirmed','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Status inválido.' });
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── GET /api/admin/payments ───────────────────────
router.get('/payments', authenticate, adminOnly, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*,
        s.date AS session_date, s.time AS session_time,
        us.name AS student_name, ut.name AS trainer_name
      FROM payments p
      LEFT JOIN sessions s ON s.id = p.session_id
      LEFT JOIN users us ON us.id = s.student_id
      LEFT JOIN trainers tr ON tr.id = s.trainer_id
      LEFT JOIN users ut ON ut.id = tr.user_id
      ORDER BY p.created_at DESC
      LIMIT 500
    `).all();
    res.json({ payments: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/admin/payments/:id/refund ───────────
router.put('/payments/:id/refund', authenticate, adminOnly, (req, res) => {
  db.prepare("UPDATE payments SET status = 'refunded' WHERE id = ?").run(req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── GET /api/admin/transfers ──────────────────────
router.get('/transfers', authenticate, adminOnly, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT tr.*, u.name AS trainer_name
      FROM transfers tr
      LEFT JOIN trainers t ON t.id = tr.trainer_id
      LEFT JOIN users u ON u.id = t.user_id
      ORDER BY tr.created_at DESC
      LIMIT 200
    `).all();
    res.json({ transfers: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/admin/transfers/:id/process ─────────
router.put('/transfers/:id/process', authenticate, adminOnly, (req, res) => {
  db.prepare("UPDATE transfers SET status = 'completed' WHERE id = ?").run(req.params.id);
  saveToFile();
  res.json({ ok: true });
});

// ── GET /api/admin/stats ──────────────────────────
router.get('/stats', authenticate, adminOnly, (req, res) => {
  try {
    const totalUsers    = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    const totalTrainers = db.prepare("SELECT COUNT(*) AS c FROM trainers WHERE active = 1").get().c;
    const totalSessions = db.prepare("SELECT COUNT(*) AS c FROM sessions").get().c;
    const totalRevenue  = db.prepare("SELECT SUM(amount) AS s FROM payments WHERE status = 'approved'").get().s || 0;
    const totalFees     = db.prepare("SELECT SUM(platform_fee) AS s FROM payments WHERE status = 'approved'").get().s || 0;
    const pendingPay    = db.prepare("SELECT COUNT(*) AS c FROM payments WHERE status = 'pending'").get().c;
    res.json({ totalUsers, totalTrainers, totalSessions, totalRevenue, totalFees, pendingPay });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
