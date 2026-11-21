import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
const runtime=fileURLToPath(new URL('../../../.worduel-native/runtime.json',import.meta.url));
function config(){try{return JSON.parse(readFileSync(runtime,'utf8'));}catch{return null;}}
export function nativeGateway(){return config()?.gateway_url || 'http://127.0.0.1:49431';}
export function nativePreview(){return {name:'worduel-native-preview',apply:'serve',configureServer(server){
  server.middlewares.use((req,res,next)=>{
    const path=new URL(req.url||'/','http://localhost').pathname;
    if(path!=='/env.json' && path!=='/__worduel_connection') return next();
    if(req.method!=='GET') {res.statusCode=405;res.end();return;}
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(path==='/env.json') {
      const value=config();if(!value){res.statusCode=503;res.end(JSON.stringify({error:'Start the native Motoko backend.'}));return;}
      res.end(JSON.stringify({backend_canister_id:value.backend_canister_id,backend_host:'',worduel_local:true,project_id:'worduel-local',ii_derivation_origin:'',storage_gateway_url:''}));
    } else {
      const port=server.httpServer?.address()?.port || 43992;
      const origins=Object.values(networkInterfaces()).flat().filter(item=>item && item.family==='IPv4' && !item.internal).map(item=>`http://${item.address}:${port}`);
      res.end(JSON.stringify({origins}));
    }
  });
}};}
