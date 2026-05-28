const { Jimp } = require('jimp');

async function fixIcon(filename, outputName, targetSize) {
  try {
    const original = await Jimp.read('public/' + filename);
    const w = original.bitmap.width;
    const h = original.bitmap.height;
    
    // Create new white image
    const newImage = new Jimp({ width: targetSize, height: targetSize, color: 0xffffffff });
    
    // Scale original to 65% of size (so it has 35% padding) for app icon
    const scale = (targetSize * 0.65) / Math.max(w, h);
    const newW = Math.floor(w * scale);
    const newH = Math.floor(h * scale);
    
    original.resize({ w: newW, h: newH });
    
    // Center it
    const offsetX = Math.floor((targetSize - newW) / 2);
    const offsetY = Math.floor((targetSize - newH) / 2);
    newImage.composite(original, offsetX, offsetY);
    
    await newImage.write('public/' + outputName);
    console.log('Fixed ' + outputName + ' to ' + targetSize + 'x' + targetSize);
  } catch (err) {
    console.error(err);
  }
}

async function run() {
  await fixIcon('logo-512.png', 'app-icon-512.png', 512);
  await fixIcon('logo-512.png', 'app-icon-192.png', 192); // She said logo-512.png should serve as app icon!
  // "il logo unnamed(1).png è il vecchio logo-512.png e deve essere anche l'icona dell'app quando la scarico sia su android che su apple."
  // Wait, so app-icon should BOTH be made from logo-512.png!
}

run();
