import {Matrix4,Vector3} from 'three';
import type {Part} from './anatomy';
export type DogPose='standing'|'sitting'|'lying';
export const dogPoses:DogPose[]=['standing','sitting','lying'];
// Approximate joint centres in this particular source mesh's coordinates.
// These rigid skeletal previews are not a measured range-of-motion simulation.
export const poseJoints={shoulder:[.200,.426,0],elbow:[.145,.270,0],carpus:[.147,.090,0],hip:[-.326,.465,0],stifle:[-.350,.297,0],hock:[-.532,.151,0]} as const;
function turn(point:readonly number[],angle:number){return new Matrix4().makeTranslation(...point as [number,number,number]).multiply(new Matrix4().makeRotationZ(angle)).multiply(new Matrix4().makeTranslation(-point[0],-point[1],-point[2]));}
type PoseAngles=Record<'trunk'|'arm'|'forearm'|'forefoot'|'foretoes'|'thigh'|'shank'|'hindfoot'|'hindtoes'|'tail',number>;
export type PoseConfig={joints:Record<keyof typeof poseJoints,number[]>;foretoes:number[];hindtoes:number[];tail:number[];lower:number;angles?:Partial<Record<DogPose,PoseAngles>>};
export function poseRig(pose:DogPose,config?:PoseConfig){
 const poseJoints=config?.joints||defaultJoints;
 const sit=pose==='sitting',lie=pose==='lying';
 if(config?.angles?.[pose]){
  const a=config.angles[pose]!;
  const trunk=turn(poseJoints.shoulder,a.trunk);if(lie)trunk.premultiply(new Matrix4().makeTranslation(0,-config.lower,0));
  const arm=trunk.clone().multiply(turn(poseJoints.shoulder,a.arm)),forearm=arm.clone().multiply(turn(poseJoints.elbow,a.forearm)),forefoot=forearm.clone().multiply(turn(poseJoints.carpus,a.forefoot));
  const thigh=trunk.clone().multiply(turn(poseJoints.hip,a.thigh)),shank=thigh.clone().multiply(turn(poseJoints.stifle,a.shank)),hindfoot=shank.clone().multiply(turn(poseJoints.hock,a.hindfoot));
  return {trunk,arm,forearm,forefoot,thigh,shank,hindfoot,foretoes:forefoot.clone().multiply(turn(config.foretoes,a.foretoes)),hindtoes:hindfoot.clone().multiply(turn(config.hindtoes,a.hindtoes)),tail:trunk.clone().multiply(turn(config.tail,a.tail))};
 }
 const trunk=sit?turn(poseJoints.shoulder,.62):lie?new Matrix4().makeTranslation(0,-(config?.lower??.27),0):new Matrix4();
 const arm=trunk.clone().multiply(turn(poseJoints.shoulder,sit?-.62:lie?-.48:0));
 const forearm=arm.clone().multiply(turn(poseJoints.elbow,lie?2.10:0));
 const forefoot=forearm.clone().multiply(turn(poseJoints.carpus,lie?-.42:0));
 const thigh=trunk.clone().multiply(turn(poseJoints.hip,sit?.99:lie?1.11:0));
 const shank=thigh.clone().multiply(turn(poseJoints.stifle,sit?-1.76:lie?-1.555:0));
 const hindfoot=shank.clone().multiply(turn(poseJoints.hock,sit?1.59:lie?1.85:0));
 const foretoes=forefoot.clone().multiply(turn(config?.foretoes||[.175,.025,0],lie?-1.2:0));
 const hindtoes=hindfoot.clone().multiply(turn(config?.hindtoes||[-.531,.027,0],sit?-1.44:lie?-1.405:0));
 const tail=trunk.clone().multiply(turn(config?.tail||[-.342,.494,0],sit?-.95:0));
 return {trunk,arm,forearm,forefoot,foretoes,thigh,shank,hindfoot,hindtoes,tail};
}
export function poseSegment(part:Part):keyof ReturnType<typeof poseRig>{
 const id=part.id;
 if(/^Ca_/.test(id))return 'tail';
 if(/^Phalanges_B/.test(id))return 'hindtoes';
 if(/^Phalanx/.test(id))return 'foretoes';
 if(/^humerus_/i.test(id))return 'arm';
 if(/^(Radius|Ulna)_/.test(id))return 'forearm';
 if(/^(Carpal|Os_metacarpale|Phalanx)/.test(id))return 'forefoot';
 if(/^(Femoris|Patella)_/.test(id))return 'thigh';
 if(/^(Tibia|Fibula)_/.test(id))return 'shank';
 if(/^(Tarsus|Tibial_tarsal|Calcaneal_tuber|Metatarsi|Phalanges_B)/.test(id))return 'hindfoot';
 return 'trunk';
}
const defaultJoints=poseJoints;
export function poseMatrix(part:Part,pose:DogPose,config?:PoseConfig){return poseRig(pose,config)[poseSegment(part)].clone();}
export function posePoint(point:readonly number[],matrix:Matrix4){return new Vector3(...point as [number,number,number]).applyMatrix4(matrix);}

type Segment=keyof ReturnType<typeof poseRig>;
type Influence={segment:Segment;weight:number};
// Spatial skinning of the unrigged source model. Blend nearby bone segments
// per vertex so tissue spanning a joint follows both sides of that joint.
// These weights are illustrative, not measured muscle attachments or strains.
export function bindSoftVertices(positions:Float32Array,bones:Part[]):Influence[][]{
 const guides=bones.map(part=>({segment:poseSegment(part),bounds:part.bounds}));
 const result:Influence[][]=[];
 for(let i=0;i<positions.length;i+=3){
  const distances=new Map<Segment,number>();
  for(const {segment,bounds} of guides){
   let distance=0;
   for(let axis=0;axis<3;axis++){const v=positions[i+axis];const delta=Math.max(bounds[0][axis]-v,0,v-bounds[1][axis]);distance+=delta*delta;}
   if(distance<(distances.get(segment)??Infinity))distances.set(segment,distance);
  }
  const nearest=[...distances].sort((a,b)=>a[1]-b[1]).slice(0,3);
  const weights=nearest.map(([segment,distance])=>({segment,weight:1/Math.pow(distance+.000025,2)}));
  const total=weights.reduce((sum,v)=>sum+v.weight,0);
  result.push(weights.map(v=>({...v,weight:v.weight/total})));
 }
 return result;
}
export function deformSoftVertices(rest:Float32Array,bindings:Influence[][],pose:DogPose,config?:PoseConfig){
 if(pose==='standing')return rest.slice();
 const rig=poseRig(pose,config),output=new Float32Array(rest.length),point=new Vector3();
 for(let i=0;i<rest.length;i+=3){
  for(const {segment,weight} of bindings[i/3]){
   point.set(rest[i],rest[i+1],rest[i+2]).applyMatrix4(rig[segment]);
   output[i]+=point.x*weight;output[i+1]+=point.y*weight;output[i+2]+=point.z*weight;
  }
 }
 return output;
}
