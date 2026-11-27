// Schematic buccal (side) outlines of each tooth for the dental chart, drawn
// for an upper tooth (roots up, crown down) in a box w x 100; lower teeth are
// mirrored vertically. Shapes follow the tooth type of each species: incisors,
// curved canines, cusped premolars, blade-like carnassials and broad molars in
// carnivores; ever-growing curved incisors and column-like cheek teeth without
// closed roots in the rabbit and guinea pig. Not to scale between species.
export type ToothShape = {
  w: number;
  crown: string;
  roots: string;
  open?: boolean; // ever-growing (elodont): no closed root
};
const premolar = (w: number, h = 88): ToothShape => ({
  w,
  crown: `M1,58 L${w - 1},58 L${w},70 L${w * 0.7},72 L${w / 2},${h} L${w * 0.3},72 L0,70 Z`,
  roots:
    w < 14
      ? `M${w * 0.3},58 L${w * 0.4},6 L${w * 0.6},6 L${w * 0.7},58 Z`
      : `M2,58 L${w * 0.2},8 L${w * 0.38},8 L${w * 0.45},58 Z M${w * 0.55},58 L${w * 0.62},8 L${w * 0.8},8 L${w - 2},58 Z`,
});
const molar = (w: number, h = 78): ToothShape => ({
  w,
  crown: `M1,58 L${w - 1},58 L${w},70 Q${w * 0.83},${h} ${w * 0.66},72 Q${w / 2},${h + 4} ${w * 0.34},72 Q${w * 0.17},${h} 0,70 Z`,
  roots: `M2,58 L${w * 0.15},12 L${w * 0.32},12 L${w * 0.4},58 Z M${w * 0.6},58 L${w * 0.68},12 L${w * 0.85},12 L${w - 2},58 Z`,
});
const carnassialUpper = (w: number): ToothShape => ({
  w,
  crown: `M1,56 L${w - 1},56 L${w},68 L${w * 0.76},70 L${w * 0.64},82 L${w * 0.5},92 L${w * 0.35},76 L${w * 0.18},74 L0,68 Z`,
  roots: `M2,56 L${w * 0.12},6 L${w * 0.3},6 L${w * 0.38},56 Z M${w * 0.56},56 L${w * 0.7},6 L${w * 0.88},6 L${w - 2},56 Z`,
});
const carnassialLower = (w: number): ToothShape => ({
  w,
  crown: `M1,58 L${w - 1},58 L${w},70 L${w * 0.78},74 L${w * 0.62},88 L${w * 0.5},76 L${w * 0.38},92 L${w * 0.22},74 L0,70 Z`,
  roots: `M2,58 L${w * 0.14},8 L${w * 0.34},8 L${w * 0.42},58 Z M${w * 0.58},58 L${w * 0.66},8 L${w * 0.86},8 L${w - 2},58 Z`,
});
const incisor = (w: number): ToothShape => ({
  w,
  crown: `M1,55 L${w - 1},55 L${w - 0.5},80 Q${w * 0.75},94 ${w / 2},93 Q${w * 0.25},94 0.5,80 Z`,
  roots: `M2,55 L${w * 0.4},4 L${w * 0.6},4 L${w - 2},55 Z`,
});
const canine = (w: number): ToothShape => ({
  w,
  crown: `M2,48 L${w - 2},48 Q${w},76 ${w * 0.5},100 Q${w * 0.3},76 2,48 Z`,
  roots: `M3,48 Q${w * 0.35},-2 ${w * 0.55},0 Q${w * 0.8},10 ${w - 2},48 Z`,
});
// Ever-growing teeth: the whole curved tooth, the exposed crown below the gum.
const gnawingIncisor = (w: number): ToothShape => ({
  w,
  open: true,
  crown: `M${w * 0.55},62 L${w - 1},60 Q${w},82 ${w * 0.7},100 L${w * 0.15},96 Q${w * 0.45},80 ${w * 0.55},62 Z`,
  roots: `M1,0 L${w * 0.45},0 Q${w * 0.8},30 ${w - 1},60 L${w * 0.55},62 Q${w * 0.35},30 1,0 Z`,
});
const pegTooth: ToothShape = {
  w: 8,
  crown: 'M1,60 L7,60 L7,78 Q4,82 1,78 Z',
  roots: 'M2,30 L6,30 L7,60 L1,60 Z',
};
const cheekColumn = (w: number, folded: boolean): ToothShape => ({
  w,
  open: true,
  crown: `M1,68 L${w - 1},68 L${w - 1},98 L1,98 Z${folded ? ` M${w / 2},70 L${w / 2},86` : ''}`,
  roots: `M2,4 L${w - 2},4 L${w - 1},68 L1,68 Z`,
});

export function toothShape(
  sp: string,
  pos: number,
  upper: boolean,
): ToothShape {
  if (sp === 'rabbit' || sp === 'guinea_pig') {
    if (pos === 1) return gnawingIncisor(sp === 'rabbit' ? 14 : 12);
    if (pos === 2) return pegTooth;
    const last = upper && sp === 'rabbit' && pos === 11;
    return cheekColumn(last ? 10 : 16, sp === 'guinea_pig');
  }
  if (pos <= 3) return incisor(pos === 3 ? 14 : 11);
  if (pos === 4) return canine(sp === 'cat' ? 17 : 19);
  if (upper) {
    if (pos === 8) return carnassialUpper(sp === 'cat' ? 34 : 32);
    if (pos === 5) return premolar(11, 74);
    if (pos <= 7) return premolar(pos === 6 ? 18 : 22, 84);
    if (pos === 9)
      return sp === 'cat' ? molar(10, 68) : molar(sp === 'ferret' ? 18 : 26);
    return molar(16, 72);
  }
  if (pos === 9) return carnassialLower(sp === 'cat' ? 30 : 32);
  if (pos === 5) return premolar(11, 74);
  if (pos <= 8) return premolar(pos === 8 ? 24 : pos === 6 ? 18 : 21, 86);
  return molar(pos === 10 ? (sp === 'ferret' ? 9 : 18) : 12, 72);
}
