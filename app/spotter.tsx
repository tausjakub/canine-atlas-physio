'use client';
// Timed practical spotter: a structure is pinned in 3D and the student types its
// name (Czech, English or Latin). Results feed Leitner spaced-repetition boxes
// kept in localStorage, so missed structures come back sooner.
import { useEffect, useMemo, useState } from 'react';
import AnatomyScene from './scene';
import { type Atlas, type System, initial, type SceneState } from './anatomy';
import { type Language, normalizeSearch } from './i18n';
import { structureName } from './study-notes';
import { latinName } from './latin';

export const srsKey = 'canine-atlas-spotter-v1';
export type Boxes = Record<string, { box: number; due: number }>;
const DAY = 86400000,
  intervals = [0, 0, 1, 3, 7, 14]; // days until the next review, by box (box 1: now)
export function readBoxes(raw: string | null): Boxes {
  try {
    const v = JSON.parse(raw || '{}');
    const out: Boxes = {};
    for (const [id, b] of Object.entries(v ?? {}) as [string, Boxes[string]][])
      if (
        typeof id === 'string' &&
        id.length < 120 &&
        Number.isInteger(b?.box) &&
        b.box >= 1 &&
        b.box <= 5 &&
        Number.isFinite(b.due)
      )
        out[id] = { box: b.box, due: b.due };
    return out;
  } catch {
    return {};
  }
}
export function review(
  boxes: Boxes,
  id: string,
  correct: boolean,
  now = Date.now(),
): Boxes {
  const box = correct ? Math.min(5, (boxes[id]?.box ?? 0) + 1) : 1;
  return { ...boxes, [id]: { box, due: now + intervals[box] * DAY } };
}
export function dueIds(boxes: Boxes, now = Date.now()) {
  return Object.entries(boxes)
    .filter(([, b]) => b.due <= now)
    .map(([id]) => id);
}
function distance(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(
        d[j] + 1,
        d[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = t;
    }
  }
  return d[b.length];
}
const clean = (s: string) =>
  normalizeSearch(s)
    .replace(/ · (vlevo|vpravo|left|right).*$/, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** Accept any of the Czech, English or Latin names, allowing small typos; side is not required. */
export function matches(answer: string, names: string[]) {
  const a = clean(answer);
  if (a.length < 3) return false;
  return names
    .map(clean)
    .some(
      (n) =>
        n &&
        (n === a ||
          distance(a, n) <= Math.max(1, Math.floor(n.length / 7)) ||
          (n.startsWith(a) && a.length >= n.length * 0.6)),
    );
}

export default function Spotter({
  atlas,
  ids,
  systems,
  title,
  language,
  onClose,
}: {
  atlas: Atlas;
  ids: string[];
  systems: System[];
  title: string;
  language: Language;
  onClose: () => void;
}) {
  const e = (en: string, cs: string) => (language === 'cs' ? cs : en);
  const deck = useMemo(
    () => ids.filter((id) => atlas.parts.some((p) => p.id === id)),
    [ids, atlas],
  );
  const [index, setIndex] = useState(0),
    [answer, setAnswer] = useState(''),
    [result, setResult] = useState<boolean | null>(null),
    [score, setScore] = useState(0),
    [left, setLeft] = useState(45);
  const target = atlas.parts.find((p) => p.id === deck[index]);
  const [scene, setScene] = useState<SceneState>({
    ...initial,
    systems: [...new Set<System>([...systems, target?.system ?? 'bone'])],
    selected: deck[0] ?? null,
    sex: atlas.parts.find((p) => p.id === deck[0])?.sex ?? 'male',
    focusSelected: true,
  });
  const names = target
    ? [
        structureName(target, 'en'),
        structureName(target, 'cs'),
        latinName(target) ?? '',
      ]
    : [];
  const check = (timedOut = false) => {
    if (!target || result !== null) return;
    const ok = !timedOut && matches(answer, names);
    setResult(ok);
    if (ok) setScore((s) => s + 1);
    try {
      localStorage.setItem(
        srsKey,
        JSON.stringify(
          review(readBoxes(localStorage.getItem(srsKey)), target.id, ok),
        ),
      );
    } catch {}
  };
  useEffect(() => {
    if (result !== null || !target) return;
    if (left <= 0) {
      // oxlint-disable-next-line react/react-compiler -- the timer running out ends the item
      check(true);
      return;
    }
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  });
  const next = () => {
    const i = index + 1;
    setIndex(i);
    setAnswer('');
    setResult(null);
    setLeft(45);
    const p = atlas.parts.find((x) => x.id === deck[i]);
    if (p)
      setScene((s) => ({
        ...s,
        systems: [...new Set<System>([...systems, p.system])],
        selected: p.id,
        sex: p.sex ?? s.sex,
        reset: s.reset + 1,
      }));
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
              {e('PRACTICAL SPOTTER', 'PRAKTICKÝ POZNÁVACÍ TEST')}
            </span>
            <h2>{title}</h2>
          </div>
          <button onClick={onClose}>{e('Close', 'Zavřít')}</button>
        </header>
        {!deck.length ? (
          <div className="challenge-intro">
            <p>
              {e(
                'Nothing to practise here yet.',
                'Zatím zde není co procvičovat.',
              )}
            </p>
          </div>
        ) : index >= deck.length ? (
          <div className="challenge-intro">
            <h3>
              {e('Round complete', 'Kolo dokončeno')}: {score} / {deck.length}
            </h3>
            <p className="muted">
              {e(
                'Missed structures return in your review queue sooner; correct ones are spaced out over days.',
                'Chybné struktury se vrátí k opakování dříve; správné se rozloží do dalších dnů.',
              )}
            </p>
            <button onClick={onClose}>{e('Done', 'Hotovo')}</button>
          </div>
        ) : (
          <div className="challenge-layout">
            <div className="challenge-model">
              <AnatomyScene
                atlas={atlas}
                state={scene}
                language={language}
                onSelect={() => {}}
              />
            </div>
            <div className="challenge-panel">
              <p className="muted">
                {index + 1} / {deck.length} · {e('time', 'čas')} {left} s
              </p>
              <h3>
                {e(
                  'Name the highlighted structure',
                  'Pojmenuj zvýrazněnou strukturu',
                )}
              </h3>
              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (result === null) check();
                  else next();
                }}
              >
                <input
                  aria-label={e('Your answer', 'Tvoje odpověď')}
                  value={answer}
                  disabled={result !== null}
                  autoFocus
                  onChange={(ev) => setAnswer(ev.target.value)}
                  placeholder={e(
                    'Czech, English or Latin name',
                    'Český, anglický nebo latinský název',
                  )}
                />
                <button type="submit">
                  {result === null ? e('Check', 'Ověřit') : e('Next', 'Další')}
                </button>
              </form>
              {result !== null && (
                <p role="status" className={result ? 'spot-ok' : 'spot-miss'}>
                  {result
                    ? e('Correct.', 'Správně.')
                    : e('Not quite.', 'Ne úplně.')}{' '}
                  {structureName(target!, language)}
                  {latinName(target!) && <em> · {latinName(target!)}</em>}
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
