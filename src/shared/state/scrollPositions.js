const positions = new Map();

export function setScrollPosition(key, y) {
  positions.set(String(key), Number(y) || 0);
}

export function getScrollPosition(key) {
  return positions.get(String(key)) || 0;
}

export function clearScrollPosition(key) {
  positions.delete(String(key));
}

export function clearAllScrollPositions() {
  positions.clear();
}


