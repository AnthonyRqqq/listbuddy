const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'listbuddy-fresh-'));
const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of new Set(files)) {
  if (file.split('/').includes('node_modules') || path.basename(file) === '.env') continue;
  const source = path.join(root, file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  const destination = path.join(target, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
console.log('Fresh verification directory: ' + target);
function npm(args, env = process.env) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
    cwd: target, stdio: 'inherit', shell: process.platform === 'win32', env,
  });
  if (result.status !== 0) throw new Error('Fresh verification failed: npm ' + args.join(' '));
}
npm(['run', 'setup']);
npm(['run', 'check']);
// Supply connection configuration in memory; never copy credentials to the fixture checkout.
require('../server/node_modules/dotenv').config({ path: path.join(root, 'server/.env') });
npm(['run', 'test:e2e']);
console.log('PASS: fresh dependency install, lint, unit tests, build, and database/browser smoke test');
