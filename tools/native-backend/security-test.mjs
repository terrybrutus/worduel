import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PocketIc, PocketIcServer } from '@dfinity/pic';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory as legacy } from './legacy-idl.mjs';

const idlFactory = ({ IDL }) => IDL.Service({
  ...Object.fromEntries(legacy({ IDL })._fields),
  getSessionGameHistory: Object.fromEntries(legacy({ IDL })._fields).getMyGameHistory,
  registerGuest: IDL.Func([], [IDL.Record({ token: IDL.Text, username: IDL.Text })], []),
  provisionIdentityAdmin: IDL.Func([IDL.Text, IDL.Principal], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
  getMyRematchOffer: IDL.Func([IDL.Text, IDL.Text], [IDL.Opt(IDL.Record({ newGameId: IDL.Text, roomCode: IDL.Text, joinToken: IDL.Text, offeredBy: IDL.Text }))], ['query']),
});
const server = await PocketIcServer.start();
const wasm = process.env.WORDUEL_WASM || fileURLToPath(new URL('./backend.wasm', import.meta.url));
let pic;
try {
  pic = await PocketIc.create(server.getUrl());
  const { actor, canisterId } = await pic.setupCanister({ idlFactory, wasm });
  const a = await actor.registerGuest();
  const b = await actor.registerGuest();
  const outsider = await actor.registerGuest();
  assert.match(a.token, /^v3:\d+:[a-f0-9]{64}$/);
  assert.notEqual(a.token, b.token);
  assert.deepEqual(await actor.getAdminSetupInfo(), []);
  assert.ok('err' in await actor.register('admin', 'secret'));
  assert.ok('err' in await actor.login('admin', 'secret'));
  assert.ok('err' in await actor.promoteToAdmin(a.username, 'anything'));
  const created = (await actor.createPrivateGame(a.token, { versus: null })).ok;
  assert.equal(created.roomCode.length, 17);
  assert.match(created.joinToken, /^[a-f0-9]{64}$/);
  assert.ok('err' in await actor.getGameState(outsider.token, created.gameId));
  assert.deepEqual(await actor.getGameStateWithRole(created.gameId, outsider.token), []);
  assert.ok('err' in await actor.requestRematch(outsider.token, created.gameId));
  assert.ok('ok' in await actor.joinByToken(b.token, created.joinToken, [created.gameId]));
  const view = (await actor.getGameState(a.token, created.gameId)).ok;
  assert.deepEqual(view.answer, []);
  assert.ok('err' in await actor.recordResult(a.token, true, b.username, { win: null }));
  assert.ok('ok' in await actor.leaveGame(b.token, created.gameId));
  const stats = await actor.getMyStats(a.token);
  assert.equal(stats[0].totalWins, 1n);
  await actor.leaveGame(b.token, created.gameId);
  assert.deepEqual(await actor.getMyStats(a.token), stats);
  assert.equal((await actor.getMyGameHistory(a.username)).length, 0);
  assert.equal((await actor.getSessionGameHistory(a.token)).length, 1);
  const offer = (await actor.requestRematch(a.token, created.gameId)).ok;
  assert.ok(offer.newGameId);
  assert.deepEqual(await actor.getRematchOffer(created.gameId), []);
  assert.deepEqual(await actor.getMyRematchOffer(outsider.token, created.gameId), []);
  assert.ok('err' in await actor.acceptRematch(outsider.token, created.gameId));
  const joinedByRequest=await actor.requestRematch(b.token,created.gameId);
  assert.equal(joinedByRequest.ok.newGameId,offer.newGameId);
  assert.ok('ok' in await actor.acceptRematch(b.token, created.gameId));
  const identity = Principal.fromUint8Array(Uint8Array.of(1, 2, 3));
  actor.setPrincipal(identity);
  assert.ok('err' in await actor.provisionIdentityAdmin(a.username, identity));
  actor.setPrincipal(Principal.anonymous());
  assert.ok('ok' in await actor.provisionIdentityAdmin(a.username, identity));
  assert.deepEqual(await actor.getUsernameForSession(a.token), []);
  actor.setPrincipal(identity);
  const login = await actor.loginWithIdentity('ignored');
  assert.ok('ok' in login);
  assert.equal((await actor.getUsernameForSession(login.ok))[0], a.username);
  assert.ok((await actor.listAllPlayers(login.ok)).length >= 3);
  await actor.disablePlayer(login.ok, b.username);
  assert.deepEqual(await actor.getUsernameForSession(b.token), []);
  await pic.upgradeCanister({ canisterId, wasm, upgradeModeOptions: { skip_pre_upgrade: [], wasm_memory_persistence: [{ keep: null }] } });
  assert.deepEqual(await actor.getMyStats(login.ok), stats);
  await pic.advanceTime(31 * 86400 * 1000);
  await pic.tick();
  assert.deepEqual(await actor.getUsernameForSession(login.ok), []);
  console.log('PASS: cryptographic sessions, private game isolation, rematch authorization, authoritative/idempotent stats, identity admin, disabled accounts, expiry, and real Wasm upgrade.');
} finally {
  if (pic) await pic.tearDown();
  await server.stop();
}
