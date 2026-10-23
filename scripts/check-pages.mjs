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
for(const p of ['models/anatomy.bin','models/catalog.json','models/LICENSE-MODEL.txt','study/dog-skeleton-museum.jpg','study/dog-knee-museum.jpg',...['calm-approach','gentle-touch','walking-observation'].map(name=>`study/practice/${name}.webp`)])assert(fs.existsSync(path.join(root,p)),p);
const books=JSON.parse(fs.readFileSync('app/library-data.json','utf8'));
assert(!books.some(book=>book.id==='dorn-method-dogs'),'Removed Dorn document must not return to the library');
for(const name of fs.readdirSync(path.join(root,'library')))assert(!/^dorn-(?:method-dogs-.*\.pdf|preview-.*\.jpg)$/.test(name),'Removed Dorn document asset remains in the build: '+name);
for(const species of ['cat','rabbit'])assert.equal(fs.statSync(path.join(root,'models',species,'skeleton-scan.glb')).size,fs.statSync(path.join('public/models',species,'skeleton-scan.glb')).size);
assert(fs.existsSync(path.join(root,'models/SCAN-CREDITS.md')));
const feline=JSON.parse(fs.readFileSync(path.join(root,'models/cat/detailed-catalog.json'),'utf8'));
assert.equal(fs.statSync(path.join(root,feline.binaryPath)).size,feline.bytes);
assert(fs.existsSync(path.join(root,'models/cat/FELINE-CREDITS.md')));
for(const species of ['cat','rabbit']){const atlas=JSON.parse(fs.readFileSync(path.join(root,'models',species,'catalog.json'),'utf8'));assert.equal(fs.statSync(path.join(root,atlas.binaryPath)).size,atlas.bytes);}
let count=0;
for(const book of books)for(const section of book.parts){assert.equal(fs.statSync(path.join(root,section.url)).size,section.bytes);count++;}
// All runtime asset URLs must use the same deployment prefix as the bundles.
for(const file of ['page','scene','native-species-atlas','species-scan','library','book-reading','exam-quiz','study-visuals','practical-study','theory-chapter']){
 const source=fs.readFileSync('app/'+file+'.tsx','utf8');assert(source.includes('sitePath('),file);
 assert(!/fetch\(['"]\/|(?:src|href)=['"]\/(?!\/)/.test(source),'Root-only URL in '+file);
}
console.log('PASS: Pages base '+(basePath||'/')+'; '+assets+' HTML assets, 3D model, study images and '+count+' PDF sections.');
