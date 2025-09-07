/**
 * A disk cache implementation that supports both a pre-loaded tree of files 
 * implementing a static web server inside the webworker. Tested to scale with 
 * no performance decredation upto 24K files.
 * 
 * In addition a cache which is maintained by the webworker, also tested to 24K files.
 * 
 * The default local storage cache has a 10x to 100x performance degredation on access 
 * that makes it unusable for embedding large image sets (ie map tiles) into a PWA for offline access. 
 */ 


import { CacheProvider } from './cacheprovider.js';


const IGNORE_CACHE_LOAD = [
	".DS_Store",
	"node_modules",
	".git",
];

class DirectoryLoader {
	constructor() {

	}
	async load(cacheName, progressFn=(()=>{})) {
		// get the source directory
		const dirHandle = await window.showDirectoryPicker();
		progressFn(-1,-1);
		const nfiles =  await this.countFiles(dirHandle, IGNORE_CACHE_LOAD);
		progressFn(0,nfiles);
		const cacheRoot =  await (await navigator.storage.getDirectory())
			.getDirectoryHandle(cacheName, { create: true});
		let n = 0;

		for await (const f of this.recurseFiles(dirHandle, '.', IGNORE_CACHE_LOAD)) {
			await this.copy(f, cacheRoot);
			n++;
			if (n % 100 == 0) {
				progressFn(n,nfiles);
		      	console.log(`${n}:${nfiles} Copied ${f.path} into ${cacheName}`);
			}
		};
		progressFn(n,nfiles);
		console.log(`Loaded ${n}:${nfiles} files into ${cacheName}`);
	}

	/**
	 * Copies the source to the dest
	 * @source - the source file object as return from the generator
	 * @dest - a DirectoryFileHandle representing the base 
	 */ 
	async copy(source, dest) {
		let parent = dest;
		const paths = source.path.split('/');
		for (let i = 0; i < paths.length-1; i++) {
			if (paths[i] !== '.') {
				parent = await parent.getDirectoryHandle(paths[i], { create: true});
			}
		}
		const target = await parent.getFileHandle(paths[paths.length-1], { create: true});
		const writeBody = await target.createWritable();
      	await writeBody.write(await source.handle.getFile());
      	await writeBody.close();

	}
	async getCacheRecord(cacheName, paths, create) {
		const opfsRoot = await navigator.storage.getDirectory();
		if ( paths[paths.length-1] === '' ) {
			// trailing /
			paths[paths.length-1] = "index.html";
		}
		let parent = await opfsRoot.getDirectoryHandle(cacheName, { create: true});
		for (let i = 0; i < paths.length-1; i++) {
			if (paths[i] !== '.' && paths[i] !== '') {
				try {
					const child = await parent.getDirectoryHandle(paths[i], { create: create});
					if (!child) {
						return undefined;
					}					
					parent = child;
				// eslint-disable-next-line no-unused-vars
				} catch (e) {
					return undefined;
				}
			}
		}
		const bodyHandle = await parent.getFileHandle(paths[paths.length-1], { create: create});
		try {
			const headersHandle = await parent.getFileHandle(`.${paths[paths.length-1]}.json`, { create: create});
			return {
				bodyHandle,
				headersHandle,
			};
		} catch (e) {
			console.debug('No headers file',e);
		}
		return {
			bodyHandle,
			headersHandle: undefined,
		};
	}

	async purge(cacheName) {
		console.log(`Removing Cache ${cacheName}`);
		try {
			const opfsRoot = await navigator.storage.getDirectory();
			await opfsRoot.removeEntry(cacheName, { recursive: true});			
		} catch (e) {
			console.log("Failed ",e);
		}
	}


	async listCache() {
		const opfsRoot = await navigator.storage.getDirectory();
		let n = 0;
		for await (const f of this.recurseFiles(opfsRoot, '.')) {
			n++;
			console.log(`${n} ${f.path} ${f.handle.name}`);
		};

	}

	async countFiles(handle, ignore_names=[]) {
		if (ignore_names.indexOf(handle.name) !== -1 ) {
			return 0;
		}
		if (handle instanceof FileSystemFileHandle) {
			return 1;
		}
		let count = 0;
		for await (const [, value] of handle.entries()) {
			count += await this.countFiles(value,ignore_names);
		}
		return count;
	}

	// recurse into the tree
	async *recurseFiles(dirHandle, path, ignore_names=[]) {
		for await (const [key, value] of dirHandle.entries()) {
			if (ignore_names.indexOf(key) === -1) {
				if (value instanceof FileSystemFileHandle) {
					yield {
						handle:value,
						path: `${path}/${key}`,
					};				
				} else if (value instanceof FileSystemDirectoryHandle) {
					const newPath = `${path}/${key}`
					for await (const f of this.recurseFiles(value, newPath, ignore_names)) {
						yield f;
					}
				}				
			}
		}
	}

}



/**
 * Use the Origin Public Filesystem as webservere file system and cache.
 * for HITS 
 * 	tree under diskCache/ can be prepopulated and is used first
 * 	then the tree under workerCache/ is user
 * DirectoryLoader is used to access both trees.
 * Headers are stored as per the CacheRecord in the DirectoryLoader 
 */ 
class OPFSCache extends CacheProvider {
  constructor() {
    super();
    this.disk = new DirectoryLoader();
  }

  cacheId(s,n) {
    return Math.abs(s.split('').reduce((a,b)=>{
        a=((a<<5)-a)+b.charCodeAt(0);
        return a&a;
      },0)%n);
  }

  async loadCacheResponse(cacheName, paths) {
  	try {
	  	const diskCacheRecord = await this.disk.getCacheRecord(cacheName, paths, false);
	  	if ( diskCacheRecord && diskCacheRecord.bodyHandle) {
	        const body = await diskCacheRecord.bodyHandle.getFile();
	        if ( diskCacheRecord.headersHandle ) {
	        	const headersFile = await diskCacheRecord.headersHandle.getFile();
		        const headers = JSON.parse(await headersFile.text());
		  		return new Response(body, {
		  			headers,
		  		});
	        } else {
	        	// this might not return the right headers. tbd
		  		return new Response(body);
	        }
	  	}
	} catch (e) {
		console.debug("Failed loading ", cacheName, paths, e);
	}
  	return undefined;  	
  }


  async match(request) {
  	const pathname = new URL(request.url).pathname;
  	if ( pathname.startsWith('/navtex/cache') ) {
	  	const requestPaths = pathname.split('/').slice(3);
	  	const diskCacheResponse = await this.loadCacheResponse('diskCache', requestPaths);
	  	if ( diskCacheResponse) {
	  		return diskCacheResponse;
	  	}  		
  	}

    const pathNameB64 = btoa(request.url);
    const paths = [ this.cacheId(pathNameB64,100), `${pathNameB64}`];
  	return await this.loadCacheResponse('workerCache', paths);
  }



  async put(request, responseCopy) {
    const pathNameB64 = btoa(request.url);
    const paths = [ this.cacheId(pathNameB64,100), `${pathNameB64}`];
  	try {
	    const cacheRecord = await this.disk.getCacheRecord('workerCache', paths, true);
	    if ( cacheRecord && cacheRecord.headersHandle && cacheRecord.bodyHandle) {
	      const headers = {};
	      responseCopy.headers.forEach((v,k) => {
	        headers[k] = v;
	      });
	      headers.date = new Date().toUTCString();
	      const writeHeaders = await cacheRecord.headersHandle.createWritable();
	      await writeHeaders.write(JSON.stringify(headers));
	      await writeHeaders.close();

	      const writeBody = await cacheRecord.bodyHandle.createWritable();
	      await writeBody.write(await responseCopy.bytes());
	      await writeBody.close();
	    }
  	} catch (e) {
  		console.log("Failed saving ", paths, e);
  	}
  }

}

export {
	DirectoryLoader,
	OPFSCache,
};


/*

		accept-ranges
: 
"bytes"
cache-control
: 
"max-age=3600"
connection
: 
"keep-alive"
content-length
: 
"42448"
content-type
: 
"image/png"
date
: 
"Tue, 02 Sep 2025 12:55:51 GMT"
etag
: 
"W/\"31833980-42448-2025-06-19T07:19:08.108Z\""
keep-alive
: 
"timeout=5"
last-modified
: 
"Thu, 19 Jun 2025 07:19:08 GMT"
*/
