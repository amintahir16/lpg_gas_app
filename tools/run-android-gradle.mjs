/**
 * Cross-platform: run `assembleDebug` / `assembleRelease` from repo `android/`.
 */
import { spawnSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const task = process.argv[2] || 'assembleDebug';
const win = process.platform === 'win32';

const result = win
  ? spawnSync('cmd.exe', ['/c', 'gradlew.bat', task], {
      cwd: androidDir,
      stdio: 'inherit',
    })
  : spawnSync('./gradlew', [task], {
      cwd: androidDir,
      stdio: 'inherit',
    });

process.exit(result.status === null ? 1 : result.status);
