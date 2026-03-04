const fs = require('fs');
const path = require('path');
const mappings = [
  { src: '图片1.png', dest: 'screenshot1.png' },
  { src: '图片2.png', dest: 'screenshot2.png' },
  { src: '图片5.png', dest: 'screenshot3.png' }
];
const imgDir = path.join(__dirname, '..', 'images');
if (!fs.existsSync(imgDir)) {
  console.error('images directory not found:', imgDir);
  process.exit(1);
}
for (const m of mappings) {
  const src = path.join(imgDir, m.src);
  const dest = path.join(imgDir, m.dest);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Copied', m.src, '→', m.dest);
  } else {
    console.warn('Source not found, skipping:', m.src);
  }
}
console.log('Done.');
