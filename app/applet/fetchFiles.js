const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/salumeriaenotecagigliola-hash/salumeria-gigliola-app/42a4b283836fb60e0c18f7986c986fb3b55c49bd/src/lib/menuService.ts', (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => { 
    fs.writeFileSync('src/lib/menuService.ts', data); 
    console.log('menuService.ts downloaded'); 
  });
}).on('error', (e) => {
  console.error(e);
});

https.get('https://raw.githubusercontent.com/salumeriaenotecagigliola-hash/salumeria-gigliola-app/42a4b283836fb60e0c18f7986c986fb3b55c49bd/package-lock.json', (res) => {
  let data = '';
  res.on('data', (d) => { data += d; });
  res.on('end', () => { 
    fs.writeFileSync('package-lock.json', data); 
    console.log('package-lock.json downloaded'); 
  });
}).on('error', (e) => {
  console.error(e);
});
