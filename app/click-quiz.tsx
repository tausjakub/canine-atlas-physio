'use client';
// Answer-by-clicking drills in 3D: "which nerve supplies this muscle?", "which
// node drains this region?" and "find the bone that is out of place".
import { useState } from 'react';
import AnatomyScene from './scene';
import {
  type Atlas,
  type Part,
  type System,
  initial,
  type SceneState,
} from './anatomy';
import { type Language } from './i18n';
import { structureName } from './study-notes';
import { shuffle } from './quiz-engine';

type Bi = { cs: string; en: string };
export type Round = {
  prompt: Bi;
  systems: System[];
  accept: (id: string) => boolean;
  answer: Bi;
  displace?: { id: string; by: number[] } | null;
};
const b = (cs: string, en: string): Bi => ({ cs, en });
// Muscle (id fragment) -> nerve (clinical-layer id stem); dog innervation.
const supply: [string, string][] = [
  ['triceps_brachii_long', 'radial'],
  ['extensor_carpi_radialis', 'radial'],
  ['flexor_carpi_radialis', 'median'],
  ['pronator_teres', 'median'],
  ['flexor_carpi_ulnaris', 'ulnar'],
  ['biceps_brachii', 'musculocutaneous'],
  ['brachialis', 'musculocutaneous'],
  ['rectus_femoris', 'femoral'],
  ['sartorius', 'femoral'],
  ['semitendinosus', 'sciatic'],
  ['semimembranosus', 'sciatic'],
  ['gastrocnemius', 'tibial'],
  ['tibialis_cranialis', 'common_peroneal'],
];
const drainage: [Bi, string][] = [
  [
    b('dutina ústní, pysky a nos', 'the oral cavity, lips and nose'),
    'mandibular',
  ],
  [
    b('krk a hrudní končetina', 'the neck and thoracic limb'),
    'superficial_cervical',
  ],
  [b('distální část pánevní končetiny', 'the distal pelvic limb'), 'popliteal'],
  [
    b(
      'kaudální břišní stěna a zevní genitál',
      'the caudal abdominal wall and external genitalia',
    ),
    'superficial_inguinal',
  ],
];
const byStem = (parts: Part[], stem: string) =>
  parts.find((p) => p.id.startsWith(stem));

export function connectionRounds(
  atlas: Atlas,
  language: Language,
  n = 8,
): Round[] {
  const muscles = atlas.parts.filter((p) => p.system === 'muscle');
  const nerveRounds = supply.flatMap(([m, nerve]) => {
    const muscle = muscles.find((p) => p.id.includes(m) && p.id.endsWith('_L'));
    const target = byStem(atlas.parts, `n_${nerve}_`);
    if (!muscle || !target) return [];
    const name = (l: Language) =>
      structureName(muscle, l).replace(/ · (vlevo|left)$/, '');
    return [
      {
        prompt: b(
          `Klikni na nerv, který inervuje: ${name('cs')}`,
          `Click the nerve that supplies the ${name('en')}`,
        ),
        systems: ['bone', 'nerve'] as System[],
        accept: (id: string) => id.startsWith(`n_${nerve}_`),
        answer: b(
          structureName(target, 'cs').replace(/ · .*$/, ''),
          structureName(target, 'en').replace(/ · .*$/, ''),
        ),
      },
    ];
  });
  const nodeRounds = drainage.flatMap(([area, node]) => {
    const target = byStem(atlas.parts, `ln_${node}_`);
    if (!target) return [];
    return [
      {
        prompt: b(
          `Klikni na uzlinu, která sbírá mízu z oblasti: ${area.cs}`,
          `Click the lymph node that drains ${area.en}`,
        ),
        systems: ['bone', 'lymph'] as System[],
        accept: (id: string) => id.startsWith(`ln_${node}_`),
        answer: b(
          structureName(target, 'cs').replace(/ · .*$/, ''),
          structureName(target, 'en').replace(/ · .*$/, ''),
        ),
      },
    ];
  });
  void language;
  return shuffle([...nerveRounds, ...nodeRounds]).slice(0, n);
}

export function misplacedRounds(atlas: Atlas, n = 5): Round[] {
  const bones = atlas.parts.filter((p) => {
    if (p.system !== 'bone') return false;
    const d = p.bounds[1].map((v, i) => v - p.bounds[0][i]);
    return (
      Math.hypot(...d) > 0.07 &&
      !/^(Ribcage|MergedSkull|Pelvis|Sacrum)$/.test(p.id)
    );
  });
  return shuffle(bones)
    .slice(0, n)
    .map((p) => {
      const a = Math.random() * Math.PI * 2;
      return {
        prompt: b(
          'Klikni na kost, která je mimo své místo.',
          'Click the bone that is out of place.',
        ),
        systems: ['bone'] as System[],
        accept: (id: string) => id === p.id,
        answer: b(structureName(p, 'cs'), structureName(p, 'en')),
        displace: {
          id: p.id,
          by: [Math.cos(a) * 0.09, 0.05 + Math.sin(a) * 0.04, -0.08],
        },
      };
    });
}

export default function ClickQuiz({
  atlas,
  rounds,
  title,
  language,
  onClose,
}: {
  atlas: Atlas;
  rounds: Round[];
  title: string;
  language: Language;
  onClose: (score?: number, total?: number) => void;
}) {
  const e = (en: string, cs: string) => (language === 'cs' ? cs : en);
  const [i, setI] = useState(0),
    [score, setScore] = useState(0),
    [result, setResult] = useState<boolean | null>(null);
  const round = rounds[i];
  const stateFor = (r: Round | undefined, reset = 0): SceneState => ({
    ...initial,
    systems: r?.systems ?? ['bone'],
    displace: r?.displace ?? null,
    reset,
  });
  const [scene, setScene] = useState<SceneState>(stateFor(rounds[0]));
  const pick = (id: string) => {
    if (!round || result !== null) return;
    const ok = round.accept(id);
    setScene((s) => ({ ...s, selected: id }));
    setResult(ok);
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    setI(i + 1);
    setResult(null);
    setScene((s) => stateFor(rounds[i + 1], s.reset + 1));
  };
  return (
    <div
      className="spotter-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <section className="anatomy-challenge">
        <header className="challenge-heading">
          <div>
            <span className="eyebrow mint">
              {e('CLICK IN 3D', 'KLIKNI VE 3D')}
            </span>
            <h2>{title}</h2>
          </div>
          <button onClick={() => onClose()}>{e('Close', 'Zavřít')}</button>
        </header>
        {!round ? (
          <div className="challenge-intro">
            <h3>
              {e('Round complete', 'Kolo dokončeno')}: {score} / {rounds.length}
            </h3>
            <button onClick={() => onClose(score, rounds.length)}>
              {e('Done', 'Hotovo')}
            </button>
          </div>
        ) : (
          <div className="challenge-layout">
            <div className="challenge-model">
              <AnatomyScene
                atlas={atlas}
                state={scene}
                language={language}
                onSelect={pick}
              />
            </div>
            <div className="challenge-panel">
              <p className="muted">
                {i + 1} / {rounds.length}
              </p>
              <h3>{round.prompt[language]}</h3>
              {result !== null && (
                <>
                  <p role="status" className={result ? 'spot-ok' : 'spot-miss'}>
                    {result
                      ? e('Correct.', 'Správně.')
                      : e('Not quite. Answer:', 'Ne úplně. Odpověď:')}{' '}
                    {round.answer[language]}
                  </p>
                  <button onClick={next}>{e('Next', 'Další')}</button>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
