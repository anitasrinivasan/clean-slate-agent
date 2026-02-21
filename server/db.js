import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'cleanslate.db');

// Initialize database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS case_files (
    session_id TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    session_id TEXT,
    estimated_cost REAL DEFAULT 0,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Encryption helpers using AES-256-GCM
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'cleanslate_dev_key_32bytes_long!';
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encrypted, iv: iv.toString('hex'), authTag };
}

export function decrypt(encryptedData, ivHex, authTagHex) {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Case file operations
export function saveCaseFile(sessionId, caseDetails) {
  const plaintext = JSON.stringify(caseDetails);
  const { encrypted, iv, authTag } = encrypt(plaintext);

  const stmt = db.prepare(`
    INSERT INTO case_files (session_id, encrypted_data, iv, auth_tag, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(session_id) DO UPDATE SET
      encrypted_data = excluded.encrypted_data,
      iv = excluded.iv,
      auth_tag = excluded.auth_tag,
      updated_at = datetime('now')
  `);
  stmt.run(sessionId, encrypted, iv, authTag);
}

export function loadCaseFile(sessionId) {
  const row = db.prepare('SELECT * FROM case_files WHERE session_id = ?').get(sessionId);
  if (!row) return null;
  try {
    const decrypted = decrypt(row.encrypted_data, row.iv, row.auth_tag);
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Failed to decrypt case file:', e.message);
    return null;
  }
}

// Conversation history
export function saveMessage(sessionId, role, content) {
  db.prepare('INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)')
    .run(sessionId, role, content);
}

export function getConversationHistory(sessionId, limit = 20) {
  return db.prepare(
    'SELECT role, content FROM conversations WHERE session_id = ? ORDER BY created_at ASC LIMIT ?'
  ).all(sessionId, limit);
}

// Agent metrics
export function logMetric(eventType, sessionId, estimatedCost = 0, details = '') {
  db.prepare(
    'INSERT INTO agent_metrics (event_type, session_id, estimated_cost, details) VALUES (?, ?, ?, ?)'
  ).run(eventType, sessionId, estimatedCost, details);
}

export function getMetrics() {
  const individualsHelped = db.prepare(
    "SELECT COUNT(DISTINCT session_id) as count FROM conversations WHERE role = 'user'"
  ).get();
  const employerAssessments = db.prepare(
    "SELECT COUNT(*) as count FROM agent_metrics WHERE event_type = 'employer_assessment'"
  ).get();
  const totalCost = db.prepare(
    'SELECT COALESCE(SUM(estimated_cost), 0) as total FROM agent_metrics'
  ).get();
  const recentEvents = db.prepare(
    'SELECT * FROM agent_metrics ORDER BY created_at DESC LIMIT 20'
  ).all();

  return {
    individualsHelped: individualsHelped.count,
    employerAssessments: employerAssessments.count,
    totalEstimatedCost: totalCost.total,
    recentEvents,
  };
}

export default db;
