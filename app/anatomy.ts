export type System = 'bone'|'muscle'|'connective'|'surface';
export type Part = {id:string;system:System;vertexOffset:number;vertexCount:number;indexOffset:number;indexCount:number;center:number[];bounds:number[][]};
export type Atlas = {parts:Part[];bytes:number};
export type SceneState = {systems:System[];selected:string|null;hidden:string[];isolate:boolean;explode:number;opacity:number;view:string;reset:number;rotate:boolean};
export const systems:{id:System;name:string;color:string}[]=[{id:'bone',name:'Skeleton',color:'#e6d5ad'},{id:'muscle',name:'Muscles',color:'#cf7776'},{id:'connective',name:'Connective tissue',color:'#abc8d6'},{id:'surface',name:'Body surface',color:'#758d9c'}];
export const initial:SceneState={systems:['bone','muscle'],selected:null,hidden:[],isolate:false,explode:0,opacity:1,view:'lateral',reset:0,rotate:false};
export function displayName(id:string){
 if(id==='skin')return 'Body surface'; if(id==='MergedSkull')return 'Skull';if(id==='Jaw')return 'Mandible';if(id==='Ribcage')return 'Rib cage & thoracic spine';
 if(/^L_\d+$/.test(id))return `Lumbar vertebra L${id.slice(2)}`;
 if(/^C_\d+$/.test(id))return `Cervical vertebra C${id.slice(2)}${id==='C_1'?' · atlas':id==='C_2'?' · axis':''}`;
 if(/^Ca_\d+$/.test(id))return `Caudal vertebra ${id.slice(3)}`;
 let s=id.replace(/^m_/,'').replace(/\(2\)/g,' · additional piece').replace(/\.001/g,' · additional piece').replace(/Phalanxpmxinutlis/g,'Phalanx proximalis').replace(/capri/g,'carpi').replace(/tranversus/g,'transversus').replace(/tricepsbrachii/g,'triceps_brachii').replace(/Femoris(?=_|$)/,'Femur').replace(/MergedSkull/,'Skull').replace(/vastus_med_/,'vastus_medialis_').replace(/vastus_lat_/,'vastus_lateralis_').replace(/latissimus_dors_/,'latissimus_dorsi_').replace(/_L(?=[\d_ .]|$)/g,' · left ').replace(/_R(?=[\d_ .]|$)/g,' · right ').replace(/[_.]/g,' ').trim();
 return s.charAt(0).toUpperCase()+s.slice(1);
}
export function region(p:Part){
 const id=p.id.toLowerCase();
 if(/scapula|humerus|radius|ulna|carpal|phalanx|biceps_brachii|triceps|brachialis|anconeus|supra|infraspinatus|deltoideus|teres_|subscapularis|coracobrachialis|carpi|capri|pronator|supinator|pollicis|antebrachii/.test(id)) return 'Forelimb';
 if(/femor|pelvis|patella|fibula|tibia|tars|calcaneal|phalanges_b|gluteus|vastus|sartorius|psoas|iliacus|gastrocnemius|semitend|semimembr|gracilis|pectineus|adductor|obturator|gemellus|popliteus|peroneus|cruris|latae/.test(id))return 'Hindlimb';
 if(/skull|jaw|eye|nose|oculi|oris|buccinator|masseter|temporalis|pterygoid|caninus|labii|zygomatic|hyoid|scut/.test(id))return 'Head';
 return 'Neck & trunk';
}
export type Note={match:RegExp;title:string;action:string;landmark:string;study:string;lab:string};
export const notes:Note[]=[
 {match:/supraspinatus/i,title:'Supraspinatus',action:'Extends and stabilizes the shoulder.',landmark:'Supraspinous fossa → greater tubercle of the humerus.',study:'Compare its position cranial to the scapular spine with infraspinatus.',lab:'03'},
 {match:/infraspinatus/i,title:'Infraspinatus',action:'Abducts and laterally rotates the arm; supports the shoulder laterally.',landmark:'Infraspinous fossa → lateral proximal humerus.',study:'Locate the scapular spine separating it from supraspinatus.',lab:'03'},
 {match:/biceps_brachii/i,title:'Biceps brachii',action:'Flexes the elbow and extends the shoulder.',landmark:'Supraglenoid tubercle → proximal radius and ulna.',study:'Trace why one muscle can act across two joints.',lab:'03'},
 {match:/triceps/i,title:'Triceps brachii',action:'Extends the elbow; the long head also flexes the shoulder.',landmark:'Scapula or humerus, depending on head → olecranon.',study:'Identify which head crosses the shoulder.',lab:'03'},
 {match:/brachialis/i,title:'Brachialis',action:'Flexes the elbow.',landmark:'Proximal humerus → proximal ulna and radius.',study:'Follow its course around the humerus.',lab:'03'},
 {match:/deltoideus/i,title:'Deltoideus',action:'Flexes the shoulder.',landmark:'Scapular spine or acromion → deltoid tuberosity.',study:'Compare the acromial and scapular parts.',lab:'03'},
 {match:/subscapularis/i,title:'Subscapularis',action:'Adducts the arm and supports the shoulder medially.',landmark:'Subscapular fossa → lesser tubercle.',study:'Rotate to the medial scapular surface.',lab:'03'},
 {match:/rectus_femoris|vastus/i,title:'Quadriceps group',action:'Extends the stifle; rectus femoris also flexes the hip.',landmark:'Ilium or femur → patella → tibial tuberosity via patellar ligament.',study:'Compare rectus femoris with the three vasti.',lab:'06'},
 {match:/psoas_major|iliacus/i,title:'Iliopsoas components',action:'Flex the hip.',landmark:'Lumbar region and ilium → lesser trochanter.',study:'Find psoas major and iliacus; distinguish psoas minor.',lab:'06'},
 {match:/gastrocnemius/i,title:'Gastrocnemius',action:'Extends the tarsus and flexes the stifle.',landmark:'Distal femur → calcaneal tuber via the common calcanean tendon.',study:'Trace its relationship to both joints.',lab:'07'},
 {match:/tibialis_cranialis/i,title:'Cranial tibial muscle',action:'Flexes the tarsus.',landmark:'Proximal tibia → medial proximal metatarsal region.',study:'Compare its line of pull with gastrocnemius.',lab:'06'},
 {match:/gluteus_medius/i,title:'Middle gluteal muscle',action:'Extends and abducts the hip.',landmark:'Gluteal surface of ilium → greater trochanter.',study:'Locate the muscle over the lateral pelvis.',lab:'05'},
 {match:/semitendinosus/i,title:'Semitendinosus',action:'Extends the hip and tarsus; flexes the stifle.',landmark:'Ischiatic tuberosity → tibia and calcaneal tuber.',study:'Compare its caudal position with the other hamstrings.',lab:'05'},
 {match:/biceps_femoris(?!_tendon)/i,title:'Biceps femoris',action:'Extends the hip; different portions can extend or flex the stifle.',landmark:'Ischiatic region → patella, tibia and calcaneal tuber through fascia and tendon.',study:'Avoid assigning a single stifle action to the entire muscle.',lab:'05'},
 {match:/longissimus/i,title:'Longissimus system',action:'Contributes to extension and lateral bending of the vertebral column.',landmark:'One of the paired epaxial muscle systems.',study:'Distinguish epaxial muscles from ventral hypaxial muscles.',lab:'09'},
];
export function noteFor(p:Part){return notes.find(n=>n.match.test(p.id));}
export function isShown(p:Part,s:SceneState){return !s.hidden.includes(p.id)&&(s.isolate?p.id===s.selected:s.systems.includes(p.system)||p.id===s.selected);}
