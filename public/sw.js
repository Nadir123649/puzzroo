// Self-destructing service worker.
//
// A previous version of this service worker cached pages and intercepted all
// navigations, which caused devices (especially phones) to keep serving stale
// /login, /signup and other pages long after the site was updated.
//
// Browsers always re-fetch the service worker SCRIPT from the network on
// navigation, so shipping this file is the only reliable way to clean up
// devices that already have the old worker installed. On activation it deletes
// every cache, unregisters itself, and reloads open tabs so they load fresh
// content straight from the network.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Delete all caches created by the old worker.
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));

      // 2. Unregister this worker so nothing intercepts requests anymore.
      await self.registration.unregister();

      // 3. Force-reload any open windows so they drop the controlled state
      //    and fetch the current pages from the network.
      const clientList = await self.clients.matchAll({ type: 'window' });
      clientList.forEach((client) => {
        if ('navigate' in client) {
          client.navigate(client.url);
        }
      });
    })()
  );
});
