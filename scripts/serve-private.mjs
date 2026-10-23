import http from 'node:http';
import path from 'node:path';
import {readFile,stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {gate} from '../security/gate.mjs';
const root=await realpath('dist/client'),env={ALLOW_INSECURE_LOCAL:'true'};
for(const line of (await readFile('.env.private.local','utf8')).split(/\r?\n/)){const index=line.indexOf('=');if(index>0)env[line.slice(0,index)]=line.slice(index+1);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.pdf':'application/pdf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.glb':'model/gltf-binary','.bin':'application/octet-stream','.txt':'text/plain; charset=utf-8'};
async function asset(request){
 let file;try{const pathname=decodeURIComponent(new URL(request.url).pathname);file=await realpath(path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':'')));if(path.relative(root,file).startsWith('..')||path.isAbsolute(path.relative(root,file)))return new Response('Forbidden',{status:403});}catch{return new Response('Not found',{status:404});}
 const info=await stat(file);if(!info.isFile())return new Response('Not found',{status:404});
 if(info.size===0)return new Response(null,{headers:{'Content-Length':'0','Content-Type':mime[path.extname(file)]||'application/octet-stream'}});
 const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};let start=0,end=info.size-1,status=200;
 const range=request.headers.get('range');if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${info.size}`}});if(!match[1])start=Math.max(0,info.size-Number(match[2]));else start=Number(match[1]);end=match[1]&&match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=info.size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${info.size}`}});status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;}
 headers['Content-Length']=String(end-start+1);return new Response(request.method==='HEAD'?null:Readable.toWeb(createReadStream(file,{start,end})),{status,headers});
}
const port=Number(process.env.PRIVATE_PORT||5174);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid private preview port');
http.createServer(async(req,res)=>{
 try{
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Host denied');return;}
  const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});
  const response=await gate(request,env,asset);res.writeHead(response.status,Object.fromEntries(response.headers));if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch{res.writeHead(500,{'Cache-Control':'no-store'});res.end('Private preview could not complete the request.');}
}).listen(port,'127.0.0.1',()=>console.log(`Protected atlas: http://127.0.0.1:${port}/ — login required for all files.`));
