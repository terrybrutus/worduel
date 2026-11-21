import assert from 'node:assert/strict';
import { PocketIc,PocketIcServer } from '@dfinity/pic';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory as legacy } from './legacy-idl.mjs';
const idlFactory=({IDL})=>IDL.Service({
 ...Object.fromEntries(legacy({IDL})._fields),
 getSessionGameHistory:Object.fromEntries(legacy({IDL})._fields).getMyGameHistory,
 appCall:IDL.Func([IDL.Text,IDL.Text,IDL.Text],[IDL.Text],[]),
 provisionIdentityAdmin:IDL.Func([IDL.Text,IDL.Principal],[IDL.Variant({ok:IDL.Null,err:IDL.Text})],[]),
});
const server=await PocketIcServer.start();let pic;
try{
 pic=await PocketIc.create(server.getUrl());
 const {actor,canisterId}=await pic.setupCanister({idlFactory,wasm:process.env.WORDUEL_OLD_WASM});
 const a=(await actor.register('before-a','fixture-only-password')).ok;
 const b=(await actor.register('before-b','fixture-only-password')).ok;
 assert.ok(a&&b);
 const game=(await actor.createPrivateGame(a,{versus:null})).ok;
 await actor.joinByToken(b,game.joinToken,[game.gameId]);
 await actor.leaveGame(b,game.gameId);
 const previousStats=await actor.getMyStats(a);
 assert.equal((await actor.getMyGameHistory('before-a')).length,1);
 await pic.advanceTime(120000);await pic.tick(2);
 await pic.upgradeCanister({canisterId,wasm:process.env.WORDUEL_WASM,upgradeModeOptions:{skip_pre_upgrade:[],wasm_memory_persistence:[{keep:null}]}});
 assert.deepEqual(await actor.getAdminSetupInfo(),[]);
 assert.deepEqual(await actor.getUsernameForSession(a),[]);
 assert.ok('err' in await actor.login('before-a','fixture-only-password'));
 const identity=Principal.fromUint8Array(Uint8Array.of(4,5,6));
 assert.ok('ok' in await actor.provisionIdentityAdmin('before-a',identity));
 actor.setPrincipal(identity);
 const token=(await actor.loginWithIdentity('before-a')).ok;
 assert.ok(token);
 assert.deepEqual(await actor.getMyStats(token),previousStats);
 assert.equal((await actor.getSessionGameHistory(token)).length,1);
 await actor.leaveGame(token,game.gameId);
 assert.deepEqual(await actor.getMyStats(token),previousStats,'An old finished match must not be counted again after upgrading');
 assert.equal((await actor.getSessionGameHistory(token)).length,1);
 console.log('PASS previous committed backend -> new backend: old accounts/history/stats retained, unsafe passwords/sessions/setup retired, controller identity recovery works, no duplicate results.');
}finally{if(pic)await pic.tearDown();await server.stop();}
