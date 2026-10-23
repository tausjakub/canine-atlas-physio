import {loginPage} from './login-page.mjs';
const encoder=new TextEncoder(),TTL=8*60*60;
const to64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const equal=(a,b)=>{let difference=a.length^b.length;for(let i=0;i<a.length;i++)difference|=a[i]^(b[i]??0);return difference===0;};
export async function passwordVerifier(password,salt=crypto.getRandomValues(new Uint8Array(16)),iterations=100000){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations},key,256);
 return `pbkdf2-sha256$${iterations}$${to64(salt)}$${to64(hash)}`;
}
function validConfig(env){try{const p=env.ATLAS_PASSWORD_VERIFIER?.split('$');return p?.length===4&&p[0]==='pbkdf2-sha256'&&/^\d+$/.test(p[1])&&Number(p[1])>=100000&&Number(p[1])<=1000000&&from64(p[2]).length>=16&&from64(p[3]).length===32&&from64(env.ATLAS_SESSION_SECRET).length>=32;}catch{return false;}}
async function verifyPassword(password,verifier){try{const [,iterations,salt,expected]=verifier.split('$'),actual=await passwordVerifier(password,from64(salt),Number(iterations));return equal(encoder.encode(actual.split('$')[3]),encoder.encode(expected));}catch{return false;}}
const signingKey=secret=>crypto.subtle.importKey('raw',from64(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
const revision=async verifier=>to64((await crypto.subtle.digest('SHA-256',encoder.encode(verifier))).slice(0,12));
export function safeNext(value,origin){try{if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n\x00-\x1f]/.test(value))return '/';const url=new URL(value,origin);if(url.origin!==origin||url.pathname.startsWith('/_auth'))return '/';return url.pathname+url.search;}catch{return '/';}}
async function issueSession(env,origin,now){const payload=to64(encoder.encode(JSON.stringify({iat:now,exp:now+TTL,aud:origin,ver:await revision(env.ATLAS_PASSWORD_VERIFIER),nonce:to64(crypto.getRandomValues(new Uint8Array(18)))})));return payload+'.'+to64(await crypto.subtle.sign('HMAC',await signingKey(env.ATLAS_SESSION_SECRET),encoder.encode(payload)));}
async function sessionValid(request,env,name,now){try{const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1);if(!token||token.length>2048)return false;const parts=token.split('.');if(parts.length!==2||!await crypto.subtle.verify('HMAC',await signingKey(env.ATLAS_SESSION_SECRET),from64(parts[1]),encoder.encode(parts[0])))return false;const p=JSON.parse(new TextDecoder().decode(from64(parts[0])));return Number.isInteger(p.iat)&&Number.isInteger(p.exp)&&p.iat<=now+30&&p.iat>now-TTL&&p.exp>now&&p.exp<=p.iat+TTL&&p.aud===new URL(request.url).origin&&p.ver===await revision(env.ATLAS_PASSWORD_VERIFIER);}catch{return false;}}
// no-referrer also turns Origin into "null" on native HTML form submissions,
// which makes our strict same-origin login/logout checks reject the browser.
const baseHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Robots-Tag':'noindex, nofollow'};
function response(body,status=200,headers={}){return new Response(body,{status,headers:{...baseHeaders,...headers}});}
function login(next,error=false,status=200){return response(loginPage(next,error),status,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});}
async function boundedForm(request){
 if(!request.body)return '';const reader=request.body.getReader(),decoder=new TextDecoder();let total=0,text='';
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>4096){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
// Some ASSETS runtimes ignore Range and return the complete file. Preserve PDF
// seeking without buffering that file, and only after authentication succeeds.
async function rangedAsset(asset,request,knownSize){
 const range=request.headers.get('range'),size=Number(asset.headers.get('content-length')||knownSize);
 const encoding=asset.headers.get('content-encoding');
 if(!range||asset.status!==200||!asset.body||!Number.isSafeInteger(size)||size<=0||(encoding&&encoding!=='identity'))return asset;
 const ifRange=request.headers.get('if-range');if(ifRange&&ifRange!==asset.headers.get('etag')&&ifRange!==asset.headers.get('last-modified'))return asset;
 const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start=0,end=size-1;
 if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(Number(match[2]),end):end;}
 if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){await asset.body.cancel();return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});}
 const reader=asset.body.getReader();let offset=0;
 const body=new ReadableStream({async pull(controller){for(;;){const {done,value}=await reader.read();if(done){controller.close();return;}const from=Math.max(0,start-offset),to=Math.min(value.length,end+1-offset);offset+=value.length;if(to>from)controller.enqueue(value.subarray(from,to));if(offset>end){controller.close();await reader.cancel();return;}if(to>from)return;}},cancel(reason){return reader.cancel(reason);}});
 const headers=new Headers(asset.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');return new Response(body,{status:206,headers});
}
export async function gate(request,env,serveAssets,{now=Math.floor(Date.now()/1000),assetSizes}={}){
 const url=new URL(request.url),local=env.ALLOW_INSECURE_LOCAL==='true'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 if(url.protocol!=='https:'&&!local)return response(null,308,{Location:'https://'+url.host+url.pathname+url.search});
 if(!validConfig(env))return response('Private atlas is not configured. Configure the server secrets before serving content.',503,{'Content-Type':'text/plain; charset=utf-8'});
 const name=local?'atlas_session':'__Host-atlas_session',cookie=token=>`${name}=${token}; Path=/; HttpOnly; SameSite=Strict${local?'':'; Secure'}`;
 const authenticated=await sessionValid(request,env,name,now);
 if(url.pathname==='/_auth/login'){
  if(request.method==='GET')return login(safeNext(url.searchParams.get('next'),url.origin));
  if(request.method!=='POST')return response('Method not allowed',405,{Allow:'GET, POST'});
  if(request.headers.get('origin')!==url.origin)return response('Origin denied',403);
  if(env.ATLAS_LOGIN_LIMIT){const limit=await env.ATLAS_LOGIN_LIMIT.limit({key:request.headers.get('cf-connecting-ip')||'unknown'});if(!limit.success)return response('Too many attempts. Try again in a minute.',429,{'Retry-After':'60'});}
  if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))return response('Unsupported form',415);
  if(Number(request.headers.get('content-length')||0)>4096)return response('Request too large',413);
  const text=await boundedForm(request);if(text===null)return response('Request too large',413);
  const form=new URLSearchParams(text),next=safeNext(form.get('next'),url.origin),password=form.get('password')||'';
  if(!password||password.length>256||!await verifyPassword(password,env.ATLAS_PASSWORD_VERIFIER))return login(next,true,401);
  return response(null,303,{Location:next,'Set-Cookie':cookie(await issueSession(env,url.origin,now))+`; Max-Age=${TTL}`});
 }
 if(url.pathname==='/_auth/logout'){
  if(request.method!=='POST')return response('Method not allowed',405,{Allow:'POST'});
  if(request.headers.get('origin')!==url.origin)return response('Origin denied',403);
  return response(null,303,{Location:'/_auth/login','Set-Cookie':cookie('')+'; Max-Age=0','Clear-Site-Data':'"cache"'});
 }
 if(url.pathname==='/_auth/session')return response(JSON.stringify({authenticated}),authenticated?200:401,{'Content-Type':'application/json'});
 if(!authenticated){const navigation=request.method==='GET'&&(request.headers.get('sec-fetch-dest')==='document'||request.headers.get('accept')?.includes('text/html'));return navigation?login(safeNext(url.pathname+url.search,url.origin),false,401):response(request.method==='HEAD'?null:'Sign in to access this atlas.',401,{'Content-Type':'text/plain; charset=utf-8'});}
 if(request.method!=='GET'&&request.method!=='HEAD')return response('Method not allowed',405,{Allow:'GET, HEAD'});
 const asset=await rangedAsset(await serveAssets(request),request,assetSizes?.[decodeURIComponent(url.pathname)]),headers=new Headers(asset.headers);for(const [name,value]of Object.entries(baseHeaders))headers.set(name,value);headers.set('X-Frame-Options','SAMEORIGIN');headers.delete('access-control-allow-origin');headers.append('Vary','Cookie');return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
}
