const {chromium} = require(process.env.WORDUEL_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const frontend = createRequire(path.resolve(__dirname,'../src/frontend/package.json'));
const {Actor,HttpAgent} = frontend('@icp-sdk/core/agent');
const {Ed25519KeyIdentity} = frontend('@icp-sdk/core/identity');
const origin = process.env.WORDUEL_TEST_ORIGIN || 'http://localhost:43992';
const output = path.resolve(__dirname,'../.worduel-native/qa');
fs.mkdirSync(output,{recursive:true});

// Replace only the external provider UI. Every account transfer and bank/stat
// check still calls the real canister with a signed test identity.
const mockProvider = `import React from '/node_modules/.vite/deps/react.js';
const Context=React.createContext(null);
export function InternetIdentityProvider({children}) {
 const [signed,setSigned]=React.useState(localStorage.getItem('__qa_signed__')==='yes');
 const [failed,setFailed]=React.useState(false);
 const identity=React.useMemo(()=>signed?{getPrincipal:()=>({toText:()=>'signed-test-identity'})}:undefined,[signed]);
 const login=(options)=>{window.__chosenProvider=options?.provider||'passkey';if(sessionStorage.getItem('__qa_cancel__')){setFailed(true);return;}setFailed(false);localStorage.setItem('__qa_signed__','yes');setSigned(true);};
 const clear=()=>{localStorage.removeItem('__qa_signed__');setSigned(false);};
 return React.createElement(Context.Provider,{value:{identity,login,clear,isInitializing:false,isLoggingIn:false,isAuthenticated:signed,isLoginError:failed,isSessionExpired:false}},children);
}
export const useInternetIdentity=()=>React.useContext(Context);`;

(async()=>{
 const {idlFactory}=await import('../src/frontend/src/declarations/backend.did.js');
 const runtime=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../.worduel-native/runtime.json'),'utf8'));
 const identity=Ed25519KeyIdentity.generate();
 const agent=await HttpAgent.create({host:runtime.gateway_url,identity});
 await agent.fetchRootKey();
 const actor=Actor.createActor(idlFactory,{agent,canisterId:runtime.backend_canister_id});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const errors=[];
  const setup=async(signed=false)=>{
   const context=await browser.newContext({viewport:{width:390,height:844}});
   if(signed) await context.addInitScript(()=>{if(!localStorage.getItem('__qa_seeded__')){localStorage.setItem('__qa_signed__','yes');localStorage.setItem('__qa_seeded__','yes');}});
   await context.route('**/node_modules/.vite/deps/@caffeineai_core-infrastructure.js*',route=>route.fulfill({body:mockProvider,contentType:'application/javascript'}));
   await context.route('**/src/lib/localBackend.ts*',async route=>{
    const response=await route.fetch();let body=await response.text();
    body=body.replace(/(export async function signInNativeIdentity\([^)]*\)\s*\{)/,'$1\n if(window.__testSignIn) return window.__testSignIn(name,guestToken,words);');
    body=body.replace(/(export async function localCall\([^)]*\)\s*\{)/,'$1\n if(method==="wordMeaning") return {definition:"A test definition.",example:"A test example.",source:"Test dictionary",sourceUrl:""}; if(method==="wordQuiz") return {status:"not-configured"};');
    assert(body.includes('window.__testSignIn'));
    await route.fulfill({response,body,contentType:'application/javascript'});
   });
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   await page.exposeFunction('__testSignIn',async(name,token,words)=>{
    const result=await actor.signInAndCarryGuest(name,token,words);
    if('err' in result) throw new Error(result.err);
    return {...result.ok,isGuest:false};
   });
   return {context,page};
  };
  const waitLobby=async page=>{
   await page.locator('[data-ocid="lobby.page"]').waitFor({timeout:45000});
   await page.locator('[aria-label="Loading Worduel"]').waitFor({state:'hidden'});
  };
  const session=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('__worduel_native_guest__')));
  const save=async(page,word)=>page.evaluate(async(word)=>{
   const {localGuest}=await import('/src/lib/localBackend.ts');
   const {loadWordBank,saveWordBank}=await import('/src/lib/wordBank.ts');
   const name=localGuest().username;
   saveWordBank(name,[...loadWordBank(name),{word,definition:'A test definition for '+word,confidence:'unknown',savedAt:Date.now(),lastSeenAt:Date.now(),reviewStreak:1,nextReviewAt:Date.now()}]);
  },word);
  const waitBank=async(token,word)=>{
   for(let i=0;i<40;i++) {if(JSON.parse((await actor.getWordBank(token)).payload).some(entry=>entry.word===word))return;await new Promise(r=>setTimeout(r,250));}
   throw new Error('Saved word did not reach the native backend: '+word);
  };
  const {page:a}=await setup();
  await a.goto(origin+'/lobby');await waitLobby(a);
  const guest=await session(a);
  await save(a,'prune');await waitBank(guest.token,'prune');
  const friend=await actor.registerGuest();
  const game=(await actor.createPrivateGame(guest.token,{versus:null})).ok;
  await actor.joinByToken(friend.token,game.joinToken,[game.gameId]);
  await actor.leaveGame(friend.token,game.gameId);
  await a.getByRole('button',{name:'Sign in',exact:true}).click();
  await a.getByRole('button',{name:'Continue with Google',exact:true}).waitFor();
  await a.getByRole('button',{name:'Continue with Microsoft',exact:true}).waitFor();
  assert(!(await a.locator('body').innerText()).includes('Internet Identity'));
  await a.screenshot({path:output+'/sign-in-mobile.png'});
  await a.evaluate(()=>sessionStorage.setItem('__qa_cancel__','yes'));
  await a.getByRole('button',{name:'Continue with Microsoft',exact:true}).click();
  await a.getByRole('alert').waitFor();
  assert.equal(await a.evaluate(()=>window.__chosenProvider),'microsoft');
  assert.deepEqual(await session(a),guest);
  await a.evaluate(()=>sessionStorage.removeItem('__qa_cancel__'));
  const displayName='Browser'+Date.now().toString(36);
  await a.getByLabel('Username for a new account').fill(displayName);
  await a.getByRole('button',{name:'Continue with Google',exact:true}).click();
  await waitLobby(a);
  const signed=await session(a);
  assert.equal(signed.isGuest,false);assert.equal(signed.username,displayName);
  await waitBank(signed.token,'prune');
  assert.equal((await actor.getMyStats(signed.token))[0].totalWins,1n);
  await a.reload();await waitLobby(a);
  assert.equal((await session(a)).username,signed.username);
  console.log('PASS: direct provider choices, cancellation preserves guest, guest words/stats transfer, and signed account restores after reload.');

  const {page:b}=await setup(true);
  await b.goto(origin+'/word-bank');
  await b.locator('[data-ocid="word_bank.page"]').waitFor({timeout:45000});
  await b.getByText('prune',{exact:false}).first().waitFor({timeout:15000});
  const second=await session(b);
  assert.equal(second.username,signed.username);
  assert.equal((await actor.getMyStats(second.token))[0].totalWins,1n);
  await save(b,'pride');await waitBank(second.token,'pride');
  await a.goto(origin+'/word-bank');
  await a.getByText('pride',{exact:false}).first().waitFor({timeout:40000});
  await b.goto(origin+'/lobby');await waitLobby(b);
  await b.getByRole('button',{name:'Open profile',exact:true}).click();
  await b.getByRole('button',{name:'Sign Out',exact:true}).click();
  await b.getByRole('button',{name:'Sign in',exact:true}).waitFor({timeout:20000});
  assert.equal((await session(b)).isGuest,true);
  await b.goto(origin+'/word-bank');
  await b.locator('[data-ocid="word_bank.page"]').waitFor();
  assert.equal(await b.getByText('prune',{exact:false}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: another browser restores the same Word Bank/stats, word changes sync back, and signing out does not expose account words to the next guest. No paid AI calls.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
