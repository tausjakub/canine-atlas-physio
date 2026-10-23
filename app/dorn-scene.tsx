'use client';

import {memo,useEffect,useRef,useState} from 'react';
import {Axis3d,Bone,Layers,Minus,Plus,RotateCcw} from 'lucide-react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {Atlas,Part} from './anatomy';
import type {Language} from './i18n';
import type {DornMovementKind} from './dorn-movement-data';
import {sitePath} from './site-path';
import {bindDornSoftVertices,deformDornSoftVertices,dornKinematics,dornMotionBounds} from './dorn-kinematics';
import './dorn-scene.css';

type Props={kind:DornMovementKind;bend:number;returning:boolean;language:Language;mode?:'detail'|'overview'};
type Settings={bend:number;muscles:boolean;plane:boolean;view:'oblique'|'side';reset:number};
type Engine={update:(settings:Settings)=>void;zoom:(scale:number)=>void};
type Entry={part:Part;mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;rest:Float32Array;bindings?:ReturnType<typeof bindDornSoftVertices>};

// Both the joint close-up and the location model use the actual dog atlas.
// Cache source bytes only: geometries belong to their viewer and are disposed
// when it unmounts. A failed request remains retryable.
let sourcePromise:Promise<{atlas:Atlas;buffer:ArrayBuffer}>|null=null;
function loadDogSource(){
 if(!sourcePromise)sourcePromise=(async()=>{
  const [catalogResponse,binaryResponse]=await Promise.all([fetch(sitePath('/models/catalog.json')),fetch(sitePath('/models/anatomy.bin'))]);
  if(!catalogResponse.ok||!binaryResponse.ok)throw new Error('dog-source');
  const [atlas,buffer]=await Promise.all([catalogResponse.json() as Promise<Atlas>,binaryResponse.arrayBuffer()]);
  if(buffer.byteLength!==atlas.bytes)throw new Error('dog-source');
  return {atlas,buffer};
 })().catch(error=>{sourcePromise=null;throw error;});
 return sourcePromise;
}

function geometryFor(part:Part,buffer:ArrayBuffer){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,part.vertexOffset,part.vertexCount*3).slice(),3));
 geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,part.indexOffset,part.indexCount),1));
 geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 return geometry;
}

function muscleInContext(part:Part,kind:DornMovementKind){
 if(part.system!=='muscle'||part.center[2]>=-.008)return false;
 const id=part.id.toLowerCase();
 if(kind==='hip'||kind==='hip-rotation')return /gluteus|iliacus|psoas_major|femor|vastus|sartorius|semitend|semimembr|gracilis|adductor|pectineus|obturator|gemellus|gastrocnemius|tibialis|peroneus|popliteus/.test(id)||part.center[0]<-.3&&part.center[1]<.35;
 if(kind==='hock')return part.center[0]<-.35&&part.center[1]<.3;
 if(kind==='hind-digits')return part.center[0]<-.35&&part.center[1]<.15;
 if(kind==='shoulder')return /supraspinatus|infraspinatus|deltoideus|subscapularis|teres_|coracobrachialis|brachii|brachialis|anconeus|supinator|pronator|carpi|capri/.test(id)||part.center[0]>.09&&part.center[1]<.29;
 if(kind==='stifle')return /femor|vastus|sartorius|gastrocnemius|popliteus|semitend|semimembr|gracilis|tibialis|peroneus/.test(id)||part.center[0]<-.3&&part.center[1]<.35;
 if(kind==='elbow')return /brachii|brachialis|anconeus|supinator|pronator|carpi|capri/.test(id)||part.center[0]>.09&&part.center[1]<.29;
 if(kind==='carpus')return part.center[0]>.08&&part.center[1]<.28;
 return part.center[0]>.09&&part.center[1]<.16;
}

function regionName(kind:DornMovementKind,language:Language){
 const labels={stifle:{cs:'Kolenní kloub',en:'Stifle joint'},elbow:{cs:'Loketní kloub',en:'Elbow joint'},carpus:{cs:'Zápěstí',en:'Carpus'},digits:{cs:'Prsty přední tlapky',en:'Forepaw digits'},hip:{cs:'Kyčelní kloub',en:'Hip joint'},'hip-rotation':{cs:'Zevní rotace v kyčli',en:'Hip external rotation'},hock:{cs:'Hlezenní kloub',en:'Hock joint'},shoulder:{cs:'Ramenní kloub',en:'Shoulder joint'},'hind-digits':{cs:'Prsty zadní tlapky',en:'Hindpaw digits'}};
 return labels[kind][language];
}

function DornScene({kind,bend,returning,language,mode='detail'}:Props){
 const e=(en:string,cs:string)=>language==='cs'?cs:en;
 const host=useRef<HTMLDivElement>(null),engine=useRef<Engine|null>(null),locale=useRef(language);
 const [muscles,setMuscles]=useState(false),[plane,setPlane]=useState(false),[view,setView]=useState<'oblique'|'side'>('oblique'),[reset,setReset]=useState(0),[retry,setRetry]=useState(0),[status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
 const settings=useRef<Settings>({bend,muscles,plane,view,reset});settings.current={bend,muscles,plane,view,reset};locale.current=language;
 const overview=mode==='overview';

 useEffect(()=>{
  const element=host.current;if(!element)return;
  let dead=false,dispose=()=>{};setStatus('loading');
  (async()=>{
   try{
    const {atlas,buffer}=await loadDogSource();if(dead)return;
    const rigAtRest=dornKinematics(kind,0,atlas.parts),contextIds=new Set(rigAtRest.contextIds),movingIds=new Set(rigAtRest.affectedIds),bones=atlas.parts.filter(part=>part.system==='bone');
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:overview?'low-power':'high-performance'});
    const cleanupTasks:Array<()=>void>=[];let disposed=false;
    dispose=()=>{if(disposed)return;disposed=true;for(const cleanup of cleanupTasks.reverse())cleanup();};
    cleanupTasks.push(()=>{renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove();});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,overview?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.shadowMap.enabled=!overview;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');element.appendChild(canvas);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.001,20);
    const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.1;controls.enablePan=!overview;controls.minDistance=.06;controls.maxDistance=5;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
    cleanupTasks.push(()=>controls.dispose());
    scene.add(new THREE.HemisphereLight(0xc3e6f2,0x334147,1.15));
    const key=new THREE.DirectionalLight(0xffe6bd,2.8);key.position.set(1.2,2,-1.8);key.castShadow=!overview;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-.8;key.shadow.camera.right=.8;key.shadow.camera.top=.9;key.shadow.camera.bottom=-.9;key.shadow.normalBias=.0015;key.shadow.bias=-.0001;scene.add(key);
    const fill=new THREE.DirectionalLight(0x8cbedd,.8);fill.position.set(-1,.6,-.4);scene.add(fill);
    const rim=new THREE.DirectionalLight(0xb4ebed,1.7);rim.position.set(-.5,1,1.7);scene.add(rim);

    const entries:Entry[]=[],ghosts:THREE.Mesh[]=[],ownedGeometry=new Set<THREE.BufferGeometry>(),ownedMaterials=new Set<THREE.Material>();
    cleanupTasks.push(()=>{ownedGeometry.forEach(geometry=>geometry.dispose());ownedMaterials.forEach(material=>material.dispose());});
    const model=new THREE.Group();scene.add(model);
    const candidateParts=atlas.parts.filter(part=>overview?['skin','eye_L','eye_R','m_Nose'].includes(part.id):part.system==='bone'&&(contextIds.has(part.id)||movingIds.has(part.id))||muscleInContext(part,kind));
    for(const part of candidateParts){
     const geometry=geometryFor(part,buffer);ownedGeometry.add(geometry);
     const soft=part.system==='muscle',skin=part.id==='skin',facial=part.id!=='skin'&&part.system==='surface';
     const material=new THREE.MeshStandardMaterial({color:skin?0x73949a:facial?0x20383f:soft?0xbd7872:movingIds.has(part.id)?0xf1dfbd:0xc8bba3,roughness:skin?.59:soft?.7:.54,metalness:.025,side:THREE.DoubleSide});ownedMaterials.add(material);
     if(soft){material.transparent=true;material.opacity=.42;material.depthWrite=false;}
     const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=!soft;mesh.receiveShadow=true;mesh.userData.part=part;mesh.matrixAutoUpdate=false;model.add(mesh);
     entries.push({part,mesh,rest:(geometry.getAttribute('position').array as Float32Array).slice()});
     if(!overview&&movingIds.has(part.id)){
      const ghostMaterial=new THREE.MeshStandardMaterial({color:0xabc8ce,transparent:true,opacity:.1,depthWrite:false,roughness:1,side:THREE.DoubleSide});ownedMaterials.add(ghostMaterial);
      const ghost=new THREE.Mesh(geometry,ghostMaterial);ghost.renderOrder=-1;ghost.visible=false;scene.add(ghost);ghosts.push(ghost);
     }
    }
    const motionBounds=overview?new THREE.Box3().setFromObject(model):dornMotionBounds(kind,atlas.parts),span=motionBounds.getSize(new THREE.Vector3());
    // A quiet real ground plane catches directional light and anchors the 3D
    // model without adding invented anatomy or a photograph-like backdrop.
    const floorGeometry=new THREE.PlaneGeometry(4,4),floorMaterial=new THREE.MeshStandardMaterial({color:0x182c35,roughness:1,metalness:0});ownedGeometry.add(floorGeometry);ownedMaterials.add(floorMaterial);
    const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=Math.min(.0001,motionBounds.min.y)-.017;floor.receiveShadow=true;scene.add(floor);
    const markerRadius=overview?.018:Math.min(.018,Math.max(.007,span.length()*.038));
    const ringGeometry=new THREE.TorusGeometry(markerRadius,markerRadius*.075,8,64),ringMaterial=new THREE.MeshBasicMaterial({color:0x86e5d4,transparent:true,opacity:.95,depthTest:false,depthWrite:false});ownedGeometry.add(ringGeometry);ownedMaterials.add(ringMaterial);
    const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.position.copy(rigAtRest.pivot);ring.renderOrder=8;scene.add(ring);
    const coreGeometry=new THREE.SphereGeometry(markerRadius*.16,16,12),coreMaterial=new THREE.MeshBasicMaterial({color:0x9fffe9,depthTest:false,depthWrite:false});ownedGeometry.add(coreGeometry);ownedMaterials.add(coreMaterial);
    const core=new THREE.Mesh(coreGeometry,coreMaterial);core.position.copy(rigAtRest.pivot);core.renderOrder=9;scene.add(core);

    // This teaching layer distinguishes the movement plane from its normal
    // (rotation axis). Hip rotation uses the femur's actual long-axis direction,
    // rather than incorrectly labelling a body-transverse plane as its axis.
    const planeGroup=new THREE.Group(),planeRadius=Math.max(.055,Math.min(.31,span.length()*.5)),axisLength=planeRadius*.7;
    planeGroup.position.copy(rigAtRest.pivot);planeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),rigAtRest.axis.clone().normalize());scene.add(planeGroup);
    const planeGeometry=new THREE.CircleGeometry(planeRadius,64),planeMaterial=new THREE.MeshBasicMaterial({color:0x65c4ec,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});ownedGeometry.add(planeGeometry);ownedMaterials.add(planeMaterial);planeGroup.add(new THREE.Mesh(planeGeometry,planeMaterial));
    const contourGeometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,index)=>new THREE.Vector3(Math.cos(index*Math.PI/32)*planeRadius,Math.sin(index*Math.PI/32)*planeRadius,0))),contourMaterial=new THREE.LineBasicMaterial({color:0x79c9e7,transparent:true,opacity:.58,depthWrite:false});ownedGeometry.add(contourGeometry);ownedMaterials.add(contourMaterial);planeGroup.add(new THREE.LineLoop(contourGeometry,contourMaterial));
    const axisGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,-axisLength),new THREE.Vector3(0,0,axisLength)]),axisMaterial=new THREE.LineBasicMaterial({color:0xf1c07d});ownedGeometry.add(axisGeometry);ownedMaterials.add(axisMaterial);planeGroup.add(new THREE.Line(axisGeometry,axisMaterial));
    const arrowGeometry=new THREE.ConeGeometry(planeRadius*.028,planeRadius*.10,12),arrowMaterial=new THREE.MeshBasicMaterial({color:0xf1c07d});ownedGeometry.add(arrowGeometry);ownedMaterials.add(arrowMaterial);
    for(const sign of [-1,1]){const arrow=new THREE.Mesh(arrowGeometry,arrowMaterial);arrow.position.z=sign*axisLength;arrow.rotation.x=sign*Math.PI/2;planeGroup.add(arrow);}
    planeGroup.visible=false;

    let previous:Settings|undefined,visible=true,documentVisible=!document.hidden,width=0,height=0,lastBend=NaN;
    const identity=new THREE.Matrix4();
    const frame=(viewName:'oblique'|'side')=>{
     // Fit the explanatory axis as well as the bones when it is shown. In the
     // hip view its proximal end otherwise extends beyond the skeletal bounds.
     const framingBounds=settings.current.plane&&!overview?motionBounds.clone().union(new THREE.Box3().setFromObject(planeGroup)):motionBounds;
     const center=framingBounds.getCenter(new THREE.Vector3()),direction=(viewName==='side'?new THREE.Vector3(0,.025,-1):overview?new THREE.Vector3(.32,.16,-1):new THREE.Vector3(.38,.15,-1)).normalize();
     const right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));let distance=0;
     for(const x of [framingBounds.min.x,framingBounds.max.x])for(const y of [framingBounds.min.y,framingBounds.max.y])for(const z of [framingBounds.min.z,framingBounds.max.z]){
      const corner=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,Math.abs(corner.dot(right))/(tan*camera.aspect)+corner.dot(direction),Math.abs(corner.dot(up))/tan+corner.dot(direction));
     }
     controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,Math.max(.12,distance*(overview?1.12:1.18)));camera.near=Math.max(.0001,distance/1000);camera.far=Math.max(10,distance*20);camera.updateProjectionMatrix();controls.update();
    };
    const update=(next:Settings)=>{
     const amount=overview?0:Math.max(0,Math.min(1,next.bend)),rig=dornKinematics(kind,amount,atlas.parts);
     for(const entry of entries){
      const {part,mesh}=entry,soft=part.system==='muscle';mesh.visible=!soft||next.muscles;
      mesh.matrix.copy(rig.matrices.get(part.id)||identity);mesh.matrixWorldNeedsUpdate=true;
      if(soft&&mesh.visible&&(lastBend!==amount||!previous?.muscles)){
       entry.bindings??=bindDornSoftVertices(entry.rest,bones);
       const positions=amount===0?entry.rest:deformDornSoftVertices(entry.rest,entry.bindings,rig);
       const attribute=mesh.geometry.getAttribute('position') as THREE.BufferAttribute;attribute.set(positions);attribute.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
      }
     }
     lastBend=amount;ghosts.forEach(ghost=>{ghost.visible=amount>.03;});
     planeGroup.visible=!overview&&next.plane;
     if(!previous||next.reset!==previous.reset||next.view!==previous.view||next.plane!==previous.plane)frame(next.view);
     canvas.setAttribute('aria-label',locale.current==='cs'?`${regionName(kind,'cs')}. Skutečný 3D model psího atlasu. Tažením otoč, kolečkem přibliž. Šipky otáčejí, Home obnoví pohled.`:`${regionName(kind,'en')}. Real 3D dog atlas model. Drag to orbit, scroll to zoom. Arrow keys orbit; Home resets the view.`);
     previous={...next};
    };
    const zoom=(scale:number)=>{camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);controls.update();};
    const keydown=(event:KeyboardEvent)=>{
     if(event.key==='Home'){event.preventDefault();frame(settings.current.view);return;}
     if(event.key==='+'||event.key==='='){event.preventDefault();zoom(.85);return;}
     if(event.key==='-'){event.preventDefault();zoom(1.18);return;}
     if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
     event.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);
     spherical.theta+=(event.key==='ArrowLeft'?.12:event.key==='ArrowRight'?-.12:0);spherical.phi+=event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0;spherical.makeSafe();camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();
    };
    canvas.addEventListener('keydown',keydown);cleanupTasks.push(()=>canvas.removeEventListener('keydown',keydown));
    const resize=()=>{const rect=element.getBoundingClientRect();if(!rect.width||!rect.height)return;camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);if(width!==rect.width||height!==rect.height){width=rect.width;height=rect.height;frame(settings.current.view);}};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);cleanupTasks.push(()=>resizeObserver.disconnect());
    const paint=()=>{controls.update();ring.quaternion.copy(camera.quaternion);renderer.render(scene,camera);};
    const rendering=()=>{renderer.setAnimationLoop(visible&&documentVisible?paint:null);};
    const intersectionObserver=new IntersectionObserver(items=>{visible=items[0]?.isIntersecting??true;rendering();},{rootMargin:'60px'});intersectionObserver.observe(element);cleanupTasks.push(()=>intersectionObserver.disconnect());
    const visibility=()=>{documentVisible=!document.hidden;rendering();};document.addEventListener('visibilitychange',visibility);cleanupTasks.push(()=>document.removeEventListener('visibilitychange',visibility));
    if(dead){dispose();return;}
    engine.current={update,zoom};resize();update(settings.current);rendering();setStatus('ready');
   }catch(error){if(!dead){dispose();engine.current=null;setStatus('error');}}
  })();
  return()=>{dead=true;dispose();engine.current=null;};
 },[kind,mode,retry]);

 useEffect(()=>engine.current?.update(settings.current),[bend,muscles,plane,view,reset,language]);
 return <div className={`dorn-three-scene dorn-three-${mode}`}>
  <div className="dorn-three-canvas" ref={host}/>
  {!overview&&status==='ready'&&<>
   <div className="dorn-three-heading"><span className="dorn-three-kicker">{e('DOG ATLAS · 3D','PSÍ ATLAS · 3D')}</span><strong>{regionName(kind,language)}</strong><span className="dorn-three-state">{bend<.03?e('Starting position','Výchozí poloha'):returning?e('Returning','Návrat'):e('Movement','Pohyb')}</span></div>
   <div className="dorn-three-tools" role="group" aria-label={e('3D view controls','Ovládání 3D pohledu')}>
    <button onClick={()=>setView(value=>value==='oblique'?'side':'oblique')} aria-label={view==='oblique'?e('Show side view','Zobrazit boční pohled'):e('Show oblique view','Zobrazit šikmý pohled')} title={e('Change camera','Změnit pohled')}>{view==='oblique'?e('Side','Z boku'):'¾'}</button>
    <button onClick={()=>setMuscles(value=>!value)} aria-pressed={muscles} title={e('Show muscles for context','Zobrazit svaly pro orientaci')}><Layers size={15}/><span>{e('Muscles','Svaly')}</span></button>
    <button onClick={()=>setPlane(value=>!value)} aria-pressed={plane} title={e('Show the movement plane and perpendicular rotation axis','Zobrazit rovinu pohybu a kolmou osu rotace')}><Axis3d size={15}/><span>{e('Plane & axis','Rovina a osa')}</span></button>
    <button onClick={()=>setReset(value=>value+1)} aria-label={e('Reset 3D camera','Obnovit 3D pohled')} title={e('Reset camera','Obnovit pohled')}><RotateCcw size={15}/></button>
   </div>
   <div className="dorn-three-legend"><span><i/>{e('Moving chain','Pohyblivá část')}</span><span><i/>{e('Starting outline','Výchozí obrys')}</span></div>
   {plane&&<p className="dorn-three-plane-note"><span>{e('BLUE: PLANE · GOLD: AXIS','MODRÁ: ROVINA · ZLATÁ: OSA')}</span>{kind==='hip-rotation'?e('Local rotation plane · femoral long axis','Lokální rotační rovina · podélná osa femuru'):e('Sagittal plane · mediolateral axis','Sagitální rovina · mediolaterální osa')}</p>}
   <div className="dorn-three-zoom"><button onClick={()=>engine.current?.zoom(.82)} aria-label={e('Zoom in','Přiblížit')}><Plus size={17}/></button><button onClick={()=>engine.current?.zoom(1.22)} aria-label={e('Zoom out','Oddálit')}><Minus size={17}/></button></div>
   <p className="dorn-three-hint">{e('Drag to orbit · scroll to zoom','Tažením otáčej · kolečkem přibližuj')}</p>
  </>}
  {status!=='ready'&&<div className="dorn-three-status" role={status==='error'?'alert':'status'}><Bone size={overview?18:25}/><span>{status==='error'?e('3D model unavailable','3D model se nepodařilo načíst'):e('Preparing the dog atlas…','Připravuji psí atlas…')}</span>{status==='error'&&<button onClick={()=>setRetry(value=>value+1)}>{e('Try again','Zkusit znovu')}</button>}</div>}
 </div>;
}

export default memo(DornScene);
