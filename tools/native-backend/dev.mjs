import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
const root=fileURLToPath(new URL('../../',import.meta.url));
const windows=process.platform==='win32';
const backend=windows ? spawn('wsl.exe',['-d','Ubuntu','--cd',root,'--exec','bash','tools/native-backend/run.sh'],{cwd:root,stdio:['inherit','pipe','inherit']}) : spawn('bash',['tools/native-backend/run.sh'],{cwd:root,stdio:['inherit','pipe','inherit']});
let vite;
createInterface({input:backend.stdout}).on('line',line=>{
  process.stdout.write(line+'\n');
  if(line==='WORDUEL_NATIVE_READY' && !vite) {
    vite=spawn(process.execPath,[fileURLToPath(new URL('../../src/frontend/node_modules/vite/bin/vite.js',import.meta.url)),'--host','0.0.0.0','--port','43992','--strictPort'],{cwd:fileURLToPath(new URL('../../src/frontend/',import.meta.url)),stdio:'inherit'});
    vite.on('exit',code=>{backend.kill('SIGTERM');process.exitCode=code||0;});
  }
});
backend.on('exit',code=>{if(vite) vite.kill();process.exitCode=code||0;});
process.on('SIGINT',()=>{if(vite)vite.kill('SIGINT');backend.kill('SIGINT');});
process.on('SIGTERM',()=>{if(vite)vite.kill('SIGTERM');backend.kill('SIGTERM');});
