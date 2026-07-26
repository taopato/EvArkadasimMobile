import fs from 'node:fs';
import path from 'node:path';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  console.error('Kullanim: npm run version:set -- 1.1.0');
  process.exit(1);
}

const root = process.cwd();
const files = ['app.json', 'package.json', 'package-lock.json'];

for (const file of files) {
  const filePath = path.join(root, file);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (file === 'app.json') {
    json.expo.version = version;
  } else {
    json.version = version;
    if (file === 'package-lock.json' && json.packages?.['']) {
      json.packages[''].version = version;
    }
  }

  fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`);
}

console.log(`Roomora uygulama surumu ${version} olarak ayarlandi.`);
