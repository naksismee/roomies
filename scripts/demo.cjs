const { spawn } = require('node:child_process');
const child = spawn(process.execPath, [require.resolve('react-scripts/scripts/start')], {
  stdio: 'inherit', env: { ...process.env, REACT_APP_STORAGE_MODE: 'browser' },
});
child.on('exit', code => { process.exitCode = code || 0; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
