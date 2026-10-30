// Copies the single-file game from the repo root into www/ as the app's start page.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(__dirname, 'www');
fs.mkdirSync(www, { recursive: true });
fs.copyFileSync(path.join(root, 'keep_onslaught.html'), path.join(www, 'index.html'));
for (const f of ['keep_onslaught_icon.png', 'keep_onslaught.webmanifest']) fs.copyFileSync(path.join(root, f), path.join(www, f));
console.log('Copied the game into www/');
