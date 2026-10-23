// Import the user's CC BY 4.0 sculpt without inventing anatomical names.
// Run inspect-feline.mjs on the authorized GLB first. Component IDs are tied
// to that source and ordered by descending face count, not anatomy numbering.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {studyFor} from './species-study.mjs';
const components=JSON.parse(fs.readFileSync('../../work/feline-components.json'));
const pair=(cs,en)=>({cs,en});
const source='https://sketchfab.com/3d-models/feline-ecorche-dec-4c08824eb4914ff4b6e71b4dc2ba080e';
// Tissue grouping is a visual interpretation of the supplied sculpt, not
// source-authored labels. Unknown muscle identities stay unnamed in the UI.
const soft=new Set([0,1,3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,23,24,25,26,27,28,29,32,33,37,38,43,44,45,46,47,48,49,50,53,54,55,56,57,58,59,60,61,63,64,65,66,67,68,69,70,71,74,75,78,79,81,82,85,86,87,88,89,90,91,92,93,94,96,97,98,100,101,102,104,105,107,110,111,117,119,120,123,124,125,128,129,132,133,134,135,138,139,140,141,142,143,144,145,146,147,149,150,151,152,153,154,155,156,157,158,159,160,161,163,164,165,166,167,168,169,170,171,172,173,174,175,176,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,222,223,224,225,227,228,230,231,232,233,234,235,236,237,240,241,242,243,244,246,247,248,249,250,251,252,253,254,255,257,258,259,260,261,262,264,267,270,271,272,273,277,278,293,317,321,358]);
const names={2:pair('Lebka','Skull'),12:pair('Pánevní celek','Pelvic assembly'),30:pair('Pažní kost','Humerus'),31:pair('Pažní kost','Humerus'),34:pair('Dolní čelist','Mandible'),39:pair('Stehenní kost','Femur'),40:pair('Stehenní kost','Femur'),41:pair('Lopatka','Scapula'),42:pair('Lopatka','Scapula'),51:pair('Holenní kost','Tibia'),52:pair('Holenní kost','Tibia')};
// Link a small reviewed set to general anatomy lessons. This does not upgrade
// the sculpt's provisional identification to a veterinary validation.
const lessons={2:['MergedSkull','Head'],12:['Pelvis','Hindlimb'],30:['humerus','Forelimb'],31:['humerus','Forelimb'],34:['Jaw','Head'],39:['Femoris','Hindlimb'],40:['Femoris','Hindlimb'],41:['Scapula','Forelimb'],42:['Scapula','Forelimb'],51:['Tibia','Hindlimb'],52:['Tibia','Hindlimb']};
// Rib shafts/cartilaginous continuations and distal bones reviewed in situ.
for(const id of [63,64,102,104,170,172,184,188,190,191,196,200,201,202,203,204,205,206,209,210,211,212,213,214,215,216,217,218,219,220,222,225,227,228,230,231,232,233,234,237,240,241,242,243,244,246,247,248,249,250,251,252,253,254,255,257,258,260,261,264,267,270,271,272,273,277,278,293,317,321,358])soft.delete(id);
const minY=Math.min(...components.map(c=>c.bounds[0][1])),minZ=Math.min(...components.map(c=>c.bounds[0][2])),maxZ=Math.max(...components.map(c=>c.bounds[1][2])),scale=1.3/(maxZ-minZ),midZ=(maxZ+minZ)/2;
const chunks=[],parts=[];let offset=0;
for(const c of components){
 if(c.triangles<=1)continue; // Four isolated single-triangle export fragments.
 const xyz=new Float32Array(c.positions.flatMap(([x,y,z])=>[(z-midZ)*scale,(y-minY)*scale,-x*scale]));
 const index=new Uint32Array(c.indices.flat());const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
 for(let i=0;i<xyz.length;i++) {const axis=i%3;bounds[0][axis]=Math.min(bounds[0][axis],xyz[i]);bounds[1][axis]=Math.max(bounds[1][axis],xyz[i]);}
 const center=bounds[0].map((a,i)=>(a+bounds[1][i])/2),system=soft.has(c.id)?'muscle':'bone',code=String(c.id).padStart(3,'0');
 const label=names[c.id]?pair(`${names[c.id].cs} · ${code}`,`${names[c.id].en} · ${code}`):pair(`${system==='bone'?'Kostní':'Měkká'} část ${code}`,`${system==='bone'?'Skeletal':'Soft-tissue'} component ${code}`);
 const lesson=lessons[c.id],study=lesson?studyFor(lesson[0],system,lesson[1],'cat'):null;
 if(study){study.location=pair(`Obecná anatomie k pracovnímu označení této části: ${study.location.cs}`,`General anatomy for this component's provisional label: ${study.location.en}`);study.difference=pair('Zdroj je studie kočkovité šelmy bez určení druhu. Porovnávejte s anatomií domácí kočky; přesné proporce a úponové plochy tohoto modelu nejsou ověřeny.','The source is an unspecified feline study. Compare it with domestic-cat anatomy; exact proportions and attachment surfaces of this sculpt are unvalidated.');}
 parts.push({id:`feline_${code}`,system,label,vertexOffset:offset,vertexCount:xyz.length/3,indexOffset:offset+xyz.byteLength,indexCount:index.length,bounds,center,sourceComponent:c.id,identification:names[c.id]?'provisional':'unidentified',...(lesson?{anatomicalRegion:lesson[1]}:{}),action:pair('Samostatná část původní modelované geometrie. Anatomické názvy a rozdělení tkání jsou pracovní interpretací a čekají na odborné ověření.','An independently selectable piece of the original sculpt. Anatomical names and tissue grouping are provisional interpretations pending expert review.'),study});
 chunks.push(Buffer.from(xyz.buffer),Buffer.from(index.buffer));offset+=xyz.byteLength+index.byteLength;
}
const dir='public/models/cat/';fs.writeFileSync(dir+'detailed-anatomy.bin',Buffer.concat(chunks));
fs.writeFileSync(dir+'detailed-catalog.json',JSON.stringify({species:'cat',geometryKind:'sculpt',parts,bytes:offset,binaryPath:'/models/cat/detailed-anatomy.bin',scientificName:'Feline Ecorche',scope:pair('Modelovaná kočkovitá anatomie od westerly (CC BY 4.0). Původní tvarové detaily jsou zachovány. Autor neurčuje konkrétní druh a vynechal některé hluboké svaly. Rozdělení kostních a měkkých částí je orientační; názvy nejsou odborně ověřené. Polohy jsou do ověření kloubů vypnuté.','Feline anatomy sculpt by westerly (CC BY 4.0). Original surface detail is preserved. The author does not specify a species and omitted some deep muscles. Bone/soft-tissue grouping and names are provisional. Poses are disabled pending joint validation.'),geometryOrigin:pair('Feline Ecorche Dec, westerly, 2015. Import zachovává geometrii; odděluje souvislé komponenty, sjednocuje měřítko a orientaci, mění materiály. Vynechány čtyři izolované trojúhelníky.','Feline Ecorche Dec, westerly, 2015. Import preserves geometry, separates connected components, normalizes scale and orientation, and changes materials. Four isolated triangles omitted.'),sources:[{title:'Feline Ecorche Dec · westerly',url:source},{title:'CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/'},{title:'University of Minnesota · Carnivore anatomy',url:'https://vanat.ahc.umn.edu/carnLabs/'}],sourceGeometryHash:createHash('sha256').update(fs.readFileSync('../../work/feline-components.json')).digest('hex')}));
console.log(`Imported ${parts.length} components, ${parts.reduce((n,p)=>n+p.indexCount/3,0)} triangles, ${offset} bytes.`);
