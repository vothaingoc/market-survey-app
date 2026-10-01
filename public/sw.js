const CACHE_NAME = 'market-survey-app-v1';
const APP_SHELL_URL = new URL('./', self.registration.scope).href;

function getAppAssetUrls(html) {
  const urls = new Set([APP_SHELL_URL]);
  const attributePattern = /(?:src|href)=["']([^"']+)["']/gi;
  let match;

  while ((match = attributePattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], APP_SHELL_URL);
      if (url.origin === self.location.origin) urls.add(url.href);
    } catch {
      // Ignore invalid or non-URL attributes.
    }
  }

  return Array.from(urls);
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(APP_SHELL_URL, { cache: 'reload' });
  if (!response.ok) throw new Error(`Could not cache app shell: ${response.status}`);

  await cache.put(APP_SHELL_URL, response.clone());
  const html = await response.text();
  const assetUrls = getAppAssetUrls(html).filter(url => url !== APP_SHELL_URL);
  await Promise.allSettled(assetUrls.map(async url => {
    const assetResponse = await fetch(url, { cache: 'reload' });
    if (assetResponse.ok) await cache.put(url, assetResponse);
  }));
}

self.addEventListener('install', event => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('market-survey-app-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(APP_SHELL_URL, response.clone());
      cacheAppShell().catch(() => undefined);
    }
    return response;
  } catch {
    return (await cache.match(APP_SHELL_URL)) || Response.error();
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) {
    event.respondWith(handleStaticAsset(request));
  }
});
