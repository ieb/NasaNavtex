const express = require('express')
const fs = require('node:fs');
const path = require('node:path');
const https = require('https');

const app = express()
const port = 8080






// load from cache first
app.use('/navtex', express.static('./cache'));
// then try source
app.use('/navtex', express.static('./'));

// then try to proxy and save the cache.
app.use('/navtex',(req, res) => {
	const file = './cache'+req.path.replace('..','_');
	fs.mkdir(path.dirname(file), { recursive: true}, () => {
		const url = 'https:/'+req.path;
		const options = {
	      method: 'GET',
	      headers: {
			'Accept': '*/*',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'DNT': '1',
			'Pragma': 'no-cache',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
	      },
		}

		const proxyReq = https.request(url, options, (proxyRes) => {
		  res.status(proxyRes.statusCode);
		  Object.keys(proxyRes.headers).forEach((k) => {
			  res.append(k, proxyRes.headers[k]);

		  })

		  if ( proxyRes.statusCode == 200) {
		 	  const cacheFileStream = fs.createWriteStream(file);
			  proxyRes.on('data', (d) => {
			  	res.write(d);
			  	cacheFileStream.write(d);
			  });
			  proxyRes.on('close', () => {
			  	res.end();
			  	cacheFileStream.close();
			  });
		  } else {
		  	console.log('Failed ',url,file);
			  proxyRes.on('data', (d) => {
			  	res.write(d);
			  });
			  proxyRes.on('close', () => {
			  	res.end();
			  });
		  }
		});

		proxyReq.on('error', (e) => {
			console.log('Error',e);
			res.status(500).end();
		});
		proxyReq.end();

	});
	
});




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})