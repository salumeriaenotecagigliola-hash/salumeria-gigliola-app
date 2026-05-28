const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'domcontentloaded' }).catch(e => console.error(e));
  
  // Wait 3 seconds for React to mount
  await new Promise(r => setTimeout(r, 3000));
  
  const content = await page.content();
  console.log("HTML:", content.substring(0, 1000)); // just part of it to verify root has stuff
  
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log('Root HTML length:', rootHtml.length);
  
  await browser.close();
})();
