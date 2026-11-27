// Gait cycle and range-of-motion data. Joint angles are schematic offsets
// from the standing model, for visualising sequence and direction; they are
// not a kinematic measurement of a real animal.
import type { Joint, Motion } from './poses';

export type GaitKind = 'walk' | 'trot';
// Seconds per stride cycle in the player (slowed for study).
export const gaitPeriod: Record<GaitKind, number> = { walk: 1.6, trot: 1.0 };
const rad = (d: number) => (d * Math.PI) / 180;
const wave = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
// One limb over a stride (t 0-1): stance 0-0.6, swing 0.6-1. Degrees.
function fore(t: number) {
  if (t < 0.6) {
    const u = t / 0.6;
    return { shoulder: 15 - 35 * u, elbow: 8 * wave(u), carpus: 12 * u };
  }
  const u = (t - 0.6) / 0.4;
  return {
    shoulder: -20 + 35 * (0.5 - 0.5 * Math.cos(Math.PI * u)),
    elbow: 45 * wave(u),
    carpus: 12 * (1 - u) - 70 * wave(u * 1.4),
  };
}
function hind(t: number) {
  if (t < 0.6) {
    const u = t / 0.6;
    return { hip: 15 - 35 * u, stifle: -10 * wave(u), hock: 8 * wave(u) };
  }
  const u = (t - 0.6) / 0.4;
  return {
    hip: -20 + 35 * (0.5 - 0.5 * Math.cos(Math.PI * u)),
    stifle: -45 * wave(u),
    hock: 40 * wave(u),
  };
}
// Phase offsets of each limb: walk is a four-beat lateral sequence, trot moves
// diagonal pairs together.
const gaits = {
  walk: { LH: 0, RF: 0.25, RH: 0.5, LF: 0.75 }, // strikes: LH, LF, RH, RF
  trot: { LH: 0, RF: 0, RH: 0.5, LF: 0.5 },
};
// Muscle groups typically active in stance (support, propulsion) and swing
// (limb advance), simplified from EMG studies; id fragments.
const active = {
  fore: {
    stance: [
      'triceps_brachii',
      'supraspinatus',
      'infraspinatus',
      'latissimus',
      'flexor_carpi_ulnaris',
    ],
    swing: [
      'biceps_brachii',
      'brachialis',
      'deltoideus',
      'extensor_carpi_radialis',
      'extensor_digitorum',
    ],
  },
  hind: {
    stance: [
      'gluteus_medius',
      'biceps_femoris',
      'semimembranosus',
      'vastus',
      'gastrocnemius',
    ],
    swing: [
      'iliacus',
      'psoas',
      'sartorius',
      'tibialis_cranialis',
      'extensor_digitorum_long',
    ],
  },
};
export const limbs = ['LF', 'RF', 'LH', 'RH'] as const;
export function gaitFrame(gait: GaitKind, t: number) {
  const o = gaits[gait];
  const ph = (k: keyof typeof o) => (t + o[k]) % 1;
  const toRad = (a: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(a).map(([k, v]) => [k, rad(v)]),
    ) as Partial<Record<Joint, number>>;
  const motion: Motion = {
    L: { ...toRad(fore(ph('LF'))), ...toRad(hind(ph('LH'))) },
    R: { ...toRad(fore(ph('RF'))), ...toRad(hind(ph('RH'))) },
  };
  const highlight = limbs.flatMap((k) =>
    active[k[1] === 'F' ? 'fore' : 'hind'][
      ph(k) < 0.6 ? 'stance' : 'swing'
    ].map((m) => `${m}@${k[0]}`),
  );
  const stance = limbs.filter((k) => ph(k) < 0.6);
  return { motion, highlight, stance };
}
export function romMotion(rom: Partial<Record<Joint, number>>): Motion {
  return {
    L: Object.fromEntries(
      Object.entries(rom).map(([k, v]) => [k, rad(v ?? 0)]),
    ),
    R: {},
  };
}
// Normal goniometry in Labrador Retrievers (Jaegger, Marcellin-Little & Levine,
// Am J Vet Res 2002), joint angle in degrees.
export const romReference: Record<Joint, [number, number]> = {
  shoulder: [57, 165],
  elbow: [36, 165],
  carpus: [32, 196],
  hip: [50, 162],
  stifle: [42, 162],
  hock: [39, 164],
};
