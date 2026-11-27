import data from './study-data.json';
import dataCs from './study-data.cs.json';
import { type Part, displayName } from './anatomy';
import type { Language } from './i18n';
import { ligamentDetail } from './ligaments';
export type Source = { title: string; url: string };
export type StudyProfile = {
  title: string;
  overview: string;
  location: string;
  attachments: string;
  function: string;
  nerve: string;
  physio: string;
  recall: string;
  sources: string[];
};
export type PieceNote = {
  profile: string;
  side: string;
  modelNote: string;
  warning: string;
};
const profiles: Record<string, StudyProfile> = data.profiles;
const pieces: Record<string, PieceNote> = data.parts;
export const noteCoverage = {
  pieces: Object.keys(pieces).length,
  profiles: Object.keys(profiles).length,
  qualified: Object.values(pieces).filter((p) => p.warning).length,
};
type Bilingual = { cs: string; en: string };
// Cat and rabbit parts carry their own bilingual study card in the catalog.
export type SpeciesStudy = {
  location: Bilingual;
  connections: Bilingual;
  nerve: Bilingual | null;
  difference: Bilingual;
  recall: Bilingual;
  answer: Bilingual;
  reference: string;
  depth: 'deep' | 'superficial';
};
export type SpeciesPart = Part & {
  label: Bilingual;
  action: Bilingual;
  study: SpeciesStudy | null;
  layer?: number;
};
export function isSpeciesPart(part: Part): part is SpeciesPart {
  return 'label' in part && 'study' in part;
}
function speciesNote(part: SpeciesPart, language: Language) {
  const s = part.study,
    cs = language === 'cs',
    pick = (b: Bilingual | null | undefined) => (b ? b[language] : '');
  const side = part.id.endsWith('_L')
    ? cs
      ? 'Vlevo'
      : 'Left'
    : part.id.endsWith('_R')
      ? cs
        ? 'Vpravo'
        : 'Right'
      : cs
        ? 'Střední čára'
        : 'Midline';
  return {
    title: part.label[language].replace(/ · (vlevo|vpravo|left|right)$/, ''),
    overview: pick(s?.location),
    location: pick(s?.location),
    attachments: pick(s?.connections),
    function: pick(part.action),
    nerve:
      pick(s?.nerve) ||
      (cs ? 'Neuplatňuje se (kost).' : 'Not applicable (bone).'),
    physio: cs
      ? 'Sledujte vztah struktury k okolním kloubům. Pohyb v zatížené končetině se může lišit od izolovaného pohybu; polohy modelu ukazují prostorové vztahy, nikoli bezpečný rozsah pohybu živého zvířete.'
      : 'Follow the structure’s relationship to neighbouring joints. Weight-bearing function may differ from isolated movement; model poses show spatial relationships, not a safe range of motion for a living animal.',
    recall: s ? `${pick(s.recall)} ${pick(s.answer)}` : '',
    sources: [] as string[],
    profile: '',
    side,
    modelNote: pick(s?.difference),
    warning: '',
    references: s
      ? [
          {
            title: cs
              ? 'Anatomický podklad k dalšímu studiu'
              : 'Anatomical reference for further study',
            url: s.reference,
          },
        ]
      : [],
  };
}
export function detailFor(part: Part, language: Language = 'en') {
  if (isSpeciesPart(part)) return speciesNote(part, language);
  const guide = ligamentDetail(part, language);
  if (guide) return guide;
  const localized = language === 'cs' ? dataCs : data;
  const localPieces: Record<string, PieceNote> = localized.parts,
    localProfiles: Record<string, StudyProfile> = localized.profiles,
    localSources: Record<string, Source> = localized.sources;
  const piece = localPieces[part.id];
  if (!piece || !localProfiles[piece.profile])
    throw new Error(`Missing study note: ${part.id}`);
  return {
    ...localProfiles[piece.profile],
    ...piece,
    references: localProfiles[piece.profile].sources.map(
      (id) => localSources[id],
    ),
  };
}
export function structureName(part: Part, language: Language) {
  if (isSpeciesPart(part)) return part.label[language];
  const guide = ligamentDetail(part, language);
  if (guide) return `${guide.title} · ${guide.side}`;
  if (language === 'en') return displayName(part.id);
  const note = detailFor(part, language);
  const suffix = part.id.match(/(?:digiti_|metacarpale_)([IV]+)/)?.[1];
  const level = part.id.match(/^(?:C|L|Ca)_(\d+)$/)?.[1];
  const fragment = part.id.match(/(?:\(2\)|\.001|_(\d+))$/);
  return [
    note.title,
    note.side === 'Vlevo' || note.side === 'Vpravo' ? note.side : '',
    suffix ? `prst ${suffix}` : '',
    level
      ? `${part.id.split('_')[0]}${level}`
      : fragment
        ? `část ${fragment[1] ?? 2}`
        : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
