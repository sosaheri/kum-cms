const fs = require('fs');
const path = require('path');

const theme = process.argv[2] || 'default';
const themeDir = path.join(__dirname, '..', 'themes', theme);
const partialsDir = path.join(themeDir, 'partials');

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
}

function buildIndex() {
  const manifestPath = path.join(partialsDir, 'manifest.json');
  const manifestRaw = safeRead(manifestPath);
  if (!manifestRaw) {
    console.error('No manifest.json for theme', theme);
    process.exit(1);
  }
  let list;
  try { list = JSON.parse(manifestRaw); } catch (e) { console.error('Invalid manifest.json', e); process.exit(1); }

  const head = `<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>${theme} — preview</title>\n  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600;700;800&display=swap" rel="stylesheet">\n  <link rel="stylesheet" href="theme.css">\n  <link rel="stylesheet" href="../../lib/framework/core.css">\n</head>\n<body>\n`;
  const foot = `\n<script type="module" src="./theme.js"></script>\n</body>\n</html>`;

  let body = '';
  const missing = [];
  for (const p of list) {
    const pfile = path.join(partialsDir, `${p}.html`);
    const txt = safeRead(pfile);
    if (txt == null) missing.push(p);
    else body += txt + '\n';
  }
  if (missing.length) {
    console.warn('Missing partials:', missing.join(', '));
  }
  const out = head + body + foot;
  const outPath = path.join(themeDir, 'index.html');
  fs.writeFileSync(outPath, out, 'utf8');
  console.log('Wrote', outPath);
}

buildIndex();
