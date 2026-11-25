const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill('SIGTERM'));
  process.exitCode = code;
}
const api = spawn(process.execPath, ['server/index.cjs'], { cwd: root, stdio: 'inherit' });
children.push(api);
api.on('error', () => stop(1));
api.on('exit', code => { if (!stopping) stop(code || 1); });
const client = spawn(process.execPath, [require.resolve('react-scripts/scripts/start')], {
  cwd: root, stdio: 'inherit', env: { ...process.env, BROWSER: process.env.BROWSER || 'none' },
});
children.push(client);
client.on('error', () => stop(1));
client.on('exit', code => { if (!stopping) stop(code || 0); });
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
