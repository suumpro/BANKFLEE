const cache = {};

export function loadAssets(map) {
  const entries = Object.entries(map || {});
  return Promise.all(entries.map(([key, url]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { cache[key] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = url;
  })));
}

export function getAsset(key) {
  return cache[key];
}
