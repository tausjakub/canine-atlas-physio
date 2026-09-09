import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist/client');
const {basePath}=JSON.parse(fs.readFileSync(path.join(root,'pages-build.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let assets=0;
for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 if(!url.startsWith('/')||url.startsWith('//'))continue;
 assert(url.startsWith(basePath+'/'),'Unprefixed HTML asset: '+url);
 const local=url.slice(basePath.length).split('?')[0];
 assert(fs.existsSync(path.join(root,local)),'Missing HTML asset: '+url);assets++;
}
assert(assets>0,'No generated assets found');
assert(fs.existsSync(path.join(root,'.nojekyll')));
for(const p of ['models/anatomy.bin','models/catalog.json','models/LICENSE-MODEL.txt','study/dog-skeleton-museum.jpg','study/dog-knee-museum.jpg'])assert(fs.existsSync(path.join(root,p)),p);
const books=JSON.parse(fs.readFileSync('app/library-data.json','utf8'));
let count=0;
for(const book of books)for(const section of book.parts){assert.equal(fs.statSync(path.join(root,section.url)).size,section.bytes);count++;}
// All runtime asset URLs must use the same deployment prefix as the bundles.
for(const file of ['page','scene','library','book-reading','exam-quiz','study-visuals']){
 const source=fs.readFileSync('app/'+file+'.tsx','utf8');assert(source.includes('sitePath('),file);
 assert(!/fetch\(['"]\/|(?:src|href)=['"]\/(?!\/)/.test(source),'Root-only URL in '+file);
}
console.log('PASS: Pages base '+(basePath||'/')+'; '+assets+' HTML assets, 3D model, study images and '+count+' PDF sections.');
