'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {sitePath} from './site-path';
import {speciesScans} from './species-scan-data';
import type {Language} from './i18n';
type View='side'|'opposite'|'front'|'top'|'oblique';
type Settings={view:View;rotate:boolean;texture:boolean;stand:boolean;reset:number};
export default function SpeciesScan({species,language,onStudy}:{species:'cat'|'rabbit';language:Language;onStudy:()=>void}){
 const el=useRef<HTMLDivElement>(null),engine=useRef<{update:(s:Settings)=>void;zoom:(factor:number)=>void}|null>(null);
 const [settings,setSettings]=useState<Settings>({view:'side',rotate:false,texture:false,stand:false,reset:0});
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{if(!expanded)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[expanded]);
 const latest=useRef(settings);latest.current=settings;
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[retry,setRetry]=useState(0);
 const source=speciesScans[species],e=(cs:string,en:string)=>language==='cs'?cs:en;
 useEffect(()=>{
  let disposed=false;const abort=new AbortController();let cleanup=()=>{};
  setStatus('loading');
  const free=(root:THREE.Object3D)=>{const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const val of Object.values(m))if(val instanceof THREE.Texture)textures.add(val);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.dispose();if(typeof t.image?.close==='function')t.image.close();});};
  async function start(){
   let loaded:THREE.Group|undefined;
   try{
    const response=await fetch(sitePath(`/models/${species}/skeleton-scan.glb`),{signal:abort.signal});if(!response.ok)throw Error('download');
    const bytes=await response.arrayBuffer();if(disposed)return;
    const gltf=await new GLTFLoader().parseAsync(bytes,'');loaded=gltf.scene;if(disposed){free(loaded);return;}
    const scene=new THREE.Scene(),root=new THREE.Group();root.add(loaded);root.rotation.y=source.rotationY;scene.add(root);
    // Exclude the rabbit's separate display plinth from fitting, without deleting source geometry.
    const meshMaterials=new Map<THREE.Mesh,{original:THREE.Material|THREE.Material[];ivory:THREE.MeshStandardMaterial;support:boolean}>();
    loaded.traverse(o=>{if(o instanceof THREE.Mesh){const original=o.material;const support=species==='rabbit'&&o.geometry.getAttribute('position').count===24;const ivory=new THREE.MeshStandardMaterial({color:0xdac9a9,roughness:.85,metalness:0,side:THREE.DoubleSide});meshMaterials.set(o,{original,ivory,support});o.visible=!support;o.material=ivory;}});
    root.updateMatrixWorld(true);const bounds=new THREE.Box3();for(const [mesh,data] of meshMaterials)if(!data.support)bounds.expandByObject(mesh);
    const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=1.3/Math.max(size.x,size.y,size.z);root.scale.setScalar(scale);root.position.copy(center).multiplyScalar(-scale);root.updateMatrixWorld(true);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    el.current!.appendChild(renderer.domElement);
    const camera=new THREE.PerspectiveCamera(34,1,.001,100),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.07;controls.maxDistance=8;controls.autoRotateSpeed=.6;
    scene.add(new THREE.HemisphereLight(0xe5efff,0x39332e,.85));const key=new THREE.DirectionalLight(0xffedd4,2.4);key.position.set(1,2,-2);scene.add(key);const fill=new THREE.DirectionalLight(0xc7ddff,.65);fill.position.set(-1,1,2);scene.add(fill);
    const directions:Record<View,THREE.Vector3>={side:new THREE.Vector3(0,.02,-1),opposite:new THREE.Vector3(0,.02,1),front:new THREE.Vector3(1,.02,0),top:new THREE.Vector3(0,1,.001),oblique:new THREE.Vector3(.38,.16,-1)};
    // Fit the specimen vertices, not empty corners of its bounding box.
    const points:THREE.Vector3[]=[];
    for(const [mesh,data] of meshMaterials)if(!data.support){const position=mesh.geometry.getAttribute('position');for(let i=0;i<position.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld));}
    const specimenCenter=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
    function frame(view:View){
     const direction=directions[view].clone().normalize(),right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
     let fit=0;const relative=new THREE.Vector3();
     for(const point of points){relative.copy(point).sub(specimenCenter);fit=Math.max(fit,Math.abs(relative.dot(right))/(tan*camera.aspect)+relative.dot(direction),Math.abs(relative.dot(up))/tan+relative.dot(direction));}
     controls.target.copy(specimenCenter);camera.position.copy(specimenCenter).addScaledVector(direction,fit*1.08);controls.update();
    }
    // Inspect the actual surface hit; this does not pretend to identify an unsegmented bone.
    const raycaster=new THREE.Raycaster();
    const focusSurface=(event:MouseEvent)=>{
     const rect=renderer.domElement.getBoundingClientRect();
     raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
     const hit=raycaster.intersectObjects([...meshMaterials].filter(([,data])=>!data.support).map(([mesh])=>mesh),false)[0];if(!hit)return;
     const direction=camera.position.clone().sub(controls.target).normalize();
     const distance=Math.max(.15,camera.position.distanceTo(controls.target)*.48);
     controls.target.copy(hit.point);camera.position.copy(hit.point).addScaledVector(direction,distance);controls.autoRotate=false;controls.update();setSettings(s=>({...s,rotate:false}));
    };
    renderer.domElement.addEventListener('dblclick',focusSurface);
    let prev:Settings|undefined;function update(s:Settings){for(const [mesh,data] of meshMaterials){mesh.visible=!data.support||s.stand;mesh.material=s.texture?data.original:data.ivory;}controls.autoRotate=s.rotate;if(!prev||prev.view!==s.view||prev.reset!==s.reset)frame(s.view);prev={...s};}
    const resize=()=>{if(!el.current)return;const {width,height}=el.current.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height);frame(latest.current.view);};
    const observer=new ResizeObserver(resize);observer.observe(el.current!);resize();update(latest.current);renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
    cleanup=()=>{observer.disconnect();renderer.domElement.removeEventListener('dblclick',focusSurface);renderer.setAnimationLoop(null);controls.dispose();for(const [mesh,data] of meshMaterials){mesh.material=data.original;data.ivory.dispose();}free(root);renderer.dispose();renderer.domElement.remove();};engine.current={update,zoom:factor=>{camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}};setStatus('ready');
   }catch{if(loaded)free(loaded);if(!disposed)setStatus('error');}
  }
  start();return()=>{disposed=true;abort.abort();cleanup();engine.current=null;};
 },[species,retry,source]);
 useEffect(()=>engine.current?.update(settings),[settings]);
 return <div className={`scan-workspace${expanded?' scan-expanded':''}`}>
  <section className="scan-viewport" aria-label={e('Podrobný model kostry','Detailed skeleton model')}>
   <div className="scan-heading"><span className="eyebrow">{e('FOTOGRAMMETRICKÝ MODEL','PHOTOGRAMMETRY MODEL')}</span><h2>{e(species==='cat'?'Kostra kočky':'Kostra králíka',species==='cat'?'Cat skeleton':'Rabbit skeleton')}</h2><p>{e('Skutečná povrchová geometrie preparátu','Actual specimen surface geometry')}</p></div>
   <button className="scan-expand" aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?e('↙ Zmenšit model','↙ Exit large view'):e('⛶ Velký model','⛶ Large view')}</button>
   <div className="scene" ref={el}/>
   <nav className="view-tools" aria-label={e('Pohledy','Views')}>{([['side','Bok','Side'],['opposite','Druhý bok','Other side'],['front','Čelo','End'],['top','Shora','Top'],['oblique','¾','¾']] as const).map(([view,cs,en])=><button key={view} aria-label={e(cs,en)} title={e(cs,en)} aria-pressed={settings.view===view} onClick={()=>setSettings(s=>({...s,view}))}>{e(cs,en)}</button>)}<button aria-pressed={settings.rotate} onClick={()=>setSettings(s=>({...s,rotate:!s.rotate}))}>{e('Otáčet','Rotate')}</button><button onClick={()=>setSettings(s=>({...s,view:'side',rotate:false,reset:s.reset+1}))}>{e('Obnovit','Reset')}</button></nav>
   {status!=='ready'&&<div className="load-card" role={status==='error'?'alert':'status'}><strong>{status==='loading'?e('Načítám podrobnou kostru…','Loading detailed skeleton…'):e('Model se nepodařilo načíst','Could not load the model')}</strong>{status==='error'&&<button onClick={()=>setRetry(v=>v+1)}>{e('Zkusit znovu','Retry')}</button>}</div>}
   <div className="scan-zoom"><button aria-label={e('Přiblížit','Zoom in')} onClick={()=>engine.current?.zoom(.8)}>+</button><button aria-label={e('Oddálit','Zoom out')} onClick={()=>engine.current?.zoom(1.25)}>−</button></div>
   <footer className="viewer-footer">{e('Tažením otáčej · dvojklikem zaměř detail · kolečkem přibližuj','Drag to orbit · double-click to focus · scroll to zoom')}</footer>
  </section>
  <aside className="scan-inspector"><span className="eyebrow mint">{e('DETAILNÍ KOSTRA','DETAILED SKELETON')}</span><h2>{e('Prozkoumej skutečné tvary','Explore the real shapes')}</h2>
   <div className="scan-materials"><button aria-pressed={!settings.texture} onClick={()=>setSettings(s=>({...s,texture:false}))}>{e('Atlasový povrch','Atlas surface')}</button><button aria-pressed={settings.texture} onClick={()=>setSettings(s=>({...s,texture:true}))}>{e('Původní textura','Original texture')}</button></div>
   {species==='rabbit'&&<label className="scan-stand"><input type="checkbox" checked={settings.stand} onChange={ev=>setSettings(s=>({...s,stand:ev.target.checked}))}/>{e('Zobrazit podstavec preparátu','Show specimen plinth')}</label>}
   <h3>{e('Jak s modelem studovat','Study with this model')}</h3><ol><li>{e('Začni bočním pohledem a sleduj páteř od lebky k ocasu.','Start with a side view and follow the spine from skull to tail.')}</li><li>{e('Dvojklikem na povrch přibliž detail. Tlačítkem Obnovit vrať celou kostru.','Double-click the surface to inspect a detail. Reset returns to the whole skeleton.')}</li><li>{e('Otoč model a zkus stejné struktury poznat z druhé strany.','Rotate and identify the same structures from the opposite side.')}</li></ol>
   <div className="scan-study-link"><p>{e('Sken není rozdělený na pojmenované kosti a neobsahuje svaly. Pro výběr jednotlivých částí a studijní karty otevři schéma.','The scan is not segmented into named bones and contains no muscles. Open the schematic to select individual structures and study their notes.')}</p><button onClick={onStudy}>{e('Otevřít kosti a svaly s popisky','Open labelled bones and muscles')} →</button></div>
   <details className="native-sources"><summary>{e('Původ modelu a licence','Model provenance and license')}</summary><p>{source.title} · {source.author}</p><a href={source.url} target="_blank" rel="noreferrer">{e('Původní model','Original model')} ↗</a><a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a><p>{species==='rabbit'?e('Autor uvádí fotogrammetrii a ruční opravu žeber a trnových výběžků. Konkrétní druh králíka není v popisu doložen.','The author describes photogrammetry and manual reconstruction of ribs and dorsal spines. Exact rabbit species is not documented in the description.'):e('Autor uvádí fotogrammetrii kompletní kočičí kostry. Jednotlivé kosti nejsou v souboru oddělené.','The author describes photogrammetry of a complete cat skeleton. Individual bones are not separated in the file.')}</p><p>{e('Změny zobrazení: sjednocené měřítko, orientace, nasvícení a volitelný atlasový materiál. Oba modely jsou určeny pro nekomerční použití.','Display changes: normalized scale, orientation, lighting and optional atlas material. Both models are for noncommercial use.')}</p></details>
  </aside>
 </div>;
}
