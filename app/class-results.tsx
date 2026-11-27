'use client';
// Private edition: the cohort's anonymous spotter results per structure, most
// missed first. Data come from the gate's /_api/results aggregate.
import { useEffect, useState } from 'react';
import { type Atlas } from './anatomy';
import { type Language } from './i18n';
import { structureName } from './study-notes';
import { sitePath } from './site-path';

export default function ClassResults({
  atlas,
  language,
  onClose,
}: {
  atlas: Atlas;
  language: Language;
  onClose: () => void;
}) {
  const e = (en: string, cs: string) => (language === 'cs' ? cs : en);
  const [rows, setRows] = useState<[string, number, number][] | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    fetch(sitePath('/_api/results'))
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Record<string, [number, number]>>)
          : Promise.reject(new Error('unavailable')),
      )
      .then((agg) =>
        setRows(
          Object.entries(agg)
            .map(
              ([id, [right, wrong]]) =>
                [id, right, wrong] as [string, number, number],
            )
            .sort(
              (a, b) =>
                b[2] / (b[1] + b[2]) - a[2] / (a[1] + a[2]) || b[2] - a[2],
            ),
        ),
      )
      .catch(() => setError(true));
  }, []);
  const name = (id: string) => {
    const p = atlas.parts.find((x) => x.id === id);
    return p ? structureName(p, language) : id;
  };
  return (
    <div
      className="spotter-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={e('Class results', 'Výsledky skupiny')}
    >
      <section className="anatomy-challenge">
        <header className="challenge-heading">
          <div>
            <span className="eyebrow mint">
              {e('ANONYMOUS · OPT-IN', 'ANONYMNĚ · DOBROVOLNĚ')}
            </span>
            <h2>{e('Class results', 'Výsledky skupiny')}</h2>
          </div>
          <button onClick={onClose}>{e('Close', 'Zavřít')}</button>
        </header>
        {error ? (
          <p>
            {e(
              'Class results are not configured for this course.',
              'Výsledky skupiny nejsou pro tento kurz nastaveny.',
            )}
          </p>
        ) : !rows ? (
          <p>{e('Loading…', 'Načítám…')}</p>
        ) : !rows.length ? (
          <p>
            {e(
              'No results have been shared yet.',
              'Zatím nikdo nesdílel výsledky.',
            )}
          </p>
        ) : (
          <table className="class-table">
            <thead>
              <tr>
                <th>{e('Structure', 'Struktura')}</th>
                <th>{e('Correct', 'Správně')}</th>
                <th>{e('Missed', 'Chybně')}</th>
                <th>{e('Missed %', 'Chybně %')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, right, wrong]) => (
                <tr key={id}>
                  <td>{name(id)}</td>
                  <td>{right}</td>
                  <td>{wrong}</td>
                  <td>{Math.round((100 * wrong) / (right + wrong))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
