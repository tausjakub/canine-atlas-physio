import {Box3, Matrix4, Vector3} from 'three';
import type {Part} from './anatomy';

export type DornMovementKind = 'stifle'|'elbow'|'carpus'|'digits'|'hip'|'hip-rotation'|'hock'|'shoulder'|'hind-digits';
export type DornPartRole = 'moving'|'fixed'|'context';
export type DornKinematics = {
  kind: DornMovementKind;
  bend: number;
  pivot: Vector3;
  axis: Vector3;
  matrices: Map<string, Matrix4>;
  affectedIds: string[];
  contextIds: string[];
  proximalAnchor: Vector3;
  distalAnchor: Vector3;
  focusBounds: Box3;
};

// Approximate joint centres of this specific dog mesh. These are explanatory
// rigid-bone rotations, not patient ranges, hand positions or a therapy protocol.
// The near/left limb is the source's negative-Z side; no contralateral bones move.
const joints = {
  stifle: [-.350, .297, -.077],
  elbow: [.145, .270, -.064],
  carpus: [.147, .090, -.055],
  digits: [.177, .028, -.053],
  hip: [-.327760018, .463807614, -.059428711],
  'hip-rotation': [-.327760018, .463807614, -.059428711],
  hock: [-.532, .151, -.073],
  shoulder: [.200, .426, -.060],
  'hind-digits': [-.538, .034, -.080],
} as const;
const angles: Record<DornMovementKind, number> = {
  stifle: -.98, elbow: 1.12, carpus: -.95, digits: -.70,
  hip: .65, 'hip-rotation': .42, hock: 1.0, shoulder: .75, 'hind-digits': -.70,
};
const left = (id: string) => /_L(?:_|\.|$)/.test(id);
const foreDistal = (id: string) => /^(Carpal|Os_metacarpale|Phalanx)/.test(id);
const hindDistal = (id: string) => /^(Tarsus|Tibial_tarsal|Calcaneal_tuber|Metatarsi|Phalanges_B)/.test(id);

export function dornMovementPartRole(part: Part, kind: DornMovementKind): DornPartRole {
  if (part.system !== 'bone') return 'context';
  if ((kind === 'stifle'||kind==='hip'||kind==='hip-rotation') && part.id === 'Pelvis') return 'fixed';
  if (!left(part.id)) return 'context';
  const id = part.id;
  if (kind==='hip'||kind==='hip-rotation') {
    if (/^(Femoris|Patella|Tibia|Fibula)_/.test(id)||hindDistal(id)) return 'moving';
  } else if (kind==='hock') {
    if (hindDistal(id)) return 'moving';
    if (/^(Tibia|Fibula)_/.test(id)) return 'fixed';
  } else if (kind==='shoulder') {
    if (/^(humerus|Radius|Ulna)_/.test(id)||foreDistal(id)) return 'moving';
    if (/^Scapula_/i.test(id)) return 'fixed';
  } else if (kind==='hind-digits') {
    if (/^Phalanges_B/.test(id)) return 'moving';
    if (/^Metatarsi_/.test(id)) return 'fixed';
  } else if (kind === 'stifle') {
    if (/^(Tibia|Fibula)_/.test(id) || hindDistal(id)) return 'moving';
    if (/^(Femoris|Patella)_/.test(id)) return 'fixed';
  } else if (kind === 'elbow') {
    if (/^(Radius|Ulna)_/.test(id) || foreDistal(id)) return 'moving';
    if (/^(Scapula|humerus)_/i.test(id)) return 'fixed';
  } else if (kind === 'carpus') {
    if (foreDistal(id)) return 'moving';
    if (/^(Radius|Ulna)_/.test(id)) return 'fixed';
  } else if (kind === 'digits') {
    if (/^Phalanx/.test(id)) return 'moving';
    if (/^(Carpal|Os_metacarpale)/.test(id)) return 'fixed';
  }
  return 'context';
}

function rotate(pivot: Vector3, angle: number, axis?: Vector3) {
  return new Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z)
    .multiply(axis ? new Matrix4().makeRotationAxis(axis,angle) : new Matrix4().makeRotationZ(angle))
    .multiply(new Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

function pointBounds(part: Part, matrix?: Matrix4) {
  const box = new Box3();
  for (let i=0; i<8; i++) {
    const p = new Vector3(part.bounds[i&1 ? 1 : 0][0], part.bounds[i&2 ? 1 : 0][1], part.bounds[i&4 ? 1 : 0][2]);
    box.expandByPoint(matrix ? p.applyMatrix4(matrix) : p);
  }
  return box;
}

function requirePart(parts: Part[], id: string) {
  const part = parts.find(part => part.id === id && part.system === 'bone');
  if (!part) throw new Error(`Dog anatomy is missing ${id}.`);
  return part;
}

// The source names the proximal phalanges "Phalanxpmxinutlis". Preserve its
// identifiers so each genuine bone keeps its own source geometry and label.
function digit(parts: Part[], level: 'proximal'|'media'|'distalis', numeral: string) {
  return parts.find(part => part.system === 'bone' && left(part.id) &&
    (level === 'proximal' ? /^Phalanxpmxinutlis/.test(part.id) : part.id.startsWith(`Phalanx_${level}`)) &&
    new RegExp(`_digiti_${numeral}_L(?:_|$)`).test(part.id));
}

function endpoint(part: Part, end: 'proximal'|'distal') {
  // Phalanges point cranially (+X) in this model's standing stance.
  // Their centres and longitudinal bounds locate the explanatory hinge without
  // guessing a joint on the body's midline or changing the bone's shape.
  return new Vector3(part.bounds[end === 'proximal' ? 0 : 1][0], part.center[1], part.center[2]);
}

function digitMatrices(parts: Part[], bend: number, matrices: Map<string, Matrix4>) {
  for (const numeral of ['II', 'III', 'IV', 'V']) {
    const proximal = digit(parts, 'proximal', numeral);
    const middle = digit(parts, 'media', numeral);
    const distal = digit(parts, 'distalis', numeral);
    if (!proximal || !middle || !distal) throw new Error(`Dog digit ${numeral} has an incomplete phalanx chain.`);
    const mcp = endpoint(proximal, 'proximal');
    const pip = endpoint(proximal, 'distal').lerp(endpoint(middle, 'proximal'), .5);
    const dip = endpoint(middle, 'distal').lerp(endpoint(distal, 'proximal'), .5);
    const first = rotate(mcp, angles.digits*bend);
    const second = first.clone().multiply(rotate(pip, -.43*bend));
    const third = second.clone().multiply(rotate(dip, -.25*bend));
    matrices.set(proximal.id, first);
    matrices.set(middle.id, second);
    matrices.set(distal.id, third);
  }
  // The model provides only a distal piece for digit I. Keep its short movement
  // around its actual proximal endpoint, independently of the four main toes.
  const dewclaw = digit(parts, 'distalis', 'I');
  if (dewclaw) matrices.set(dewclaw.id, rotate(endpoint(dewclaw, 'proximal'), -.35*bend));
}

function hindDigitMatrices(parts: Part[], bend: number, matrices: Map<string, Matrix4>) {
  // Four real three-piece hind-digit chains. The source numbers the four rays
  // 1-4; preserve those identifiers instead of relabelling them as digits I-IV.
  for (const number of [1,2,3,4]) {
    const proximal=requirePart(parts,`Phalanges_B_L_${number}`);
    const middle=requirePart(parts,`Phalanges_B_2_L_${number}`);
    const distal=requirePart(parts,`Phalanges_B_3_L_${number}`);
    const mtp=endpoint(proximal,'proximal');
    const pip=endpoint(proximal,'distal').lerp(endpoint(middle,'proximal'),.5);
    const dip=endpoint(middle,'distal').lerp(endpoint(distal,'proximal'),.5);
    const first=rotate(mtp,angles['hind-digits']*bend);
    const second=first.clone().multiply(rotate(pip,-.43*bend));
    matrices.set(proximal.id,first);
    matrices.set(middle.id,second);
    matrices.set(distal.id,second.clone().multiply(rotate(dip,-.25*bend)));
  }
}

export function dornKinematics(kind: DornMovementKind, value: number, parts: Part[]): DornKinematics {
  const bend = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const pivot = new Vector3(...joints[kind]);
  // This direction is derived from the means of the upper/lower 15% of the
  // actual femur's source vertices (by Y), not a second sagittal hinge.
  const axis=kind==='hip-rotation'
    ? new Vector3(-.349445875,.297996725,-.078073133).sub(pivot).normalize()
    : new Vector3(0,0,1);
  const matrices = new Map<string, Matrix4>();
  const context = parts.filter(part => dornMovementPartRole(part, kind) !== 'context');
  const moving = context.filter(part => dornMovementPartRole(part, kind) === 'moving');
  if (kind === 'digits') digitMatrices(parts, bend, matrices);
  else if (kind==='hind-digits') hindDigitMatrices(parts,bend,matrices);
  else {
    const matrix = rotate(pivot, angles[kind]*bend,axis);
    for (const part of moving) matrices.set(part.id, matrix.clone());
  }
  let proximalAnchor: Vector3;
  let distalAnchor: Vector3;
  if (kind==='hip'||kind==='hip-rotation') {
    proximalAnchor=pivot.clone().add(new Vector3(.1,0,0));
    distalAnchor=new Vector3(-.349445875,.297996725,-.078073133).applyMatrix4(matrices.get('Femoris_L')!);
  } else if (kind==='hock') {
    proximalAnchor=new Vector3(-.350,.297,pivot.z);
    distalAnchor=new Vector3(...requirePart(parts,'Metatarsi_L_3').center).applyMatrix4(matrices.get('Metatarsi_L_3')!);
  } else if (kind==='shoulder') {
    proximalAnchor=pivot.clone().add(new Vector3(-.06,.1,0));
    distalAnchor=new Vector3(.145,.270,pivot.z).applyMatrix4(matrices.get('humerus_L')!);
  } else if (kind==='hind-digits') {
    proximalAnchor=new Vector3(...requirePart(parts,'Metatarsi_L_3').center);
    const toe=requirePart(parts,'Phalanges_B_3_L_3');
    distalAnchor=new Vector3(...toe.center).applyMatrix4(matrices.get(toe.id)!);
  } else if (kind === 'stifle') {
    proximalAnchor = new Vector3(-.326, .465, pivot.z);
    distalAnchor = new Vector3(-.532, .151, pivot.z).applyMatrix4(matrices.get('Tibia_L')!);
  } else if (kind === 'elbow') {
    proximalAnchor = new Vector3(.200, .426, pivot.z);
    distalAnchor = new Vector3(.147, .090, pivot.z).applyMatrix4(matrices.get('Radius_L')!);
  } else if (kind === 'carpus') {
    proximalAnchor = new Vector3(.145, .270, pivot.z);
    distalAnchor = new Vector3(...requirePart(parts, 'Os_metacarpale_III_L').center)
      .applyMatrix4(matrices.get('Os_metacarpale_III_L')!);
  } else {
    proximalAnchor = new Vector3(...requirePart(parts, 'Os_metacarpale_III_L').center);
    const toe = requirePart(parts, 'Phalanx_distalis_digiti_III_L');
    distalAnchor = new Vector3(...toe.center).applyMatrix4(matrices.get(toe.id)!);
  }
  const focusBounds = new Box3();
  for (const part of context) focusBounds.union(pointBounds(part, matrices.get(part.id)));
  return {kind, bend, pivot, axis, matrices,
    affectedIds: moving.map(part=>part.id), contextIds: context.map(part=>part.id),
    proximalAnchor, distalAnchor, focusBounds};
}

export function dornMotionSamples(kind: DornMovementKind, parts: Part[]) {
  return Array.from({length: 17}, (_, i) => dornKinematics(kind, i/16, parts));
}

export function dornMotionBounds(kind: DornMovementKind, parts: Part[]) {
  const bounds = new Box3();
  for (const rig of dornMotionSamples(kind, parts)) bounds.union(rig.focusBounds);
  // A small margin absorbs extrema between samples and the explanatory marker.
  return bounds.expandByScalar(.006);
}

export type DornSoftBinding = {id: string; weight: number}[];

export function bindDornSoftVertices(rest: Float32Array, bones: Part[]): DornSoftBinding[] {
  const bindings: DornSoftBinding[] = [];
  for (let i=0; i<rest.length; i+=3) {
    // The far side of the dog is a stationary spatial reference.
    if (rest[i+2] >= 0) { bindings.push([]); continue; }
    const nearest = bones.map(part => {
      let distance=0;
      for (let axis=0; axis<3; axis++) {
        const delta=Math.max(part.bounds[0][axis]-rest[i+axis],0,rest[i+axis]-part.bounds[1][axis]);
        distance+=delta*delta;
      }
      return {id:part.id, distance};
    }).sort((a,b)=>a.distance-b.distance).slice(0,3);
    const weights=nearest.map(({id,distance})=>({id,weight:1/Math.pow(distance+.000025,2)}));
    const total=weights.reduce((sum,influence)=>sum+influence.weight,0);
    bindings.push(weights.map(influence=>({...influence,weight:influence.weight/total})));
  }
  return bindings;
}

export function deformDornSoftVertices(rest: Float32Array, bindings: DornSoftBinding[], rig: DornKinematics) {
  if (!rig.bend) return rest.slice();
  const output=rest.slice(), point=new Vector3();
  for (let i=0; i<rest.length; i+=3) {
    const influences=bindings[i/3];
    if (!influences?.length) continue;
    output[i]=output[i+1]=output[i+2]=0;
    for (const {id,weight} of influences) {
      point.set(rest[i],rest[i+1],rest[i+2]);
      const matrix=rig.matrices.get(id);
      if (matrix) point.applyMatrix4(matrix);
      output[i]+=point.x*weight; output[i+1]+=point.y*weight; output[i+2]+=point.z*weight;
    }
  }
  return output;
}
