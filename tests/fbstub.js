// In-memory stand-ins for the Firebase modules index.html imports. Shared state on window.__fb
// so the test can seed and inspect it.
const STUBS = {};

STUBS.app = `export function initializeApp(){ return {}; }`;

STUBS.auth = `
const S = window.__fb;
export function getAuth(){ return S.auth; }
export class GoogleAuthProvider { setCustomParameters(){} addScope(){} static credentialFromResult(){ return null; } }
export function signInWithPopup(){ return Promise.resolve(); }
export function signOut(){ return Promise.resolve(); }
export function connectAuthEmulator(){}
export function onAuthStateChanged(a, cb){ setTimeout(function(){ cb(S.auth.currentUser); }, 0); return function(){}; }
`;

STUBS.storage = `
const S = window.__fb;
export function getStorage(){ return {}; }
export function ref(st, path){ return { path: path }; }
export function uploadBytes(r, f){ (S.uploads = S.uploads || []).push({ path: r.path, size: f.size, type: f.type }); return Promise.resolve({ ref: r }); }
export function getDownloadURL(r){ return Promise.resolve('https://files.test/' + r.path); }
export function deleteObject(r){ (S.deletes = S.deletes || []).push(r.path); return Promise.resolve(); }
export function connectStorageEmulator(){}
`;

STUBS.firestore = `
const S = window.__fb;
const DEL = { __del: true };
function store(name){ return S.data[name] || (S.data[name] = {}); }
function clone(x){ return JSON.parse(JSON.stringify(x)); }
export function getFirestore(){ return {}; }
export function connectFirestoreEmulator(){}
export function collection(db, name){ return { kind: 'col', name: name }; }
export function doc(a, b, c){
  if (a && a.kind === 'col') return { kind: 'doc', col: a.name, id: b || ('auto' + (S.seq++)) };
  return { kind: 'doc', col: b, id: c };
}
export function query(col){ var cons = [].slice.call(arguments, 1); return { kind: 'query', name: col.name, cons: cons }; }
export function where(f, op, v){ return { t: 'where', f: f, op: op, v: v }; }
export function orderBy(f, d){ return { t: 'orderBy', f: f, d: d }; }
export function limit(n){ return { t: 'limit', n: n }; }
export function arrayUnion(){ return { __union: [].slice.call(arguments) }; }
export function deleteField(){ return DEL; }
function snapDoc(col, id){ var d = store(col)[id]; return { id: id, metadata: { hasPendingWrites: false }, ref: { kind: "doc", col: col, id: id }, exists: function(){ return !!d; }, data: function(){ return d ? clone(d) : undefined; } }; }
function runQuery(q){
  var name = q.kind === 'col' ? q.name : q.name;
  var ids = Object.keys(store(name));
  var docs = ids.map(function(id){ return snapDoc(name, id); });
  (q.cons || []).forEach(function(c){
    if (c.t === 'where') docs = docs.filter(function(d){ var v = d.data()[c.f]; return c.op === '==' ? v === c.v : true; });
    if (c.t === 'orderBy') docs.sort(function(a, b){ var x = a.data()[c.f], y = b.data()[c.f]; return (x < y ? -1 : x > y ? 1 : 0) * (c.d === 'desc' ? -1 : 1); });
    if (c.t === 'limit') docs = docs.slice(0, c.n);
  });
  return docs;
}
var listeners = [];
function fire(){
  listeners.forEach(function(l){
    if (l.ref.kind === 'doc') { l.cb(snapDoc(l.ref.col, l.ref.id)); return; }
    var docs = runQuery(l.ref);
    var prev = l.prev || {};
    var changes = docs.filter(function(d){ return !prev[d.id]; }).map(function(d){ return { type: 'added', doc: d }; });
    l.prev = {}; docs.forEach(function(d){ l.prev[d.id] = true; });
    l.cb({ docs: docs, size: docs.length, empty: !docs.length, forEach: function(f){ docs.forEach(f); }, docChanges: function(){ return changes; }, metadata: { hasPendingWrites: false } });
  });
}
function schedule(){ if (S.pending) return; S.pending = true; setTimeout(function(){ S.pending = false; fire(); }, 5); }
S.remote = function(fn){ fn(S.data); schedule(); };
export function onSnapshot(ref, cb, err){ var l = { ref: ref, cb: cb }; listeners.push(l); setTimeout(function(){ fire.call(null); }, 0); return function(){ listeners.splice(listeners.indexOf(l), 1); }; }
function apply(cur, data){
  Object.keys(data).forEach(function(k){
    var v = data[k];
    if (v === DEL || (v && v.__del)) delete cur[k];
    else if (v && v.__union) { var arr = Array.isArray(cur[k]) ? cur[k] : []; v.__union.forEach(function(x){ arr.push(x); }); cur[k] = arr; }
    else cur[k] = clone(v);
  });
  return cur;
}
export function setDoc(ref, data, opts){ var st = store(ref.col); st[ref.id] = apply(opts && opts.merge ? (st[ref.id] || {}) : {}, data); S.writes.push({ op: 'set', col: ref.col, id: ref.id, data: clone(data) }); schedule(); return Promise.resolve(); }
export function addDoc(col, data){ var r = doc(col); return setDoc(r, data).then(function(){ return r; }); }
export function updateDoc(ref, data){ var st = store(ref.col); if (!st[ref.id]) return Promise.reject(new Error('no doc')); apply(st[ref.id], data); S.writes.push({ op: 'update', col: ref.col, id: ref.id }); schedule(); return Promise.resolve(); }
export function deleteDoc(ref){ delete store(ref.col)[ref.id]; schedule(); return Promise.resolve(); }
export function getDoc(ref){ return Promise.resolve(snapDoc(ref.col, ref.id)); }
export function writeBatch(){ var ops = []; return { set: function(r, d, o){ ops.push(function(){ return setDoc(r, d, o); }); }, update: function(r, d){ ops.push(function(){ return updateDoc(r, d); }); }, delete: function(r){ ops.push(function(){ return deleteDoc(r); }); }, commit: function(){ ops.forEach(function(f){ f(); }); return Promise.resolve(); } }; }
`;

module.exports = STUBS;
