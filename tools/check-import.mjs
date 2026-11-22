import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../',import.meta.url));
const frontend = join(root,'src/frontend');
function run(command,args,cwd=root) {
  const result = spawnSync(command,args,{cwd,stdio:'inherit',env:process.env});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const bindgen = realpathSync(join(root,'node_modules/@caffeineai/bindgen'));
const manifest = JSON.parse(readFileSync(join(bindgen,'package.json'),'utf8'));
const cli = join(bindgen,manifest.bin['caffeine-bindgen']);
if (process.platform === 'win32') run('wsl.exe',['-d','Ubuntu','--exec','bash','tools/native-backend/build.sh']);
else run('bash',['tools/native-backend/build.sh']);
// Regenerate from the just-compiled Candid, never from stale checked-in types.
run(process.execPath,[cli,'--did-file','.worduel-native/build/backend.did','--out-dir','src/frontend/src','--actor-interface-file','--force']);
run(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],frontend);
run(process.execPath,['node_modules/@biomejs/biome/bin/biome','check','src'],frontend);
run(process.execPath,['node_modules/vite/bin/vite.js','build'],frontend);
run(process.execPath,['scripts/copy-env.mjs'],frontend);
console.log('PASS import preflight: native compilation, stable compatibility, fresh bindings, full frontend typecheck, lint and production build.');
