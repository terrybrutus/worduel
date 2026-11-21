import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
export async function importCache(pic,canisterId,sender,root) {
  const file=resolve(root,'src/frontend/.worduel-meanings.json');
  if(!existsSync(file)) return;
  const data=JSON.parse(readFileSync(file,'utf8'));
  if(data.version!==1 || !data.entries || !data.usage) throw new Error('Legacy AI cache is unreadable; preserve it before enabling native AI.');
  const idlFactory=({IDL})=>{
    const Meaning=IDL.Record({definition:IDL.Text,example:IDL.Text,source:IDL.Text,sourceUrl:IDL.Text,aiEnhanced:IDL.Bool,originalDefinition:IDL.Text});
    const Alternative=IDL.Record({word:IDL.Text,definition:IDL.Text});
    const Quiz=IDL.Record({word:IDL.Text,savedDefinition:IDL.Text,alternatives:IDL.Vec(Alternative),sentence:IDL.Opt(IDL.Record({text:IDL.Text,alternatives:IDL.Vec(Alternative)})),aiGenerated:IDL.Bool,source:IDL.Text,sourceUrl:IDL.Text});
    return IDL.Service({importLegacyCache:IDL.Func([IDL.Vec(IDL.Tuple(IDL.Text,Meaning)),IDL.Vec(IDL.Tuple(IDL.Text,Quiz)),IDL.Int,IDL.Nat,IDL.Nat],[IDL.Bool],[])});
  };
  const entries=Object.entries(data.entries).map(([word,m])=>[word,{definition:m.definition,example:m.example||'',source:m.source,sourceUrl:m.sourceUrl,aiEnhanced:m.aiEnhanced===true,originalDefinition:m.originalDefinition||m.definition}]);
  const questions=Object.values(data.quizzes||{}).filter(q=>q.reviewedVersion===1 && q.value).map(q=>{
    const value=q.value;
    return [`quiz:v1:${value.word}:${value.savedDefinition.toLowerCase()}`,{...value,sentence:value.sentence?[value.sentence]:[],aiGenerated:true,source:value.source||'',sourceUrl:value.sourceUrl||''}];
  });
  const now=new Date().toISOString();
  const daily=data.usage.day===now.slice(0,10)?data.usage.daily:0;
  const monthly=data.usage.month===now.slice(0,7)?data.usage.monthly:0;
  const actor=pic.createActor({idlFactory,canisterId,sender});
  await actor.importLegacyCache(entries,questions,BigInt(Math.floor(Date.now()/86400000)),BigInt(daily),BigInt(monthly));
}
