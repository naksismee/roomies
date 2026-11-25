const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], {
  stdio: 'inherit', env: { ...process.env, REACT_APP_STORAGE_MODE: 'browser' },
});
process.exitCode = result.status || (result.error ? 1 : 0);
