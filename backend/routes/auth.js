// ══════════════════════════════════════════════════
// LINKEGYM — AUTENTICAÇÃO (Nível Uber)
// ══════════════════════════════════════════════════
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { enviarOTPEmail } from '../services/mailer.js';

const router = express.Router();
const JWT_SECRET    = process.env.JWT_SECRET || 'linkegym_secret';
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MIN   = 15;
const OTP_EXPIRE_MIN = 10;

// ── Rate limiting por IP (in-memory) ─────────────────────────────────────────
const ipMap = new Map(); // ip → { count, resetAt }
function ipAllowed(ip) {
  const now = Date.now();
  const d = ipMap.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > d.resetAt) { d.count = 0; d.resetAt = now + 60_000; }
  d.count++;
  ipMap.set(ip, d);
  return d.count <= 30; // max 30 req/min por IP
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeAccess(u) {
  return jwt.sign(
    { id: u.id, email: u.email, role: u.role, name: u.name },
    JWT_SECRET, { expiresIn: '2h' }
  );
}
function makeRefresh(u) {
  return jwt.sign(
    { id: u.id, email: u.email, role: u.role, name: u.name, type: 'refresh' },
    JWT_SECRET, { expiresIn: '30d' }
  );
}
function makeOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function validCREF(c) {
  return /^\d{4,6}-[A-Z]{1,2}\/[A-Z]{2}$/.test((c || '').trim().toUpperCase());
}
function passStrong(p) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
}

// ── CADASTRO ──────────────────────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', (req, res) => {
  const {
    name, email, phone, password, role = 'student',
    cref, specialty, bio, price,
    address_cep, address_street, address_num,
    address_neighborhood, address_city, address_state
  } = req.body;

  // Validações
  if (!name?.trim() || !email || !password || !phone)
    return res.status(400).json({ error: 'Nome, e-mail, telefone e senha são obrigatórios.' });
  if (!passStrong(password))
    return res.status(400).json({ error: 'Senha precisa ter mínimo 8 caracteres, 1 letra maiúscula e 1 número.' });

  const emailClean = email.toLowerCase().trim();
  const phoneClean = phone.replace(/\D/g, '');
  if (phoneClean.length < 10)
    return res.status(400).json({ error: 'Telefone inválido. Informe DDD + número.' });

  if (role === 'trainer' && !validCREF(cref))
    return res.status(400).json({ error: 'CREF inválido. Formato esperado: 123456-G/SP' });

  if (db.prepare('SELECT id FROM users WHERE email = ?').get(emailClean))
    return res.status(409).json({ error: 'E-mail já cadastrado.' });
  if (db.prepare('SELECT id FROM users WHERE phone = ?').get(phoneClean))
    return res.status(409).json({ error: 'Este telefone já está vinculado a outra conta.' });

  const id   = uuidv4();
  const hash = bcrypt.hashSync(password, 12);
  const otp  = makeOTP();
  const otpExp = Date.now() + OTP_EXPIRE_MIN * 60_000;

  db.prepare(`
    INSERT INTO users
      (id, name, email, phone, password, role, otp_code, otp_expires,
       email_verified, login_attempts,
       address_cep, address_street, address_num,
       address_neighborhood, address_city, address_state)
    VALUES (?,?,?,?,?,?,?,?,0,0,?,?,?,?,?,?)
  `).run(
    id, name.trim(), emailClean, phoneClean, hash, role, otp, otpExp,
    address_cep || '', address_street || '', address_num || '',
    address_neighborhood || '', address_city || '', address_state || ''
  );

  if (role === 'trainer') {
    db.prepare(`
      INSERT INTO trainers (id, user_id, cref, bio, specialty, price, trainer_status)
      VALUES (?,?,?,?,?,?,'pending')
    `).run(uuidv4(), id, cref.trim().toUpperCase(), bio || '', specialty || '', Number(price) || 0);
  }

  // Envia OTP por e-mail
  enviarOTPEmail(emailClean, name.trim(), otp).catch(e => console.warn('OTP email:', e.message));

  const user = { id, name: name.trim(), email: emailClean, phone: phoneClean, role, email_verified: 0 };
  res.status(201).json({
    token: makeAccess(user),
    refresh_token: makeRefresh(user),
    user,
    otp_pending: true,
    // Mostrar OTP apenas em desenvolvimento
    ...(process.env.NODE_ENV !== 'production' ? { _dev_otp: otp } : {})
  });
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  if (!ipAllowed(ip))
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' });

  const { email, password, remember_me } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user)
    return res.status(401).json({ error: 'E-mail ou senha incorretos.', field: 'email' });

  // Conta bloqueada?
  if (user.locked_until && Date.now() < user.locked_until) {
    const mins = Math.ceil((user.locked_until - Date.now()) / 60_000);
    return res.status(423).json({
      error: `Conta bloqueada. Tente novamente em ${mins} minuto${mins > 1 ? 's' : ''}.`,
      locked_until: user.locked_until,
      minutes_remaining: mins
    });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    const attempts = (user.login_attempts || 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MIN * 60_000 : null;
    db.prepare('UPDATE users SET login_attempts=?, locked_until=? WHERE id=?').run(attempts, lock, user.id);

    if (lock) {
      return res.status(423).json({
        error: `Conta bloqueada por ${LOCKOUT_MIN} minutos após ${MAX_ATTEMPTS} tentativas incorretas.`,
        locked_until: lock,
        minutes_remaining: LOCKOUT_MIN
      });
    }
    return res.status(401).json({
      error: 'E-mail ou senha incorretos.',
      attempts_remaining: MAX_ATTEMPTS - attempts,
      field: 'password'
    });
  }

  // Sucesso — zera tentativas
  db.prepare('UPDATE users SET login_attempts=0, locked_until=NULL WHERE id=?').run(user.id);

  const { password: _, otp_code, otp_expires, locked_until, logged_out_at, ...safe } = user;
  res.json({
    token:         makeAccess(safe),
    refresh_token: remember_me ? makeRefresh(safe) : undefined,
    user: safe
  });
});

// ── REFRESH TOKEN ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token obrigatório.' });
  try {
    const p = jwt.verify(refresh_token, JWT_SECRET);
    if (p.type !== 'refresh') throw new Error('not refresh');

    // Verifica se conta não foi deslogada após emissão do token
    const user = db.prepare('SELECT id, name, email, phone, role, email_verified, logged_out_at FROM users WHERE id = ?').get(p.id);
    if (!user) return res.status(401).json({ error: 'Conta não encontrada.' });
    if (user.logged_out_at && p.iat * 1000 < user.logged_out_at)
      return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });

    // Rotaciona tokens
    res.json({
      token:         makeAccess(user),
      refresh_token: makeRefresh(user),
      user
    });
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  db.prepare('UPDATE users SET logged_out_at=? WHERE id=?').run(Date.now(), req.user.id);
  res.json({ success: true });
});

// ── VERIFICAR OTP ─────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
router.post('/verify-otp', authenticate, (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'Código obrigatório.' });

  const user = db.prepare('SELECT id, otp_code, otp_expires, email_verified FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (user.email_verified) return res.json({ success: true, already_verified: true });

  if (!user.otp_code || user.otp_code !== otp.trim())
    return res.status(400).json({ error: 'Código incorreto. Verifique e tente novamente.' });
  if (Date.now() > user.otp_expires)
    return res.status(400).json({ error: 'Código expirado. Solicite um novo código.' });

  db.prepare('UPDATE users SET email_verified=1, otp_code=NULL, otp_expires=NULL WHERE id=?').run(user.id);
  res.json({ success: true, message: 'E-mail verificado com sucesso!' });
});

// ── REENVIAR OTP ──────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
router.post('/resend-otp', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, name, email, email_verified, otp_expires FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (user.email_verified) return res.json({ success: true, already_verified: true });

  // Anti-spam: não reenviar se OTP ainda válido por > 7 min
  if (user.otp_expires && (user.otp_expires - Date.now()) > 7 * 60_000)
    return res.status(429).json({ error: 'Aguarde antes de solicitar um novo código.' });

  const otp = makeOTP();
  const otpExp = Date.now() + OTP_EXPIRE_MIN * 60_000;
  db.prepare('UPDATE users SET otp_code=?, otp_expires=? WHERE id=?').run(otp, otpExp, user.id);

  enviarOTPEmail(user.email, user.name, otp).catch(e => console.warn('Resend OTP email:', e.message));

  res.json({
    success: true,
    message: 'Novo código enviado para seu e-mail.',
    ...(process.env.NODE_ENV !== 'production' ? { _dev_otp: otp } : {})
  });
});

// ── PERFIL ────────────────────────────────────────────────────────────────────
// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, email, phone, role, avatar, email_verified,
           address_cep, address_street, address_num,
           address_neighborhood, address_city, address_state
    FROM users WHERE id = ?
  `).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(user);
});

// ── ATUALIZAR PERFIL ──────────────────────────────────────────────────────────
// PATCH /api/auth/profile
router.patch('/profile', authenticate, (req, res) => {
  const { name, phone, address_cep, address_street, address_num, address_neighborhood, address_city, address_state } = req.body;
  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      address_cep = COALESCE(?, address_cep),
      address_street = COALESCE(?, address_street),
      address_num = COALESCE(?, address_num),
      address_neighborhood = COALESCE(?, address_neighborhood),
      address_city = COALESCE(?, address_city),
      address_state = COALESCE(?, address_state)
    WHERE id = ?
  `).run(name, phone, address_cep, address_street, address_num, address_neighborhood, address_city, address_state, req.user.id);
  res.json({ success: true });
});

// ── TRAINERS PENDENTES (Admin) ────────────────────────────────────────────────
// GET /api/auth/trainers/pending
router.get('/trainers/pending', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  const trainers = db.prepare(`
    SELECT t.id, t.cref, t.cref_verified, t.trainer_status, t.specialty, t.price, t.bio,
           u.name, u.email, u.phone, u.created_at
    FROM trainers t
    JOIN users u ON u.id = t.user_id
    ORDER BY u.created_at DESC
  `).all();
  res.json(trainers);
});

// ── VERIFICAR PERSONAL (Admin) ────────────────────────────────────────────────
// PATCH /api/auth/trainers/:id/verify
router.patch('/trainers/:id/verify', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado.' });
  const { action } = req.body; // 'approve' | 'reject'
  const status = action === 'approve' ? 'verified' : 'rejected';
  const verified = action === 'approve' ? 1 : 0;
  db.prepare('UPDATE trainers SET trainer_status=?, cref_verified=? WHERE id=?')
    .run(status, verified, req.params.id);
  res.json({ success: true, status });
});

// ── PERFIL COMPLETO DO TRAINER LOGADO ─────────────────────────────────────────
// GET /api/auth/trainer-profile
router.get('/trainer-profile', authenticate, (req, res) => {
  if (req.user.role !== 'trainer' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Apenas trainers.' });

  const row = db.prepare(`
    SELECT t.id as trainer_id, t.cref, t.cref_verified, t.trainer_status,
           t.bio, t.specialty, t.price, t.plan, t.rating, t.total_sessions,
           t.city, t.neighborhood,
           u.name, u.email, u.phone,
           u.address_neighborhood, u.address_city, u.address_state
    FROM trainers t JOIN users u ON u.id = t.user_id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!row) return res.status(404).json({ error: 'Perfil não encontrado. Complete seu cadastro.' });

  const sc = db.prepare('SELECT COUNT(DISTINCT student_id) as c FROM sessions WHERE trainer_id = ?').get(row.trainer_id);
  const rv = db.prepare(`
    SELECT r.rating, r.comment, r.created_at, u.name as reviewer_name
    FROM reviews r JOIN users u ON u.id = r.reviewer_id
    WHERE r.reviewed_id = ?
    ORDER BY r.created_at DESC LIMIT 20
  `).all(row.trainer_id);

  res.json({ ...row, student_count: sc?.c || 0, reviews: rv });
});

// ── BUSCA PÚBLICA DE TRAINERS ──────────────────────────────────────────────────
// GET /api/auth/trainers/search  ← MUST be before /:id/public to avoid param collision
router.get('/trainers/search', (req, res) => {
  const { q, specialty, city, neighborhood, min_price, max_price, sort = 'rating', limit = 20, offset = 0 } = req.query;

  let sql = `
    SELECT t.id as trainer_id, t.cref, t.cref_verified, t.bio, t.specialty,
           t.price, t.plan, t.rating, t.total_sessions,
           t.city, t.neighborhood, u.name, u.phone,
           (SELECT COUNT(DISTINCT student_id) FROM sessions WHERE trainer_id = t.id) as student_count,
           (SELECT COUNT(*) FROM reviews WHERE reviewed_id = t.id) as review_count
    FROM trainers t
    JOIN users u ON u.id = t.user_id
    WHERE t.active = 1
  `;
  const params = [];

  if (q) {
    sql += ` AND (u.name LIKE ? OR t.specialty LIKE ? OR t.bio LIKE ? OR t.neighborhood LIKE ?)`;
    const qp = `%${q}%`;
    params.push(qp, qp, qp, qp);
  }
  if (specialty) {
    sql += ` AND t.specialty LIKE ?`;
    params.push(`%${specialty}%`);
  }
  if (city) {
    sql += ` AND (t.city LIKE ? OR u.address_city LIKE ?)`;
    params.push(`%${city}%`, `%${city}%`);
  }
  if (neighborhood) {
    sql += ` AND (t.neighborhood LIKE ? OR u.address_neighborhood LIKE ?)`;
    params.push(`%${neighborhood}%`, `%${neighborhood}%`);
  }
  if (min_price) { sql += ` AND t.price >= ?`; params.push(Number(min_price)); }
  if (max_price) { sql += ` AND t.price <= ?`; params.push(Number(max_price)); }

  const orderMap = { rating: 't.rating DESC', price_asc: 't.price ASC', price_desc: 't.price DESC', sessions: 't.total_sessions DESC' };
  // Plan priority: elite > premium > pro > free
  sql += ` ORDER BY CASE t.plan WHEN 'elite' THEN 0 WHEN 'premium' THEN 1 WHEN 'pro' THEN 2 ELSE 3 END ASC, ${orderMap[sort] || 't.rating DESC'} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(sql).all(...params);

  // Get total count for pagination
  let countSql = `SELECT COUNT(*) as total FROM trainers t JOIN users u ON u.id = t.user_id WHERE t.active = 1`;
  const total = db.prepare(countSql).get()?.total || rows.length;

  res.json({ trainers: rows, total, limit: Number(limit), offset: Number(offset) });
});

// ── PERFIL PÚBLICO DE TRAINER ──────────────────────────────────────────────────
// GET /api/auth/trainers/:id/public  ← AFTER search to avoid param collision
router.get('/trainers/:id/public', (req, res) => {
  const row = db.prepare(`
    SELECT t.id as trainer_id, t.cref, t.cref_verified, t.bio, t.specialty,
           t.price, t.plan, t.rating, t.total_sessions, t.city, t.neighborhood,
           u.name, u.phone
    FROM trainers t JOIN users u ON u.id = t.user_id
    WHERE t.id = ? AND t.active = 1
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Trainer não encontrado.' });
  const sc = db.prepare('SELECT COUNT(DISTINCT student_id) as c FROM sessions WHERE trainer_id = ?').get(req.params.id);
  const rv = db.prepare(`
    SELECT r.rating, r.comment, r.created_at, u.name as reviewer_name
    FROM reviews r JOIN users u ON u.id = r.reviewer_id
    WHERE r.reviewed_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(req.params.id);
  res.json({ ...row, student_count: sc?.c || 0, reviews: rv });
});

// ── MIDDLEWARES ───────────────────────────────────────────────────────────────
export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido.' });
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET);
    if (p.type === 'refresh') throw new Error('use access token');

    // Verificar revogação
    const u = db.prepare('SELECT logged_out_at FROM users WHERE id = ?').get(p.id);
    if (u?.logged_out_at && p.iat * 1000 < u.logged_out_at)
      return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });

    req.user = p;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  next();
}

export default router;
