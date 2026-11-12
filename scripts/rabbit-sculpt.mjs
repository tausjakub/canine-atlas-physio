// Original educational modelling. Landmarks inform the shape; these are not
// specimen measurements. Keep the catalogue's authored-model accuracy notice.
import * as T from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
const V=p=>new T.Vector3(...p);
const blend=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
const egg=(p,c,r)=>{const x=(p[0]-c[0])/r[0],y=(p[1]-c[1])/r[1],z=(p[2]-c[2])/r[2];return (Math.hypot(x,y,z)-1)*Math.min(...r);};
const capsule=(p,a,b,r)=>{const d=b.map((v,i)=>v-a[i]),q=p.map((v,i)=>v-a[i]),h=Math.max(0,Math.min(1,q.reduce((s,v,i)=>s+v*d[i],0)/d.reduce((s,v)=>s+v*v,0)));return Math.hypot(...q.map((v,i)=>v-h*d[i]))-r;};
function implicit(min,max,field,resolution=60){
 const mc=new MarchingCubes(resolution,new T.MeshBasicMaterial(),false,false,70000);mc.isolation=0;
 for(let z=0;z<resolution;z++)for(let y=0;y<resolution;y++)for(let x=0;x<resolution;x++){
  const p=[x,y,z].map((v,i)=>min[i]+v/resolution*(max[i]-min[i]));mc.field[x+resolution*(y+resolution*z)]=-field(p);
 }
 mc.update();const a=mc.geometry.attributes.position.array,position=new Float32Array(mc.count*3);
 for(let i=0;i<position.length;i++){const axis=i%3;position[i]=min[axis]+(a[i]+1)*.5*(max[axis]-min[axis]);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(position,3));
 const joined=mergeVertices(geometry,1e-6);joined.computeVertexNormals();geometry.dispose();mc.geometry.dispose();mc.material.dispose();return joined;
}
export function sculptLongBone(id,a,b,r){
 const length=V(a).distanceTo(V(b));if(length<.055)return null;
 // Local Y runs proximal to distal. A continuous, curved shaft joins the
 // epiphyses; paired distal condyles retain an intercondylar indentation.
 const field=p=>{
  const t=Math.max(0,Math.min(1,p[1]/length)),cx=-r*.35*Math.sin(Math.PI*t),radius=r*(.43+.13*Math.pow(Math.abs(2*t-1),3));
  let d=Math.max(Math.hypot((p[0]-cx)*1.08,p[2]) - radius,Math.max(-p[1],p[1]-length));
  const add=(c,s,k=r*.35)=>{d=blend(d,egg(p,c,s),k);};
  if(/^Femoris/.test(id)){
   add([-r*.65,r*.55,0],[r*.9,r*.95,r*.92]); // head and neck
   add([r*.75,r*.8,0],[r*.65,r*1.4,r*.7]); // greater trochanter
   add([-r*.65,length*.23,r*.2],[r*.36,r*.62,r*.4]);
  }else if(/^humerus/.test(id)){
   add([-r*.25,r*.65,0],[r,r*1.3,r*.95]);
   add([r*.8,r*.9,0],[r*.55,r*1.2,r*.7]);
   d=blend(d,capsule(p,[r*.5,length*.18,0],[r*.7,length*.43,0],r*.23),r*.25);
  }else{
   add([0,r*.8,-r*.55],[r*.9,r,r*.65]);add([0,r*.8,r*.55],[r*.9,r,r*.65]);
   d=blend(d,capsule(p,[r*.7,r*1.4,0],[r*.3,length*.42,0],r*.25),r*.3);
  }
  add([0,length-r*.55,-r*.55],[r*.82,r,r*.64]);add([0,length-r*.55,r*.55],[r*.82,r,r*.64]);
  return d;
 };
 const g=implicit([-r*2,-r*1.5,-r*1.8],[r*2,length+r*1.5,r*1.8],field,64);
 g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),V(b).sub(V(a)).normalize()));return g.translate(...a);
}
export function sculptRabbitSkull(head){
 const field=p=>{
  let d=egg(p,[-.013,.008,0],[.052,.043,.038]);
  d=blend(d,egg(p,[.045,-.008,0],[.071,.027,.027]),.009);
  d=blend(d,egg(p,[.074,-.026,0],[.028,.018,.024]),.006);
  // Large paired orbits; the zygomatic bars remain below the orbital openings.
  for(const side of [-1,1]){
   d=Math.max(d,-egg(p,[.026,.005,side*.035],[.028,.023,.031]));
   d=blend(d,capsule(p,[-.005,-.014,side*.035],[.059,-.023,side*.030],.005),.004);
   // Thin maxillary fenestrations, rather than painted markings.
   for(const [x,y] of [[.063,-.003],[.078,-.005],[.057,-.016]])d=Math.max(d,-egg(p,[x,y,side*.024],[.005,.004,.012]));
  }
  d=Math.max(d,-egg(p,[.1,-.009,0],[.026,.014,.017])); // nasal aperture
  d=Math.max(d,-egg(p,[-.059,-.005,0],[.018,.014,.013])); // caudal opening
  return d;
 };
 return implicit([-.079,-.052,-.058],[.124,.064,.058],field,84).translate(...head);
}
export function sculptRabbitJaw(head,side){
 const field=p=>{
  let d=egg(p,[.049,-.047,side*.024],[.047,.010,.009]);
  d=blend(d,egg(p,[-.003,-.031,side*.032],[.019,.028,.010]),.007);
  d=blend(d,egg(p,[-.011,-.004,side*.032],[.007,.011,.008]),.006);
  d=blend(d,egg(p,[.006,-.007,side*.031],[.006,.018,.006]),.004);
  return d;
 };
 return implicit([-.032,-.068,side<0?-.052:.009],[.107,.018,side<0?-.009:.052],field,56).translate(...head);
}
export function sculptRabbitScapula(shoulder,z,side){
 const outline=[[-.082,.087],[-.061,.108],[-.011,.112],[.014,.087],[.019,.010],[.004,-.004],[-.016,.012]];
 const planar=p=>{let distance=Infinity,inside=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){
  const a=outline[i],b=outline[j],d=[b[0]-a[0],b[1]-a[1]],q=[p[0]-a[0],p[1]-a[1]],h=Math.max(0,Math.min(1,(q[0]*d[0]+q[1]*d[1])/(d[0]*d[0]+d[1]*d[1])));
  distance=Math.min(distance,Math.hypot(q[0]-h*d[0],q[1]-h*d[1]));if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?-distance:distance;};
 const field=p=>{const surface=.003*Math.sin(p[1]*24)*side;let d=Math.max(planar(p),Math.abs(p[2]-surface)-.0024);
  d=blend(d,capsule(p,[-.044,.098,side*.006],[.008,.024,side*.008],.0035),.003);
  d=blend(d,capsule(p,[.008,.024,side*.008],[.023,.014,side*.012],.003),.002);
  d=blend(d,egg(p,[.010,.004,0],[.012,.012,.008]),.003);
  d=Math.max(d,-egg(p,[.012,-.003,0],[.007,.006,.007]));return d;
 };
 return implicit([-.095,-.02,-.022],[.037,.126,.022],field,72).translate(shoulder[0],shoulder[1],z);
}
// A closed fan-shaped sheet, with a broad origin edge and narrow insertion.
// Curvature keeps the sheet following the thoracic/scapular surface.
export function muscleFan(originA,originB,insertion,thickness,bulge=0){
 const positions=[],indices=[],rows=32,cols=32,A=V(originA),B=V(originB),C=V(insertion);
 const normal=B.clone().sub(A).cross(C.clone().sub(A)).normalize();
 for(const layer of [-1,1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
  const u=i/rows,t=j/cols,origin=A.clone().lerp(B,u),p=origin.lerp(C,t*.985);
  const swell=Math.pow(Math.sin(Math.PI*t),.65)*Math.sin(Math.PI*u),h=thickness*(.25+.75*swell);
  p.addScaledVector(normal,bulge*Math.sin(Math.PI*t)+layer*h);positions.push(...p.toArray());
 }
 const n=(rows+1)*(cols+1),index=(l,i,j)=>l*n+i*(cols+1)+j;
 for(let l=0;l<2;l++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=index(l,i,j),b=index(l,i+1,j),c=index(l,i,j+1),d=index(l,i+1,j+1);indices.push(...(l?[a,c,b,b,c,d]:[a,b,c,b,d,c]));}
 const bridge=(a,b)=>indices.push(a,a+n,b,b,a+n,b+n);
 for(let i=0;i<rows;i++){bridge(index(0,i,0),index(0,i+1,0));bridge(index(0,i+1,cols),index(0,i,cols));}
 for(let j=0;j<cols;j++){bridge(index(0,0,j+1),index(0,0,j));bridge(index(0,rows,j),index(0,rows,j+1));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function muscleBelly(a,b,width,depth,id){
 const dir=V(b).sub(V(a)),axis=dir.clone().normalize(),side=new T.Vector3(0,0,1).cross(axis).normalize();
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),axis),positions=[],indices=[],rows=40,rings=32;
 const broad=/biceps_femoris|gluteus|vastus|masseter|triceps_long/.test(id);
 for(let i=0;i<=rows;i++){
  const t=i/rows,profile=Math.pow(Math.sin(Math.PI*t),broad?.48:.8),peak=(.65+.35*Math.sin(Math.PI*Math.min(1,t*1.25)));
  for(let j=0;j<=rings;j++){
   const angle=j/rings*Math.PI*2,section=new T.Vector3(Math.cos(angle)*width*(.045+profile*peak),dir.length()*t,Math.sin(angle)*depth*(.06+profile));
   section.applyQuaternion(q).add(V(a)).addScaledVector(side,width*.18*Math.sin(Math.PI*t));positions.push(...section.toArray());
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<rings;j++){const a=i*(rings+1)+j,b=a+rings+1;indices.push(a,b,a+1,a+1,b,b+1);}
 // Close attachment ends, retaining a narrow tendon-like neck.
 for(const [row,reverse] of [[0,true],[rows,false]]){const center=positions.length/3;positions.push(...V(a).lerp(V(b),row/rows).toArray());for(let j=0;j<rings;j++){const x=row*(rings+1)+j;indices.push(...(reverse?[center,x+1,x]:[center,x,x+1]));}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
