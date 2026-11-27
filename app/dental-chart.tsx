'use client';
// Dental chart with modified Triadan numbering for dog, cat, rabbit, ferret and guinea pig, plus a
// "find the tooth" drill. Quadrants: 1 upper right, 2 upper left, 3 lower left,
// 4 lower right (the animal's sides); 01 is the central incisor.
import { useState } from 'react';
import { type Language } from './i18n';
import { shuffle } from './quiz-engine';

type Species = 'dog' | 'cat' | 'rabbit' | 'ferret' | 'guinea_pig';
// Tooth positions present per arch (upper, lower), by Triadan position number.
const formula: Record<
  Species,
  { upper: number[]; lower: number[]; text: string }
> = {
  dog: {
    upper: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    lower: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    text: 'I 3/3 · C 1/1 · P 4/4 · M 2/3 = 42',
  },
  cat: {
    upper: [1, 2, 3, 4, 6, 7, 8, 9],
    lower: [1, 2, 3, 4, 7, 8, 9],
    text: 'I 3/3 · C 1/1 · P 3/2 · M 1/1 = 30',
  },
  rabbit: {
    upper: [1, 2, 6, 7, 8, 9, 10, 11],
    lower: [1, 7, 8, 9, 10, 11],
    text: 'I 2/1 · C 0/0 · P 3/2 · M 3/3 = 28',
  },
  ferret: {
    upper: [1, 2, 3, 4, 6, 7, 8, 9],
    lower: [1, 2, 3, 4, 6, 7, 8, 9, 10],
    text: 'I 3/3 · C 1/1 · P 3/3 · M 1/2 = 34',
  },
  guinea_pig: {
    upper: [1, 8, 9, 10, 11],
    lower: [1, 8, 9, 10, 11],
    text: 'I 1/1 · C 0/0 · P 1/1 · M 3/3 = 20',
  },
};
const quadrants = [
  { q: 1, upper: true, cs: 'horní pravá', en: 'upper right' },
  { q: 2, upper: true, cs: 'horní levá', en: 'upper left' },
  { q: 4, upper: false, cs: 'dolní pravá', en: 'lower right' },
  { q: 3, upper: false, cs: 'dolní levá', en: 'lower left' },
];
function toothName(sp: Species, pos: number, upper: boolean, cs: boolean) {
  const ord = (n: number) =>
    cs ? `${n}.` : ['1st', '2nd', '3rd', '4th'][n - 1];
  if (pos <= 3) {
    if (sp === 'rabbit' && pos === 2)
      return cs
        ? 'kolíkovitý řezák (2. horní)'
        : 'peg tooth (2nd upper incisor)';
    return cs ? `${ord(pos)} řezák` : `${ord(pos)} incisor`;
  }
  if (pos === 4) return cs ? 'špičák' : 'canine';
  if (pos <= 8) {
    const n = pos - 4;
    const carn =
      (sp === 'dog' || sp === 'cat' || sp === 'ferret') && upper && pos === 8;
    return (
      (cs ? `${ord(n)} premolár` : `${ord(n)} premolar`) +
      (carn ? (cs ? ' (trháč)' : ' (carnassial)') : '')
    );
  }
  const n = pos - 8;
  const carn =
    (sp === 'dog' || sp === 'cat' || sp === 'ferret') && !upper && pos === 9;
  return (
    (cs ? `${ord(n)} molár` : `${ord(n)} molar`) +
    (carn ? (cs ? ' (trháč)' : ' (carnassial)') : '')
  );
}
const code = (q: number, pos: number) => `${q}${String(pos).padStart(2, '0')}`;

export default function DentalChart({
  language,
  onClose,
}: {
  language: Language;
  onClose: (score?: number, total?: number) => void;
}) {
  const cs = language === 'cs',
    e = (en: string, c: string) => (cs ? c : en);
  const [sp, setSp] = useState<Species>('dog'),
    [picked, setPicked] = useState<string | null>(null),
    [ask, setAsk] = useState<string[]>([]),
    [score, setScore] = useState(0),
    [feedback, setFeedback] = useState(''),
    [drilled, setDrilled] = useState(false);
  const all = quadrants.flatMap(({ q, upper }) =>
    (upper ? formula[sp].upper : formula[sp].lower).map((pos) => code(q, pos)),
  );
  const describe = (c: string) => {
    const q = Number(c[0]),
      pos = Number(c.slice(1)),
      quad = quadrants.find((x) => x.q === q)!;
    return `${c} · ${cs ? quad.cs : quad.en} · ${toothName(sp, pos, quad.upper, cs)}`;
  };
  const choose = (c: string) => {
    setPicked(c);
    if (!ask.length) return;
    const ok = c === ask[0];
    setScore((s) => s + (ok ? 1 : 0));
    setFeedback(
      `${ok ? e('Correct', 'Správně') : e('That was', 'To byl')} ${describe(c)}`,
    );
    setAsk((a) => a.slice(1));
  };
  return (
    <div
      className="spotter-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={e('Dental chart', 'Zubní diagram')}
    >
      <section className="anatomy-challenge">
        <header className="challenge-heading">
          <div>
            <span className="eyebrow mint">
              {e('MODIFIED TRIADAN SYSTEM', 'MODIFIKOVANÝ TRIADANŮV SYSTÉM')}
            </span>
            <h2>{e('Dental chart', 'Zubní diagram')}</h2>
          </div>
          <button
            onClick={() =>
              onClose(drilled && !ask.length ? score : undefined, 10)
            }
          >
            {e('Close', 'Zavřít')}
          </button>
        </header>
        <div className="presets" role="group" aria-label={e('Species', 'Druh')}>
          {(['dog', 'cat', 'rabbit', 'ferret', 'guinea_pig'] as const).map(
            (s) => (
              <button
                key={s}
                aria-pressed={sp === s}
                onClick={() => {
                  setSp(s);
                  setPicked(null);
                  setAsk([]);
                  setDrilled(false);
                  setFeedback('');
                }}
              >
                {
                  {
                    dog: e('Dog', 'Pes'),
                    cat: e('Cat', 'Kočka'),
                    rabbit: e('Rabbit', 'Králík'),
                    ferret: e('Ferret', 'Fretka'),
                    guinea_pig: e('Guinea pig', 'Morče'),
                  }[s]
                }
              </button>
            ),
          )}
        </div>
        <p>
          {e('Dental formula', 'Zubní vzorec')}:{' '}
          <strong>{formula[sp].text}</strong>.{' '}
          {e(
            'The chart is drawn as if facing the animal: its right side is on your left.',
            'Diagram je kreslen při pohledu proti zvířeti: jeho pravá strana je vlevo.',
          )}
        </p>
        <div className="dental-chart">
          {quadrants.map(({ q, upper, cs: qc, en }) => (
            <div key={q} className={`dental-quadrant q${q}`}>
              <h3>
                {q}xx · {cs ? qc : en}
              </h3>
              <div className="dental-row">
                {(upper ? formula[sp].upper : formula[sp].lower)
                  .slice()
                  .sort((a, b) => (q === 1 || q === 4 ? b - a : a - b))
                  .map((pos) => {
                    const c = code(q, pos);
                    return (
                      <button
                        key={c}
                        aria-pressed={picked === c}
                        aria-label={ask.length ? `${c.slice(1)}` : describe(c)}
                        className={`tooth t${pos <= 3 ? 'i' : pos === 4 ? 'c' : pos <= 8 ? 'p' : 'm'}`}
                        onClick={() => choose(c)}
                      >
                        {ask.length ? '' : c}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <p aria-live="polite">
          {ask.length
            ? `${e('Find tooth', 'Najdi zub')} ${ask[0]}`
            : picked
              ? describe(picked)
              : ''}
        </p>
        {feedback && <p role="status">{feedback}</p>}
        <div className="presets">
          <button
            onClick={() => {
              setAsk(shuffle(all).slice(0, 10));
              setDrilled(true);
              setScore(0);
              setFeedback('');
              setPicked(null);
            }}
          >
            {e('Drill: find 10 teeth', 'Cvičení: najdi 10 zubů')}
          </button>
          {!ask.length && feedback && (
            <span>
              {e('Score', 'Skóre')}: {score} / 10
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
