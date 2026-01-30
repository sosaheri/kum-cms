#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const theme = process.argv[2] || 'default';
const outName = process.argv[3] || 'index-standalone.html';
const root = path.join(__dirname, '..');
const themeDir = path.join(root, 'themes', theme);

function safeRead(p, enc='utf8'){ try { return fs.readFileSync(p, enc); } catch(e){ return null } }

// Build body: prefer existing index.html, else assemble from partials manifest
function buildBody(){
  const indexPath = path.join(themeDir, 'index.html');
  const partialsDir = path.join(themeDir, 'partials');
  const indexRaw = safeRead(indexPath);
  if (indexRaw) return indexRaw;
  const manifestPath = path.join(partialsDir, 'manifest.json');
  const manifestRaw = safeRead(manifestPath);
  if (!manifestRaw) { console.error('No manifest.json and no index.html for theme', theme); process.exit(1); }
  let list;
  try { list = JSON.parse(manifestRaw); } catch(e){ console.error('Invalid manifest.json', e); process.exit(1); }
  let body = '<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>'+theme+' — standalone</title>\n';
  // keep fonts and icon links
  body += '  <link rel="preconnect" href="https://fonts.googleapis.com">\n  <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600;700;800&display=swap" rel="stylesheet">\n';
  body += '</head>\n<body>\n';
  for (const p of list){
    const pfile = path.join(partialsDir, `${p}.html`);
    const txt = safeRead(pfile);
    if (txt) body += txt + '\n'; else console.warn('Missing partial', p);
  }
  body += '\n</body>\n</html>';
  return body;
}

function inlineCss(html){
  const coreCss = safeRead(path.join(root, 'lib', 'framework', 'core.css')) || '';
  const themeCss = safeRead(path.join(themeDir, 'theme.css')) || '';
  // Replace link rel="stylesheet" href="theme.css" or core.css occurrences
  // Simple injection: place combined styles into a <style> tag in head
  const styleTag = `<style>\n/* core.css */\n${coreCss}\n/* theme.css */\n${themeCss}\n</style>`;
  // inject after <head> open
  return html.replace(/<head[^>]*>/i, match => match + '\n' + styleTag + '\n');
}

function inlineData(html){
  const dataDir = path.join(root, 'data');
  let files = [];
  try { files = fs.readdirSync(dataDir).filter(f=>f.endsWith('.json')); } catch(e) { files = []; }
  const dataObj = {};
  for (const f of files){
    const txt = safeRead(path.join(dataDir, f));
    try { dataObj[f] = JSON.parse(txt); } catch(e){ dataObj[f] = null; }
  }
  const dataScript = `\n<script>\nwindow.__STANDALONE_DATA = ${JSON.stringify(dataObj)};\n(function(){\n  const orig = window.fetch.bind(window);\n  window.fetch = function(input, init){\n    try{ const url = typeof input === 'string' ? input : input.url; const m = url.match(/data\/([^\/\\?#]+\.json)$/); if(m){ const name = m[1]; if(window.__STANDALONE_DATA && window.__STANDALONE_DATA[name]!==undefined){ return Promise.resolve(new Response(JSON.stringify(window.__STANDALONE_DATA[name]),{headers:{'Content-Type':'application/json'}})); } } }catch(e){}; return orig(input, init); };\n})();\n</script>\n`;
  // inject before closing </head> if exists, else at top of body
  if (html.match(/<\/head>/i)) return html.replace(/<\/head>/i, dataScript + '\n</head>');
  return html.replace(/<body[^>]*>/i, match => match + '\n' + dataScript);
}

function writeOut(content){
  const outPath = path.join(themeDir, outName);
  fs.writeFileSync(outPath, content, 'utf8');
  console.log('Wrote', outPath);
}

// Build process
let html = buildBody();
html = inlineCss(html);
html = inlineData(html);
writeOut(html);
