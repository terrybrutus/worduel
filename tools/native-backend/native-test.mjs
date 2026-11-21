import assert from 'node:assert/strict';
import { PocketIc, PocketIcServer } from '@dfinity/pic';
import { fileURLToPath } from 'node:url';
const idlFactory = ({ IDL }) => IDL.Service({ appCall: IDL.Func([IDL.Text,IDL.Text,IDL.Text],[IDL.Text],[]) });
const server = await PocketIcServer.start();
let pic;
try {
  pic = await PocketIc.create(server.getUrl());
  const { actor } = await pic.setupCanister({ idlFactory, wasm: process.env.WORDUEL_WASM || fileURLToPath(new URL('./backend.wasm',import.meta.url)) });
  const call = async (token,method,args=[]) => JSON.parse(await actor.appCall(token,method,JSON.stringify(args)));
  const a = await call('','guest');
  const b = await call('','guest');
  console.log('Guest response keys:',Object.keys(a).join(','));
  assert.match(a.token,/^v3:/);
  for (const length of [5,6,7]) {
    const created = (await call(a.token,'createPrivateGame',[a.token,'versus',length]))['#ok'];
    assert.ok(created?.gameId);
    const joined = (await call(b.token,'joinByToken',[b.token,created.joinToken,created.gameId]))['#ok'];
    assert.equal(joined.wordLength,length);
    assert.equal(joined.answer,null);
    const word = {5:'prune',6:'garden',7:'library'}[length];
    const guess = (await call(a.token,'submitGuess',[a.token,created.gameId,word]))['#ok'];
    assert.equal(guess.myGuesses[0].word,word);
    const hidden = (await call(b.token,'getGameState',[b.token,created.gameId]))['#ok'];
    assert.equal(hidden.opponentGuessTileStates[0].length,length);
    assert.equal(hidden.myGuesses.length,0);
    const bad = await call(b.token,'submitGuess',[b.token,created.gameId,'z'.repeat(length)]);
    assert.ok(bad['#err']);
    const daily = await call(a.token,'dailyChallenge',[length]);
    const same = await call(b.token,'dailyChallenge',[length]);
    assert.equal(daily.id,same.id);
    assert.equal(daily.guesses.length,0);
    assert.equal(daily.answer,null);
    const replay = await call(a.token,'createReplay',[length]);
    assert.match(replay.id,/^[a-f0-9]{64}$/);
    for (const guessWord of {5:['crane','pride','plant','flame','world','heart'],6:['planet','garden','bridge','silver','castle','stream'],7:['journey','picture','blanket','thunder','library','morning']}[length]) {
      const state = await call(a.token,'submitChallengeGuess',[replay.id,guessWord]);
      if (state.finished) { assert.ok(state.answer); assert.equal(state.scores.length,1); break; }
    }
    const other = await call(b.token,'challengeState',[replay.id]);
    assert.equal(other.answer,null);
    assert.equal(other.guesses.length,0);
    assert.equal(other.scores.length,0);
    await call(b.token,'leaveGame',[b.token,created.gameId]);
    const opponents=await call(a.token,'getMyOpponentStats');
    assert.ok(Array.isArray(opponents) && opponents.length>=1);
    assert.ok(Array.isArray(opponents[0]) && opponents[0][0]===b.username,JSON.stringify(opponents));
  }
  assert.equal((await call(a.token,'listChallenges')).length,6);
  const bank=await call(a.token,'wordBankGet');
  assert.equal(bank.revision,0);
  await call(a.token,'wordBankPut',[0,JSON.stringify([{word:'planet',definition:'A world orbiting a star.'}])]);
  assert.equal(JSON.parse((await call(a.token,'wordBankGet')).payload)[0].word,'planet');
  assert.equal((await call(b.token,'wordBankGet')).payload,'[]');
  await assert.rejects(call(a.token,'wordBankPut',[0,'[]']),/another device/);
  console.log('PASS: same compiled Motoko API: 5/6/7-letter games, real-word validation, hidden opponent letters, daily shared word, independent replay boards, result reveal and recent history.');
} finally { if (pic) await pic.tearDown(); await server.stop(); }
