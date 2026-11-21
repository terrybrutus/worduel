import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(new URL('../src/frontend/package.json',import.meta.url));
const ts = require('typescript');
async function load(name) {
  const code = readFileSync(new URL(`../src/frontend/src/lib/${name}.ts`,import.meta.url),'utf8');
  const output = ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}
const {readWithDeadline} = await load('readDeadline');
assert.equal(await readWithDeadline(async()=>42,100),42);
await assert.rejects(readWithDeadline(()=>new Promise(()=>{}),10),/timed out/);
await assert.rejects(readWithDeadline(async()=>{throw new Error('unavailable');},100),/unavailable/);
const {inviteError,GameAccessError} = await load('gameConnection');
assert.equal(inviteError('game_full').title,'This game is full');
assert.equal(inviteError('game_not_found').title,'Invite unavailable');
assert.equal(inviteError('already_in_game:game-22').title,'Invite unavailable');
assert.equal(inviteError('Invalid or expired session').title,'Your session needs refreshing');
assert.equal(inviteError('game_started').title,'This round has ended');
assert.equal(inviteError('internal network failure').title,'Could not connect');
assert.ok(new GameAccessError('not a member') instanceof Error);
console.log('PASS read deadlines, error propagation, invite classifications and application-error distinction.');
