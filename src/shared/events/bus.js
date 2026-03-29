// src/shared/events/bus.js
const listeners = new Map();

const on = (event, cb) => {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => listeners.get(event)?.delete(cb);
};

const emit = (event, payload) => {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach((cb) => {
    try { cb(payload); } catch {}
  });
};

const off = (event, cb) => {
  const set = listeners.get(event);
  if (!set) return;
  if (typeof cb === 'function') {
    set.delete(cb);
  } else {
    listeners.delete(event);
  }
};

export default { on, off, emit };
