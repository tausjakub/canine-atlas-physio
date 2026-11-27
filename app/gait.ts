// Gait cycle and range-of-motion data. Joint angles are schematic offsets
// from the standing model, for visualising sequence and direction; they are
// not a kinematic measurement of a real animal.
import type { Joint, Motion } from './poses';

export type GaitKind = 'walk' | 'trot' | 'gallop';
const rad = (d: number) => (d * Math.PI) / 180;
const wave = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
const ease = (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u);
// Per gait: stride period in the player (s, slowed for study), duty factor
// (share of the stride a foot is on the ground), joint amplitude scale, limb
// phase offsets, and trunk motion (vertical travel as a share of body height,
// pitch in degrees).
// - walk: four-beat lateral sequence, at least two feet always down;
// - trot: diagonal pairs move together, duty < 0.5 gives a suspension phase;
// - gallop: rotary gallop (LH, RH, RF, LF), short stance, long suspension.
const gaits = {
  walk: {
    period: 1.6,
    duty: 0.62,
    amp: 1,
    offsets: { LH: 0, RF: 0.25, RH: 0.5, LF: 0.75 }, // strikes: LH, LF, RH, RF
    bob: 0.004,
    pitch: 0,
  },
  trot: {
    period: 0.75,
    duty: 0.4,
    amp: 1.4,
    offsets: { LH: 0, RF: 0, RH: 0.5, LF: 0.5 },
    bob: 0.014,
    pitch: 0,
  },
  gallop: {
    period: 0.55,
    duty: 0.28,
    amp: 1.5,
    offsets: { LH: 0, RH: 0.9, RF: 0.6, LF: 0.5 }, // strikes: LH, RH, RF, LF
    bob: 0.03,
    pitch: 5,
  },
};
export const gaitPeriod = Object.fromEntries(
  Object.entries(gaits).map(([k, g]) => [k, g.period]),
) as Record<GaitKind, number>;
// One limb over a stride (t 0-1): stance until the duty factor, then swing.
// a scales protraction/retraction and swing flexion. Degrees.
function fore(t: number, duty: number, a: number) {
  if (t < duty) {
    const u = t / duty;
    return {
      shoulder: a * (15 - 35 * u),
      elbow: 8 * a * wave(u),
      carpus: 12 * u,
    };
  }
  const u = (t - duty) / (1 - duty);
  return {
    shoulder: a * (-20 + 35 * ease(u)),
    elbow: 45 * a * wave(u),
    carpus: 12 * (1 - u) - Math.min(110, 70 * a) * wave(u * 1.4),
  };
}
function hind(t: number, duty: number, a: number) {
  if (t < duty) {
    const u = t / duty;
    return {
      hip: a * (15 - 35 * u),
      stifle: -10 * a * wave(u),
      hock: 8 * a * wave(u),
    };
  }
  const u = (t - duty) / (1 - duty);
  return {
    hip: a * (-20 + 35 * ease(u)),
    stifle: -45 * a * wave(u),
    hock: 40 * a * wave(u),
  };
}
// Trunk: lowest while feet are loaded, highest in suspension. Walk and trot
// rise twice per stride (once per diagonal pair or foot pair), the gallop once.
function trunk(gait: GaitKind, t: number) {
  const g = gaits[gait];
  if (gait === 'gallop')
    return {
      lift: g.bob * Math.cos(2 * Math.PI * (t - 0.85)),
      pitch: g.pitch * Math.sin(2 * Math.PI * (t - 0.2)),
    };
  return { lift: -g.bob * Math.cos(4 * Math.PI * (t - g.duty / 2)), pitch: 0 };
}
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
  const { offsets: o, duty, amp } = gaits[gait];
  const ph = (k: keyof typeof o) => (t + o[k]) % 1;
  const toRad = (a: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(a).map(([k, v]) => [k, rad(v)]),
    ) as Partial<Record<Joint, number>>;
  const motion: Motion = {
    L: {
      ...toRad(fore(ph('LF'), duty, amp)),
      ...toRad(hind(ph('LH'), duty, amp)),
    },
    R: {
      ...toRad(fore(ph('RF'), duty, amp)),
      ...toRad(hind(ph('RH'), duty, amp)),
    },
  };
  const highlight = limbs.flatMap((k) =>
    active[k[1] === 'F' ? 'fore' : 'hind'][
      ph(k) < duty ? 'stance' : 'swing'
    ].map((m) => `${m}@${k[0]}`),
  );
  const stance = limbs.filter((k) => ph(k) < duty);
  return { motion, highlight, stance, ...trunk(gait, t) };
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
