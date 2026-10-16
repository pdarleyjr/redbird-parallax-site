// Visited houses live only on this device (localStorage, in-memory fallback). Never sent anywhere.
const KEY = 'rbht:visited:halloween-2026';
let memory = new Set();
let storageOK = true;
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter(id => typeof id === 'string') : []);
  } catch { storageOK = false; return new Set(memory); }
}
function write(set) {
  memory = new Set(set);
  try { localStorage.setItem(KEY, JSON.stringify([...set])); } catch { storageOK = false; }
}

export const storageAvailable = () => storageOK;
export const getVisited = () => read();
export function prune(validIds) {
  const set = read();
  const kept = new Set([...set].filter(id => validIds.has(id)));
  if (kept.size !== set.size) write(kept);
}
export function setVisited(id, visited) {
  const set = read();
  if (visited) set.add(id); else set.delete(id);
  write(set);
  listeners.forEach(fn => fn(set));
}
export function resetVisited() { write(new Set()); listeners.forEach(fn => fn(new Set())); }
export const onVisitedChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
