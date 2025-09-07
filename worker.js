/**
 * The worker is here to allow installation, its not
 * here to for much more as doing anything complex makes
 * reloading the worker hard.
 *
 * If the performance of the cache suffers, increase the number of cache shards.
 */


import { OPFSCache } from './diskcache.js';


const cacheProvider = new OPFSCache();


// eslint-disable-next-line no-unused-vars
self.addEventListener('install', async (event) => {
});



self.addEventListener('beforeinstallprompt', (event) => {
  console.debug('Before Event Install ', event);
});



self.addEventListener('message', (event) => {
  if (event.data.cacheEnabled !== undefined) {
    cacheProvider.cacheEnabled = event.data.cacheEnabled;
    console.log('Cache Enabled now ', cacheProvider.cacheEnabled);
  }
});



const stats = {
  hits: 0,
  miss: 0,
  pass: 0,
  chr: 0,
};
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith((async () => {
        const cachedResponse = await cacheProvider.getCacheResponse(event.request);
        if ( cachedResponse ) {
          console.debug('hit', event.request.url);
          stats.hits++;
          stats.chr = stats.hits/(stats.hits+stats.miss+stats.pass);
          cachedResponse.headers.set('x-worker-cache','hit');
          cachedResponse.headers.set('x-worker-stats',JSON.stringify(stats));
          return cachedResponse;
        }
        // If the resource was not in the cache or too old in the cache try the network.
        const fetchResponse = await cacheProvider.originFetch(event.request);
        if ( await cacheProvider.putCacheResponse(event.request, fetchResponse) ) {
          console.debug('miss-cached', event.request.url);
          stats.miss++;
          stats.chr = stats.hits/(stats.hits+stats.miss+stats.pass);
          return fetchResponse;
        } else if (fetchResponse.status === 504 && cachedResponse) {
          console.debug('serve-stale', event.request.url);
          stats.hits++;
          stats.chr = stats.hits/(stats.hits+stats.miss+stats.pass);
          cachedResponse.headers.set('x-worker-cache','serve-stale');
          cachedResponse.headers.set('x-worker-stats',JSON.stringify(stats));
          return cachedResponse;              
        } else {
          console.debug('miss', event.request.url);
          stats.miss++;
          stats.chr = stats.hits/(stats.hits+stats.miss+stats.pass);
          return fetchResponse;
        }
    })());
  } else {
    stats.pass++;
    console.log("pass ", event.request.url );
  }
});

