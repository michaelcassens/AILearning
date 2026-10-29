// Copies the single-file game from the repo root into www/ and its icon into build/.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), www = path.join(__dirname, 'www');
fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
fs.copyFileSync(path.join(root, 'keep_onslaught.html'), path.join(www, 'index.html'));
for (const f of ['keep_onslaught_icon.png', 'keep_onslaught.webmanifest']) fs.copyFileSync(path.join(root, f), path.join(www, f));
fs.copyFileSync(path.join(root, 'keep_onslaught_icon.png'), path.join(__dirname, 'build', 'icon.png'));
console.log('Copied the game into www/');
