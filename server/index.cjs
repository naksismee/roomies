const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const DAY = 86400000;
const id = () => crypto.randomUUID();
const date = () => new Date().toLocaleDateString('en-CA');
const addDays = (value, days) => {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
class Problem extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function text(value, label, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new Problem(400, `${label} must be between 1 and ${max} characters.`);
  }
  return value.trim();
}
function frequency(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 365) throw new Problem(400, 'Choose a repeat interval between 1 and 365 days.');
  return number;
}
function rebalance(house) {
  const loads = Object.fromEntries(house.members.map(member => [member.id, 0]));
  [...house.chores].sort((a, b) => b.effort / b.frequencyDays - a.effort / a.frequencyDays).forEach(chore => {
    const member = house.members.reduce((best, next) => loads[next.id] < loads[best.id] ? next : best);
    chore.memberId = member.id;
    loads[member.id] += chore.effort * 7 / chore.frequencyDays;
  });
}
function createApp({ dataFile = path.join(__dirname, '../data/roomies.json'), buildDir = path.join(__dirname, '../build'), secureCookies = process.env.COOKIE_SECURE === 'true' } = {}) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  let db = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : { users: [], sessions: [], houses: [] };
  const save = () => {
    const temporary = `${dataFile}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(db, null, 2), { mode: 0o600 });
    fs.renameSync(temporary, dataFile);
  };
  const publicUser = user => user ? { id: user.id, name: user.name, email: user.email, houseId: user.houseId } : null;
  const tokenHash = token => crypto.createHash('sha256').update(token || '').digest('hex');
  const findUser = req => {
    const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('roomies_session='))?.slice(16);
    const session = db.sessions.find(item => item.tokenHash === tokenHash(token) && item.expiresAt > Date.now());
    return session ? db.users.find(user => user.id === session.userId) : null;
  };
  const login = (res, user) => {
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions = db.sessions.filter(session => session.expiresAt > Date.now());
    db.sessions.push({ tokenHash: tokenHash(token), userId: user.id, expiresAt: Date.now() + 30 * DAY });
    res.setHeader('Set-Cookie', `roomies_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secureCookies ? '; Secure' : ''}`);
    save();
  };
  const attempts = new Map();
  const throttle = req => {
    const key = req.socket.remoteAddress;
    const entry = attempts.get(key);
    if (entry && entry.until > Date.now() && entry.count >= 30) throw new Problem(429, 'Too many attempts. Please try again in 15 minutes.');
    if (!entry || entry.until <= Date.now()) attempts.set(key, { count: 1, until: Date.now() + 15 * 60000 });
    else entry.count++;
  };
  const readBody = async req => {
    if (!(req.headers['content-type'] || '').includes('application/json')) throw new Problem(415, 'Send JSON data.');
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 100000) throw new Problem(413, 'That request is too large.');
    }
    try { return JSON.parse(body || '{}'); } catch { throw new Problem(400, 'Could not read that request.'); }
  };
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, 'http://localhost');
      const route = url.pathname;
      if (!route.startsWith('/api/')) {
        if (!['GET', 'HEAD'].includes(req.method)) throw new Problem(405, 'Method not allowed.');
        const relative = decodeURIComponent(route).replace(/^\/+/, '');
        let target = path.resolve(buildDir, relative || 'index.html');
        if (!target.startsWith(path.resolve(buildDir) + path.sep)) throw new Problem(404, 'Page not found.');
        if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
          if (path.extname(relative)) throw new Problem(404, 'File not found.');
          target = path.join(buildDir, 'index.html');
        }
        if (!fs.existsSync(target)) throw new Problem(503, 'Run npm run build first, or open the development server on port 3000.');
        res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
        if (req.method === 'HEAD') res.end();
        else fs.createReadStream(target).pipe(res);
        return;
      }
      if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) throw new Problem(405, 'Method not allowed.');
      if (req.method !== 'GET' && req.headers.origin) {
        const source = new URL(req.headers.origin);
        const host = new URL(`http://${req.headers.host}`).hostname;
        const loopbacks = ['localhost', '127.0.0.1', '[::1]'];
        const sameLoopback = loopbacks.includes(source.hostname) && loopbacks.includes(host);
        if (source.hostname !== host && !sameLoopback) throw new Problem(403, 'Open Roomies directly to make changes.');
      }
      const body = req.method === 'GET' ? {} : await readBody(req);
      let user = findUser(req);
      if (route === '/api/session' && req.method === 'GET') return send(200, { user: publicUser(user) });
      if (route === '/api/auth/signup' && req.method === 'POST') {
        throttle(req);
        const name = text(body.name, 'Your name', 50);
        const email = text(body.email, 'Email address', 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Problem(400, 'Enter a valid email address.');
        if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) throw new Problem(400, 'Use a password between 8 and 128 characters.');
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = (await scrypt(body.password, salt, 64)).toString('hex');
        if (db.users.some(item => item.email === email)) throw new Problem(409, 'That email already has an account. Log in instead.');
        user = { id: id(), name, email, salt, passwordHash, houseId: null };
        db.users.push(user);
        login(res, user);
        return send(201, { user: publicUser(user) });
      }
      if (route === '/api/auth/login' && req.method === 'POST') {
        throttle(req);
        const email = String(body.email || '').trim().toLowerCase();
        if (typeof body.password !== 'string' || body.password.length > 128) throw new Problem(401, 'Email or password is incorrect.');
        const candidate = db.users.find(item => item.email === email);
        const hash = await scrypt(body.password, candidate?.salt || '00000000000000000000000000000000', 64);
        if (!candidate || !crypto.timingSafeEqual(hash, Buffer.from(candidate.passwordHash, 'hex'))) throw new Problem(401, 'Email or password is incorrect.');
        login(res, candidate);
        return send(200, { user: publicUser(candidate) });
      }
      if (route === '/api/auth/logout' && req.method === 'POST') {
        const token = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('roomies_session='))?.slice(16);
        db.sessions = db.sessions.filter(session => session.tokenHash !== tokenHash(token));
        res.setHeader('Set-Cookie', `roomies_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secureCookies ? '; Secure' : ''}`);
        save();
        return send(200, { ok: true });
      }
      if (route.startsWith('/api/invites/') && req.method === 'GET') {
        const code = route.split('/').pop().toUpperCase();
        const house = db.houses.find(item => item.inviteCode === code);
        if (!house) throw new Problem(404, 'That house code was not found. Check it with your roommate.');
        return send(200, { name: house.name, members: house.members.filter(member => !member.userId).map(({ id, name }) => ({ id, name })) });
      }
      if (!user) throw new Problem(401, 'Please log in to continue.');
      if (route === '/api/households' && req.method === 'POST') {
        if (user.houseId) throw new Problem(409, 'You already belong to a house.');
        const name = text(body.name, 'House name', 60);
        if (!['apartment', 'house'].includes(body.type) || !['alone', 'sharing'].includes(body.living)) throw new Problem(400, 'Choose your home type and living arrangement.');
        if (!Array.isArray(body.members) || body.members.length < 1 || body.members.length > 12) throw new Problem(400, 'Add between 1 and 12 household members.');
        const members = body.members.map((member, index) => ({ id: text(member.id, 'Member ID'), name: index === 0 ? user.name : text(member.name, 'Roommate name', 50), userId: index === 0 ? user.id : null }));
        if (new Set(members.map(member => member.id)).size !== members.length) throw new Problem(400, 'Member IDs must be unique.');
        if (body.living === 'alone' && members.length !== 1) throw new Problem(400, 'A solo household has one member.');
        if (!Array.isArray(body.areas) || body.areas.length < 1 || body.areas.length > 20) throw new Problem(400, 'Select at least one shared area.');
        const areas = [...new Set(body.areas.map(area => text(area, 'Area name', 40)))];
        const features = Array.isArray(body.features) ? body.features.filter(feature => ['chores', 'groceries'].includes(feature)) : ['chores'];
        if (!features.length) throw new Problem(400, 'Choose chores, groceries, or both.');
        if (!Array.isArray(body.chores) || body.chores.length > 100 || (features.includes('chores') && !body.chores.length)) throw new Problem(400, 'Choose at least one chore.');
        const chores = body.chores.map(chore => {
          if (!areas.includes(chore.area)) throw new Problem(400, 'Choose an area for every chore.');
          const effort = Number(chore.effort || 1);
          if (![1, 2, 3].includes(effort)) throw new Problem(400, 'Choose a valid chore effort.');
          return { id: id(), name: text(chore.name, 'Chore name', 80), area: chore.area, frequencyDays: frequency(chore.frequencyDays), effort, memberId: members.some(member => member.id === chore.memberId) ? chore.memberId : members[0].id, dueDate: date() };
        });
        let inviteCode;
        do { inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase(); } while (db.houses.some(house => house.inviteCode === inviteCode));
        const house = { id: id(), revision: 1, ownerId: user.id, name, type: body.type, living: body.living, features, areas, members, chores, groceries: [], history: [], rotate: body.rotate !== false, inviteCode, createdAt: new Date().toISOString() };
        if (body.assignmentMode !== 'manual') rebalance(house);
        db.houses.push(house);
        user.houseId = house.id;
        save();
        return send(201, { house, user: publicUser(user) });
      }
      if (route === '/api/join' && req.method === 'POST') {
        if (user.houseId) throw new Problem(409, 'You already belong to a house.');
        const house = db.houses.find(item => item.inviteCode === String(body.code || '').trim().toUpperCase());
        if (!house) throw new Problem(404, 'That house code was not found.');
        let member;
        if (body.memberId) {
          member = house.members.find(item => item.id === body.memberId && !item.userId);
          if (!member) throw new Problem(409, 'That roommate has already joined. Choose another spot.');
        } else {
          if (house.members.length >= 12) throw new Problem(400, 'This house has reached its 12-member limit.');
          member = { id: id(), name: user.name, userId: null };
          house.members.push(member);
        }
        member.userId = user.id;
        member.name = user.name;
        user.houseId = house.id;
        house.revision = (house.revision || 0) + 1;
        save();
        return send(200, { house, user: publicUser(user) });
      }
      const house = db.houses.find(item => item.id === user.houseId && item.members.some(member => member.userId === user.id));
      if (!house) throw new Problem(404, 'Create or join a house first.');
      if (route === '/api/household' && req.method === 'GET') return send(200, { house });
      if (route === '/api/household' && req.method === 'PATCH') {
        if (house.ownerId !== user.id) throw new Problem(403, 'Only the house creator can change house settings.');
        if (body.name !== undefined) house.name = text(body.name, 'House name', 60);
        if (typeof body.rotate === 'boolean') house.rotate = body.rotate;
      } else if (route === '/api/rebalance' && req.method === 'POST') {
        if (house.ownerId !== user.id) throw new Problem(403, 'Only the house creator can rebalance chores.');
        rebalance(house);
      } else if (route === '/api/chores' && req.method === 'POST') {
        if (house.chores.length >= 100) throw new Problem(400, 'This house already has 100 chores.');
        const area = text(body.area, 'Area', 40);
        if (!house.areas.includes(area)) throw new Problem(400, 'Choose one of your shared areas.');
        if (!house.members.some(member => member.id === body.memberId)) throw new Problem(400, 'Choose a household member.');
        const effort = Number(body.effort || 1);
        if (![1, 2, 3].includes(effort)) throw new Problem(400, 'Choose a valid chore effort.');
        house.chores.push({ id: id(), name: text(body.name, 'Chore name', 80), area, memberId: body.memberId, frequencyDays: frequency(body.frequencyDays), effort, dueDate: date() });
      } else if (/^\/api\/chores\/[^/]+(?:\/complete|\/undo)?$/.test(route)) {
        const chore = house.chores.find(item => item.id === route.split('/')[3]);
        if (!chore) throw new Problem(404, 'That chore no longer exists.');
        if (route.endsWith('/complete') && req.method === 'POST') {
          const completion = { id: id(), choreId: chore.id, choreName: chore.name, memberId: chore.memberId, completedBy: user.id, completedAt: new Date().toISOString(), previousDueDate: chore.dueDate, previousMemberId: chore.memberId };
          house.history.unshift(completion);
          house.history = house.history.slice(0, 1000);
          chore.lastCompletionId = completion.id;
          chore.dueDate = addDays(chore.dueDate < date() ? date() : chore.dueDate, chore.frequencyDays);
          if (house.rotate) chore.memberId = house.members[(house.members.findIndex(member => member.id === chore.memberId) + 1) % house.members.length].id;
          house.revision = (house.revision || 0) + 1;
          save();
          return send(200, { house, completionId: completion.id });
        } else if (route.endsWith('/undo') && req.method === 'POST') {
          const completion = house.history.find(item => item.id === body.completionId && item.choreId === chore.id);
          if (!completion || chore.lastCompletionId !== completion.id) throw new Problem(409, 'This chore changed again. Refresh to see the latest version.');
          chore.dueDate = completion.previousDueDate;
          chore.memberId = completion.previousMemberId;
          delete chore.lastCompletionId;
          house.history = house.history.filter(item => item.id !== completion.id);
        } else if (req.method === 'PATCH' && !route.endsWith('/complete') && !route.endsWith('/undo')) {
          const updates = {};
          if (body.name !== undefined) updates.name = text(body.name, 'Chore name', 80);
          if (body.frequencyDays !== undefined) updates.frequencyDays = frequency(body.frequencyDays);
          if (body.memberId !== undefined) {
            if (!house.members.some(member => member.id === body.memberId)) throw new Problem(400, 'Choose a household member.');
            updates.memberId = body.memberId;
          }
          if (body.dueDate !== undefined) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) || Number.isNaN(Date.parse(body.dueDate))) throw new Problem(400, 'Choose a valid date.');
            updates.dueDate = body.dueDate;
          }
          Object.assign(chore, updates);
          delete chore.lastCompletionId;
        } else if (req.method === 'DELETE' && !route.endsWith('/complete') && !route.endsWith('/undo')) {
          house.chores = house.chores.filter(item => item.id !== chore.id);
        } else throw new Problem(405, 'Method not allowed.');
      } else if (route === '/api/groceries' && req.method === 'POST') {
        if (house.groceries.length >= 200) throw new Problem(400, 'Remove some groceries before adding more.');
        house.groceries.push({ id: id(), name: text(body.name, 'Grocery item', 80), quantity: String(body.quantity || '').trim().slice(0, 40), purchased: false, addedBy: user.name });
      } else if (route.startsWith('/api/groceries/')) {
        const item = house.groceries.find(item => item.id === route.split('/')[3]);
        if (!item) throw new Problem(404, 'That grocery item no longer exists.');
        if (req.method === 'PATCH' && typeof body.purchased === 'boolean') item.purchased = body.purchased;
        else if (req.method === 'DELETE') house.groceries = house.groceries.filter(entry => entry.id !== item.id);
        else throw new Problem(400, 'Choose whether the item is purchased.');
      } else throw new Problem(404, 'That action was not found.');
      house.revision = (house.revision || 0) + 1;
      save();
      return send(200, { house });
    } catch (error) {
      if (!error.status) console.error('Roomies server error:', error.message);
      if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please try again.' });
      else res.end();
    }
  });
  return server;
}

if (require.main === module) {
  const port = Number(process.env.API_PORT || process.env.PORT || 3001);
  const server = createApp();
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Roomies app and API: http://localhost:${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { createApp, rebalance, addDays };
