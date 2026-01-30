#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

const schemaMap = {
  'proyectos.json': require('../schemas/projects.schema.json'),
  'talleres.json': require('../schemas/workshops.schema.json')
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

let hadErrors = false;
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  console.error('No data/ directory found.');
  process.exit(1);
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.warn('No JSON files found in data/. Nothing to validate.');
  process.exit(0);
}

for (const file of files) {
  const full = path.join(dataDir, file);
  console.log(`Validating ${file} ...`);
  try {
    const data = loadJson(full);
    const schema = schemaMap[file];
    if (!schema) {
      console.warn(`  No schema configured for ${file}, skipping.`);
      continue;
    }
    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      hadErrors = true;
      console.error(`  Errors in ${file}:`);
      for (const err of validate.errors) {
        console.error(`    - ${err.instancePath} ${err.message}`);
      }
    } else {
      console.log('  OK');
    }
  } catch (e) {
    hadErrors = true;
    console.error(`  Failed to parse ${file}: ${e.message}`);
  }
}

if (hadErrors) process.exit(1);
console.log('\nAll data files valid.');
process.exit(0);
