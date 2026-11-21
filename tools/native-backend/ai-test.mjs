import assert from 'node:assert/strict';
import { PocketIc, PocketIcServer } from '@dfinity/pic';
import { fileURLToPath } from 'node:url';
const idlFactory = ({ IDL }) => IDL.Service({ appCall: IDL.Func([IDL.Text,IDL.Text,IDL.Text],[IDL.Text],[]) });
const server = await PocketIcServer.start();
const wasm=process.env.WORDUEL_WASM || fileURLToPath(new URL('./backend.wasm',import.meta.url));
let pic;
try {
  pic = await PocketIc.create(server.getUrl());
  const { actor,canisterId } = await pic.setupCanister({idlFactory,wasm,environmentVariables:[{name:'ANTHROPIC_API_KEY',value:'mock-test-key-not-real'}]});
  const guest = JSON.parse(await actor.appCall('','guest','[]'));
  const deferred = pic.createDeferredActor({idlFactory,canisterId});
  const request = async (method,args,responses) => {
    const finish = await deferred.appCall(guest.token,method,JSON.stringify(args));
    for (const response of responses) {
      let pending=[];
      for (let i=0;i<30 && !pending.length;i++) { await pic.tick(2); pending=await pic.getPendingHttpsOutcalls(); }
      assert.equal(pending.length,1,'Expected exactly one pending HTTP request');
      const item=pending[0];
      if (item.url.includes('anthropic.com')) {
        assert.equal(item.url,'https://api.anthropic.com/v1/messages');
        const body=JSON.parse(new TextDecoder().decode(item.body));
        assert.equal(body.model,'claude-haiku-4-5');
        assert.ok(body.max_tokens <= 1000);
        assert.ok(body.system);
        assert.ok(!body.system.includes('mock-test-key'));
      } else assert.ok(item.url.startsWith('https://api.dictionaryapi.dev/api/v2/entries/en/'));
      await pic.mockPendingHttpsOutcall({requestId:item.requestId,subnetId:item.subnetId,response:{type:'success',statusCode:200,headers:[],body:new TextEncoder().encode(JSON.stringify(response))}});
    }
    const result=JSON.parse(await finish());
    assert.equal((await pic.getPendingHttpsOutcalls()).length,0);
    return result;
  };
  const dictionary=[{meanings:[{definitions:[{definition:'A strong wish to achieve something.',example:'Her ambition drove her work.'}]}]}];
  const answer = value => ({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(value)}]});
  const meaning=await request('wordMeaning',['ambition'],[dictionary,answer({supported:true,definition:'A strong desire to achieve a goal.',example:'Her ambition was to become a pilot.'})]);
  assert.equal(meaning.aiEnhanced,true);
  assert.equal(meaning.originalDefinition,dictionary[0].meanings[0].definitions[0].definition);
  const choices=[{word:'ability',definition:'The skill needed to do something.'},{word:'duty',definition:'Something a person is required to do.'}];
  const draft={supported:true,alternatives:choices,sentence:{supported:true,text:'Her _____ to lead the team drove her to apply for promotion.',alternatives:choices}};
  const quiz=await request('wordQuiz',['ambition',meaning.definition],[answer(draft),answer({meaningValid:true,sentenceValid:false})]);
  assert.equal(quiz.status,'ready'); assert.equal(quiz.question.sentence,null);
  assert.equal(quiz.question.alternatives.length,2);
  assert.deepEqual(await request('wordMeaning',['ambition'],[]),meaning);
  assert.deepEqual(await request('wordQuiz',['ambition',meaning.definition],[]),quiz);
  await pic.upgradeCanister({canisterId,wasm,upgradeModeOptions:{skip_pre_upgrade:[],wasm_memory_persistence:[{keep:null}]}});
  assert.deepEqual(await request('wordMeaning',['ambition'],[]),meaning);
  assert.deepEqual(await request('wordQuiz',['ambition',meaning.definition],[]),quiz);
  console.log('PASS: actual Motoko HTTP outcalls with mocked responses, secret-free payload, bounded tokens, simplified definitions, independent quiz review, ambiguity rejection, cache hits and cache persistence after upgrade. No paid calls made.');
} finally {if(pic) await pic.tearDown(); await server.stop();}
