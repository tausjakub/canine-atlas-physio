'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {type Atlas,type SceneState,isShown,displayName,systems} from './anatomy';
import {type Language,translate} from './i18n';
type Engine={update:(s:SceneState)=>void;destroy:()=>void};
export default function AnatomyScene({atlas,state,onSelect,language}:{atlas:Atlas;state:SceneState;onSelect:(id:string)=>void;language:Language}){
 const t=(key:string)=>translate(language,key),locale=useRef(language);locale.current=language;
 const host=useRef<HTMLDivElement>(null),engine=useRef<Engine|null>(null),latest=useRef(state),select=useRef(onSelect);
 const [status,setStatus]=useState('Loading anatomy…'),[error,setError]=useState('');latest.current=state;select.current=onSelect;
 useEffect(()=>{
  const el=host.current!;let dead=false;let cleanup=()=>{};const abort=new AbortController();
  async function init(){
   try{
    const response=await fetch('/models/anatomy.bin',{signal:abort.signal});if(!response.ok)throw Error('The anatomy file could not be loaded.');
    const buffer=await response.arrayBuffer();if(dead)return;if(buffer.byteLength!==atlas.bytes)throw Error('The anatomy download is incomplete.');
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label',translate(locale.current,'Interactive canine anatomy. Drag to orbit; scroll or pinch to zoom. Select structures using the list for keyboard access.'));
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.001,100);camera.position.set(0,.4,-2);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.035;controls.maxDistance=30;controls.autoRotateSpeed=.8;controls.target.set(0,.35,0);
    scene.add(new THREE.HemisphereLight(0xdcefff,0x425367,2));
    const key=new THREE.DirectionalLight(0xffefdf,3);key.position.set(1,3,-2);scene.add(key);
    const fill=new THREE.DirectionalLight(0x8cc8ff,1.6);fill.position.set(-2,1,2);scene.add(fill);
    const meshes:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>[]=[];
    atlas.parts.forEach(p=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(buffer,p.vertexOffset,p.vertexCount*3),3));g.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,p.indexOffset,p.indexCount),1));g.computeVertexNormals();g.computeBoundingBox();
     const color=systems.find(s=>s.id===p.system)!.color;const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.63,metalness:.02,side:THREE.DoubleSide}));m.userData.part=p;scene.add(m);meshes.push(m);});
    const box=new THREE.Box3();let previous:SceneState|undefined;
    function frame(view:string){box.makeEmpty();meshes.filter(m=>m.visible).forEach(m=>box.expandByObject(m));if(box.isEmpty())return;
     const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
     const dir=view==='cranial'?new THREE.Vector3(1,0,0):view==='dorsal'?new THREE.Vector3(0,1,.0001):view==='right'?new THREE.Vector3(0,0,1):view==='three-quarter'?new THREE.Vector3(.8,.35,-1):new THREE.Vector3(0,.03,-1);
     const radius=size.length()/2;const fit=radius/Math.sin(THREE.MathUtils.degToRad(camera.fov/2))*Math.max(1,1/camera.aspect)*1.05;
     controls.target.copy(center);camera.position.copy(center).addScaledVector(dir.normalize(),Math.max(fit,.08));camera.near=Math.max(.0001,fit/1000);camera.far=Math.max(100,fit*10);camera.updateProjectionMatrix();controls.update();
    }
    function update(s:SceneState){
     let x=0,y=0,row=0;const shown=atlas.parts.filter(p=>isShown(p,s)),layout=new Map<string,THREE.Vector3>();
     for(const p of [...shown].sort((a,b)=>(b.bounds[1][1]-b.bounds[0][1])-(a.bounds[1][1]-a.bounds[0][1]))){const w=p.bounds[1][0]-p.bounds[0][0]+.045,h=p.bounds[1][1]-p.bounds[0][1]+.045;if(x+w>4.3){x=0;y+=row;row=0;}layout.set(p.id,new THREE.Vector3(x+w/2,-y-h/2,0).sub(new THREE.Vector3(...p.center)));x+=w;row=Math.max(row,h);}
     meshes.forEach(m=>{const p=m.userData.part;m.visible=isShown(p,s);const selected=p.id===s.selected;
      m.material.color.set(selected?'#67e0d0':systems.find(t=>t.id===p.system)!.color);m.material.emissive.set(selected?'#123d39':'#000000');
      m.material.opacity=selected?1:p.system==='muscle'?s.opacity:p.system==='surface'?.20:1;m.material.transparent=m.material.opacity<1;m.material.depthWrite=m.material.opacity>=1;
      m.position.copy(layout.get(p.id)||new THREE.Vector3()).multiplyScalar(s.explode);});
     controls.autoRotate=s.rotate;
     if(!previous||previous.reset!==s.reset||previous.view!==s.view||previous.isolate!==s.isolate||previous.explode!==s.explode||(s.isolate&&previous.selected!==s.selected))frame(s.explode>0?'lateral':s.view);
     previous={...s};
    }
    let width=0,height=0;const resize=()=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);if(width!==r.width||height!==r.height){width=r.width;height=r.height;frame(latest.current.view);}};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();update(latest.current);
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let start=[0,0],drag=false;
    const hit=(e:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(meshes.filter(m=>m.visible&&m.material.opacity>.05),false)[0];};
    const down=(e:PointerEvent)=>{start=[e.clientX,e.clientY];drag=false;};
    const move=(e:PointerEvent)=>{if(Math.hypot(e.clientX-start[0],e.clientY-start[1])>5)drag=true;};
    const up=(e:PointerEvent)=>{if(drag||e.button!==0)return;const h=hit(e);if(h)select.current(h.object.userData.part.id);};
    renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);
    renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
    cleanup=()=>{observer.disconnect();renderer.setAnimationLoop(null);controls.dispose();meshes.forEach(m=>{m.geometry.dispose();m.material.dispose();});renderer.dispose();renderer.domElement.remove();};
    engine.current={update,destroy:cleanup};setStatus('');
   }catch(e){if(!dead)setError(e instanceof Error&&['The anatomy file could not be loaded.','The anatomy download is incomplete.'].includes(e.message)?e.message:'Unable to initialize the 3D viewer.');}
  }init();return()=>{dead=true;abort.abort();cleanup();engine.current=null;};
 },[atlas]);
 useEffect(()=>engine.current?.update(state),[state]);
 useEffect(()=>{host.current?.querySelector('canvas')?.setAttribute('aria-label',t('Interactive canine anatomy. Drag to orbit; scroll or pinch to zoom. Select structures using the list for keyboard access.'));},[language]);
 return <><div className="scene" ref={host}/>{(error||status)&&<div className="load-card" role={error?'alert':'status'}><strong>{t(error?'Viewer unavailable':status)}</strong><p>{t(error||'Preparing 3D bones and soft tissues.')}</p>{error&&<button onClick={()=>location.reload()}>{t('Retry viewer')}</button>}</div>}</>;
}
