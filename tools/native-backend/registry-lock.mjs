// The registry's per-package signed query remains available when its batch update fails.
import { mainActor } from '../../node_modules/ic-mops/dist/api/actors.js';
import { resolvePackages } from '../../node_modules/ic-mops/dist/resolve-packages.js';
import { readConfig, globalCacheDir } from '../../node_modules/ic-mops/dist/mops.js';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,renameSync,existsSync,cpSync } from 'node:fs';
import { resolve,sep } from 'node:path';
const sha=data=>createHash('sha256').update(data).digest('hex');
const root=process.cwd(),packages=await resolvePackages(),actor=await mainActor();
const hashes={};
for(const [alias,version]of Object.entries(packages)){
  if(!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('This lock helper supports registry packages only.');
  const name=alias.split('@')[0],id=`${name}@${version}`;
  if(hashes[id]) continue;
  const packageDirectory=resolve(root,'.mops',id);
  if(!existsSync(packageDirectory)) cpSync(resolve(globalCacheDir,'packages',id),packageDirectory,{recursive:true,errorOnExist:true,force:false});
  const reply=await actor.getFileHashesQuery(name,version);
  if(!reply.ok) throw new Error(`Registry hashes unavailable for ${id}`);
  const files={};
  for(const [fileId,bytes]of reply.ok){
    const path=resolve(root,'.mops',fileId);
    if(!path.startsWith(resolve(root,'.mops')+sep)) throw new Error('Invalid registry file path');
    const expected=Buffer.from(bytes).toString('hex'),actual=sha(readFileSync(path));
    if(expected!==actual) throw new Error(`Package integrity mismatch: ${fileId}`);
    files[fileId]=expected;
  }
  hashes[id]=files;
  console.log(`Verified ${id}: ${Object.keys(files).length} files`);
}
const config=readConfig(),deps={...config.dependencies,...config['dev-dependencies']};
const normalized=Object.fromEntries(Object.keys(deps).sort().map(key=>[key,deps[key]?.version||deps[key]?.repo||deps[key]?.path||'']));
const lock={version:3,mopsTomlDepsHash:sha(JSON.stringify(normalized)),deps:packages,hashes};
writeFileSync(resolve(root,'mops.lock.tmp'),JSON.stringify(lock,null,2)+'\n');
renameSync(resolve(root,'mops.lock.tmp'),resolve(root,'mops.lock'));
console.log('Updated mops.lock after verifying every registry-provided file hash.');
