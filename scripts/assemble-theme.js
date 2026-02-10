#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}

function validateAccess(sectionId) {
  // Stub for future Premium validation logic (Triple Candado).
  // Currently always returns true but leaves a clear integration point.
  return true;
}

function resolveValue(key, context) {
  // support simple dot notation
  const parts = key.split('.');
  let cur = context;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
    else return undefined;
  }
  return cur;
}

function renderTemplate(html, context) {
  return html.replace(/{{\s*([\w.]+)\s*}}/g, (m, key) => {
    const v = resolveValue(key, context);
    return v === undefined || v === null ? '' : String(v);
  });
}

function cleanScripts(html) {
  // Remove all <script ...>...</script> and standalone script tags to produce pure static output
  return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}

function assemble() {
  const cwd = process.cwd();
  const dataDir = path.join(cwd, 'data');
  const layout = readJsonSafe(path.join(dataDir, 'layout.json'));
  if (!layout || !Array.isArray(layout.sections)) {
    console.error('Error: data/layout.json missing or invalid. Expected {"sections": ["hero-standard", ...]}');
    process.exit(1);
  }

  const config = readJsonSafe(path.join(dataDir, 'config.json')) || {};
  const sectionsData = readJsonSafe(path.join(dataDir, 'sections.json')) || {};

  const libraryBase = path.join(cwd, 'library', 'sections', 'base');
  const assembled = [];

  for (const sectionId of layout.sections) {
    if (!validateAccess(sectionId)) {
      assembled.push(`<!-- PROTECTED_SECTION:${sectionId} -->`);
      continue;
    }

    const sectionPath = path.join(libraryBase, `${sectionId}.html`);
    if (!fs.existsSync(sectionPath)) {
      assembled.push(`<!-- MISSING_SECTION:${sectionId} -->`);
      continue;
    }

    let raw = fs.readFileSync(sectionPath, 'utf8');
    // Merge contexts: section-specific overrides global config
    const context = Object.assign({}, config, sectionsData[sectionId] || {});
    const rendered = renderTemplate(raw, context);
    assembled.push(rendered);
  }

  // Read master index.html template
  const masterPath = path.join(cwd, 'index.html');
  let master = fs.readFileSync(masterPath, 'utf8');

  const sectionsHtml = assembled.join('\n');
  master = master.replace('<!-- KUMI_SECTIONS_GO_HERE -->', sectionsHtml);

  // ensure identity hook exists
  if (!master.includes('<!-- KUMI_IDENTITY_HOOK -->')) {
    master = master.replace('</body>', '\n    <!-- KUMI_IDENTITY_HOOK -->\n  </body>');
  }

  // Produce standalone: remove script tags to generate pure static output
  const standalone = cleanScripts(master);

  const outDir = path.join(cwd, 'themes', 'default');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'index-standalone.html');
  fs.writeFileSync(outPath, standalone, 'utf8');

  console.log('Assembled sections:', layout.sections.join(', '));
  console.log('Wrote:', outPath);
}

if (require.main === module) assemble();
