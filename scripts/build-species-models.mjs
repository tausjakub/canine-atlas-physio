// Original procedural teaching geometry; no dog meshes or third-party models are used.
// Positions are authored illustrations, not digitised measurements or attachment footprints.
import fs from 'node:fs';
import * as T from 'three';
import {studyFor} from './species-study.mjs';
import {sculptLongBone,sculptRabbitSkull,sculptRabbitJaw,sculptRabbitScapula,muscleFan,muscleBelly} from './rabbit-sculpt.mjs';
const root=new URL('../public/models/',import.meta.url);
const pair=(cs,en)=>({cs,en});
const v=p=>new T.Vector3(...p);
const mix=(a,b,t)=>v(a).lerp(v(b),t).toArray();
function ellipsoid(p,size){return new T.SphereGeometry(1,24,16).scale(...size).translate(...p);}
function rod(a,b,r1,r2=r1){const va=v(a),vb=v(b),g=new T.CylinderGeometry(r2,r1,va.distanceTo(vb),10,1);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),vb.clone().sub(va).normalize()));return g.translate(...va.lerp(vb,.5).toArray());}
function belly(a,b,width,depth=width){const d=v(b).sub(v(a)),length=d.length(),profile=[];for(let i=0;i<=24;i++){const t=i/24;profile.push(new T.Vector2(width*(.075+.925*Math.pow(Math.sin(Math.PI*t),.72)),length*(t-.5)));}const g=new T.LatheGeometry(profile,20).scale(1,1,depth/width);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));return g.translate(...mix(a,b,.5));}
function curve(points,r){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v)),24,r,8,false);}
function plate(points,thickness){const shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();return new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1}).translate(0,0,-thickness/2);}
const sources={
 cat:[{title:'University of Minnesota · Carnivore anatomy (dog and cat)',url:'https://vanat.ahc.umn.edu/carnLabs/'},{title:'Penn State · Cat muscle dissection',url:'https://sites.psu.edu/catmuscles/'}],
 rabbit:[{title:'Universidad de Zaragoza · Rabbit osteology',url:'https://ocw.unizar.es/ocw/course/view.php?id=23&section=2'},{title:'Mukhopadhyay & Wagner · Rabbit muscular anatomy',url:'https://open.clemson.edu/rabbit/2/'},{title:'Vertebral formula and congenital abnormalities of the vertebral column in rabbits',url:'https://www.sciencedirect.com/science/article/pii/S1090023318301345'},{title:'Biology of the Rabbit · comparative anatomy',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5129783/'},{title:'Skeletal muscle architecture of the rabbit hindlimb',url:'https://pubmed.ncbi.nlm.nih.gov/2921772/'},{title:'Rabbit gastrocnemius, plantaris and soleus architecture',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4482742/'}]
};
for(const species of ['cat','rabbit']){
 if(process.argv.includes('--rabbit-only')&&species!=='rabbit')continue;
 const rabbit=species==='rabbit',parts=[],chunks=[];let offset=0;
 const shoulder=[.18,rabbit?.32:.40,0],elbow=[.14,rabbit?.19:.25,0],carpus=[.19,.065,0];
 const hip=[-.28,rabbit?.34:.40,0],stifle=[rabbit?-.10:-.22,rabbit?.205:.24,0],hock=[rabbit?-.28:-.34,.09,0];
 const head=[.31,rabbit?.43:.53,0],neck=[.20,rabbit?.36:.45,0];
 const toe=[.235,.025,0],hindtoe=[rabbit?-.13:-.30,.025,0],tailBase=[-.35,hip[1]+.045,0];
 function add(id,label,region,geometries,system='bone',action=pair('Opora a přenos sil; přesný tvar kloubních ploch zde není modelován.','Support and force transmission; precise articular surfaces are not represented.')){
  const vertices=[],indices=[];
  for(const g of geometries){const a=g.getAttribute('position');const start=vertices.length/3;for(let i=0;i<a.count;i++)vertices.push(a.getX(i),a.getY(i),a.getZ(i));if(g.index)for(const n of g.index.array)indices.push(n+start);else for(let i=0;i<a.count;i++)indices.push(start+i);g.dispose();}
  const xyz=new Float32Array(vertices),idx=new Uint32Array(indices),box=new T.Box3().setFromArray(xyz),suffix=id.endsWith('_L')?pair(' · vlevo',' · left'):id.endsWith('_R')?pair(' · vpravo',' · right'):pair('','');
  parts.push({id,system,vertexOffset:offset,vertexCount:xyz.length/3,indexOffset:offset+xyz.byteLength,indexCount:idx.length,center:box.getCenter(new T.Vector3()).toArray(),bounds:[box.min.toArray(),box.max.toArray()],anatomicalRegion:region,label:pair(label.cs+suffix.cs,label.en+suffix.en),action,study:studyFor(id,system,region,species)});
  chunks.push(Buffer.from(xyz.buffer),Buffer.from(idx.buffer));offset+=xyz.byteLength+idx.byteLength;
 }
 const longBone=(id,label,region,a,b,r)=>{if(rabbit&&/^(Femoris|humerus|Tibia|Radius|Ulna)_/.test(id)){const sculpt=sculptLongBone(id,a,b,r);if(sculpt){add(id,label,region,[sculpt]);return;}}const midpoint=mix(a,b,.48);midpoint[0]-=r*.45;add(id,label,region,[curve([a,midpoint,b],r*.6),ellipsoid(a,[r*1.3,r,r]),ellipsoid(b,[r*1.2,r*.85,r*1.3]),...(/^Femoris/.test(id)?[ellipsoid([a[0]+.006,a[1]+.008,a[2]*.76],[r,r,r]),ellipsoid([a[0]-.009,a[1]+.009,a[2]*1.12],[r*.7,r*1.3,r*.7])]:/^humerus/.test(id)?[rod(mix(a,b,.20),[midpoint[0]+r,midpoint[1]+r,midpoint[2]],r*.36)]:/^Tibia_/.test(id)?[rod([a[0]+r,a[1]-.009,a[2]],[midpoint[0]+r*.8,midpoint[1],midpoint[2]],r*.35)]:[])]);};
 // Braincase, facial region, orbital arches and paired mandibles remain simplified solids.
 add('MergedSkull',pair('Lebka · autorská rekonstrukce','Skull · authored reconstruction'),'Head',rabbit?[sculptRabbitSkull(head)]:[ellipsoid(head,[.057,.045,.043]),ellipsoid([head[0]+.05,head[1]-.012,0],[.035,.026,.029]),...[-1,1].map(s=>new T.TorusGeometry(.024,.004,7,22).scale(1,1,.8).translate(head[0]+.02,head[1],s*.037))], 'bone',pair('Ochrana mozku a smyslových orgánů. U králíka jsou modelovány velké očnice, jařmové oblouky, nosní otvor a orientační fenestrace horní čelisti; švy a jednotlivé lebeční kosti nejsou odděleny.','Protection of the brain and sensory organs. The rabbit has modelled orbits, zygomatic arches, a nasal opening and illustrative maxillary fenestrations; sutures and individual cranial bones are not separated.'));
 for(const side of [-1,1]){
  const tag=side<0?'L':'R',z=side*.022;
  add('Jaw_'+tag,pair('Polovina dolní čelisti','Hemimandible'),'Head',rabbit?[sculptRabbitJaw(head,side)]:[rod([head[0]-.013,head[1]-.015,z],[head[0]+.005,head[1]-.052,z],.007),rod([head[0]+.005,head[1]-.052,z],[head[0]+.069,head[1]-.04,z*.65],.007)]);
 }
 // Teeth are intentionally omitted rather than substituting an incorrect dental formula.
 const thoracic=rabbit?12:13,lumbar=7,thoraxFront=.12,thoraxBack=-.13,spineY=hip[1]+.045;
 const vertebra=(id,label,p,r)=>{if(id==='C_1'){add(id,label,'Neck & trunk',[new T.TorusGeometry(.012,.004,10,28).rotateY(Math.PI/2).translate(...p),...[-1,1].map(side=>ellipsoid([p[0]-.005,p[1],side*.023],[.014,.004,.018]))],'bone',pair('Atlas nese hlavu a spolu s týlní kostí umožňuje kývavý pohyb.','Atlas supports the head and permits nodding with the occipital bone.'));return;}const ring=new T.TorusGeometry(r*.55,r*.22,6,12).rotateY(Math.PI/2).translate(...[p[0],p[1]+r*.55,p[2]]);add(id,label,'Neck & trunk',[ellipsoid(p,[r*.8,r*.55,r*.6]),ring,...(id==='C_2'?[rod([p[0],p[1],0],[p[0]+.025,p[1]+.005,0],.004)]:[]),rod([p[0],p[1]+r*.8,0],[p[0]-.004,p[1]+r*1.65,0],r*.17),rod([p[0],p[1],-r*1.15],[p[0],p[1],r*1.15],r*.18)],'bone',pair('Článek páteře. Určete oddíl, směr k hlavě a návaznost na sousední obratle. Výběžky a kanál jsou schematické.','A vertebral element. Identify its region, cranial direction and neighbours. Processes and canal are schematic.'));};
 for(let i=0;i<7;i++)vertebra('C_'+(i+1),pair(`Krční obratel C${i+1}`,`Cervical vertebra C${i+1}`),mix([head[0]-.05,head[1]-.007,0],[thoraxFront+.025,spineY,0],i/6),.015);
 for(let i=0;i<thoracic;i++){
  const t=i/(thoracic-1),x=thoraxFront+(thoraxBack-thoraxFront)*t,y=spineY+.012*Math.sin(t*Math.PI);vertebra('T_'+(i+1),pair(`Hrudní obratel T${i+1}`,`Thoracic vertebra T${i+1}`),[x,y,0],.015);
  for(const side of [-1,1]){const depth=.08+.06*Math.sin(Math.PI*(.15+t*.75)),width=.035+.045*Math.sin(Math.PI*(.10+t*.82));const end=[x+.01,y-depth,side*.014];add(`Rib_${i+1}_${side<0?'L':'R'}`,pair(`Žebro ${i+1}`,`Rib ${i+1}`),'Neck & trunk',[curve([[x,y-.006,side*.012],[x-.012,y-.035,side*width],[x-.018,y-depth*.7,side*width],end],.0035)],'bone',pair('Součást hrudního koše. Žeberní chrupavky a přesná kloubní spojení nejsou zobrazeny.','Part of the thoracic cage. Costal cartilages and precise articulations are not shown.'));}
 }
 for(let i=0;i<lumbar;i++)vertebra('L_'+(i+1),pair(`Bederní obratel L${i+1}`,`Lumbar vertebra L${i+1}`),mix([thoraxBack-.022,spineY,0],[hip[0]-.003,hip[1]+.04,0],i/6),.017);
 add('Sacrum',pair(`Křížová kost · ${rabbit?4:3} srostlé obratle`,`Sacrum · ${rabbit?4:3} fused vertebrae`),'Neck & trunk',[ellipsoid([hip[0]-.035,hip[1]+.036,0],[.036,.014,.023])]);
 for(let i=0;i<(rabbit?16:20);i++){const t=i/(rabbit?16:20),p=[tailBase[0]-(rabbit?.095:.34)*t,tailBase[1]-(rabbit?.02:.1)*Math.sin(t*Math.PI*.8),0];vertebra('Ca_'+(i+1),pair(`Ocasní obratel ${i+1} · ilustrační počet`,`Caudal vertebra ${i+1} · illustrative count`),p,(rabbit?.006:.012)*(1-t*.7));}
 add('Sternum',pair('Hrudní kost · skupina','Sternum · grouped'),'Neck & trunk',[curve([[.10,spineY-.105,0],[0,spineY-.143,0],[-.085,spineY-.115,0]],.007)]);
 for(const side of [-1,1]){
  const tag=side<0?'L':'R',z=side*(rabbit?.072:.055),at=p=>[p[0],p[1],z],off=(p,x,y,d=0)=>[p[0]+x,p[1]+y,z+side*d];
  const s=at(shoulder),e=at(elbow),c=at(carpus),h=at(hip),k=at(stifle),a=at(hock),ft=at(toe),ht=at(hindtoe);
  add('Scapula_'+tag,pair('Lopatka','Scapula'),'Forelimb',rabbit?[sculptRabbitScapula(s,z,side)]:[plate([[s[0]-.09,s[1]+.095],[s[0]+.018,s[1]+.11],[s[0]+.018,s[1]]],.006).translate(0,0,z),rod(off(s,-.04,.09,.007),off(s,.01,.01,.007),.003)]);
  add('Clavicle_'+tag,pair('Klíční kost · schéma','Clavicle · schematic'),'Forelimb',[rod(off(s,.024,.035,-.025),off(s,.022,.017,-.035),.002)],'bone',pair('Drobná klíční kost je záměrně zvýrazněná. Nevytváří kostěný závěs končetiny na trupu.','The small clavicle is deliberately emphasised. It does not create a bony attachment of the limb to the trunk.'));
  longBone('humerus_'+tag,pair('Pažní kost','Humerus'),'Forelimb',s,e,.013);
  longBone('Radius_'+tag,pair('Vřetenní kost','Radius'),'Forelimb',off(e,.003,-.004,-.004),off(c,.003,0,-.004),.007);
  longBone('Ulna_'+tag,pair('Loketní kost','Ulna'),'Forelimb',off(e,-.009,.02,.004),off(c,-.008,0,.004),.005);
  const carpals=rabbit?[['radiale','Vřetenní','Radial',-.012,.006],['intermedium','Střední','Intermediate',0,.006],['ulnare','Loketní','Ulnar',.012,.006],['accessorium','Přídatná','Accessory',.021,.003],['centrale','Centrální','Central',0,-.004]]:[['intermedioradiale','Středovřetenní','Intermedioradial',-.009,.005],['ulnare','Loketní','Ulnar',.009,.005],['accessorium','Přídatná','Accessory',.020,.003]];
  for(let i=1;i<=4;i++)carpals.push([String(i),'Zápěstní '+i,'Carpal '+i,(i-2.5)*.010,-.014]);
  for(const [name,cs,en,d,y] of carpals)add('Carpal_'+name+'_'+tag,pair(cs+' kost zápěstí',en+' carpal bone'),'Forelimb',[ellipsoid(off(c,name==='accessorium'?-.011:0,y,d),[.008,.0055,.005])]);
  add('Pelvis_'+tag,pair('Pánevní kost','Hip bone'),'Hindlimb',[plate([[h[0]+.055,h[1]+.065],[h[0]-.02,h[1]+.02],[h[0]-.07,h[1]-.035],[h[0]-.017,h[1]-.015]],.01).translate(0,0,z*.6),new T.TorusGeometry(.024,.006,8,16).scale(1,.65,1).translate(h[0]-.035,h[1]-.022,z*.55),ellipsoid(h,[.016,.019,.013])]);
  longBone('Femoris_'+tag,pair('Stehenní kost','Femur'),'Hindlimb',h,k,rabbit?.017:.014);
  add('Patella_'+tag,pair('Čéška','Patella'),'Hindlimb',[ellipsoid(off(k,.016,.002,0),[.006,.01,.008])]);
  longBone('Tibia_'+tag,pair('Holenní kost','Tibia'),'Hindlimb',k,a,.009);
  longBone('Fibula_'+tag,pair('Lýtková kost','Fibula'),'Hindlimb',off(k,-.009,0,.007),off(a,-.004,0,rabbit?0:.007),.0035);
  add('Tibial_tarsal_'+tag,pair('Hlezenní kost · talus','Talus'),'Hindlimb',[ellipsoid(off(a,.003,0,-.006),[.014,.012,.01]),...[-1,1].map(q=>new T.TorusGeometry(.008,.0025,8,24).rotateY(Math.PI/2).translate(a[0]+.004,a[1]+.003,a[2]+q*.006))]);
  add('Calcaneal_tuber_'+tag,pair('Patní kost · calcaneus','Calcaneus'),'Hindlimb',[rod(off(a,-.006,-.005,.008),off(a,-.025,.035,.008),.006),ellipsoid(off(a,-.025,.035,.008),[.009,.009,.007])]);
  add('Tarsus_centrale_'+tag,pair('Centrální zánártní kost','Central tarsal bone'),'Hindlimb',[ellipsoid(off(a,.008,-.017,-.004),[.01,.005,.012])]);
  for(let i=rabbit?2:1;i<=4;i++)add('Tarsus_'+i+'_'+tag,pair('Zánártní kost '+i,'Tarsal bone '+i),'Hindlimb',[ellipsoid(off(a,.013,-.029,(i-2.5)*.010),[.009,.005,.005])]);
  for(const [fore,start,end,count] of [[true,c,ft,5],[false,a,ht,4]])for(let i=0;i<count;i++){
   const digit=fore?i+1:i+2,spread=(i-(count-1)/2)*.011,tip=[end[0],end[1],end[2]+spread],base=[start[0],start[1],start[2]+spread*.6];
   if(fore&&i===0){tip[0]-=.024;tip[1]+=.02;}
   longBone(`${fore?'Os_metacarpale':'Metatarsi'}_${digit}_${tag}`,pair(`${fore?'Záprstní':'Nártní'} kost ${digit}`,`${fore?'Metacarpal':'Metatarsal'} ${digit}`),fore?'Forelimb':'Hindlimb',base,tip,.003);
   for(let ph=0;ph<(digit===1?2:3);ph++){const p=[tip[0]+ph*.009,tip[1]-.003-ph*.002,tip[2]],q=[p[0]+.009,p[1]-.002,p[2]];longBone(`${fore?'Phalanx':'Phalanges_B'}_${digit}_${ph+1}_${tag}`,pair(`Článek ${ph+1} prstu ${digit}`,`Digit ${digit}, phalanx ${ph+1}`),fore?'Forelimb':'Hindlimb',p,q,.0026);}
  }
  const muscle=(id,cs,en,region,p,q,width,actionCs,actionEn,depth=width*.6)=>{
   const via=id==='extensor_digitorum_longus'?off(a,.017,.004,.014):id==='extensor_digitorum'?off(c,.008,.003,.013):id==='flexor_digitorum'?off(c,-.008,-.005,0):null;
   const fusiform=(p,q,w,d)=>rabbit?muscleBelly(p,q,w,d,id):belly(p,q,w,d);
   let geometry=via?[fusiform(p,mix(p,via,.70),width,depth),curve([mix(p,via,.65),via,q],.0018)]:[fusiform(p,q,width,depth)];
   if(rabbit){
    const fans={
     latissimus:[[-.20,spineY+.006,side*.035],[-.035,spineY-.10,side*.075],q,.006,side*.012],
     trapezius:[[.185,spineY+.035,side*.014],[-.09,spineY+.019,side*.014],q,.003,side*.006],
     obliquus:[[.045,spineY-.04,side*.077],[-.17,spineY-.038,side*.070],q,.004,side*.006],
     subscapularis:[off(s,-.072,.080,-.020),off(s,.003,.105,-.020),q,.004,0],
     infraspinatus:[off(s,-.075,.075,.018),off(s,-.035,.102,.018),q,.006,side*.003],
     supraspinatus:[off(s,-.022,.102,.012),off(s,.012,.092,.012),q,.006,0],
     gracilis:[off(h,-.05,-.022,-.044),off(h,.023,-.012,-.044),q,.004,0],
     serratus:[[.04,spineY-.12,side*.050],[.16,spineY-.05,side*.045],q,.005,side*.005]
    };
    if(fans[id]){geometry.forEach(g=>g.dispose());geometry=[muscleFan(...fans[id])];}
   }
   add('m_'+id+'_'+tag,pair(cs,en),region,geometry,'muscle',pair(actionCs,actionEn));
  };
  muscle('supraspinatus','Nadhřebenový sval','Supraspinatus','Forelimb',off(s,-.015,.085,.012),off(s,.021,-.025,.008),.017,'Podílí se na stabilizaci a extenzi ramene.','Contributes to shoulder stability and extension.');
  muscle('infraspinatus','Podhřebenový sval','Infraspinatus','Forelimb',off(s,-.07,.065,.014),off(s,.01,-.022,.018),.024,'Podílí se na laterální stabilizaci ramene.','Contributes to lateral shoulder stability.');
  muscle('deltoideus','Deltový sval · skupina','Deltoid · grouped','Forelimb',off(s,-.015,.045,.026),off(mix(s,e,.45),0,0,.023),.018,'Přispívá k flexi ramenního kloubu.','Contributes to shoulder flexion.');
  muscle('biceps_brachii','Dvojhlavý sval pažní','Biceps brachii','Forelimb',off(s,.017,-.012,-.008),off(e,.014,-.011,-.008),.016,'Podílí se na flexi lokte; překlenuje rameno i loket.','Contributes to elbow flexion; crosses shoulder and elbow.');
  muscle('triceps_long','Triceps · dlouhá hlava','Triceps · long head','Forelimb',off(s,-.053,.048,.012),off(e,-.012,.015,.006),.023,'Extenze lokte a příspěvek k flexi ramene.','Elbow extension and contribution to shoulder flexion.');
  muscle('triceps_lateral','Triceps · laterální hlava','Triceps · lateral head','Forelimb',off(mix(s,e,.28),-.018,0,.028),off(e,-.012,.016,.014),.013,'Extenze lokte. Nepřeklenuje rameno.','Elbow extension; does not cross the shoulder.');
  muscle('triceps_medial','Triceps · mediální hlava','Triceps · medial head','Forelimb',off(mix(s,e,.35),-.008,0,-.018),off(e,-.012,.016,-.009),.011,'Extenze lokte. Hlubší hlava při pažní kosti.','Elbow extension; deeper head alongside the humerus.');
  muscle('extensor_carpi','Vřetenní natahovač zápěstí','Extensor carpi radialis','Forelimb',off(e,.012,-.016,.009),off(c,.009,.002,.004),.011,'Přispívá k extenzi zápěstí.','Contributes to carpal extension.');
  muscle('latissimus','Široký sval zádový','Latissimus dorsi','Neck & trunk',[-.10,spineY-.015,side*.072],off(s,-.005,-.043,-.009),.036,'Propojuje trup a hrudní končetinu; ovlivňuje pohyb pažní kosti.','Links trunk and forelimb and influences humeral movement.',.009);
  muscle('pectorals','Prsní svaly · skupina','Pectoral muscles · grouped','Neck & trunk',[.04,spineY-.12,side*.012],off(s,.01,-.055,-.02),.022,'Přispívají k addukci hrudní končetiny a podpoře trupu.','Contribute to forelimb adduction and trunk support.');
  muscle('longissimus','Nejdelší sval hřbetu · systém','Longissimus · system','Neck & trunk',[hip[0],spineY+.023,side*.029],[.10,spineY+.035,side*.029],.018,'Epaxiální podpora a extenze páteře.','Epaxial support and vertebral extension.');
  muscle('abdominis','Přímý sval břišní','Rectus abdominis','Neck & trunk',[-.23,spineY-.11,side*.029],[.01,spineY-.15,side*.029],.014,'Podpora břišní stěny a flexe trupu.','Abdominal wall support and trunk flexion.');
  muscle('gluteus','Střední hýžďový sval','Gluteus medius','Hindlimb',off(h,.005,.045,-.012),off(mix(h,k,.25),-.01,.005,.022),.035,'Přispívá k extenzi kyčle.','Contributes to hip extension.');
  muscle('rectus_femoris','Kvadriceps · přímý sval stehenní','Quadriceps · rectus femoris','Hindlimb',off(h,.028,.024,0),off(k,.018,.006,0),rabbit?.022:.016,'Extenze kolene a flexe kyčle.','Stifle extension and hip flexion.');
  for(const [id,cs,en,d,x] of [['lateralis','zevní','lateral',.021,.004],['medialis','vnitřní','medial',-.021,.004],['intermedius','prostřední','intermediate',0,.012]])muscle('vastus_'+id,'Kvadriceps · '+cs+' široký sval','Quadriceps · vastus '+id,'Hindlimb',off(mix(h,k,.18),x,0,d),off(k,.016,.008,d*.4),rabbit?.020:.014,'Extenze kolene; tato hlava nepřeklenuje kyčel.','Stifle extension; this head does not cross the hip.');
  muscle('biceps_femoris','Dvojhlavý sval stehenní','Biceps femoris','Hindlimb',off(h,-.035,.016,.02),off(k,-.005,-.018,.025),rabbit?.04:.026,'Vícekloubový sval. Účinek závisí na části svalu a fázi pohybu.','A multi-joint muscle. Its effect depends on the muscle portion and movement phase.');
  muscle('semitendinosus','Pološlašitý sval','Semitendinosus','Hindlimb',off(h,-.06,-.009),off(k,-.026,-.023,-.012),.018,'Přispívá k extenzi kyčle a flexi kolene.','Contributes to hip extension and stifle flexion.');
  for(const [id,cs,en,d] of [['medial','mediální','medial',-.015],['lateral','laterální','lateral',.015]])muscle('gastrocnemius_'+id,'Lýtkový sval · '+cs+' hlava','Gastrocnemius · '+en+' head','Hindlimb',off(k,-.015,.005,d),off(a,-.025,.035,.008),rabbit?.021:.015,'Extenze hlezna; překlenuje také koleno. Obě hlavy se sbíhají do patního šlachového aparátu.','Hock extension; also crosses the stifle. Both heads converge into the calcaneal tendon apparatus.');
  muscle('tibialis','Přední holenní sval','Tibialis cranialis','Hindlimb',off(k,.014,-.03,.006),off(a,.012,0,.006),.012,'Přispívá k flexi hlezna.','Contributes to hock flexion.');
  muscle('subscapularis','Podlopatkový sval','Subscapularis','Forelimb',off(s,-.04,.075,-.018),off(s,.01,-.018,-.012),.034,'Mediální stabilizace ramene a addukce paže.','Medial shoulder stability and arm adduction.',.008);
  muscle('teres_major','Velký oblý sval','Teres major','Forelimb',off(s,-.075,.07,-.012),off(mix(s,e,.20),-.012,0,-.015),.014,'Flexe ramene a addukce paže.','Shoulder flexion and arm adduction.');
  muscle('brachialis','Pažní sval','Brachialis','Forelimb',off(mix(s,e,.28),.005,0,.020),off(e,.015,-.018,.010),.012,'Flexe lokte.','Elbow flexion.');
  muscle('extensor_digitorum','Společný natahovač prstů','Common digital extensor','Forelimb',off(e,.006,-.016,.022),off(ft,.006,0,.013),.008,'Extenze prstů; průběh větvených šlach je zjednodušený.','Digital extension; branched tendon paths are simplified.');
  muscle('flexor_carpi','Vřetenní ohybač zápěstí','Flexor carpi radialis','Forelimb',off(e,-.01,-.009,-.017),off(c,-.005,-.012,-.012),.010,'Flexe zápěstí a podpora při zatížení.','Carpal flexion and support during weight bearing.');
  muscle('flexor_digitorum','Povrchový ohybač prstů','Superficial digital flexor','Forelimb',off(e,-.025,-.017,0),off(ft,-.007,-.007,0),.009,'Flexe prstů; podílí se na podpoře při zatížení.','Digital flexion; contributes to support during loading.');
  muscle('pronator_teres','Oblý pronátor','Pronator teres','Forelimb',off(e,.005,-.004,-.018),off(mix(e,c,.42),.008,0,-.008),.009,'Pronace předloktí.','Forearm pronation.');
  if(!rabbit)muscle('brachioradialis','Pažněvřetenní sval','Brachioradialis','Forelimb',off(mix(s,e,.8),.012,0,.026),off(c,.012,.019,.012),.009,'Pomáhá supinaci předloktí. U kočky je dobře vyvinutý.','Assists forearm supination; well developed in the cat.');
  muscle('serratus','Pilovitý sval ventrální · skupina','Serratus ventralis · grouped','Neck & trunk',[.03,spineY-.062,side*.063],off(s,-.027,.065,-.025),.039,'Svalový závěs trupu mezi hrudními končetinami; stabilizace lopatky.','Muscular suspension of the trunk between forelimbs; scapular stabilization.',.009);
  muscle('trapezius','Trapézový sval · skupina','Trapezius · grouped','Neck & trunk',[.065,spineY+.045,side*.012],off(s,-.029,.061,.027),.045,'Pohyb a stabilizace lopatky.','Scapular movement and stabilization.',.006);
  muscle('obliquus','Zevní šikmý břišní sval','External abdominal oblique','Neck & trunk',[-.02,spineY-.04,side*.070],[-.23,spineY-.115,side*.050],.048,'Podpora břišní stěny; podíl na flexi a rotaci trupu.','Supports the abdominal wall; contributes to trunk flexion and rotation.',.006);
  muscle('gluteus_superficialis','Povrchový hýžďový sval','Gluteus superficialis','Hindlimb',off(h,-.035,.048,.024),off(mix(h,k,.32),-.009,0,.033),.022,'Podíl na pohybu a laterální stabilizaci kyčle.','Contributes to hip movement and lateral stability.');
  muscle('semimembranosus','Poloblanitý sval','Semimembranosus','Hindlimb',off(h,-.05,-.013,-.014),off(k,-.004,.01,-.024),.023,'Extenze kyčle a addukce; vliv na koleno závisí na části.','Hip extension and adduction; stifle effect depends on portion.');
  muscle('gracilis','Štíhlý sval','Gracilis','Hindlimb',off(h,-.008,-.026,-.046),off(k,-.001,-.023,-.033),.026,'Addukce pánevní končetiny.','Hindlimb adduction.',.006);
  muscle('adductor','Přitahovače stehna · skupina','Thigh adductors · grouped','Hindlimb',off(h,-.025,-.02,-.033),off(mix(h,k,.68),-.01,0,-.017),.025,'Addukce stehna a podpora kyčle.','Thigh adduction and hip support.');
  muscle('sartorius','Krejčovský sval','Sartorius','Hindlimb',off(h,.047,.042,-.018),off(k,.022,-.009,-.027),.011,'Vícekloubový sval; přispívá k flexi kyčle a ovlivňuje koleno.','Multi-joint muscle; contributes to hip flexion and influences the stifle.');
  muscle('iliopsoas','Bedrokyčelní sval · skupina','Iliopsoas · grouped','Hindlimb',[-.18,spineY-.025,side*.024],off(mix(h,k,.22),-.009,0,-.020),.017,'Flexe kyčle; stabilizace bederněpánevní oblasti.','Hip flexion; lumbopelvic stabilization.');
  muscle('soleus','Šikmý sval lýtkový · soleus','Soleus','Hindlimb',off(k,-.01,-.045,.018),off(a,-.025,.035,.008),rabbit?.013:.008,'Extenze hlezna bez přímého překlenutí kolene.','Hock extension without directly crossing the stifle.');
  muscle('extensor_digitorum_longus','Dlouhý natahovač prstů','Long digital extensor','Hindlimb',off(k,.01,.004,.022),off(ht,.01,.006,.014),.008,'Extenze prstů a příspěvek k flexi hlezna.','Digital extension and contribution to hock flexion.');
  muscle('fibularis','Dlouhý lýtkový sval','Fibularis longus','Hindlimb',off(k,0,-.034,.024),off(a,.014,-.023,.019),.009,'Ovlivňuje polohu tlapky a flexi hlezna; šlacha pod chodidlem není úplně rekonstruována.','Influences paw orientation and hock flexion; the plantar tendon course is not fully reconstructed.');
  muscle('temporalis','Spánkový sval','Temporalis','Head',[head[0]-.017,head[1]+.018,side*.033],[head[0]+.004,head[1]-.025,side*.024],.022,'Elevace dolní čelisti.','Elevation of the mandible.');
  muscle('masseter','Žvýkací sval','Masseter','Head',[head[0]+.005,head[1]-.012,side*.041],[head[0]+.026,head[1]-.049,side*.031],rabbit?.022:.018,'Elevace dolní čelisti. Tvar a vrstvy jsou zjednodušené.','Elevation of the mandible. Shape and layers are simplified.');
 }
 // Solve limb chains against illustrative paw targets, preserving segment lengths.
 // This is a teaching pose, not measured joint range or a movement prescription.
 const direction=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
 const angleSet={};
 for(const pose of ['sitting','lying']){
  const trunk=pose==='sitting'?(rabbit?.45:.62):0,lower=pose==='lying'?shoulder[1]-.15:0;
  const transform=p=>[shoulder[0]+(p[0]-shoulder[0])*Math.cos(trunk)-(p[1]-shoulder[1])*Math.sin(trunk),shoulder[1]+(p[0]-shoulder[0])*Math.sin(trunk)+(p[1]-shoulder[1])*Math.cos(trunk)-lower,0];
  const solve=(origin,mid,end,target,sign)=>{const base=transform(origin),l1=v(origin).distanceTo(v(mid)),l2=v(mid).distanceTo(v(end)),d=v(base).distanceTo(v(target)),theta=direction(base,target)+sign*Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d)))),joint=[base[0]+l1*Math.cos(theta),base[1]+l1*Math.sin(theta),0];return [theta-direction(origin,mid)-trunk,direction(joint,target)-direction(mid,end)-(theta-direction(origin,mid))];};
  const h=transform(hip),targetHock=[h[0]+.025,rabbit?.05:.065,0],hind=solve(hip,stifle,hock,targetHock,1);
  const targetCarpus=pose==='lying'?[.36,.05,0]:carpus,fore=pose==='lying'?solve(shoulder,elbow,carpus,targetCarpus,-1):[-trunk,0];
  const footAngle=(a,b,height)=>Math.asin((.025-height)/v(a).distanceTo(v(b)))-direction(a,b);
  const forefoot=footAngle(carpus,toe,targetCarpus[1])-trunk-fore[0]-fore[1],hindfoot=footAngle(hock,hindtoe,targetHock[1])-trunk-hind[0]-hind[1];
  angleSet[pose]={trunk,arm:fore[0],forearm:fore[1],forefoot,foretoes:-(trunk+fore[0]+fore[1]+forefoot),thigh:hind[0],shank:hind[1],hindfoot,hindtoes:-(trunk+hind[0]+hind[1]+hindfoot),tail:-trunk};
 }
 const dir=new URL(species+'/',root);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(new URL('anatomy.bin',dir),Buffer.concat(chunks));
 const atlas={species,parts,bytes:offset,binaryPath:`/models/${species}/anatomy.bin`,poseConfig:{joints:{shoulder,elbow,carpus,hip,stifle,hock},foretoes:toe,hindtoes:hindtoe,tail:tailBase,lower:shoulder[1]-.15},sources:sources[species],scientificName:rabbit?'Oryctolagus cuniculus':'Felis catus',scope:pair('Vlastní schematický model hlavních kostí a vybraných svalů. Bez odborného anatomického ověření. Chybí zuby, některé drobné kosti a svaly, vazy, cévy a nervy. Vybrané hluboké svaly jsou zahrnuté. Úpony, kloubní plochy a proporce jsou pouze orientační; nejde o CT ani atlas pro nácvik zákroků.','Original schematic model of principal bones and selected muscles. Not independently anatomically reviewed. Teeth, some small bones and muscles, ligaments, vessels and nerves are omitted. Selected deep muscles are included. Attachments, articular surfaces and proportions are illustrative; this is not a CT reconstruction or procedural atlas.'),created:'2026-10-22',geometryRevision:rabbit?2:1,geometryOrigin:'Original authored geometry; anatomical references inform shape and structure selection, not measured vertex coordinates.'};
 atlas.poseConfig.angles=angleSet;
 fs.writeFileSync(new URL('catalog.json',dir),JSON.stringify(atlas));console.log(species,parts.length,'parts',offset,'bytes');
}
