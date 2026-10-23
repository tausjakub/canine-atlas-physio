import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const origin=process.env.PRIVATE_ORIGIN||'http://127.0.0.1:5174',password=process.env.ATLAS_SMOKE_PASSWORD;
if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw Error('This smoke check is restricted to localhost.');
if(!password)throw Error('Provide ATLAS_SMOKE_PASSWORD to this process only.');
const root=await fetch(origin+'/?view=dorn',{headers:{Accept:'text/html'}});assert.equal(root.status,401);const gate=await root.text();assert(gate.includes('type="password"'));assert(!gate.includes('/_next/'));assert(!gate.includes(password));
assert.equal(root.headers.get('referrer-policy'),'same-origin','Browser form POST must retain its Origin header');
const books=JSON.parse(fs.readFileSync('app/library-data.json')),book=books.find(book=>book.id==='canine-rehabilitation');assert(book);assert(!books.some(book=>book.id==='dorn-method-dogs'));
const studyImage='/study/dog-knee-museum.jpg';
for(const path of [book.parts[0].url,'/models/anatomy.bin',studyImage]){const denied=await fetch(origin+path,{headers:{Range:'bytes=0-15'}});assert.equal(denied.status,401);assert((await denied.text()).includes('Sign in'));}
const send=value=>fetch(origin+'/_auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:value,next:'/?view=dorn'}),redirect:'manual'});
assert.equal((await send('wrong-fixture-value')).status,401);const login=await send(password);assert.equal(login.status,303);const cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie);assert.equal(login.headers.get('location'),'/?view=dorn');
const loaded=await fetch(origin+'/?view=dorn',{headers:{Cookie:cookie}});assert.equal(loaded.status,200);const html=await loaded.text();assert(html.includes('/_next/'));assert(!html.includes(password));const asset=/src="([^"]+\.js[^"]*)"/.exec(html)?.[1];assert(asset);
assert.equal((await fetch(new URL(asset,origin))).status,401);assert.equal((await fetch(new URL(asset,origin),{headers:{Cookie:cookie}})).status,200);
const pdf=await fetch(origin+book.parts[0].url,{headers:{Cookie:cookie,Range:'bytes=0-15'}});assert.equal(pdf.status,206);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,4).toString(),'%PDF');assert(pdf.headers.get('cache-control').includes('no-store'));
const preview=await fetch(origin+studyImage,{headers:{Cookie:cookie}});assert.equal(preview.status,200);assert(preview.headers.get('content-type')?.startsWith('image/jpeg'));assert.equal(Buffer.from(await preview.arrayBuffer()).subarray(0,2).toString('hex'),'ffd8');
for(const path of ['/library/dorn-method-dogs-1-6.pdf','/library/dorn-method-dogs-13-18.pdf','/library/dorn-preview-15.jpg','/library/dorn-preview-25.jpg']){
 const removed=await fetch(origin+path,{headers:{Cookie:cookie}});assert.equal(removed.status,404,`Removed document URL must return 404 rather than SPA HTML: ${path}`);
}
const logout=await fetch(origin+'/_auth/logout',{method:'POST',headers:{Origin:origin,Cookie:cookie},redirect:'manual'});assert.equal(logout.status,303);assert(logout.headers.get('set-cookie').includes('Max-Age=0'));
// Cancelled oversized request bodies may close an HTTP/1 keepalive connection;
// run this probe last and explicitly avoid reusing that connection afterward.
const oversized=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(5000));controller.close();}});assert.equal((await fetch(origin+'/_auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',Connection:'close'},body:oversized,duplex:'half'})).status,413);
const secrets=[password,...fs.readFileSync('.env.private.local','utf8').split(/\r?\n/).filter(line=>line.includes('=')).map(line=>line.slice(line.indexOf('=')+1))];
function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(/\.(?:js|json|html|css|map|md|txt)$/.test(file)){const text=fs.readFileSync(file,'utf8');for(const secret of secrets)assert(!text.includes(secret),`Server credential found in generated asset ${file}`);}}}
scan('dist/client');
console.log('PASS: real runtime serves only login before auth; correct login unlocks HTML/JS/retained PDF ranges/study images; removed document URLs return 404; wrong password denied; logout clears the session cookie.');
console.log('PASS: generated browser assets contain neither the configured password, its verifier nor the session signing secret.');
