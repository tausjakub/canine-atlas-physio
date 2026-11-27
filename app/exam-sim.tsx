'use client';
// Exam simulation: a timed spotter, a click-in-3D connections round, a
// misplaced-bone round and the dental drill in sequence, with a score per part.
import { useMemo, useState } from 'react';
import { type Atlas, type System } from './anatomy';
import { type Language } from './i18n';
import Spotter from './spotter';
import ClickQuiz, { connectionRounds, misplacedRounds } from './click-quiz';
import DentalChart from './dental-chart';
import { shuffle } from './quiz-engine';

const sections = [
  { cs: 'Poznávačka (10 struktur)', en: 'Spotter (10 structures)' },
  {
    cs: 'Inervace a míza (8 otázek)',
    en: 'Nerves and lymph drainage (8 questions)',
  },
  { cs: 'Kost mimo místo (5 otázek)', en: 'Misplaced bone (5 questions)' },
  { cs: 'Zubní diagram (10 zubů)', en: 'Dental chart (10 teeth)' },
];

export default function ExamSim({
  atlas,
  language,
  onClose,
}: {
  atlas: Atlas;
  language: Language;
  onClose: () => void;
}) {
  const e = (en: string, cs: string) => (language === 'cs' ? cs : en);
  const [step, setStep] = useState(-1),
    [scores, setScores] = useState<[number, number][]>([]);
  const spotIds = useMemo(
    () =>
      shuffle(
        atlas.parts
          .filter(
            (p) => ['bone', 'muscle', 'organ'].includes(p.system) && !p.sex,
          )
          .map((p) => p.id),
      ).slice(0, 10),
    [atlas],
  );
  const connections = useMemo(
    () => connectionRounds(atlas, language),
    [atlas, language],
  );
  const misplaced = useMemo(() => misplacedRounds(atlas), [atlas]);
  const done = (score?: number, total?: number) => {
    if (score === undefined) return onClose(); // closed early: leave the exam
    setScores((s) => [...s, [score, total ?? 0]]);
    setStep((n) => n + 1);
  };
  if (step === 0)
    return (
      <Spotter
        atlas={atlas}
        ids={spotIds}
        systems={['bone', 'muscle', 'organ'] as System[]}
        title={sections[0][language]}
        language={language}
        onClose={done}
      />
    );
  if (step === 1)
    return (
      <ClickQuiz
        atlas={atlas}
        rounds={connections}
        title={sections[1][language]}
        language={language}
        onClose={done}
      />
    );
  if (step === 2)
    return (
      <ClickQuiz
        atlas={atlas}
        rounds={misplaced}
        title={sections[2][language]}
        language={language}
        onClose={done}
      />
    );
  if (step === 3) return <DentalChart language={language} onClose={done} />;
  const total = scores.reduce((a, [s, t]) => [a[0] + s, a[1] + t], [0, 0]);
  return (
    <div
      className="spotter-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={e('Exam simulation', 'Simulace zkoušky')}
    >
      <section className="anatomy-challenge">
        <header className="challenge-heading">
          <div>
            <span className="eyebrow mint">
              {e('EXAM SIMULATION', 'SIMULACE ZKOUŠKY')}
            </span>
            <h2>
              {step < 0
                ? e('Four timed parts', 'Čtyři části na čas')
                : e('Results', 'Výsledky')}
            </h2>
          </div>
          <button onClick={onClose}>{e('Close', 'Zavřít')}</button>
        </header>
        <div className="challenge-intro">
          <ol>
            {sections.map((s, i) => (
              <li key={s.en}>
                {s[language]}
                {scores[i] && ` · ${scores[i][0]} / ${scores[i][1]}`}
              </li>
            ))}
          </ol>
          {step < 0 ? (
            <>
              <p>
                {e(
                  'For the dental part, press "Drill: find 10 teeth", finish it, then close the chart. Closing any part early ends the simulation.',
                  'V zubní části spusť "Cvičení: najdi 10 zubů", dokonči ho a pak diagram zavři. Předčasné zavření kterékoli části simulaci ukončí.',
                )}
              </p>
              <button className="primary" onClick={() => setStep(0)}>
                {e('Start', 'Začít')}
              </button>
            </>
          ) : (
            <h3>
              {e('Total', 'Celkem')}: {total[0]} / {total[1]}
            </h3>
          )}
        </div>
      </section>
    </div>
  );
}
