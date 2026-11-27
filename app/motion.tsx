'use client';
// Gait player and joint range-of-motion explorer. Joint angles are schematic
// offsets from the standing model, for visualising sequence and direction; they
// are not a kinematic measurement of a real dog.
import { useEffect, useState } from 'react';
import type { Joint, Motion } from './poses';
import { type Language, translate } from './i18n';

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
type Gait = keyof typeof gaits;
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
export function gaitFrame(gait: Gait, t: number) {
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
  const highlight = (['LF', 'RF', 'LH', 'RH'] as const).flatMap((k) =>
    active[k[1] === 'F' ? 'fore' : 'hind'][
      ph(k) < 0.6 ? 'stance' : 'swing'
    ].map((m) => `${m}@${k[0]}`),
  );
  const stance = (['LF', 'RF', 'LH', 'RH'] as const).filter((k) => ph(k) < 0.6);
  return { motion, highlight, stance };
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
// Slider limits (offset from standing, degrees) and the direction of positive values.
const romSliders: [Joint, number, number, string, string][] = [
  ['shoulder', -60, 60, 'extension', 'flexion'],
  ['elbow', -20, 100, 'extension', 'flexion'],
  ['carpus', -100, 30, 'flexion', 'extension'],
  ['hip', -50, 60, 'extension', 'flexion'],
  ['stifle', -90, 20, 'flexion', 'extension'],
  ['hock', -20, 90, 'extension', 'flexion'],
];
const jointNames: Record<Joint, string> = {
  shoulder: 'Shoulder',
  elbow: 'Elbow',
  carpus: 'Carpus',
  hip: 'Hip',
  stifle: 'Stifle',
  hock: 'Tarsus (hock)',
};

export default function MotionControls({
  language,
  onChange,
  resetKey,
}: {
  language: Language;
  onChange: (motion: Motion | null, highlight: string[]) => void;
  resetKey: number;
}) {
  const t = (k: string) => translate(language, k);
  const [gait, setGait] = useState<Gait | null>(null),
    [phase, setPhase] = useState(0),
    [playing, setPlaying] = useState(false),
    [rom, setRom] = useState<Partial<Record<Joint, number>>>({});
  // A new pose or a reset elsewhere stops the motion.
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler -- an external reset clears local motion state
    setGait(null);
    setPlaying(false);
    setRom({});
  }, [resetKey]);
  useEffect(() => {
    if (!playing || !gait) return;
    const timer = setInterval(() => setPhase((p) => (p + 1 / 16) % 1), 250);
    return () => clearInterval(timer);
  }, [playing, gait]);
  const frame = gait ? gaitFrame(gait, phase) : null;
  useEffect(() => {
    if (frame) onChange(frame.motion, frame.highlight);
    else if (Object.keys(rom).length) {
      const r = Object.fromEntries(
        Object.entries(rom).map(([k, v]) => [k, rad(v ?? 0)]),
      );
      onChange({ L: r, R: {} }, []);
    } else onChange(null, []);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- frame is derived from gait and phase
  }, [gait, phase, rom]);
  const names = {
    LF: t('left fore'),
    RF: t('right fore'),
    LH: t('left hind'),
    RH: t('right hind'),
  };
  return (
    <div className="viewer-tools">
      <div className="presets" role="group" aria-label={t('Gait')}>
        {(['walk', 'trot'] as const).map((g) => (
          <button
            key={g}
            aria-pressed={gait === g}
            onClick={() => {
              setRom({});
              setGait(g);
              setPlaying(true);
            }}
          >
            {t(g === 'walk' ? 'Walk' : 'Trot')}
          </button>
        ))}
        {gait && (
          <>
            <button
              aria-pressed={playing}
              onClick={() => setPlaying((p) => !p)}
            >
              {t(playing ? 'Pause' : 'Play')}
            </button>
            <button
              onClick={() => {
                setGait(null);
                setPlaying(false);
              }}
            >
              {t('Stop')}
            </button>
          </>
        )}
      </div>
      {gait && frame && (
        <>
          <input
            aria-label={t('Stride phase')}
            type="range"
            min="0"
            max="0.9375"
            step="0.0625"
            value={phase}
            onChange={(e) => {
              setPlaying(false);
              setPhase(Number(e.target.value));
            }}
          />
          <p className="measure-readout" aria-live="polite">
            {t('Stance')}: {frame.stance.map((k) => names[k]).join(', ') || '-'}
          </p>
          <p className="muted small">
            {t(
              'Orange: muscle groups typically active in each limb phase (stance: support and propulsion; swing: limb advance). Simplified and schematic, not a measurement.',
            )}
          </p>
        </>
      )}
      <details>
        <summary>{t('Joint range of motion (left limbs)')}</summary>
        {romSliders.map(([j, lo, hi, neg, pos]) => (
          <label key={j} className="rom-row">
            <span>
              {t(jointNames[j])}: {rom[j] ?? 0}° ({t(neg)} ← → {t(pos)})
            </span>
            <input
              type="range"
              min={lo}
              max={hi}
              step="5"
              value={rom[j] ?? 0}
              onChange={(e) => {
                setGait(null);
                setPlaying(false);
                setRom((r) => ({ ...r, [j]: Number(e.target.value) }));
              }}
            />
            <small>
              {t('Reference joint angle')}: {t('flexion')} {romReference[j][0]}
              °, {t('extension')} {romReference[j][1]}°
            </small>
          </label>
        ))}
        <p className="muted small">
          {t(
            'Sliders turn the model from its standing position. Reference values: normal goniometry in Labrador Retrievers (Jaegger et al. 2002); other breeds differ. Not clinical limits.',
          )}
        </p>
        <button onClick={() => setRom({})}>{t('Reset joints')}</button>
      </details>
    </div>
  );
}
