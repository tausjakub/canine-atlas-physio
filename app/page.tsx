'use client';
import { sitePath } from './site-path';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Bone,
  Layers3,
  Search,
  RotateCcw,
  RotateCw,
  Focus,
  EyeOff,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  X,
  Dog,
  Info,
  Link2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnatomyScene, { type SceneTools, type Snapshot } from './scene';
import PoseControls from './pose-controls';
import { SpeciesPicker, type Species } from './species-atlas';
import ThemePicker from './theme-picker';
import type { DogPose } from './poses';
import ExamStudy from './exam-study';
import PracticalStudy from './practical-study';
import PrivateSession from './private-session';
import { libraryEnabled, privateEdition } from './edition';
// Private-only views are split out so the public demo bundle never contains them.
// The inline process.env checks are replaced at build time (vite.config.ts) so the
// bundler can drop the dynamic imports entirely.
const Library =
  process.env.NEXT_PUBLIC_ATLAS_LIBRARY !== '0'
    ? lazy(() => import('./library'))
    : () => null;
const ClassResults =
  process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0'
    ? lazy(() => import('./class-results'))
    : () => null;
const DornMovementStudy =
  process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0'
    ? lazy(() => import('./dorn-movement'))
    : () => null;
import BookReading from './book-reading';
import AnatomyChallenge from './anatomy-challenge';
import { addLigaments, ligamentCount } from './ligaments';
import { latinName } from './latin';
import Spotter, { srsKey, readBoxes, dueIds } from './spotter';
import DentalChart from './dental-chart';
import MotionControls from './motion';
import ClickQuiz, {
  type Round,
  connectionRounds,
  misplacedRounds,
} from './click-quiz';
import ExamSim from './exam-sim';
import { tours } from './tours';
import { mnemonicFor } from './mnemonics';
import { shuffle } from './quiz-engine';
import { detailFor, noteCoverage, structureName } from './study-notes';
import {
  type Atlas,
  type SceneState,
  type System,
  initial,
  systems,
  displayName,
  region,
  notes,
  isShown,
} from './anatomy';
import {
  type Language,
  translate,
  normalizeSearch,
  languageStorageKey,
} from './i18n';
import cardsCs from './cards.cs.json';
// Organ and clinical layers ship as separate packs (own binaries) merged into
// each species atlas; a missing pack just leaves that layer out.
function extraParts(dir: string, signal: AbortSignal) {
  return Promise.all(
    ['organs', 'clinical'].map((layer) =>
      fetch(sitePath(`${dir}/${layer}/catalog.json`), { signal })
        .then((r) => (r.ok ? (r.json() as Promise<Atlas>) : null))
        .catch((e) => {
          if (e.name === 'AbortError') throw e;
          return null;
        }),
    ),
  ).then((packs) => packs.flatMap((a) => a?.parts ?? []));
}

const cameraViews = ['lateral', 'right', 'cranial', 'dorsal', 'three-quarter'];

export default function Home() {
  const [examTarget, setExamTarget] = useState<{
    topic: string;
    criterion: string;
    screen?: 'lessons' | 'topics' | 'exam-day' | 'plan';
  } | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const t = (key: string, values: Record<string, string | number> = {}) =>
    translate(language, key, values);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(languageStorageKey);
      // oxlint-disable-next-line react/react-compiler -- hydrate browser-only state after mount (static export)
      if (saved === 'cs' || saved === 'en') setLanguage(saved);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = translate(language, 'Canine Atlas · Anatomy for movement');
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        translate(
          language,
          'Explore canine bones and muscles in 3D and study movement anatomy for canine physiotherapy.',
        ),
      );
  }, [language]);
  const changeLanguage = (value: Language) => {
    setLanguage(value);
    try {
      localStorage.setItem(languageStorageKey, value);
    } catch {}
  };
  const [atlas, setAtlas] = useState<Atlas | null>(null),
    [state, setState] = useState<SceneState>(initial),
    [query, setQuery] = useState(''),
    [area, setArea] = useState('All regions'),
    [error, setError] = useState(''),
    [tab, setTab] = useState<
      'explore' | 'study' | 'exam' | 'library' | 'practical' | 'dorn'
    >('explore'),
    [about, setAbout] = useState(false),
    [mobile, setMobile] = useState(false),
    [revealed, setRevealed] = useState(false),
    [card, setCard] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // oxlint-disable-next-line react/react-compiler -- hydrate browser-only state after mount (static export)
    if (libraryEnabled && params.has('book')) setTab('library');
    else if (libraryEnabled && params.get('view') === 'library')
      setTab('library');
    else if (privateEdition && params.get('view') === 'dorn') setTab('dorn');
    else if (params.get('view') === 'practical') setTab('practical');
    else if (params.get('view') === 'plan') {
      setExamTarget({ topic: 'anatomy', criterion: '', screen: 'plan' });
      setTab('exam');
    } else if (params.get('view') === 'exam-day') {
      setExamTarget({ topic: 'anatomy', criterion: '', screen: 'exam-day' });
      setTab('exam');
    } else if (params.get('view') === 'exam') setTab('exam');
    else if (params.get('view') === 'topics') {
      setExamTarget({ topic: 'anatomy', criterion: '', screen: 'topics' });
      setTab('exam');
    }
  }, []);
  const [challenge, setChallenge] = useState(false);
  const [species, setSpecies] = useState<Species>('dog');
  const [spotter, setSpotter] = useState<{
    ids: string[];
    title: string;
    systems: System[];
  }>();
  const [pendingQuiz, setPendingQuiz] = useState<string[]>();
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('species');
    if (
      value === 'cat' ||
      value === 'rabbit' ||
      value === 'ferret' ||
      value === 'guinea_pig'
    ) {
      // oxlint-disable-next-line react/react-compiler -- read the URL after mount (static export)
      setSpecies(value);
      setTab('explore');
    }
    // Deep link to a view: ?part=&layers=&sex=&pose=&cam= (written back below).
    const params = new URLSearchParams(window.location.search);
    const layers = (params.get('layers') ?? '')
      .split(',')
      .filter((x): x is System => systems.some((sys) => sys.id === x));
    const pose = params.get('pose'),
      cam = params.get('cam'),
      part = params.get('part');
    // Instructor pins: ?pins=[[x,y,z,"text"],...]
    let pins: { at: number[]; text: string }[] = [];
    try {
      const raw = JSON.parse(params.get('pins') || '[]');
      if (Array.isArray(raw))
        pins = raw
          .filter(
            (p) =>
              Array.isArray(p) &&
              p.length === 4 &&
              p
                .slice(0, 3)
                .every((v) => Number.isFinite(v) && Math.abs(v) < 5) &&
              typeof p[3] === 'string',
          )
          .slice(0, 20)
          .map((p) => ({
            at: p.slice(0, 3),
            text: String(p[3]).slice(0, 140),
          }));
    } catch {}
    setState((s) => ({
      ...s,
      ...(layers.length ? { systems: layers } : {}),
      ...(params.get('sex') === 'female' ? { sex: 'female' as const } : {}),
      ...(pose === 'sitting' || pose === 'lying' ? { pose } : {}),
      ...(cam && cameraViews.includes(cam) ? { view: cam } : {}),
      ...(part ? { selected: part } : {}),
      ...(pins.length ? { pins } : {}),
    }));
    // Instructor quiz set: ?quiz=id1,id2,... opens the spotter on those structures.
    const quiz = (params.get('quiz') ?? '')
      .split(',')
      .filter((id) => /^[\w().-]{1,80}$/.test(id))
      .slice(0, 60);
    if (quiz.length) setPendingQuiz(quiz);
    if (part || layers.length || quiz.length) setTab('explore');
  }, []);
  useEffect(() => {
    if (tab !== 'explore') return;
    const url = new URL(window.location.href);
    const put = (key: string, value: string | null) =>
      value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    put('part', state.selected);
    put('layers', state.systems.join(','));
    put('sex', state.sex === 'female' ? 'female' : null);
    put('pose', state.pose && state.pose !== 'standing' ? state.pose : null);
    put('cam', state.view !== 'lateral' ? state.view : null);
    put(
      'pins',
      state.pins?.length
        ? JSON.stringify(state.pins.map((p) => [...p.at, p.text]))
        : null,
    );
    window.history.replaceState(null, '', url);
  }, [
    tab,
    state.selected,
    state.systems,
    state.sex,
    state.pose,
    state.view,
    state.pins,
  ]);
  const [copied, setCopied] = useState(false);
  // Learning tools: spotter rounds, a shareable quiz set, per-structure notes.
  const [quizSet, setQuizSet] = useState<string[]>([]);
  const [myNotes, setMyNotes] = useState<Record<string, string>>({});
  const [due, setDue] = useState<string[]>([]);
  const [dental, setDental] = useState(false);
  const [offline, setOffline] = useState('');
  useEffect(() => {
    // Offline support for the public demo only; the private edition stays online behind its gate.
    if (
      process.env.NODE_ENV === 'production' &&
      !privateEdition &&
      'serviceWorker' in navigator
    )
      navigator.serviceWorker.register(sitePath('/sw.js')).catch(() => {});
  }, []);
  // Fetch every model pack once so the service worker caches it for offline use.
  const saveOffline = async () => {
    setOffline(t('Saving…'));
    const files = ['', '/cat', '/rabbit'].flatMap((dir) =>
      ['', '/organs', '/clinical'].flatMap((layer) => [
        `/models${dir}${layer}/catalog.json`,
        `/models${dir}${layer}/anatomy.bin`,
      ]),
    );
    try {
      await Promise.all(
        files.map((f) => fetch(sitePath(f)).then((r) => r.arrayBuffer())),
      );
      setOffline(t('Saved for offline use in this browser.'));
    } catch {
      setOffline(t('Could not save everything; try again online.'));
    }
  };
  const [compare, setCompare] = useState(false);
  useEffect(() => {
    try {
      // oxlint-disable-next-line react/react-compiler -- read saved study data after mount (static export)
      setDue(dueIds(readBoxes(localStorage.getItem(srsKey))));
      const set = JSON.parse(
        localStorage.getItem('canine-atlas-quizset-v1') || '[]',
      );
      if (Array.isArray(set))
        setQuizSet(set.filter((x) => typeof x === 'string').slice(0, 60));
      const n = JSON.parse(
        localStorage.getItem('canine-atlas-notes-v1') || '{}',
      );
      if (n && typeof n === 'object' && !Array.isArray(n))
        setMyNotes(
          Object.fromEntries(
            Object.entries(n).filter(([, v]) => typeof v === 'string'),
          ) as Record<string, string>,
        );
    } catch {}
  }, [spotter]);
  const saveSet = (next: string[]) => {
    setQuizSet(next);
    try {
      localStorage.setItem('canine-atlas-quizset-v1', JSON.stringify(next));
    } catch {}
  };
  const saveNote = (id: string, text: string) => {
    const next = { ...myNotes, [id]: text };
    if (!text.trim()) delete next[id];
    setMyNotes(next);
    try {
      localStorage.setItem('canine-atlas-notes-v1', JSON.stringify(next));
    } catch {}
  };
  const exportNotes = () => {
    const lines = Object.entries(myNotes).map(([id, text]) => {
      const part = view?.parts.find((p) => p.id === id);
      return `## ${part ? structureName(part, language) : id}\n\n${text.trim()}\n`;
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([`# ${t('My anatomy notes')}\n\n${lines.join('\n')}`], {
        type: 'text/markdown',
      }),
    );
    a.download = 'canine-atlas-notes.md';
    a.click();
  };
  const copyQuizLink = () => {
    const url = new URL(window.location.href);
    for (const k of ['part', 'cam', 'pose', 'sex']) url.searchParams.delete(k);
    url.searchParams.set('quiz', quizSet.join(','));
    url.searchParams.set('layers', state.systems.join(','));
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
  };
  const copyLink = () =>
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  const otherSpecies = tab === 'explore' && species !== 'dog';
  // Cat and rabbit catalogs load on first use and render in the same explorer.
  const [speciesAtlas, setSpeciesAtlas] = useState<
    Partial<Record<Species, Atlas>>
  >({});
  useEffect(() => {
    // The comparative view needs every species; otherwise only the chosen one.
    const wanted = (compare ? (['cat', 'rabbit'] as const) : [species]).filter(
      (sp) => sp !== 'dog' && !speciesAtlas[sp],
    );
    if (!wanted.length) return;
    const abort = new AbortController();
    for (const sp of wanted)
      fetch(sitePath(`/models/${sp}/catalog.json`), { signal: abort.signal })
        .then((r) => {
          if (!r.ok) throw Error('The anatomy catalogue could not be loaded.');
          return r.json();
        })
        .then(async (data) => {
          const extra = await extraParts(`/models/${sp}`, abort.signal);
          const a = data as Atlas;
          setSpeciesAtlas((all) => ({
            ...all,
            [sp]: { ...a, parts: [...a.parts, ...extra] },
          }));
        })
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message);
        });
    return () => abort.abort();
  }, [species, speciesAtlas, compare]);
  const view = otherSpecies ? (speciesAtlas[species] ?? null) : atlas;
  useEffect(() => {
    if (!view || !pendingQuiz) return;
    // oxlint-disable-next-line react/react-compiler -- open the shared quiz once its atlas has loaded
    setSpotter({ ids: pendingQuiz, title: 'Quiz set', systems: ['bone'] });
    setPendingQuiz(undefined);
  }, [view, pendingQuiz]);
  const layerCount = Math.max(
    -1,
    ...(view?.parts.map((p) => (p as { layer?: number }).layer ?? -1) ?? [-1]),
  );
  const [peel, setPeel] = useState(0);
  const presentSystems = systems.filter((sys) =>
    view ? view.parts.some((p) => p.system === sys.id) : true,
  );
  // Panes size themselves with --header-h; the header wraps differently per width.
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = header.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--header-h',
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const search = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    inspector = useRef<HTMLElement>(null);
  useEffect(() => {
    inspector.current?.scrollTo({ top: 0 });
  }, [state.selected, tab]);
  useEffect(() => {
    const abort = new AbortController();
    fetch(sitePath('/models/catalog.json'), { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw Error('The anatomy catalogue could not be loaded.');
        return r.json();
      })
      .then(async (data) => {
        const extra = await extraParts('/models', abort.signal);
        const dog = data as Atlas;
        setAtlas(addLigaments({ ...dog, parts: [...dog.parts, ...extra] }));
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (about) dialog.current?.showModal();
    else dialog.current?.close();
  }, [about]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobile(false);
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setMobile(true);
        search.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const selected = view?.parts.find((p) => p.id === state.selected),
    note = selected ? detailFor(selected, language) : undefined;
  // Plain computation: the React compiler memoizes it.
  const results =
    view?.parts
      .filter(
        (p) =>
          (area === 'All regions' || region(p) === area) &&
          (!query ||
            normalizeSearch(
              `${structureName(p, 'en')} ${structureName(p, 'cs')} ${latinName(p) ?? ''} ${displayName(p.id)} ${p.id} ${translate(language, systems.find((s) => s.id === p.system)!.name)}`,
            ).includes(normalizeSearch(query))),
      )
      .sort((a, b) =>
        structureName(a, language).localeCompare(
          structureName(b, language),
          language,
        ),
      ) || [];
  const count = view?.parts.filter((p) => isShown(p, state)).length || 0;
  const choose = (id: string) => {
    setState((s) => ({
      ...s,
      selected: id,
      isolate: false,
      hidden: s.hidden.filter((h) => h !== id),
      rotate: false,
      sex: view?.parts.find((p) => p.id === id)?.sex ?? s.sex,
    }));
    setMobile(false);
  };
  const [motionReset, setMotionReset] = useState(0);
  const [stance, setStance] = useState<string[]>([]);
  const [drill, setDrill] = useState<{ title: string; rounds: Round[] }>();
  const [classView, setClassView] = useState(false);
  // Private edition: opt-in anonymous spotter results for the course dashboard.
  const shareResults =
    process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0'
      ? (results: { id: string; ok: boolean }[]) =>
          fetch(sitePath('/_api/results'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results }),
          })
            .then((r) => r.ok)
            .catch(() => false)
      : undefined;
  const [exam, setExam] = useState(false);
  const [tour, setTour] = useState<{ id: string; step: number }>();
  const [pinText, setPinText] = useState('');
  const [pendingPin, setPendingPin] = useState<number[]>();
  const [brand, setBrand] = useState<{ name: string; logo?: string }>();
  // Muscle attachment points computed from the dog model (contact with bone).
  const [attach, setAttach] =
    useState<
      Record<string, { a: number[]; ab: string; b: number[]; bb: string }>
    >();
  useEffect(() => {
    fetch(sitePath('/models/attachments.json'))
      .then((r) => (r.ok ? r.json() : undefined))
      .then((a) => setAttach(a as typeof attach))
      .catch(() => {});
  }, []);
  useEffect(() => {
    // Course branding for licensed cohorts: /branding.json, private edition only.
    if (process.env.NEXT_PUBLIC_ATLAS_PRIVATE === '0') return;
    fetch(sitePath('/branding.json'))
      .then(
        (r) =>
          (r.ok ? r.json() : null) as Promise<{
            name?: unknown;
            logo?: unknown;
            accent?: unknown;
          } | null>,
      )
      .then(
        (b: { name?: unknown; logo?: unknown; accent?: unknown } | null) => {
          if (!b || typeof b.name !== 'string') return;
          setBrand({
            name: b.name.slice(0, 80),
            logo:
              typeof b.logo === 'string' && /^\/[\w./-]+$/.test(b.logo)
                ? b.logo
                : undefined,
          });
          if (typeof b.accent === 'string' && /^#[0-9a-f]{6}$/i.test(b.accent))
            document.documentElement.style.setProperty(
              '--brand-accent',
              b.accent,
            );
        },
      )
      .catch(() => {});
  }, []);
  const selectedPart = view?.parts.find((p) => p.id === state.selected);
  const attachment =
    !otherSpecies && selectedPart?.system === 'muscle'
      ? attach?.[selectedPart.id]
      : undefined;
  const limbMuscle =
    !!selectedPart && ['Forelimb', 'Hindlimb'].includes(region(selectedPart));
  // Shown on the standing, assembled model only (they do not follow poses).
  const attachMarks =
    attachment &&
    (state.pose ?? 'standing') === 'standing' &&
    !state.motion &&
    !state.explode
      ? [
          { at: attachment.a, text: limbMuscle ? 'O' : 'A' },
          { at: attachment.b, text: limbMuscle ? 'I' : 'B' },
        ]
      : undefined;
  const boneName = (id: string) => {
    const part = view?.parts.find((p) => p.id === id);
    return part ? structureName(part, language) : id;
  };
  const tourStep = tour
    ? tours.find((x) => x.id === tour.id)?.steps[tour.step]
    : undefined;
  const endTour = () => {
    setTour(undefined);
    setState((st) => ({ ...st, section: null }));
  };
  const goTour = (id: string, step: number) => {
    const s = tours.find((x) => x.id === id)?.steps[step];
    if (!s) return endTour();
    setTour({ id, step });
    setState((st) => ({
      ...st,
      systems: s.systems,
      selected:
        s.part && view?.parts.some((p) => p.id === s.part) ? s.part : null,
      view: s.view ?? 'lateral',
      section: s.section ?? null,
      isolate: false,
      explode: 0,
      reset: st.reset + 1,
    }));
  };
  // Flashcards for Anki: tab-separated front and back for the visible structures.
  const exportFlashcards = () => {
    if (!view) return;
    const clean = (s: string) => s.replace(/[\t\r\n]+/g, ' ').trim();
    const rows = view.parts
      .filter((p) => isShown(p, { ...state, selected: null }))
      .flatMap((p) => {
        try {
          const n = detailFor(p, language);
          const latin = latinName(p);
          return [
            [
              clean(structureName(p, language) + (latin ? ` (${latin})` : '')),
              clean(
                [n.location, n.function, n.recall].filter(Boolean).join('<br>'),
              ),
            ].join('\t'),
          ];
        } catch {
          return [];
        }
      });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob([`#separator:tab\n#html:true\n${rows.join('\n')}\n`], {
        type: 'text/tab-separated-values',
      }),
    );
    a.download = `canine-atlas-${otherSpecies ? species : 'dog'}-${language}.txt`;
    a.click();
  };
  const changePose = (pose: DogPose) => {
    setMotionReset((n) => n + 1);
    setState((s) => ({
      ...s,
      motion: null,
      gait: null,
      highlight: [],
      pose,
      selected: null,
      isolate: false,
      hidden: [],
      explode: 0,
      rotate: false,
      reset: s.reset + 1,
    }));
  };
  const sceneTools = useRef<SceneTools | null>(null);
  const [measureText, setMeasureText] = useState('');
  // Printable sheet: the current view with numbered structures and a key.
  const printSheet = () => {
    const snap = sceneTools.current?.snapshot();
    if (snap) openSheet([snap], t('Labelled sheet'));
  };
  // Region handout: lateral, cranial and dorsal views, each with its own key.
  const printHandout = () => {
    const tools = sceneTools.current;
    if (!tools) return;
    openSheet(
      ['lateral', 'cranial', 'dorsal'].map((v) => tools.snapshot(v)),
      `${t('Region handout')}: ${t(area)}`,
    );
  };
  const openSheet = (snaps: Snapshot[], title: string) => {
    if (!view) return;
    const name = (id: string) => {
      const part = view.parts.find((p) => p.id === id);
      return part ? structureName(part, language) : id;
    };
    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const figures = snaps
      .map((snap) => {
        const marks = snap.marks
          .map(
            (m, i) =>
              `<b style="left:${(m.x * 100).toFixed(2)}%;top:${(m.y * 100).toFixed(2)}%">${i + 1}</b>`,
          )
          .join('');
        const key = snap.marks
          .map((m) => {
            const part = view.parts.find((p) => p.id === m.id);
            const latin = part && latinName(part);
            return `<li>${esc(name(m.id))}${latin ? ` <i>${esc(latin)}</i>` : ''}</li>`;
          })
          .join('');
        return `<figure><img src="${snap.image}" alt="">${marks}</figure><ol>${key}</ol>`;
      })
      .join('');
    const html = `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:14px sans-serif;margin:24px;color:#111}figure{position:relative;margin:0;background:#1b2530}img{width:100%;display:block}b{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:#ffcf4a;color:#111;font-size:12px;display:grid;place-items:center;border:2px solid #111}ol{columns:2}@media print{.no{display:none}}</style><p class="no"><button onclick="print()">${esc(t('Print'))}</button> <button onclick="document.querySelectorAll('ol').forEach(o=>o.hidden=!o.hidden)">${esc(t('Hide key'))}</button></p><h1>${esc(title)}</h1>${figures}<p><small>Canine Atlas · ${esc(t('Educational reference'))}</small></p>`;
    window.open(
      URL.createObjectURL(new Blob([html], { type: 'text/html' })),
      '_blank',
    );
  };
  const reset = () => {
    setPeel(0);
    setMotionReset((n) => n + 1);
    setState((s) => ({ ...initial, reset: s.reset + 1 }));
    setQuery('');
    setArea('All regions');
  };
  const toggle = (system: System) =>
    setState((s) => ({
      ...s,
      selected: null,
      isolate: false,
      systems: s.systems.includes(system)
        ? s.systems.filter((x) => x !== system)
        : [...s.systems, system],
    }));
  const quizBase = notes[card % notes.length];
  const cardPart = atlas?.parts.find((p) => quizBase.match.test(p.id));
  const quiz =
    language === 'cs'
      ? { ...quizBase, ...cardsCs[card % notes.length] }
      : quizBase;
  return (
    <main className="atlas-app">
      <header className="app-header" ref={header}>
        <div className="brand">
          <span className="brand-mark">
            <Dog size={25} />
          </span>
          <div>
            <h1>
              {t('Canine Atlas')}
              <span>3D</span>
            </h1>
            <p>{t('ANATOMY FOR MOVEMENT')}</p>
          </div>
          {brand && (
            <span className="brand-provider">
              {brand.logo && (
                <img src={sitePath(brand.logo)} alt="" height={24} />
              )}
              {t('Provided by')} {brand.name}
            </span>
          )}
        </div>
        <nav aria-label={t('Study modes')} className="mode-tabs">
          <button
            className={tab === 'explore' ? 'active' : ''}
            onClick={() => setTab('explore')}
          >
            <Layers3 size={16} />
            {t('Explore')}
          </button>
          <button
            className={tab === 'study' ? 'active' : ''}
            onClick={() => setTab('study')}
          >
            <BookOpen size={16} />
            {t('Study')}
          </button>
          <button
            className={tab === 'exam' ? 'active' : ''}
            onClick={() => {
              setExamTarget(null);
              setTab('exam');
            }}
          >
            <BookOpen size={16} />
            {t('Exam prep')}
          </button>
          <button
            className={tab === 'practical' ? 'active' : ''}
            onClick={() => setTab('practical')}
          >
            <Dog size={16} />
            {language === 'cs' ? 'Praxe' : 'Practical'}
          </button>
          {privateEdition && (
            <button
              className={tab === 'dorn' ? 'active' : ''}
              onClick={() => {
                setTab('dorn');
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'dorn');
                url.searchParams.delete('book');
                window.history.replaceState(null, '', url);
              }}
            >
              <BookOpen size={16} />
              {language === 'cs' ? 'Dornova metoda' : 'Dorn method'}
            </button>
          )}
          {libraryEnabled && (
            <button
              className={tab === 'library' ? 'active' : ''}
              onClick={() => setTab('library')}
            >
              <BookOpen size={16} />
              {language === 'cs' ? 'Knihovna' : 'Library'}
            </button>
          )}
        </nav>
        <button
          className="source-button"
          aria-label={t('Sources & scope')}
          onClick={() => setAbout(true)}
        >
          <Info size={17} />
          <span>{t('Sources & scope')}</span>
        </button>
        <div className="header-preferences">
          {privateEdition && <PrivateSession language={language} />}
          <ThemePicker language={language} />
          <div
            className="language-switch"
            role="group"
            aria-label={t('Language')}
          >
            <button
              lang="cs"
              aria-label="Čeština"
              aria-pressed={language === 'cs'}
              onClick={() => changeLanguage('cs')}
            >
              CZ
            </button>
            <button
              lang="en"
              aria-label="English"
              aria-pressed={language === 'en'}
              onClick={() => changeLanguage('en')}
            >
              ENG
            </button>
          </div>
        </div>
      </header>
      {tab === 'explore' && (
        <SpeciesPicker
          species={species}
          language={language}
          onChange={(value) => {
            setSpecies(value);
            reset();
            const url = new URL(window.location.href);
            url.searchParams.set('species', value);
            url.searchParams.delete('view');
            url.searchParams.delete('book');
            window.history.replaceState(null, '', url);
          }}
        />
      )}
      <div
        className="workspace"
        style={
          tab === 'library' ||
          tab === 'dorn' ||
          tab === 'exam' ||
          tab === 'practical' ||
          (tab === 'study' && challenge)
            ? { display: 'none' }
            : undefined
        }
      >
        <aside
          className={`sidebar ${mobile ? 'mobile-open' : ''}`}
          aria-label={t('Anatomy controls')}
        >
          <div className="side-heading">
            <span>{t('ANATOMICAL STRUCTURES')}</span>
            <button
              className="mobile-close icon"
              onClick={() => setMobile(false)}
              aria-label={t('Close structure controls')}
            >
              <X size={18} />
            </button>
          </div>
          <label className="search-field">
            <Search size={17} />
            <input
              ref={search}
              placeholder={t('Find a structure…')}
              aria-label={t('Find a structure')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>/</kbd>
          </label>
          <PoseControls
            pose={state.pose || 'standing'}
            onChange={changePose}
            language={language}
            animal={otherSpecies ? species : 'dog'}
          />
          <div className="section-title">
            <h2>{t('Movement')}</h2>
          </div>
          <MotionControls
            language={language}
            resetKey={motionReset}
            stance={stance}
            onGait={(gait) =>
              setState((s) => ({
                ...s,
                gait,
                motion: null,
                highlight: [],
                pose: 'standing',
                explode: 0,
              }))
            }
            onRom={(motion) =>
              setState((s) => ({
                ...s,
                motion,
                gait: null,
                highlight: [],
                pose: 'standing',
                explode: 0,
              }))
            }
          />
          <div className="section-title">
            <h2>{t('Layers')}</h2>
            <span>{presentSystems.length}</span>
          </div>
          <div className="presets">
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  systems: ['bone', 'muscle'],
                  selected: null,
                  isolate: false,
                  hidden: [],
                }))
              }
            >
              {t('Musculoskeletal')}
            </button>
            <button
              onClick={() =>
                setState((s) => ({
                  ...s,
                  systems: ['bone'],
                  selected: null,
                  isolate: false,
                  hidden: [],
                }))
              }
            >
              {t('Skeleton')}
            </button>
            {presentSystems.some((sys) => sys.id === 'ligament') && (
              <button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    systems: ['bone', 'ligament'],
                    selected: null,
                    isolate: false,
                    hidden: [],
                    explode: 0,
                    reset: s.reset + 1,
                  }))
                }
              >
                {t('Bones + ligaments')}
              </button>
            )}
            {presentSystems.some((sys) => sys.id === 'organ') && (
              <button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    systems: ['bone', 'organ'],
                    selected: null,
                    isolate: false,
                    hidden: [],
                  }))
                }
              >
                {t('Bones + organs')}
              </button>
            )}
            {presentSystems.some((sys) => sys.id === 'landmark') && (
              <button
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    systems: ['bone', 'landmark', 'lymph', 'vessel', 'nerve'],
                    selected: null,
                    isolate: false,
                    hidden: [],
                  }))
                }
              >
                {t('Clinical anatomy')}
              </button>
            )}
            {presentSystems.some((sys) => sys.id === 'surface') &&
              presentSystems.some((sys) => sys.id === 'organ') && (
                <button
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      systems: ['surface', 'organ', 'landmark'],
                      selected: null,
                      isolate: false,
                      hidden: [],
                    }))
                  }
                >
                  {t('Surface projection')}
                </button>
              )}
          </div>
          {state.systems.includes('organ') &&
            view?.parts.some((p) => p.sex) && (
              <div
                className="presets"
                role="group"
                aria-label={t('Reproductive organs')}
              >
                {(['male', 'female'] as const).map((sex) => (
                  <button
                    key={sex}
                    aria-pressed={state.sex === sex}
                    onClick={() =>
                      setState((s) => ({
                        ...s,
                        sex,
                        selected: null,
                        isolate: false,
                      }))
                    }
                  >
                    {t(sex === 'male' ? 'Male organs' : 'Female organs')}
                  </button>
                ))}
              </div>
            )}
          <div className="layer-list">
            {presentSystems.map((sys) => (
              <button
                key={sys.id}
                className="layer-row"
                aria-pressed={state.systems.includes(sys.id)}
                onClick={() => toggle(sys.id)}
              >
                <span className="layer-dot" style={{ background: sys.color }} />
                <span>{t(sys.name)}</span>
                <small>
                  {view?.parts.filter(
                    (p) =>
                      p.system === sys.id && (!p.sex || p.sex === state.sex),
                  ).length ?? '—'}
                </small>
                <span
                  className={`switch ${state.systems.includes(sys.id) ? 'on' : ''}`}
                >
                  <i />
                </span>
              </button>
            ))}
          </div>
          <div className="section-title">
            <h2>{t('Viewer tools')}</h2>
          </div>
          <div className="viewer-tools">
            <label>
              {t('Section plane')}
              <select
                value={state.section?.axis ?? ''}
                onChange={(e) => {
                  const axis = e.target.value as 'x' | 'y' | 'z' | '';
                  setState((s) => ({
                    ...s,
                    section: axis ? { axis, at: s.section?.at ?? 0.5 } : null,
                  }));
                }}
              >
                <option value="">{t('Off')}</option>
                <option value="z">{t('Sagittal')}</option>
                <option value="x">{t('Transverse')}</option>
                <option value="y">{t('Dorsal plane')}</option>
              </select>
            </label>
            {state.section && (
              <input
                aria-label={t('Section position')}
                type="range"
                min="0.02"
                max="0.98"
                step="0.01"
                value={state.section.at}
                onChange={(e) => {
                  const at = Number(e.target.value);
                  setState((s) => ({
                    ...s,
                    section: s.section && { ...s.section, at },
                  }));
                }}
              />
            )}
            <div className="presets">
              <button
                aria-pressed={!!state.xray}
                onClick={() => setState((s) => ({ ...s, xray: !s.xray }))}
              >
                {t('X-ray look')}
              </button>
              <button
                aria-pressed={!!state.measure}
                onClick={() => setState((s) => ({ ...s, measure: !s.measure }))}
              >
                {t('Measure')}
              </button>
              <button onClick={printSheet}>{t('Labelled sheet')}</button>
              <button
                aria-pressed={compare}
                onClick={() => setCompare((c) => !c)}
              >
                {t('Compare species')}
              </button>
              <button
                aria-pressed={!!state.contrast}
                onClick={() =>
                  setState((s) => ({ ...s, contrast: !s.contrast }))
                }
              >
                {t('High contrast')}
              </button>
              <button
                aria-pressed={!!state.annotate}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    annotate: !s.annotate,
                    measure: false,
                  }))
                }
              >
                {t('Annotate')}
              </button>
              <button onClick={printHandout}>{t('Region handout')}</button>
            </div>
            {state.annotate && (
              <div className="pin-editor">
                <p className="small">
                  {pendingPin
                    ? t('Type a note for the new pin, then add it.')
                    : t(
                        'Click the model to place a pin. Pins are kept in the copied link.',
                      )}
                </p>
                {pendingPin && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!pinText.trim()) return;
                      setState((s) => ({
                        ...s,
                        pins: [
                          ...(s.pins ?? []),
                          {
                            at: pendingPin,
                            text: pinText.trim().slice(0, 140),
                          },
                        ].slice(0, 20),
                      }));
                      setPinText('');
                      setPendingPin(undefined);
                    }}
                  >
                    <input
                      aria-label={t('Pin note')}
                      value={pinText}
                      maxLength={140}
                      onChange={(e) => setPinText(e.target.value)}
                    />
                    <button type="submit">{t('Add pin')}</button>
                  </form>
                )}
              </div>
            )}
            {!!state.pins?.length && (
              <ol className="pin-list">
                {state.pins.map((p, i) => (
                  <li key={i}>
                    {p.text}{' '}
                    <button
                      aria-label={t('Remove pin')}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          pins: s.pins?.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {state.measure && (
              <p className="measure-readout" aria-live="polite">
                {measureText ||
                  t(
                    'Click two points for a distance or three for an angle. Model scale, not a patient measurement.',
                  )}
              </p>
            )}
          </div>
          <label className="opacity-label">
            {t('Muscle opacity')}{' '}
            <output>{Math.round(state.opacity * 100)}%</output>
            <input
              aria-label={t('Muscle opacity')}
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={state.opacity}
              onChange={(e) =>
                setState((s) => ({ ...s, opacity: +e.target.value }))
              }
            />
          </label>
          {layerCount > 0 && view && (
            <label className="opacity-label peel-label">
              {language === 'cs'
                ? 'Odkrývat po vrstvách'
                : 'Peel layer by layer'}{' '}
              <output>
                {peel === 0 ? (language === 'cs' ? 'vše' : 'all') : `−${peel}`}
              </output>
              <input
                aria-label={
                  language === 'cs'
                    ? 'Odkrývat svalové vrstvy'
                    : 'Peel muscle layers'
                }
                type="range"
                min="0"
                max={layerCount}
                step="1"
                value={peel}
                onChange={(e) => {
                  const v = +e.target.value;
                  setPeel(v);
                  setState((s) => ({
                    ...s,
                    systems: s.systems.includes('muscle')
                      ? s.systems
                      : [...s.systems, 'muscle'],
                    hidden: view.parts
                      .filter(
                        (p) =>
                          p.system === 'muscle' &&
                          ((p as { layer?: number }).layer ?? 0) >
                            layerCount - v,
                      )
                      .map((p) => p.id),
                    selected: null,
                    isolate: false,
                  }));
                }}
              />
            </label>
          )}
          <div className="section-title">
            <h2>{t('Practise')}</h2>
          </div>
          <div className="viewer-tools">
            <div className="presets">
              <button
                onClick={() =>
                  view &&
                  setSpotter({
                    title: t('Spotter: 10 structures'),
                    systems: state.systems,
                    ids: shuffle(
                      view.parts
                        .filter((p) => isShown(p, { ...state, selected: null }))
                        .map((p) => p.id),
                    ).slice(0, 10),
                  })
                }
              >
                {t('Spotter')}
              </button>
              <button
                disabled={!due.length}
                onClick={() =>
                  setSpotter({
                    title: t('Review due'),
                    systems: state.systems,
                    ids: shuffle(due).slice(0, 20),
                  })
                }
              >
                {t('Review due')} ({due.length})
              </button>
              <button onClick={() => setDental(true)}>
                {t('Dental chart')}
              </button>
              {!privateEdition && (
                <button onClick={saveOffline}>{t('Save for offline')}</button>
              )}
            </div>
            <div className="presets">
              <button
                disabled={!state.selected || quizSet.includes(state.selected)}
                onClick={() =>
                  state.selected && saveSet([...quizSet, state.selected])
                }
              >
                {t('Add to quiz set')} ({quizSet.length})
              </button>
              {quizSet.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      setSpotter({
                        title: t('Quiz set'),
                        systems: state.systems,
                        ids: quizSet,
                      })
                    }
                  >
                    {t('Start set')}
                  </button>
                  <button onClick={copyQuizLink}>{t('Copy quiz link')}</button>
                  <button onClick={() => saveSet([])}>{t('Clear set')}</button>
                </>
              )}
            </div>
            <div className="presets">
              <button
                onClick={() =>
                  view &&
                  setDrill({
                    title: t('Nerves and lymph drainage'),
                    rounds: connectionRounds(view, language),
                  })
                }
              >
                {t('Connections quiz')}
              </button>
              <button
                onClick={() =>
                  view &&
                  setDrill({
                    title: t('Find the misplaced bone'),
                    rounds: misplacedRounds(view),
                  })
                }
              >
                {t('Misplaced bone')}
              </button>
              <button onClick={() => setExam(true)}>
                {t('Exam simulation')}
              </button>
              <button onClick={exportFlashcards}>
                {t('Export flashcards')}
              </button>
              {process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0' && (
                <button onClick={() => setClassView(true)}>
                  {t('Class results')}
                </button>
              )}
            </div>
            <label>
              {t('Guided tour')}
              <select
                value={tour?.id ?? ''}
                onChange={(e) =>
                  e.target.value ? goTour(e.target.value, 0) : endTour()
                }
              >
                <option value="">{t('Off')}</option>
                {tours.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title[language]}
                  </option>
                ))}
              </select>
            </label>
            {offline && <p aria-live="polite">{offline}</p>}
            {Object.keys(myNotes).length > 0 && (
              <button className="text-link" onClick={exportNotes}>
                {t('Export my notes')} ({Object.keys(myNotes).length})
              </button>
            )}
          </div>
          <div className="section-title">
            <h2>{t('Browse anatomy')}</h2>
            <span>{results.length}</span>
          </div>
          <select
            aria-label={t('Filter by anatomical region')}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            {[
              'All regions',
              'Forelimb',
              'Hindlimb',
              'Neck & trunk',
              'Head',
            ].map((r) => (
              <option key={r} value={r}>
                {t(r)}
              </option>
            ))}
          </select>
          <div className="structure-list">
            {results.map((p) => (
              <button
                key={p.id}
                className={`structure-row ${state.selected === p.id ? 'selected' : ''}`}
                onClick={() => choose(p.id)}
              >
                <span
                  className="tiny-dot"
                  style={{
                    background: systems.find((s) => s.id === p.system)?.color,
                  }}
                />
                <span>{structureName(p, language)}</span>
                <ChevronRight size={13} />
              </button>
            ))}
            {!results.length && (
              <p className="empty">
                {view
                  ? t(
                      'No matching structures. Try a muscle name or choose all regions.',
                    )
                  : t('Loading structures…')}
              </p>
            )}
          </div>
          <div className="side-foot">
            <span className="live-dot" />
            {t('{count} pieces · {count} study notes', {
              count: otherSpecies
                ? (view?.parts.length ?? 0)
                : noteCoverage.pieces + ligamentCount,
            })}
          </div>
        </aside>
        <section className="viewer" aria-label={t('Canine anatomy explorer')}>
          <div className="viewer-top">
            <div>
              <span className="eyebrow">{t('MUSCULOSKELETAL ATLAS')}</span>
              <h2>
                {state.isolate && selected
                  ? t('Isolated structure')
                  : state.explode > 0
                    ? t('Exploded anatomy')
                    : (view?.scientificName ?? 'Canis lupus familiaris')}
              </h2>
              <p>
                {t('Visible pieces: {count}', { count })} <span>·</span>{' '}
                {state.isolate
                  ? t('Select another structure to return')
                  : t('Select a structure to explore')}
              </p>
            </div>
            <button
              className="mobile-controls"
              aria-label={t('Layers & search')}
              aria-expanded={mobile}
              onClick={() => setMobile(true)}
            >
              <Layers3 size={17} aria-hidden="true" />
              <span className="label">{t('Layers & search')}</span>
            </button>
          </div>
          {view &&
            tab !== 'library' &&
            tab !== 'dorn' &&
            tab !== 'exam' &&
            tab !== 'practical' &&
            !(tab === 'study' && challenge) &&
            !(compare && tab === 'explore') && (
              <AnatomyScene
                key={otherSpecies ? species : 'dog'}
                language={language}
                atlas={view}
                state={attachMarks ? { ...state, marks: attachMarks } : state}
                onSelect={choose}
                onMeasure={setMeasureText}
                onPick={setPendingPin}
                onStance={setStance}
                onTools={(x) => {
                  sceneTools.current = x;
                }}
              />
            )}
          {compare && tab === 'explore' && atlas && (
            <div className="compare-grid">
              {(
                [
                  ['dog', atlas, 'Dog'],
                  ['cat', speciesAtlas.cat, 'Cat'],
                  ['rabbit', speciesAtlas.rabbit, 'Rabbit'],
                ] as const
              ).map(([sp, a, name]) => (
                <div key={sp} className="compare-cell">
                  <span>{t(name)}</span>
                  {a && (
                    <AnatomyScene
                      key={`compare-${sp}`}
                      language={language}
                      atlas={a}
                      state={state}
                      onSelect={choose}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {error && (
            <div role="alert" className="load-card">
              <p>{t('The anatomy catalogue could not be loaded.')}</p>
              <button onClick={() => location.reload()}>{t('Retry')}</button>
            </div>
          )}
          {view && count === 0 && (
            <div className="load-card">
              <strong>{t('No structures visible')}</strong>
              <p>{t('Turn on a layer or restore the anatomy.')}</p>
              <button onClick={reset}>{t('Restore anatomy')}</button>
            </div>
          )}
          {view?.parts.some(
            (p) => p.system === 'ligament' && isShown(p, state),
          ) && (
            <div className="ligament-legend" role="note">
              <span />
              {t('Ligament guides · approximate anatomy')}
            </div>
          )}
          <div className="orientation">
            <span>{t('CAMERA PRESET')}</span>
            <small>
              {t(
                state.view === 'lateral'
                  ? 'Left lateral view'
                  : state.view === 'right'
                    ? 'Right lateral view'
                    : state.view === 'dorsal'
                      ? 'Dorsal view'
                      : state.view === 'cranial'
                        ? 'Cranial view'
                        : 'Oblique view',
              )}
            </small>
          </div>
          <nav className="view-tools" aria-label={t('Camera controls')}>
            {[
              ['lateral', 'L', 'Left lateral view'],
              ['right', 'R', 'Right lateral view'],
              ['cranial', 'Cr', 'Cranial view'],
              ['dorsal', 'D', 'Dorsal view'],
              ['three-quarter', '¾', 'Oblique view'],
            ].map(([v, label, title]) => (
              <button
                key={v}
                title={t(title)}
                aria-label={t(title)}
                aria-pressed={state.view === v}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    view: v,
                    explode: 0,
                    reset: s.reset + 1,
                    rotate: false,
                  }))
                }
              >
                {language === 'cs'
                  ? label === 'R'
                    ? 'P'
                    : label === 'Cr'
                      ? 'Kr'
                      : label
                  : label}
              </button>
            ))}
            <i />
            <button
              title={t('Auto rotate')}
              aria-label={t('Auto rotate')}
              aria-pressed={state.rotate}
              onClick={() => setState((s) => ({ ...s, rotate: !s.rotate }))}
            >
              <RotateCw size={17} />
            </button>
            <button
              title={t('Reset view and layers')}
              aria-label={t('Reset view and layers')}
              onClick={reset}
            >
              <RotateCcw size={17} />
            </button>
            <button
              title={t(copied ? 'Link copied' : 'Copy link to this view')}
              aria-label={t('Copy link to this view')}
              onClick={copyLink}
            >
              {copied ? <Check size={17} /> : <Link2 size={17} />}
            </button>
          </nav>
          <div className="explode-dock">
            <Layers3 size={20} />
            <div>
              <label htmlFor="explode">
                {t('Explode anatomy')}{' '}
                <output>{Math.round(state.explode * 100)}%</output>
              </label>
              <input
                id="explode"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={state.explode}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    pose: 'standing',
                    explode: +e.target.value,
                    rotate: false,
                    isolate: false,
                  }))
                }
              />
              <div className="range-captions">
                <span>{t('Assembled')}</span>
                <span>{t('Separate pieces')}</span>
              </div>
            </div>
            <button
              aria-label={t('Reassemble anatomy')}
              onClick={() =>
                setState((s) => ({ ...s, explode: 0, reset: s.reset + 1 }))
              }
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <footer className="viewer-footer">
            <span>
              {t('Drag to orbit')} <b>·</b> {t('Scroll / pinch to zoom')}{' '}
              <b>·</b> {t('Click to inspect')} <b>·</b>{' '}
              {t('Arrow keys: next structure')}
            </span>
            <span>{t('Educational reference')}</span>
          </footer>
        </section>
        <aside
          ref={inspector}
          className="inspector"
          aria-label={
            tab === 'study' ? t('Study cards') : t('Structure details')
          }
        >
          {tab === 'study' ? (
            <>
              <button
                className="primary challenge-entry"
                disabled={!atlas}
                onClick={() => setChallenge(true)}
              >
                {language === 'cs'
                  ? 'Procvičit anatomii ve 3D'
                  : 'Practice anatomy in 3D'}
              </button>
              <div className="eyebrow mint">{t('ACTIVE RECALL')}</div>
              <h2>{t('Movement cards')}</h2>
              <p className="muted">
                {t('Recall the action, then check your answer.')}
              </p>
              <div className="quiz-progress">
                <span>
                  {t('Card {number} of {total}', {
                    number: (card % notes.length) + 1,
                    total: notes.length,
                  })}
                </span>
                <BookOpen size={17} />
              </div>
              <article className="quiz-card">
                <span>{t('WHAT DOES IT DO?')}</span>
                <h3>{quiz.title}</h3>
                {revealed ? (
                  <>
                    <p>{quiz.action}</p>
                    <div className="rule" />
                    <p className="muted">{quiz.landmark}</p>
                    {cardPart && (
                      <BookReading
                        profile={detailFor(cardPart, language).profile}
                        language={language}
                      />
                    )}
                    <a
                      href={`https://vanat.ahc.umn.edu/carnLabs/Lab${quiz.lab}/Lab${quiz.lab}.html`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Review anatomy source')} <ArrowUpRight size={14} />
                    </a>
                  </>
                ) : (
                  <p className="muted">
                    {t('Name the joint action and trace the attachments.')}
                  </p>
                )}
              </article>
              <Button
                className="primary"
                onClick={() => {
                  if (revealed) {
                    setCard((c) => c + 1);
                    setRevealed(false);
                  } else setRevealed(true);
                }}
              >
                {revealed ? t('Next card') : t('Reveal answer')}
                <ChevronRight size={17} />
              </Button>
              <button
                className="text-button"
                onClick={() => {
                  const p = atlas?.parts.find((p) => quiz.match.test(p.id));
                  if (p) {
                    setSpecies('dog');
                    choose(p.id);
                    setTab('explore');
                    setState((s) => ({
                      ...s,
                      selected: p.id,
                      isolate: true,
                      explode: 0,
                      reset: s.reset + 1,
                    }));
                  }
                }}
              >
                {t('Find in the 3D model')} <Focus size={15} />
              </button>
            </>
          ) : selected ? (
            <>
              <div className="eyebrow mint">
                {t(systems.find((s) => s.id === selected.system)!.name)}{' '}
                <span> / </span> {t(region(selected))}
              </div>
              <div className="detail-title">
                <h2>
                  {note?.title ?? displayName(selected.id)}
                  {latinName(selected) && (
                    <small className="latin-name" lang="la">
                      {latinName(selected)}
                    </small>
                  )}
                </h2>
                <button
                  className="icon"
                  aria-label={t('Clear selection')}
                  onClick={() =>
                    setState((s) => ({ ...s, selected: null, isolate: false }))
                  }
                >
                  <X size={18} />
                </button>
              </div>
              <div className="selected-pill">
                <span />
                {t('Selected in 3D')}
              </div>
              {attachment && (
                <p className="memory-hook">
                  <strong>{t('Attachments from the model')}:</strong>{' '}
                  {limbMuscle ? t('Origin') : 'A'} ({limbMuscle ? 'O' : 'A'}){' '}
                  {boneName(attachment.ab)}; {limbMuscle ? t('Insertion') : 'B'}{' '}
                  ({limbMuscle ? 'I' : 'B'}) {boneName(attachment.bb)}.{' '}
                  <span className="small">
                    {t(
                      'Computed where the muscle touches bone in this model; check against your textbook.',
                    )}
                  </span>
                </p>
              )}
              {!otherSpecies && mnemonicFor(selected.id) && (
                <p className="memory-hook">
                  <strong>{t('Memory hook')}:</strong>{' '}
                  {mnemonicFor(selected.id)![language]}
                </p>
              )}
              <a
                className="text-link small"
                target="_blank"
                rel="noreferrer"
                href={`https://github.com/tausjakub/canine-atlas-physio/issues/new?${new URLSearchParams(
                  {
                    title: `Card: ${selected.id}`,
                    body: `Structure: ${selected.id}\nSpecies: ${otherSpecies ? species : 'dog'}\nLanguage: ${language}\n\nWhat should change, and the source:\n`,
                  },
                )}`}
              >
                {t('Report an issue with this card')}
              </a>
              <label className="my-note">
                {t('My notes')}
                <textarea
                  value={myNotes[selected.id] ?? ''}
                  rows={3}
                  maxLength={4000}
                  placeholder={t('Saved in this browser only.')}
                  onChange={(e) => saveNote(selected.id, e.target.value)}
                />
              </label>
              {note && (
                <div className="full-note">
                  <div className="note-meta">
                    <span>{note.side}</span>
                    <span>{t('Detailed study note')}</span>
                  </div>
                  {note.warning && (
                    <div className="identity-warning" role="note">
                      <strong>
                        {selected.system === 'ligament'
                          ? t('Schematic teaching guide')
                          : t('Source identity qualification')}
                      </strong>
                      <p>{note.warning}</p>
                    </div>
                  )}
                  <p className="note-overview">{note.overview}</p>
                  <BookReading
                    profile={
                      selected.id.startsWith('guide_')
                        ? selected.id
                        : note.profile
                    }
                    language={language}
                  />
                  <section>
                    <h3>{t('Location & relationships')}</h3>
                    <p>{note.location}</p>
                  </section>
                  <section>
                    <h3>{t('Attachments & articulations')}</h3>
                    <p>{note.attachments}</p>
                  </section>
                  <section>
                    <h3>{t('Function & biomechanics')}</h3>
                    <p>{note.function}</p>
                  </section>
                  <section>
                    <h3>{t('Nerve supply')}</h3>
                    <p>{note.nerve}</p>
                  </section>
                  <section>
                    <h3>{t('Physiotherapy relevance')}</h3>
                    <p>{note.physio}</p>
                  </section>
                  <div className="study-note">
                    <BookOpen size={18} />
                    <div>
                      <strong>{t('Recall prompt')}</strong>
                      <p>{note.recall}</p>
                    </div>
                  </div>
                  {note.modelNote && (
                    <section className="model-interpretation">
                      <h3>{t('About this model piece')}</h3>
                      <p>{note.modelNote}</p>
                    </section>
                  )}
                  <section className="note-references">
                    <h3>{t('References & further study')}</h3>
                    {note.references.map((ref) => (
                      <a
                        className="reference-link"
                        key={ref.url}
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {ref.title}
                        <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </section>
                </div>
              )}
              <div className="source-id">
                <span>
                  {selected.system === 'ligament'
                    ? t('TEACHING GUIDE ID')
                    : t('ORIGINAL MODEL NAME')}
                </span>
                <code>{selected.id}</code>
                <small>
                  {selected.system === 'ligament'
                    ? t('Added guide; not an original source mesh.')
                    : t(
                        'Source labels are retained; some are abbreviated or group multiple structures.',
                      )}
                </small>
              </div>
              <Button
                className="primary"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    isolate: !s.isolate,
                    explode: 0,
                    reset: s.reset + 1,
                  }))
                }
              >
                <Focus size={17} />
                {state.isolate
                  ? t('Show surrounding anatomy')
                  : t('Isolate structure')}
              </Button>
              <button
                className="text-button"
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    hidden: [...s.hidden, selected.id],
                    selected: null,
                    isolate: false,
                  }))
                }
              >
                <EyeOff size={16} />
                {t('Hide this piece')}
              </button>
            </>
          ) : (
            <>
              <div className="eyebrow mint">{t('EXPLORE & UNDERSTAND')}</div>
              <h2>{t('Anatomy in motion starts here.')}</h2>
              <p className="muted">
                {t(
                  'Every piece has study notes covering its location, connections, function and physiotherapy relevance. Select a structure to begin.',
                )}
              </p>
              <div className="intro-icon">
                <Bone size={34} />
              </div>
              <h3>{t('Start with a region')}</h3>
              {['Forelimb', 'Hindlimb', 'Neck & trunk'].map((r, i) => (
                <button
                  className="region-card"
                  key={r}
                  onClick={() => {
                    setArea(r);
                    setQuery('');
                    setMobile(true);
                    search.current?.focus();
                  }}
                >
                  <span className="region-number">0{i + 1}</span>
                  <span>
                    {t(r)}
                    <small>
                      {i === 0
                        ? t('Shoulder · elbow · carpus')
                        : i === 1
                          ? t('Hip · stifle · tarsus')
                          : t('Vertebrae · axial muscles')}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
              <div className="study-note">
                <BookOpen size={18} />
                <div>
                  <strong>{t('Build your recall')}</strong>
                  <p>
                    {t('Practice muscle actions with {count} movement cards.', {
                      count: notes.length,
                    })}
                  </p>
                  <button onClick={() => setTab('study')}>
                    {t('Open study cards')} <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
          {state.hidden.length > 0 && (
            <button
              className="restore-button"
              onClick={() => setState((s) => ({ ...s, hidden: [] }))}
            >
              {t('Restore hidden pieces ({count})', {
                count: state.hidden.length,
              })}
            </button>
          )}
          <p className="scope-note">
            {t(
              'Research model, not a clinical assessment tool. Notes describe anatomy and study relevance, not treatment instructions. Confirm model interpretations alongside your veterinary course materials.',
            )}
          </p>
        </aside>
      </div>
      {tab === 'study' && challenge && atlas && (
        <AnatomyChallenge
          atlas={atlas}
          language={language}
          onClose={() => setChallenge(false)}
        />
      )}
      {spotter && view && (
        <Spotter
          atlas={view}
          ids={spotter.ids}
          systems={spotter.systems}
          title={spotter.title === 'Quiz set' ? t('Quiz set') : spotter.title}
          onShare={shareResults}
          language={language}
          onClose={() => setSpotter(undefined)}
        />
      )}
      {drill && view && (
        <ClickQuiz
          atlas={view}
          rounds={drill.rounds}
          title={drill.title}
          language={language}
          onClose={() => setDrill(undefined)}
        />
      )}
      {process.env.NEXT_PUBLIC_ATLAS_PRIVATE !== '0' && classView && view && (
        <Suspense fallback={null}>
          <ClassResults
            atlas={view}
            language={language}
            onClose={() => setClassView(false)}
          />
        </Suspense>
      )}
      {exam && view && (
        <ExamSim
          atlas={view}
          language={language}
          onClose={() => setExam(false)}
        />
      )}
      {tourStep && tour && tab === 'explore' && (
        <div className="tour-card" role="region" aria-label={t('Guided tour')}>
          <p className="small">
            {tours.find((x) => x.id === tour.id)!.title[language]} ·{' '}
            {tour.step + 1} /{' '}
            {tours.find((x) => x.id === tour.id)!.steps.length}
          </p>
          <p>{tourStep.text[language]}</p>
          <div className="presets">
            <button
              disabled={!tour.step}
              onClick={() => goTour(tour.id, tour.step - 1)}
            >
              {t('Back')}
            </button>
            <button onClick={() => goTour(tour.id, tour.step + 1)}>
              {t(
                tour.step + 1 ===
                  tours.find((x) => x.id === tour.id)!.steps.length
                  ? 'Finish'
                  : 'Next',
              )}
            </button>
            <button onClick={endTour}>{t('Close')}</button>
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {view && state.selected
          ? (() => {
              const p = view.parts.find((x) => x.id === state.selected);
              return p ? structureName(p, language) : '';
            })()
          : ''}
      </p>
      {dental && (
        <DentalChart language={language} onClose={() => setDental(false)} />
      )}
      {tab === 'practical' && (
        <PracticalStudy
          language={language}
          onLesson={(topic, criterion) => {
            setExamTarget({ topic, criterion });
            setTab('exam');
          }}
        />
      )}
      {libraryEnabled && tab === 'library' && (
        <Suspense fallback={null}>
          <Library language={language} />
        </Suspense>
      )}
      {tab === 'dorn' && (
        <Suspense fallback={null}>
          <DornMovementStudy language={language} />
        </Suspense>
      )}
      {tab === 'exam' && (
        <ExamStudy
          language={language}
          initialTopic={examTarget?.topic}
          initialCriterion={examTarget?.criterion}
          initialScreen={examTarget?.screen}
          onPractical={() => setTab('practical')}
          onExplore={(id) => {
            if (atlas?.parts.some((p) => p.id === id)) {
              setSpecies('dog');
              choose(id);
              setTab('explore');
              setState((s) => ({
                ...s,
                systems: ['bone', 'ligament'],
                explode: 0,
                reset: s.reset + 1,
                view: 'three-quarter',
              }));
            }
          }}
        />
      )}
      {/* Backdrop click closes the modal; Escape is handled natively (onCancel). */}
      {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialog}
        className="about-dialog"
        onCancel={() => setAbout(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setAbout(false);
        }}
      >
        <button
          className="dialog-close icon"
          aria-label={t('Close sources')}
          onClick={() => setAbout(false)}
        >
          <X size={22} />
        </button>
        <span className="eyebrow mint">{t('SOURCES & SCOPE')}</span>
        <h2>{t('A canine atlas for study.')}</h2>
        <p>
          {t(
            'This explorer adapts the interaction patterns of Human Atlas: 3D selection, layer controls, search, isolation and exploded views.',
          )}
        </p>
        <h3>{t('Canine geometry')}</h3>
        <p>
          {t(
            'MusculoskeletalDog by Vittorio La Barbera (2025), released under MIT. The associated research describes Pharaoh dog geometry originating from leo3Dmodels and dm_control. It is a research-used anatomical model, not a CT reconstruction or a veterinarian-validated teaching atlas.',
          )}
        </p>
        <p>
          {t(
            'Selectable pieces: {count}. Pieces include grouped bones, separate muscle portions, connective tissue and surface features; these counts are not anatomical totals. Peripheral nerves are not included; the brain, spinal cord and other organs are a separate layer described below.',
            { count: noteCoverage.pieces },
          )}
        </p>
        <p>
          {t(
            'Converted from STL and SKN to indexed geometry in the source reference pose. Colors, labels and the exploded layout are adapted for this viewer; no simulated joint movement or treatment guidance is provided.',
          )}
        </p>
        <h3>{t('Cat and rabbit geometry')}</h3>
        <p>
          {t(
            'The cat and rabbit atlases are derived from MusculoskeletalDog (Vittorio La Barbera, 2025, MIT): the dog meshes are retargeted in Blender to species proportions, with a few muscles generated from attachment landmarks. The same geometry provenance note applies. They are study models, not CT reconstructions or validated dissections.',
          )}
        </p>
        <h3>{t('Dog organs')}</h3>
        <p>
          {t(
            'Brain: Cortical Atlas of the Canine Brain by Philippa J. Johnson and Erica F. Barry (2019, Cornell University, CC0), a population MRI template meshed and scaled to fit this skull. All other organs are schematic shapes authored for this atlas and placed at textbook positions inside the body cavities; they are not segmented from imaging and are not to exact size.',
          )}
        </p>
        <p>
          {t(
            'The cat and rabbit organ layers are the dog layer retargeted to each species, with a rabbit caecum and duplex uterus added; their placement follows the dog layout. Male and female reproductive organs are shown one at a time.',
          )}
        </p>
        <p>
          {t(
            'The ferret and guinea pig atlases are previews built from the cat and rabbit templates on the same dog model: the ferret gains thoracic vertebrae and ribs (15 pairs), the guinea pig loses vertebrae and digits (four front, three hind toes) and its tail. Their notes are shorter and their shapes approximate; check them against your course materials.',
          )}
        </p>
        <p>
          {t(
            'The skull and mandible of the cat, rabbit, ferret (European polecat, its wild form) and guinea pig come from 3D scans of real museum specimens (CC BY 4.0); the Sources list of each species names the specimen.',
          )}
        </p>
        <a
          href="https://doi.org/10.7298/4t8z-aw34"
          target="_blank"
          rel="noreferrer"
        >
          {t('Canine brain atlas (CC0)')} <ArrowUpRight size={15} />
        </a>
        <a
          href="https://github.com/vittorione94/MusculoskeletalDog"
          target="_blank"
          rel="noreferrer"
        >
          {t('Model repository')} <ArrowUpRight size={15} />
        </a>
        <a
          href="https://arxiv.org/html/2506.23768v2"
          target="_blank"
          rel="noreferrer"
        >
          {t('Research & model provenance')} <ArrowUpRight size={15} />
        </a>
        <a href={sitePath('/models/LICENSE-MODEL.txt')} target="_blank">
          {t('Model licence')} <ArrowUpRight size={15} />
        </a>
        <h3>{t('Ligament teaching layer')}</h3>
        <p>
          {t(
            '17 selectable guides illustrate selected stifle, elbow, pelvic and neck ligaments. Their courses and attachment regions are approximate; thickness is enlarged for visibility. These additions are not segmented from the original model and have not been independently anatomically validated. They do not form a complete ligament atlas.',
          )}
        </p>
        <h3>{t('Study content')}</h3>
        <p>
          {t(
            'Reference links open the original sources in their published language.',
          )}
        </p>
        <p>
          {t(
            'All 425 selectable pieces have detailed study notes, organized into 168 anatomical profiles. Bilateral and repeated pieces share the relevant anatomy, with side and model-specific context. Notes cover location, attachments or articulations, function, nerve supply, physiotherapy relevance and a recall question. 43 pieces carry explicit qualifications where names, species conventions or segmentation are uncertain. References include university veterinary anatomy teaching material and model provenance. Use the canine examples alongside your prescribed text; source images and dissection instructions are not reproduced. Notes have not undergone independent veterinary peer review.',
          )}
        </p>
        <a
          href="https://vanat.ahc.umn.edu/carnLabs/"
          target="_blank"
          rel="noreferrer"
        >
          {t('University of Minnesota · Carnivore anatomy')}{' '}
          <ArrowUpRight size={15} />
        </a>
        <a
          href="https://github.com/ashemag/human-atlas"
          target="_blank"
          rel="noreferrer"
        >
          {t('Human Atlas · interface reference (MIT)')}{' '}
          <ArrowUpRight size={15} />
        </a>
      </dialog>
    </main>
  );
}
