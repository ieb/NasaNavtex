/* eslint-disable no-restricted-globals */

/**
 * The worker is here to allow installation, its not
 * here to for much more as doing anything complex makes
 * reloading the worker hard.
 *
 * If the performance of the cache suffers, increase the number of cache shards.
 */

const CACHE_NAME = 'navtexClient';


self.addEventListener('install', async (event) => {
});



self.addEventListener('beforeinstallprompt', (event) => {
  console.debug('Before Event Install ', event);
});


// 20 caches, increase the number of cache performance suffers
// use a simple hash of the path.
// however tests show this does not work, at about 10K items the request time goes from 3ms to 30ms or more
// due to the cache. Best to disable the cache completely.
const cacheName = (s,n) => CACHE_NAME+'_'+Math.abs(s.split('').reduce((a,b)=>{
    a=((a<<5)-a)+b.charCodeAt(0);
    return a&a;
  },0)%n);


if ( false ) {

  let cacheEnabled = false;
  self.addEventListener('message', (event) => {
    if (event.data.cacheEnabled !== undefined) {
      cacheEnabled = event.data.cacheEnabled;
      console.log('Cache Enabled now ', cacheEnabled);
    }
  });

  self.addEventListener('fetch', (event) => {
    const pathway = [ event.request.url ];
    const pathname = new URL(event.request.url).pathname;
    if (event.request.method === 'GET') {
      event.respondWith((async () => {
        if (cacheEnabled
          && !event.request.headers.get('Authorization')
            && (event.request.destination === 'image'
            || event.request.destination === 'script'
            || event.request.destination === 'style'
            || event.request.destination === 'document'
            || event.request.destination === 'manifest')) {
          const cacheId = cacheName(pathname,20);
          pathway.push(cacheId);
          const cache = await caches.open(cacheId);
          const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
          if (cachedResponse) {
            pathway.push('match');
            const date = cachedResponse.headers.get('date');
            if (date
              && (Date.now() - Date.parse(date)) < 60000) {
              //console.debug('HIT', cachedResponse);
              pathway.push('match');
              console.debug('Pathway ', pathway);
              return cachedResponse;
            }
            cachedResponse.headers.forEach(console.debug);
            //console.debug('Expired', cachedResponse, (Date.now() - Date.parse(date)));
            pathway.push('expired');
          }
          try {
            // If the resource was not in the cache or too old in the cache try the network.
            const fetchResponse = await fetch(event.request);

            if (fetchResponse.status === 200) {
              const cacheControl = fetchResponse.headers.get('cache-control');
              if (!cacheControl
                  || !(cacheControl.includes('private') || cacheControl.includes('no-store'))) {
                // Save the resource in the cache and return it.
                // create a new copy so that we can set the date header as Chrome Web Server
                // doesnt set this.
                // clone so that we can read the body.
                const copy = fetchResponse.clone();
                const headers = new Headers(copy.headers);
                headers.set('date', new Date().toUTCString());
                const body = await copy.blob();
                const cacheResponse = new Response(body, {
                  status: fetchResponse.status,
                  statusText: fetchResponse.statusText,
                  headers,
                  ok: fetchResponse.ok,
                });
                //console.debug('MISS', cacheResponse);
                cache.put(event.request, cacheResponse);    
                pathway.push('miss-cached');
                pathway.push(fetchResponse);
                console.debug('Pathway ', pathway);
                return fetchResponse;
              }
            }
            //console.debug('PASS', fetchResponse);
            pathway.push('fetch-fail');
            pathway.push(fetchResponse);
          } catch (e) {
            console.debug('Network Failed ', e);
            pathway.push('net-fail');
            // The network failed.
          }
          if (cachedResponse) {
            // serve stale if its available
            //console.debug('STALE', cachedResponse);
            pathway.push('serve-stale');
            console.debug('Pathway ', pathway);
            return cachedResponse;
          }
        }
        try {
          //console.debug('PASS Request ', event.request);
          const passResponse = await fetch(event.request);
          //console.debug('PASS request', event.request);
          //for (const k of event.request.headers.keys()) {
          //  console.debug(`   ${k}: ${event.request.headers.get(k)}`);
          //}
          //console.debug('PASS response', passResponse);
          //for (const k of passResponse.headers.keys()) {
          //  console.debug(`   ${k}: ${passResponse.headers.get(k)}`);
          //}
          pathway.push(event.request.destination);
          pathway.push('pass-response');
          pathway.push(passResponse);
          console.debug('Pathway ', pathway);
          return passResponse;
        } catch (e) {
          console.debug('Network Failed ', e);
          pathway.push('pass-netfail');
        }
        pathway.push('504');
        console.debug('Pathway ', pathway);
        return new Response('', { status: 504, statusText: 'offline' });
      })());
    } else {
      console.log("no cache ", pathname );
    }
  });
}

