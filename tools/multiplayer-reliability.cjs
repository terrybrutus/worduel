const {chromium}=require(process.env.WORDUEL_PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const output=require('node:path').resolve(__dirname,'../.worduel-native/qa');
require('node:fs').mkdirSync(output,{recursive:true});
const origin=process.env.WORDUEL_TEST_ORIGIN || 'http://127.0.0.1:43992';
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
 const contexts=[await browser.newContext(),await browser.newContext()];const errors=[];
 for(const context of contexts){
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route('**/src/lib/localBackend.ts*',async route=>{
   const response=await route.fetch();let body=await response.text();
   body=body.replace(/(export async function localCall\([^)]*\)\s*\{)/,'$1\n if (method === "wordMeaning") return {definition:"A test meaning.",example:"A test example.",source:"Test dictionary",sourceUrl:""}; if (method === "wordQuiz") return {status:"not-configured"}; if(sessionStorage.getItem("__hangJoin")==="yes" && method === "joinByToken") return new Promise(()=>{}); if(window.__failReads && method === "getGameState") throw new Error("Simulated lost connection"); if(window.__loseGuess && method === "submitGuess") {window.__loseGuess=false; await localCall(method,args,timeoutMs); throw new Error("Simulated lost response");}');
   assert(body.includes('Simulated lost connection'));await route.fulfill({response,body,contentType:'application/javascript'});
  });
 }
 const a=await contexts[0].newPage(),b=await contexts[1].newPage();
 const call=(page,method,args=[])=>page.evaluate(async({method,args})=>{const m=await import('/src/lib/localBackend.ts');return m.localCall(method,args);},{method,args});
 const loaded=async page=>{await page.locator('[aria-label="Loading Worduel"]').waitFor({state:'hidden'});};
 for(const page of[a,b]){await page.goto(origin+'/lobby');await page.locator('[data-ocid="lobby.page"]').waitFor({timeout:45000});await loaded(page);}
 const ga=await a.evaluate(()=>JSON.parse(localStorage.getItem('__worduel_native_guest__'))),gb=await b.evaluate(()=>JSON.parse(localStorage.getItem('__worduel_native_guest__')));
 const game=(await call(a,'createPrivateGame',[ga.token,'versus',6])).ok;
 await call(b,'joinByToken',[gb.token,game.joinToken,game.gameId]);
 await a.goto(origin+'/game/'+game.gameId);await a.locator('[data-ocid="game.keyboard"]').waitFor();await loaded(a);
 await a.keyboard.type('abs');
 await contexts[0].setOffline(true);
 await a.getByRole('status',{name:''}).filter({hasText:'Offline'}).waitFor();
 assert.equal(await a.locator('[data-ocid="game.page"]').count(),1);
 await contexts[0].setOffline(false);
 await a.getByRole('button',{name:'Retry connection',exact:true}).waitFor({state:'hidden'});
 await a.keyboard.type('ent');await a.evaluate(()=>window.__loseGuess=true);await a.keyboard.press('Enter');
 let state;
 for(let i=0;i<20;i++){state=await call(a,'getGameState',[ga.token,game.gameId]);if(state.ok.myGuesses.length===1)break;await a.waitForTimeout(500);}
 assert.equal(state.ok.myGuesses[0].word,'absent');
 await a.waitForTimeout(3000);
 assert.equal((await call(a,'getGameState',[ga.token,game.gameId])).ok.myGuesses.length,1);
 await a.keyboard.type('abs');await a.evaluate(()=>window.__failReads=true);
 await a.getByRole('button',{name:'Retry connection',exact:true}).waitFor({timeout:15000});
 assert.equal(await a.getByText('Game not found.',{exact:true}).count(),0);
 await a.setViewportSize({width:320,height:568});
 assert(await a.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
 await a.screenshot({path:output+'/reconnecting-mobile.png'});
 await a.evaluate(()=>window.__failReads=false);await a.getByRole('button',{name:'Retry connection',exact:true}).click();
 await a.getByRole('button',{name:'Retry connection',exact:true}).waitFor({state:'hidden'});
 await a.keyboard.type('urd');await a.keyboard.press('Enter');
 for(let i=0;i<20;i++){state=await call(a,'getGameState',[ga.token,game.gameId]);if(state.ok.myGuesses.length===2)break;await a.waitForTimeout(500);}
 assert.equal(state.ok.myGuesses[1].word,'absurd');
 console.log('PASS: offline/reconnect keeps board and draft; lost committed response does not duplicate a guess; keyboard stays on screen.');
 await b.goto(origin+'/game/join/'+'f'.repeat(64)+'?gameId='+game.gameId);
 await b.getByRole('heading',{name:'Invite unavailable',exact:true}).waitFor();await loaded(b);
 assert(b.url().includes('/game/join/'));
 await b.getByRole('button',{name:'Try again',exact:true}).click();await b.getByRole('heading',{name:'Invite unavailable',exact:true}).waitFor();
 await b.goto(origin+'/game/join/'+game.joinToken+'?gameId='+game.gameId);
 await b.waitForURL('**/game/'+game.gameId);await b.locator('[data-ocid="game.keyboard"]').waitFor();
 const next=(await call(a,'createPrivateGame',[ga.token,'coop',7])).ok;
 await b.evaluate(()=>sessionStorage.setItem('__hangJoin','yes'));
 await b.goto(origin+'/game/join/'+next.joinToken+'?gameId='+next.gameId);
 await b.getByRole('heading',{name:'Could not connect',exact:true}).waitFor({timeout:22000});
 await b.evaluate(()=>sessionStorage.removeItem('__hangJoin'));await b.getByRole('button',{name:'Try again',exact:true}).click();
 await b.waitForURL('**/game/'+next.gameId);
 await a.goto(origin+'/game/'+next.gameId);await a.locator('[data-ocid="game.keyboard"]').waitFor();await loaded(a);
 await a.keyboard.type('library');await a.keyboard.press('Enter');
 for(let i=0;i<20;i++){state=await call(a,'getGameState',[ga.token,next.gameId]);if(state.ok.coopGuesses.length)break;await a.waitForTimeout(500);}
 assert.equal(state.ok.coopGuesses[0].word,'library');
 await call(b,'leaveGame',[gb.token,game.gameId]);
 for(const page of[a,b]){await page.goto(origin+'/game/'+game.gameId);await page.locator('[data-ocid="game.rematch_button"]').first().waitFor();await loaded(page);}
 await a.locator('[data-ocid="game.rematch_button"]').first().click();
 await b.locator('[data-ocid="game.accept_rematch_button"]').waitFor({timeout:20000});await b.locator('[data-ocid="game.accept_rematch_button"]').click();
 await a.waitForURL(url=>url.pathname.startsWith('/game/game-')&&url.pathname!=='/game/'+game.gameId,{timeout:20000});
 await b.waitForURL(a.url());
 await a.locator('[data-ocid="game.keyboard"]').waitFor();
 await a.keyboard.type('absent');await a.keyboard.press('Enter');
 const rematchId=new URL(a.url()).pathname.split('/').pop();
 for(let i=0;i<20;i++){state=await call(a,'getGameState',[ga.token,rematchId]);if(state.ok.myGuesses.length)break;await a.waitForTimeout(500);}
 assert.equal(state.ok.wordLength,6);assert.equal(state.ok.myGuesses[0].word,'absent');
 assert.deepEqual(errors,[]);
 console.log('PASS: invalid invite never resumes an unrelated match; retry and valid invite rejoin work; 7-letter co-op remains playable. No paid AI calls.');
 console.log('PASS: real browser rematch invitation, acceptance, same six-letter rules and typing in the new round.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
