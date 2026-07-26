import fs from 'node:fs';

const ascAppId = process.env.ASC_APP_ID;
if (!/^\d+$/.test(ascAppId ?? '')) {
  console.error('ASC_APP_ID GitHub secret degeri eksik veya gecersiz.');
  process.exit(1);
}

const file = 'eas.json';
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
config.submit ??= {};
config.submit.production ??= {};
config.submit.production.ios = { ascAppId };
fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
