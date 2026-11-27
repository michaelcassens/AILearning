'use strict';
/*
 * Holiday Helpers Gift Drive — shared, persistent, real-time checklist.
 * Zero dependencies: Node 18+ only.
 *
 *   PORT        port to listen on (default 3000)
 *   DATA_DIR    where claims are stored (default ./data) — put this on a persistent disk
 *   ADMIN_PIN   optional; lets organizers remove any claim
 *   TRUST_PROXY set to 1 when behind a reverse proxy (uses X-Forwarded-For for rate limits)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const ADMIN_PIN = process.env.ADMIN_PIN || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PUBLIC_DIR = path.join(__dirname, 'public');
const CLAIMS_FILE = path.join(DATA_DIR, 'claims.json');
const LOG_FILE = path.join(DATA_DIR, 'history.jsonl');

// ---------- lists (static config) ----------
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'lists.json'), 'utf8'));
const itemIndex = new Map(); // itemId -> { list, item }
for (const list of config.lists) {
  for (const group of list.groups) {
    for (const item of group.items) {
      if (itemIndex.has(item.id)) throw new Error('Duplicate item id: ' + item.id);
      itemIndex.set(item.id, { list, item });
    }
  }
}

// ---------- persistence ----------
fs.mkdirSync(DATA_DIR, { recursive: true });
let claims = [];
try {
  claims = JSON.parse(fs.readFileSync(CLAIMS_FILE, 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') throw e; // corrupt file: refuse to start rather than wipe data
}

function save() {
  const tmp = CLAIMS_FILE + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  fs.writeSync(fd, JSON.stringify(claims));
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fs.renameSync(tmp, CLAIMS_FILE);
}
function log(entry) {
  // Append-only audit trail (never includes the secret token).
  fs.appendFileSync(LOG_FILE, JSON.stringify({ ...entry, at: new Date().toISOString() }) + '\n');
}

const publicClaims = () =>
  claims.map(({ id, itemId, name, at }) => ({ id, itemId, name, at }));

// ---------- live updates (SSE) ----------
const clients = new Set();
function broadcast() {
  const payload = `event: claims\ndata: ${JSON.stringify({ claims: publicClaims() })}\n\n`;
  for (const res of clients) res.write(payload);
}
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 25000).unref();

// ---------- helpers ----------
const hits = new Map(); // ip -> timestamps
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}
setInterval(() => hits.clear(), 10 * 60000).unref();

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return String(xff).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 4096) { reject(Object.assign(new Error('Too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function cleanName(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
}

// ---------- API ----------
async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') {
    return sendJson(res, 200, { config, claims: publicClaims(), adminEnabled: Boolean(ADMIN_PIN) });
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`retry: 3000\nevent: claims\ndata: ${JSON.stringify({ claims: publicClaims() })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method !== 'POST') return sendJson(res, 404, { error: 'Not found' });
  if (rateLimited(clientIp(req))) return sendJson(res, 429, { error: 'Too many requests. Please wait a moment.' });
  const body = await readJson(req);

  if (url.pathname === '/api/claim') {
    const entry = itemIndex.get(body.itemId);
    if (!entry) return sendJson(res, 400, { error: 'Unknown item.' });
    if (!entry.list.multi && claims.some((c) => c.itemId === body.itemId)) {
      return sendJson(res, 409, { error: 'Someone just got this one! The list has been updated.' });
    }
    const claim = {
      id: crypto.randomUUID(),
      itemId: body.itemId,
      name: cleanName(body.name),
      at: new Date().toISOString(),
      token: crypto.randomBytes(16).toString('hex'),
    };
    claims.push(claim);
    save();
    log({ action: 'claim', id: claim.id, itemId: claim.itemId, name: claim.name });
    broadcast();
    return sendJson(res, 201, { id: claim.id, token: claim.token });
  }

  if (url.pathname === '/api/unclaim') {
    const idx = claims.findIndex((c) => c.id === body.id);
    if (idx === -1) return sendJson(res, 404, { error: 'That claim no longer exists.' });
    const isOwner = typeof body.token === 'string' && safeEqual(body.token, claims[idx].token);
    const isAdmin = ADMIN_PIN && typeof body.pin === 'string' && safeEqual(body.pin, ADMIN_PIN);
    if (!isOwner && !isAdmin) return sendJson(res, 403, { error: 'Only the person who claimed this can undo it.' });
    const [removed] = claims.splice(idx, 1);
    save();
    log({ action: isAdmin && !isOwner ? 'admin-unclaim' : 'unclaim', id: removed.id, itemId: removed.itemId });
    broadcast();
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

// ---------- static files ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) sendJson(res, e.status || 500, { error: e.status ? e.message : 'Server error' });
    else res.end();
    if (!e.status) console.error(e);
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Holiday Helpers running on http://localhost:${PORT} (data: ${DATA_DIR})`));
}
module.exports = server;
