// scripts/download-font.js
// ดาวน์โหลดฟอนต์ Sarabun (TTF) จาก Google Fonts GitHub และบันทึกที่ public/fonts/THSarabunNew.ttf
const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf';
const outDir = path.join(__dirname, '..', 'public', 'fonts');
const outPath = path.join(outDir, 'THSarabunNew.ttf');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Failed to download font, status ' + res.statusCode));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
}

download(url, outPath)
  .then(() => console.log('Font downloaded to', outPath))
  .catch((err) => {
    console.error('Download failed:', err.message);
    process.exit(1);
  });
