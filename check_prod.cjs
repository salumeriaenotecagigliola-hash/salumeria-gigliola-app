const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

(async () => {
  const server = spawn('npx', ['-y', 'serve', '-l', '3002', 'dist']);
  server.stdout.on('data', d => console.log('SERVER:', d.toString()));
  server.stderr.on('data', d => console.error('SERVER ERR:', d.toString()));

  // wait 2s for server
  await new Promise(r => setTimeout(r, 2000));

  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    await page.goto('http://127.0.0.1:3002/', { waitUntil: 'domcontentloaded' }).catch(e => console.error(e));
    
    await new Promise(r => setTimeout(r, 3000));
    const rootHtml = await page.evaluate(() => {
       const el = document.getElementById('root');
       return el ? el.innerHTML : 'NOROOT';
    });
    console.log('Root HTML length:', rootHtml.length);
    
    if (rootHtml.length < 100) {
      const content = await page.content();
      console.log('Body:', content.substring(0, 500));
    }
    
    await browser.close();
  } catch(e) { console.error(e); }
  
  server.kill();
  process.exit(0);
})();
