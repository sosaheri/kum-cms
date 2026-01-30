#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

async function copyRecursive(src, dest) {
  const stat = await fs.stat(src);
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src);
    for (const e of entries) {
      await copyRecursive(path.join(src, e), path.join(dest, e));
    }
  } else {
    await fs.copyFile(src, dest);
  }
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: node scaffold-theme.js <theme-name>');
    process.exit(1);
  }

  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'themes', 'default');
  const dest = path.join(root, 'themes', name);

  try {
    await fs.stat(src);
  } catch (e) {
    console.error('Source theme `themes/default` not found.');
    process.exit(2);
  }

  try {
    await fs.stat(dest);
    console.error('Destination already exists:', dest);
    process.exit(3);
  } catch (e) {
    // dest does not exist — proceed
  }

  try {
    await copyRecursive(src, dest);
    console.log('Created theme:', dest);
    console.log('You can now customize the files in', dest);
  } catch (err) {
    console.error('Error while copying theme:', err);
    process.exit(4);
  }
}

main();
