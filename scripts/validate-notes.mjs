import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const atlas=read('../public/models/catalog.json');
const data=read('../app/study-data.json');
assert.deepEqual(Object.keys(data.parts).sort(),atlas.parts.map(p=>p.id).sort(),'Every actual mesh must have a note, with no orphan IDs');
const fields=['overview','location','attachments','function','nerve','physio','recall'];
let words=0;
for(const [key,p] of Object.entries(data.profiles)){
 assert(p.title.length>2,key);
 for(const field of fields)assert(typeof p[field]==='string'&&p[field].length>(field==='nerve'?5:20),`${key}: missing ${field}`);
 const text=fields.map(f=>p[f]).join(' ');const count=text.split(/\s+/).length;words+=count;
 assert(count>=50,`${key}: unexpectedly abbreviated note`);
 assert(!/not yet included|notes are unavailable|TODO|placeholder/i.test(text),key);
 assert(p.sources.length>=1,key);
 for(const id of p.sources){assert(data.sources[id],`${key}: unresolved reference`);assert.equal(new URL(data.sources[id].url).protocol,'https:');}
}
for(const [id,piece] of Object.entries(data.parts)){assert(data.profiles[piece.profile],id);assert(piece.side,id);}
const profile=id=>data.profiles[data.parts[id].profile];
assert.notEqual(data.parts.m_flexor_digitorum_superficialis_L.profile,data.parts['m_flexor_digitorum_superficialis_L.001'].profile,'Fore/hind flexors must have different notes');
assert.notEqual(data.parts.m_flexor_digitorum_profundus_R.profile,data.parts['m_flexor_digitorum_profundus_R(2)'].profile);
assert.match(profile('m_flexor_digitorum_superficialis_L.001').title,/hindlimb/);
assert.match(profile('m_flexor_digitorum_superficialis_L').title,/forelimb/);
assert.match(profile('m_triceps_brachii_long_L').attachments,/scapula/);
assert.match(profile('m_triceps_brachii_lateral_L').attachments,/humerus/);
assert.match(profile('m_vastus_lat_L').function,/stifle/);
assert.match(profile('m_psoas_minor_L').attachments,/ilium/);
for(const id of ['m_Ligament','m_tibialis_caudalis_L','m_capsularis_R','Phalanges_B_R_4','Metatarsi_L_1','Carpal_L'])assert(data.parts[id].warning,`${id}: identity qualification required`);
assert.match(data.parts.L_7.modelNote,/lumbosacral/);
assert.equal(data.parts.L_7.side,'Midline / side not specified');
assert.equal(data.parts.m_supraspinatus_L.side,'Left');
assert.equal(data.parts.m_supraspinatus_R.side,'Right');
assert.equal(data.parts.m_supraspinatus_L.profile,data.parts.m_supraspinatus_R.profile);
const markup=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
for(const field of fields)assert(markup.includes(`note.${field}`),`Inspector must render ${field}`);
assert(markup.includes('note.references.map'));
console.log(`PASS: ${atlas.parts.length}/${atlas.parts.length} pieces covered; ${Object.keys(data.profiles).length} profiles; ${words} words of anatomy/study content; ${Object.values(data.parts).filter(p=>p.warning).length} explicit identity qualifications.`);
console.log('PASS: limb-specific flexors, separate muscle heads, bilateral notes, ambiguous labels and all inspector sections.');
