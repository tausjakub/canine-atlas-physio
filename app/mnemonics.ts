// Short memory hooks shown with matching structures. Descriptive anatomy only.
type Bi = { cs: string; en: string };
export const mnemonics: { match: RegExp; text: Bi }[] = [
  {
    match: /^(C|T|L|Ca)_\d+$|^Sacrum$|^Ribcage$/,
    text: {
      cs: 'Obratlový vzorec psa: C7 · T13 · L7 · S3 · Cd 20-23 (zkráceně "7-13-7-3").',
      en: 'Dog vertebral formula: C7 · T13 · L7 · S3 · Cd 20-23 ("7-13-7-3").',
    },
  },
  {
    match: /^Rib_|rib_numbers/,
    text: {
      cs: '13 žeber = 9 sternálních + 4 asternální; mezižebří n leží za žebrem n.',
      en: '13 ribs = 9 sternal + 4 asternal; intercostal space n lies behind rib n.',
    },
  },
  {
    match: /supraspinatus|infraspinatus|subscapularis|teres_minor/,
    text: {
      cs: 'Svaly rotátorové manžety: supraspinatus, infraspinatus, subscapularis, teres minor ("SITS").',
      en: 'Rotator cuff muscles: supraspinatus, infraspinatus, subscapularis, teres minor ("SITS").',
    },
  },
  {
    match: /biceps_femoris|semitendinosus|semimembranosus|tuber_ischiadicum/,
    text: {
      cs: 'Hamstringy "BSS": biceps femoris, semitendinosus, semimembranosus, všechny ze sedacího hrbolu.',
      en: 'Hamstrings "BSS": biceps femoris, semitendinosus, semimembranosus, all from the ischiatic tuberosity.',
    },
  },
  {
    match: /rectus_femoris|vastus/,
    text: {
      cs: 'Quadriceps = 4 hlavy: rectus femoris + tři vasti (lateralis, medialis, intermedius).',
      en: 'Quadriceps = 4 heads: rectus femoris + three vasti (lateralis, medialis, intermedius).',
    },
  },
  {
    match: /^n_femoral|^n_sciatic|^n_tibial|^n_common_peroneal|cord_L4_S3/,
    text: {
      cs: 'Femoralis "4-5-6" (L4-L6), ischiadicus "6-7-1" (L6-S1).',
      en: 'Femoral "4-5-6" (L4-L6), sciatic "6-7-1" (L6-S1).',
    },
  },
  {
    match: /^ausc_/,
    text: {
      cs: '"P-A-M vlevo 3-4-5, T vpravo": pulmonální 3., aortální 4., mitrální 5. mezižebří vlevo; trikuspidální vpravo.',
      en: '"P-A-M left 3-4-5, T right": pulmonic 3rd, aortic 4th, mitral 5th left intercostal space; tricuspid on the right.',
    },
  },
  {
    match: /organ_lung/,
    text: {
      cs: 'Pravá plíce má víc: 4 laloky (s přídatným), levá 2.',
      en: 'The right lung has more: 4 lobes (with the accessory), the left 2.',
    },
  },
  {
    match: /organ_kidney/,
    text: {
      cs: 'Pravá ledvina leží kraniálněji, v ledvinové jamce jater.',
      en: 'The right kidney lies more cranially, in the renal fossa of the liver.',
    },
  },
  {
    match: /^Jaw$|^MergedSkull$/,
    text: {
      cs: 'Triadanovo "pravidlo 4 a 9": špičák je vždy 04, první molár vždy 09. Pes 42 zubů, kočka 30, králík 28.',
      en: 'Triadan "rule of 4 and 9": the canine is always 04, the first molar always 09. Dog 42 teeth, cat 30, rabbit 28.',
    },
  },
  {
    match: /^brain_|^organ_spinal_cord/,
    text: {
      cs: 'Hlavové nervy I-XII: čichový, zrakový, okohybný, kladkový, trojklaný, odtahující, lícní, sluchově-rovnovážný, jazykohltanový, bloudivý, přídatný, podjazykový.',
      en: 'Cranial nerves I-XII: Oh Oh Oh To Touch And Feel Very Good Velvet, Such Heaven (olfactory, optic, oculomotor, trochlear, trigeminal, abducent, facial, vestibulocochlear, glossopharyngeal, vagus, accessory, hypoglossal).',
    },
  },
];
export const mnemonicFor = (id: string) =>
  mnemonics.find((m) => m.match.test(id))?.text;
