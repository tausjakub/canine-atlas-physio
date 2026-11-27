// Guided anatomy tours: each step sets layers, selection and camera, with a
// short bilingual explanation. Steps refer to dog part ids; a step whose part
// is missing in another species simply shows its layers.
import type { System } from './anatomy';

type Bi = { cs: string; en: string };
export type TourStep = {
  text: Bi;
  systems: System[];
  part?: string;
  view?: string;
  section?: { axis: 'x' | 'y' | 'z'; at: number };
};
export type Tour = { id: string; title: Bi; steps: TourStep[] };
const s = (
  cs: string,
  en: string,
  systems: System[],
  part?: string,
  view = 'lateral',
): TourStep => ({
  text: { cs, en },
  systems,
  part,
  view,
});

export const tours: Tour[] = [
  {
    id: 'shoulder',
    title: { cs: 'Rameno v 6 krocích', en: 'The shoulder in 6 steps' },
    steps: [
      s(
        'Lopatka leží na hrudní stěně bez kostěného spojení s trupem; drží ji svaly.',
        'The scapula lies on the chest wall with no bony joint to the trunk; muscles hold it.',
        ['bone'],
        'Scapula_L',
      ),
      s(
        'Hřeben lopatky dělí její laterální plochu; nahmatáte ho pod kůží.',
        'The scapular spine divides its lateral surface; you can feel it under the skin.',
        ['bone', 'landmark'],
        'lm_scapular_spine_L',
      ),
      s(
        'M. supraspinatus vyplňuje jámu kraniálně od hřebene a upíná se na velký hrbol.',
        'The supraspinatus fills the fossa cranial to the spine and inserts on the greater tubercle.',
        ['bone', 'muscle'],
        'm_supraspinatus_L',
      ),
      s(
        'M. infraspinatus leží kaudálně od hřebene; s m. supraspinatus stabilizuje ramenní kloub laterálně.',
        'The infraspinatus lies caudal to the spine; with the supraspinatus it stabilises the shoulder laterally.',
        ['bone', 'muscle'],
        'm_infraspinatus_L',
      ),
      s(
        'M. biceps brachii odstupuje z nadkloubního hrbolu lopatky a ohýbá loket.',
        'The biceps brachii arises from the supraglenoid tubercle and flexes the elbow.',
        ['bone', 'muscle'],
        'm_biceps_brachii_L',
      ),
      s(
        'M. triceps brachii natahuje loket; jeho dlouhá hlava přechází přes rameno.',
        'The triceps brachii extends the elbow; its long head also crosses the shoulder.',
        ['bone', 'muscle'],
        'm_triceps_brachii_long_L',
      ),
    ],
  },
  {
    id: 'stifle',
    title: { cs: 'Koleno v 5 krocích', en: 'The stifle in 5 steps' },
    steps: [
      s(
        'Koleno tvoří stehenní kost, holenní kost a čéška.',
        'The stifle is formed by the femur, tibia and patella.',
        ['bone'],
        'Femoris_L',
      ),
      s(
        'Čéška leží v šlaše m. quadriceps femoris a klouže v kladce stehenní kosti.',
        'The patella sits in the quadriceps tendon and glides in the femoral trochlea.',
        ['bone', 'landmark'],
        'lm_patella_L',
      ),
      s(
        'Přímý vaz čéšky se upíná na drsnatinu holenní kosti.',
        'The patellar ligament inserts on the tibial tuberosity.',
        ['bone', 'landmark'],
        'lm_tibial_tuberosity_L',
      ),
      s(
        'M. quadriceps femoris (zde m. rectus femoris) koleno natahuje.',
        'The quadriceps femoris (here the rectus femoris) extends the stifle.',
        ['bone', 'muscle'],
        'm_rectus_femoris_L',
      ),
      s(
        'Kaudálně od kolene leží podkolenní mízní uzlina a m. gastrocnemius.',
        'Caudal to the stifle lie the popliteal lymph node and the gastrocnemius.',
        ['bone', 'lymph', 'muscle'],
        'ln_popliteal_L',
      ),
    ],
  },
  {
    id: 'thorax',
    title: {
      cs: 'Topografie hrudníku v 6 krocích',
      en: 'Thoracic topography in 6 steps',
    },
    steps: [
      s(
        'Pes má 13 párů žeber; čísla pomáhají s orientací na hrudní stěně.',
        'The dog has 13 pairs of ribs; the numbers help with orientation on the chest wall.',
        ['bone', 'landmark'],
        'lm_rib_numbers_L',
      ),
      s(
        'Srdce leží ve středním mezihrudí zhruba od 3. do 6. mezižebří.',
        'The heart lies in the middle mediastinum from about the 3rd to the 6th intercostal space.',
        ['bone', 'organ'],
        'organ_heart',
      ),
      s(
        'Mitrální poslechové místo je vlevo v 5. mezižebří u kostochondrálních spojení.',
        'The mitral area is on the left at the 5th intercostal space near the costochondral junctions.',
        ['bone', 'landmark', 'organ'],
        'ausc_mitral',
      ),
      s(
        'Plíce vyplňují zbytek hrudní dutiny; levá má dva laloky, pravá čtyři.',
        'The lungs fill the rest of the thorax; the left has two lobes, the right four.',
        ['bone', 'organ'],
        'organ_lung_L',
      ),
      s(
        'Bránice odděluje hrudní a břišní dutinu; játra leží hned za ní.',
        'The diaphragm separates thorax and abdomen; the liver lies just caudal to it.',
        ['bone', 'organ'],
        'organ_liver',
      ),
      {
        ...s(
          'Řez v sagitální rovině ukáže vztah srdce, plic a jater najednou.',
          'A sagittal section shows heart, lungs and liver together.',
          ['bone', 'organ'],
          'organ_heart',
        ),
        section: { axis: 'z', at: 0.5 },
      },
    ],
  },
];
