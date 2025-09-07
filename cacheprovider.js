

/**
 * @Abstract
 */ 
class CacheProvider {

  constructor() {
    this.cacheEnabled = true;
  }

  async originFetch(request) {
    try {
      return await fetch(request);
    } catch (e) {
      console.debug('Network Failed ', e);
    }
    return new Response('', { status: 504, statusText: 'offline' });
  }

  async putCacheResponse(request, response) {
    const cacheControl = response.headers.get('cache-control');
    if (this.shouldCache(request)
      && response.status === 200 
      && (!cacheControl
          || !(cacheControl.includes('private') 
          || cacheControl.includes('no-store')))) {

      this.put(request, response.clone());
      return true;   
    }
    return false;
  }

  shouldCache(request) {
    return (this.cacheEnabled 
              && !request.headers.get('Authorization')
              && (request.destination === 'image'
                || request.destination === 'script'
                || request.destination === 'style'
                || request.destination === 'document'
                || request.destination === 'manifest'));
  }

  async getCacheResponse(request) {
    if (this.shouldCache(request) ) {
      const cachedResponse = await this.match(request, { ignoreSearch: true });
      if (cachedResponse) {
        const date = cachedResponse.headers.get('date');
        if (!date || (Date.now() - Date.parse(date)) < 60000) {
          return cachedResponse;
        }
      }
    }
    return false;
  }
}



/**
 * Use the standard system cache.
 * Implements match and put methods.
 * Doesnt scale much beyond 1K cache entries, use the diskcache in preference
 * were > 1K files or a pre-loaded cache is required.
 */ 
class SystemCache extends CacheProvider {
  constructor(cacheName) {
    super();
    this.cacheName = cacheName;
  }

  async match(request) {
    const cache = await caches.open(this.cacheName);
    return await cache.match(request, { ignoreSearch: true });
  }

  async put(request, responseCopy) {
    // need to set date, so have to take a copy of the headers
    const headers = new Headers(responseCopy.headers);
    headers.set('date', new Date().toUTCString());
    const body = await responseCopy.blob();
    const cacheResponse = new Response(body, {
      status: responseCopy.status,
      statusText: responseCopy.statusText,
      headers,
      ok: responseCopy.ok,
    });
    const cache = await caches.open(this.cacheName);
    await cache.put(request, cacheResponse);
  }
}

export {
  CacheProvider,
  SystemCache
};


