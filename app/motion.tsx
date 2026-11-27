'use client';
// Gait player and joint range-of-motion explorer. Joint angles are schematic
// offsets from the standing model, for visualising sequence and direction; they
// are not a kinematic measurement of a real dog.
import { useEffect, useState } from 'react';
import type { Joint, Motion } from './poses';
import { type Language, translate } from './i18n';
import { type GaitKind, romMotion, romReference } from './gait';
export type GaitState = { kind: GaitKind; playing: boolean; phase?: number };

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
  onGait,
  onRom,
  stance,
  resetKey,
}: {
  language: Language;
  // The scene animates the gait itself; the controls only say what to play.
  onGait: (gait: GaitState | null) => void;
  onRom: (motion: Motion | null) => void;
  stance: string[];
  resetKey: number;
}) {
  const t = (k: string) => translate(language, k);
  const [gait, setGait] = useState<GaitKind | null>(null),
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
  const play = (kind: GaitKind | null, run: boolean, at?: number) => {
    setGait(kind);
    setPlaying(run);
    if (at !== undefined) setPhase(at);
    onGait(kind ? { kind, playing: run, phase: at } : null);
  };
  const names: Record<string, string> = {
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
              play(g, true);
            }}
          >
            {t(g === 'walk' ? 'Walk' : 'Trot')}
          </button>
        ))}
        {gait && (
          <>
            <button aria-pressed={playing} onClick={() => play(gait, !playing)}>
              {t(playing ? 'Pause' : 'Play')}
            </button>
            <button onClick={() => play(null, false)}>{t('Stop')}</button>
          </>
        )}
      </div>
      {gait && (
        <>
          <input
            aria-label={t('Stride phase')}
            type="range"
            min="0"
            max="0.99"
            step="0.01"
            value={phase}
            onChange={(e) => play(gait, false, Number(e.target.value))}
          />
          <p className="measure-readout" aria-live="polite">
            {t('Stance')}: {stance.map((k) => names[k]).join(', ') || '-'}
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
                const next = { ...rom, [j]: Number(e.target.value) };
                setRom(next);
                onGait(null);
                onRom(romMotion(next));
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
        <button
          onClick={() => {
            setRom({});
            onRom(null);
          }}
        >
          {t('Reset joints')}
        </button>
      </details>
    </div>
  );
}
