'use client';
// Labelled sheet / region handout: snapshots of the viewer with numbered
// structures and a key, shown over the app and printable from there.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';

export type SheetFigure = {
  image: string;
  marks: { x: number; y: number; name: string; latin?: string }[];
};

export default function SheetDialog({
  title,
  figures,
  labels,
  onClose,
}: {
  title: string;
  figures: SheetFigure[];
  labels: {
    print: string;
    hideKey: string;
    showKey: string;
    close: string;
    note: string;
  };
  onClose: () => void;
}) {
  const [keyShown, setKeyShown] = useState(true);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return createPortal(
    <div className="sheet-backdrop">
      <div
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="sheet-bar">
          <h2>{title}</h2>
          <div>
            <button onClick={() => setKeyShown((k) => !k)}>
              {keyShown ? labels.hideKey : labels.showKey}
            </button>
            <button onClick={() => window.print()}>
              <Printer size={15} /> {labels.print}
            </button>
            <button aria-label={labels.close} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </header>
        {figures.map((f, k) => (
          <section key={k} className="sheet-figure">
            <figure>
              {/* oxlint-disable-next-line nextjs/no-img-element -- a canvas snapshot data URL */}
              <img src={f.image} alt="" />
              {f.marks.map((m, i) => (
                <b
                  key={i}
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                >
                  {i + 1}
                </b>
              ))}
            </figure>
            {keyShown && (
              <ol>
                {f.marks.map((m, i) => (
                  <li key={i}>
                    {m.name}
                    {m.latin && <i> {m.latin}</i>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
        <p className="sheet-note">{labels.note}</p>
      </div>
    </div>,
    document.body,
  );
}
