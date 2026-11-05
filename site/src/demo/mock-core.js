// بديل محلي لـ Firebase (Firestore + Auth) للنسخة التجريبية فقط.
// يُفعَّل عند البناء بالمتغير VITE_DEMO_MODE=1 عبر alias في vite.config.js، ولا يدخل بناء الإنتاج العادي.
// البيانات تُحفظ في localStorage داخل متصفح الزائر فقط (لا قاعدة بيانات حقيقية ولا مشاركة بين الأجهزة).
import { seedData, DEMO_LOGIN } from './seed.js';

const DB_KEY = 'alaa-demo-db-v1';
const SESSION_KEY = 'alaa-demo-session-v1';

const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ممتلئ أو محجوب: نكمل من الذاكرة */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* ---------- حالة البيانات ---------- */
function loadDb() {
  const url = new URL(location.href);
  if (url.searchParams.has('reset')) {
    ls.del(DB_KEY); ls.del(SESSION_KEY);
    url.searchParams.delete('reset');
    history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
  const raw = ls.get(DB_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (e) { /* نعيد التهيئة */ } }
  const fresh = seedData();
  ls.set(DB_KEY, JSON.stringify(fresh));
  return fresh;
}
let db = loadDb();
const col = (name) => (db[name] || (db[name] = {}));

const listeners = new Set(); // { target, next, err }

function snapOf(target) {
  if (target.kind === 'doc') {
    const data = col(target.col)[target.id];
    return { id: target.id, exists: () => data !== undefined, data: () => clone(data), ref: target };
  }
  let rows = Object.entries(col(target.name)).map(([id, d]) => ({ id, d }));
  for (const c of target.constraints || []) {
    if (c.type === 'orderBy') {
      const dir = c.dir === 'desc' ? -1 : 1;
      rows.sort((a, b) => {
        const x = a.d[c.field], y = b.d[c.field];
        if (x === y) return 0;
        if (x === undefined) return 1;
        if (y === undefined) return -1;
        return (x > y ? 1 : -1) * dir;
      });
    }
  }
  const lim = (target.constraints || []).find((c) => c.type === 'limit');
  if (lim) rows = rows.slice(0, lim.n);
  const docs = rows.map(({ id, d }) => ({ id, exists: () => true, data: () => clone(d), ref: { kind: 'doc', col: target.name, id } }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (cb) => docs.forEach(cb), docChanges: () => [] };
}

function fire(l) { try { l.next(snapOf(l.target)); } catch (e) { if (l.err) l.err(e); else console.error(e); } }
function notify(cols) {
  listeners.forEach((l) => {
    const name = l.target.kind === 'doc' ? l.target.col : l.target.name;
    if (!cols || cols.has(name)) fire(l);
  });
}
function persist(cols) {
  ls.set(DB_KEY, JSON.stringify(db));
  setTimeout(() => notify(cols), 0);
}
window.addEventListener('storage', (e) => {
  if (e.key === DB_KEY && e.newValue) { try { db = JSON.parse(e.newValue); notify(null); } catch (err) { /* ignore */ } }
  if (e.key === SESSION_KEY) authChanged();
});

/* ---------- Firestore ---------- */
const newId = () => 'D' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

export const getFirestore = () => ({ __demo: true });
export const collection = (_db, name) => ({ kind: 'col', name });
export function doc(a, b, c) {
  if (a && a.kind === 'col') return { kind: 'doc', col: a.name, id: newId() };
  return { kind: 'doc', col: b, id: c };
}
export const query = (c, ...constraints) => ({ kind: 'query', name: c.name, constraints });
export const orderBy = (field, dir = 'asc') => ({ type: 'orderBy', field, dir });
export const limit = (n) => ({ type: 'limit', n });
export const increment = (n) => ({ __op: 'inc', n });
export const arrayUnion = (...els) => ({ __op: 'union', els });
export const deleteField = () => ({ __op: 'del' });

function setPath(obj, path, val, isDel) {
  const parts = path.split('.'); let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
  const k = parts[parts.length - 1];
  if (isDel) delete o[k]; else o[k] = val;
}
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }

function applyPatch(existing, patch) {
  const out = existing;
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && v.__op) {
      if (v.__op === 'del') setPath(out, k, undefined, true);
      else if (v.__op === 'inc') setPath(out, k, (Number(getPath(out, k)) || 0) + v.n);
      else if (v.__op === 'union') {
        const cur = Array.isArray(getPath(out, k)) ? getPath(out, k) : [];
        v.els.forEach((el) => { if (!cur.some((x) => JSON.stringify(x) === JSON.stringify(el))) cur.push(clone(el)); });
        setPath(out, k, cur);
      }
    } else if (v !== undefined) setPath(out, k, clone(v));
  }
  return out;
}
const err = (code, msg) => Object.assign(new Error(msg), { code });

function opSet(ref, data, merge) {
  const c = col(ref.col);
  c[ref.id] = merge && c[ref.id] ? applyPatch(c[ref.id], data) : applyPatch({}, data);
}
function opUpdate(ref, data) {
  const c = col(ref.col);
  if (!c[ref.id]) throw err('not-found', 'No document to update');
  applyPatch(c[ref.id], data);
}
function opDelete(ref) { delete col(ref.col)[ref.id]; }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function addDoc(c, data) {
  const ref = { kind: 'doc', col: c.name, id: newId() };
  opSet(ref, data, false); persist(new Set([c.name])); await wait(120); return ref;
}
export async function setDoc(ref, data, opts) { opSet(ref, data, !!(opts && opts.merge)); persist(new Set([ref.col])); await wait(80); }
export async function updateDoc(ref, data) { opUpdate(ref, data); persist(new Set([ref.col])); await wait(80); }
export async function deleteDoc(ref) { opDelete(ref); persist(new Set([ref.col])); await wait(80); }
export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, opts) { ops.push(() => opSet(ref, data, !!(opts && opts.merge))); return this; },
    update(ref, data) { ops.push(() => opUpdate(ref, data)); return this; },
    delete(ref) { ops.push(() => opDelete(ref)); return this; },
    async commit() {
      const cols = new Set(); const snapshot = JSON.stringify(db);
      try {
        ops.forEach((f) => f());
      } catch (e) { db = JSON.parse(snapshot); throw e; }
      // الأعمدة المتأثرة: نحدّث الكل لتبسيط الأمر
      Object.keys(db).forEach((k) => cols.add(k));
      persist(cols); await wait(120);
    },
  };
}
export function onSnapshot(target, next, onErr) {
  const l = { target, next, err: onErr };
  listeners.add(l);
  setTimeout(() => { if (listeners.has(l)) fire(l); }, 60);
  return () => listeners.delete(l);
}

/* ---------- Auth ---------- */
const authObj = { currentUser: readSession() };
const authSubs = new Set();
function readSession() { const r = ls.get(SESSION_KEY); try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function authChanged() { authObj.currentUser = readSession(); authSubs.forEach((cb) => cb(authObj.currentUser)); }

export const getAuth = () => authObj;
export function onAuthStateChanged(_auth, cb) {
  authSubs.add(cb); setTimeout(() => { if (authSubs.has(cb)) cb(authObj.currentUser); }, 80);
  return () => authSubs.delete(cb);
}
export async function signInWithEmailAndPassword(_auth, email, password) {
  await wait(350);
  if (String(email).trim().toLowerCase() === DEMO_LOGIN.email && password === DEMO_LOGIN.password) {
    ls.set(SESSION_KEY, JSON.stringify({ uid: 'demo-admin', email: DEMO_LOGIN.email }));
    authChanged(); return { user: authObj.currentUser };
  }
  throw err('auth/invalid-credential', 'Firebase: Error (auth/invalid-credential).');
}
export async function signOut() { ls.del(SESSION_KEY); authChanged(); }
export async function sendPasswordResetEmail() { await wait(250); }

/* ---------- app ---------- */
export const initializeApp = (config) => ({ options: config, __demo: true });

/* ---------- شريط التنبيه + تعبئة الصور الناقصة ---------- */
const PLACEHOLDER_PREFIX = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='5'";

function installDemoChrome() {
  const isAdmin = location.pathname.replace(/\/+$/, '').endsWith('/admin');
  // شريط رفيع داخل الصفحة (لا يغطي أي زر): في اللوحة يظهر في شاشة الدخول فقط.
  const bar = document.createElement('div');
  bar.setAttribute('dir', 'rtl');
  bar.style.cssText = 'background:#3B2A2F;color:#fff;font:12px/1.7 Cairo,system-ui,sans-serif;padding:6px 14px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;text-align:center;position:relative;z-index:50';
  const link = 'color:#F1D3C8;text-decoration:underline';
  bar.innerHTML = `<span><b>نسخة تجريبية</b> — بيانات وصور وهمية، وكل ما تضيفينه يُحفظ في متصفحك فقط.</span>
    ${isAdmin ? `<span dir="ltr" style="background:rgba(255,255,255,.12);border-radius:999px;padding:2px 12px">Email: <b>${DEMO_LOGIN.email}</b> &nbsp;|&nbsp; Password: <b>${DEMO_LOGIN.password}</b></span><button id="demoFill" type="button" style="background:#CEA9A6;color:#3B2A2F;border:0;border-radius:999px;padding:2px 14px;font-weight:700;cursor:pointer">تعبئة بيانات الدخول</button>` : ''}
    <span><a href="?reset=1" style="${link}">إعادة ضبط البيانات</a> · ${isAdmin ? `<a href="../" style="${link}">المتجر</a>` : `<a href="admin/" style="${link}">لوحة التحكم</a>`}</span>`;
  document.body.insertBefore(bar, document.body.firstChild);
  const fill = bar.querySelector('#demoFill');
  if (fill) fill.onclick = () => {
    const e = document.getElementById('loginEmail'), p = document.getElementById('loginPassword');
    if (e && p) { e.value = DEMO_LOGIN.email; p.value = DEMO_LOGIN.password; }
  };
  if (isAdmin) {
    const sync = () => { const ls_ = document.getElementById('loginScreen'); bar.style.display = ls_ && ls_.offsetParent !== null ? 'flex' : 'none'; };
    sync(); setInterval(sync, 400);
  }

  // أي صورة ما زالت خلفية بديلة (مثل صورة «من نحن» واللوك بوك) نملؤها برسم توضيحي.
  import('./garments.js').then(({ garmentUri }) => {
    const pool = [['evening', 'plum'], ['toub', 'indigo'], ['swing', 'rose'], ['abaya', 'black'], ['engagement', 'champagne'], ['kaftan', 'sage'], ['set', 'blush'], ['toub', 'terra'], ['evening', 'emerald'], ['outfit', 'cream']];
    let n = 0; const cache = {};
    const fillImg = (img) => {
      if (!img.src || !img.src.startsWith(PLACEHOLDER_PREFIX)) return;
      if (img.id === 'heroImg') return; // الغلاف يأتي من الإعدادات
      const k = n++ % pool.length;
      img.src = cache[k] || (cache[k] = garmentUri(pool[k][0], pool[k][1]));
      img.style.objectFit = 'cover';
    };
    const scan = (root) => root.querySelectorAll && root.querySelectorAll('img').forEach(fillImg);
    scan(document);
    new MutationObserver((ms) => ms.forEach((m) => { m.addedNodes.forEach((nd) => { if (nd.nodeType === 1) { if (nd.tagName === 'IMG') fillImg(nd); else scan(nd); } }); })).observe(document.body, { childList: true, subtree: true });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installDemoChrome); else installDemoChrome();
