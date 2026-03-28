// ══════════════════════════════════════════════════
// LINKEGYM — BANCO DE DADOS (sql.js — puro JS)
// ══════════════════════════════════════════════════
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, process.env.DB_PATH || './linkegym.db.json');

// sql.js usa memória + persiste em arquivo JSON
let _db = null;
let _SQL = null;

// ── INICIALIZAR ────────────────────────────────────────────────────────────
async function getDb() {
  if (_db) return _db;
  _SQL = await initSqlJs();

  // Carregar ou criar banco (ordem correta: tabelas antes dos dados)
  _db = new _SQL.Database();
  createTables();
  migrateColumns();
  loadFromFile();
  seedAdmin();
  return _db;
}

function loadFromFile() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      // Reconstruct from stored rows
      _db.run('BEGIN');
      for (const [table, rows] of Object.entries(data)) {
        if (!Array.isArray(rows) || !rows.length) continue;
        const cols = Object.keys(rows[0]);
        for (const row of rows) {
          const vals = cols.map(c => row[c]);
          _db.run(
            `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`,
            vals
          );
        }
      }
      _db.run('COMMIT');
    } catch(e) { console.warn('DB load warning:', e.message); }
  }
}

// Persistir para arquivo após cada escrita
export function saveToFile() {
  try {
    const tables = ['users','trainers','sessions','payments','transfers','reviews','workouts','mural_photos','stories'];
    const data = {};
    for (const t of tables) {
      try {
        const res = _db.exec(`SELECT * FROM ${t}`);
        if (res.length) {
          data[t] = res[0].values.map(row => {
            const obj = {};
            res[0].columns.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
          });
        } else { data[t] = []; }
      } catch { data[t] = []; }
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch(e) { console.error('DB save error:', e.message); }
}

function createTables() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      phone TEXT, password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student','trainer','admin')),
      avatar TEXT, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS trainers (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      cref TEXT, bio TEXT, specialty TEXT, price REAL NOT NULL DEFAULT 0,
      plan TEXT DEFAULT 'free', rating REAL DEFAULT 5.0,
      total_sessions INTEGER DEFAULT 0, city TEXT, neighborhood TEXT,
      active INTEGER DEFAULT 1, created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, trainer_id TEXT NOT NULL,
      date TEXT NOT NULL, time TEXT NOT NULL, duration INTEGER NOT NULL DEFAULT 60,
      location TEXT, price REAL NOT NULL, platform_fee REAL NOT NULL DEFAULT 0,
      trainer_receives REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'pending', notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      mp_payment_id TEXT, mp_preference_id TEXT,
      amount REAL NOT NULL, platform_fee REAL NOT NULL DEFAULT 0,
      trainer_amount REAL NOT NULL DEFAULT 0, method TEXT,
      status TEXT DEFAULT 'pending',
      pix_qr_code TEXT, pix_qr_code_base64 TEXT, paid_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY, payment_id TEXT NOT NULL, trainer_id TEXT NOT NULL,
      amount REAL NOT NULL, status TEXT DEFAULT 'pending', notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL, reviewed_id TEXT NOT NULL,
      rating INTEGER NOT NULL, comment TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
    );
  `);
}

function migrateColumns() {
  const cols = [
    `ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN otp_code TEXT`,
    `ALTER TABLE users ADD COLUMN otp_expires INTEGER`,
    `ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0`,
    `ALTER TABLE users ADD COLUMN locked_until INTEGER`,
    `ALTER TABLE users ADD COLUMN logged_out_at INTEGER`,
    `ALTER TABLE users ADD COLUMN address_cep TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN address_street TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN address_num TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN address_neighborhood TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN address_city TEXT DEFAULT ''`,
    `ALTER TABLE users ADD COLUMN address_state TEXT DEFAULT ''`,
    `ALTER TABLE trainers ADD COLUMN cref_verified INTEGER DEFAULT 0`,
    `ALTER TABLE trainers ADD COLUMN trainer_status TEXT DEFAULT 'pending'`,
  ];
  for (const sql of cols) {
    try { _db.run(sql); } catch {} // Column already exists → skip
  }
}

function seedAdmin() {
  const ADMIN_EMAIL    = 'jefersonascimento.edfisica@gmail.com';
  const ADMIN_PASSWORD = 'amd471138Matriula';
  const ADMIN_NAME     = 'Jeferson Nascimento';

  // Verifica se já existe admin com o e-mail correto
  const existing = _db.exec(`SELECT id FROM users WHERE email='${ADMIN_EMAIL}' LIMIT 1`);
  if (!existing.length || !existing[0].values.length) {
    // Remove admin antigo (e-mail padrão) se houver
    _db.run("DELETE FROM users WHERE email='admin@linkegymbrasil.com.br'");

    const adminId = uuidv4();
    const hash    = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    _db.run(
      "INSERT INTO users (id,name,email,phone,password,role,email_verified) VALUES (?,?,?,?,?,?,?)",
      [adminId, ADMIN_NAME, ADMIN_EMAIL, '11999999999', hash, 'admin', 1]
    );
    saveToFile();
    console.log(`✅ Admin criado: ${ADMIN_EMAIL}`);
  } else {
    // Garante que a senha está atualizada
    const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    _db.run(`UPDATE users SET password=?, name=?, role='admin', email_verified=1 WHERE email=?`,
      [hash, ADMIN_NAME, ADMIN_EMAIL]);
    saveToFile();
    console.log(`✅ Admin atualizado: ${ADMIN_EMAIL}`);
  }

  // Conta personal elite (mesmo dono, e-mail com +personal para separar login)
  const TRAINER_EMAIL    = 'jefersonascimento.edfisica+personal@gmail.com';
  const TRAINER_PASSWORD = '471138Matricula';

  const trainerUser = _db.exec(`SELECT id FROM users WHERE email='${TRAINER_EMAIL}' LIMIT 1`);
  if (!trainerUser.length || !trainerUser[0].values.length) {
    const trainerId  = uuidv4();
    const trainerHash = bcrypt.hashSync(TRAINER_PASSWORD, 10);
    _db.run(
      "INSERT INTO users (id,name,email,phone,password,role,email_verified) VALUES (?,?,?,?,?,?,?)",
      [trainerId, ADMIN_NAME, TRAINER_EMAIL, '11999999999', trainerHash, 'trainer', 1]
    );
    // Cria perfil de personal Elite
    _db.run(
      "INSERT INTO trainers (id,user_id,cref,bio,specialty,price,plan,rating,total_sessions,active) VALUES (?,?,?,?,?,?,?,?,?,?)",
      [uuidv4(), trainerId, 'CREF-ELITE', 'Personal Trainer Fundador da LinkeGym.', 'Musculação,Funcional,Emagrecimento', 150, 'elite', 5.0, 0, 1]
    );
    saveToFile();
    console.log(`✅ Personal Elite criado: ${TRAINER_EMAIL}`);
  } else {
    const trainerHash = bcrypt.hashSync(TRAINER_PASSWORD, 10);
    _db.run(`UPDATE users SET password=?, name=?, email_verified=1 WHERE email=?`,
      [trainerHash, ADMIN_NAME, TRAINER_EMAIL]);
    saveToFile();
    console.log(`✅ Personal Elite atualizado: ${TRAINER_EMAIL}`);
  }
}

// ── API SIMPLES (compatível com o código existente) ─────────────────────────
class DbWrapper {
  constructor() { this._init = getDb(); }

  async ready() { return this._init; }

  prepare(sql) {
    const self = this;
    return {
      get: (...args) => {
        const params = args.flat();
        try {
          const res = _db.exec(sql, params);
          if (!res.length || !res[0].values.length) return undefined;
          const obj = {};
          res[0].columns.forEach((col, i) => { obj[col] = res[0].values[0][i]; });
          return obj;
        } catch(e) { console.error('DB get error:', sql, e.message); return undefined; }
      },
      all: (...args) => {
        const params = args.flat();
        try {
          const res = _db.exec(sql, params);
          if (!res.length) return [];
          return res[0].values.map(row => {
            const obj = {};
            res[0].columns.forEach((col, i) => { obj[col] = row[i]; });
            return obj;
          });
        } catch(e) { console.error('DB all error:', sql, e.message); return []; }
      },
      run: (...args) => {
        const params = args.flat();
        try {
          _db.run(sql, params);
          saveToFile();
          return { changes: 1 };
        } catch(e) { console.error('DB run error:', sql, e.message); return { changes: 0 }; }
      }
    };
  }

  exec(sql) {
    try { _db.run(sql); saveToFile(); } catch(e) { console.error('DB exec error:', e.message); }
  }
}

// Singleton — exportar instância
const db = new DbWrapper();

// Inicializar imediatamente
await db.ready();

export default db;
