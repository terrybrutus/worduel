import { PocketIc, PocketIcServer } from '@dfinity/pic';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { importCache } from './import-cache.mjs';

const root = fileURLToPath(new URL('../../',import.meta.url));
const state = resolve(root,'.worduel-native');
mkdirSync(state,{recursive:true,mode:0o700});
const keyFile=resolve(state,'controller.json');
const controller=existsSync(keyFile) ? Ed25519KeyIdentity.fromJSON(readFileSync(keyFile,'utf8')) : Ed25519KeyIdentity.generate();
if (!existsSync(keyFile)) writeFileSync(keyFile,JSON.stringify(controller.toJSON()),{mode:0o600,flag:'wx'});
const sender=controller.getPrincipal();
const wasm=resolve(state,'build/backend.wasm');
const buildHash=createHash('sha256').update(readFileSync(wasm)).digest('hex');
let environmentVariables=[];
const envFile=resolve(root,'src/frontend/.env.local');
if (existsSync(envFile)) {
  const key=readFileSync(envFile,'utf8').split(/\r?\n/).find(line=>line.startsWith('ANTHROPIC_API_KEY='))?.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g,'');
  if(key) environmentVariables=[{name:'ANTHROPIC_API_KEY',value:key}];
}
const server=await PocketIcServer.start({ttl:86400});
let pic,canisterId,shuttingDown=false,snapshot;
async function saveSnapshot() {
  if (!pic || !canisterId) return;
  await pic.stopCanister({canisterId,sender});
  try {
    const taken=await pic.takeCanisterSnapshot({canisterId,sender,replaceSnapshot:snapshot});
    snapshot=taken.id;
    const directory=resolve(state,`snapshot-${Date.now()}`);
    await pic.downloadCanisterSnapshot({canisterId,snapshotId:snapshot,snapshotDir:directory,sender});
    writeFileSync(resolve(state,'snapshot.json.tmp'),JSON.stringify({directory,canisterId:canisterId.toText(),buildHash}),{mode:0o600});
    renameSync(resolve(state,'snapshot.json.tmp'),resolve(state,'snapshot.json'));
  } finally { await pic.startCanister({canisterId,sender}); }
}
async function shutdown() {
  if(shuttingDown) return; shuttingDown=true;
  try { await saveSnapshot(); } catch { console.error('Native snapshot failed. Existing snapshots were preserved.'); }
  try { if(pic) await pic.tearDown(); await server.stop(); } finally {process.exit(0);}
}
process.on('SIGINT',()=>void shutdown()); process.on('SIGTERM',()=>void shutdown());
try {
  pic=await PocketIc.create(server.getUrl(),{nns:{state:{type:'new'}},application:[{state:{type:'new'}}]});
  canisterId=await pic.createCanister({sender,controllers:[sender],environmentVariables,logVisibility:{controllers:null},snapshotVisibility:{controllers:null},statusVisibility:{controllers:null}});
  const previousFile=resolve(state,'snapshot.json');
  if(existsSync(previousFile)) {
    const previous=JSON.parse(readFileSync(previousFile,'utf8'));
    // Load the saved enhanced-persistence state, then perform a real upgrade.
    const snapshotId=await pic.uploadCanisterSnapshot({canisterId,snapshotDir:previous.directory,sender});
    await pic.loadCanisterSnapshot({canisterId,snapshotId,sender});
    // Snapshot loading consumes the local replica's heap-delta allowance.
    // Advance its simulated clock before upgrading instead of disabling limits.
    await pic.advanceTime(120000); await pic.tick(2);
    if(previous.buildHash !== buildHash) await pic.upgradeCanister({canisterId,wasm,sender,upgradeModeOptions:{skip_pre_upgrade:[],wasm_memory_persistence:[{keep:null}]}});
    await pic.updateCanisterSettings({canisterId,sender,controllers:[sender],environmentVariables});
  } else await pic.installCode({canisterId,wasm,sender});
  await importCache(pic,canisterId,sender,root);
  const gatewayPort=await pic.makeLive({httpGateway:{ipAddr:'127.0.0.1',port:49431}});
  writeFileSync(resolve(state,'runtime.json'),JSON.stringify({backend_canister_id:canisterId.toText(),backend_host:'',worduel_local:true,gateway_url:`http://127.0.0.1:${gatewayPort}`,pid:process.pid,readyAt:Date.now()}),{mode:0o600});
  console.log('WORDUEL_NATIVE_READY');
  // Keep the real local replica running until explicitly stopped. Shutdown saves state.
  setInterval(()=>{},60000);
} catch(error) {
  console.error(error.message); if(pic) await pic.tearDown(); await server.stop(); process.exitCode=1;
}
