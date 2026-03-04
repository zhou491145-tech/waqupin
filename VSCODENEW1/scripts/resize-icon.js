const fs = require('fs');
const { PNG } = require('pngjs');

const input = 'icon_c.png';
const out = 'icon.png';
const backup = 'BAK/icon.png.bak2';

if (!fs.existsSync(input)) {
  console.error('Input not found:', input);
  process.exit(1);
}

if (!fs.existsSync('BAK')) fs.mkdirSync('BAK');
if (fs.existsSync(out)) fs.copyFileSync(out, backup);

const data = fs.readFileSync(input);
PNG.sync.read(data); // quick check

const img = PNG.sync.read(data);
const srcW = img.width, srcH = img.height;
const destW = 128, destH = 128;
const dest = new PNG({ width: destW, height: destH });

for (let y = 0; y < destH; y++) {
  for (let x = 0; x < destW; x++) {
    // nearest neighbor sampling
    const sx = Math.floor(x * srcW / destW);
    const sy = Math.floor(y * srcH / destH);
    const sp = (sy * srcW + sx) << 2;
    const dp = (y * destW + x) << 2;
    dest.data[dp] = img.data[sp];
    dest.data[dp+1] = img.data[sp+1];
    dest.data[dp+2] = img.data[sp+2];
    dest.data[dp+3] = img.data[sp+3];
  }
}

fs.writeFileSync(out, PNG.sync.write(dest));
console.log('Wrote', out, 'from', input, `(${srcW}x${srcH} -> ${destW}x${destH})`);
