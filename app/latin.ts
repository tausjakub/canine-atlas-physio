// Latin (Nomina Anatomica Veterinaria style) names shown under each structure's
// title. Muscle ids already carry the Latin name; bones, organs and the clinical
// layer use the tables below. Unknown ids return null (no Latin line).
import type { Part } from './anatomy';

const side = (id: string) => id.replace(/_[LR](\(\d\)|\.\d+|_\d+)?$/, '');
const roman = (n: number) => ['I', 'II', 'III', 'IV', 'V'][n - 1] ?? String(n);
const abbrev: Record<string, string> = {
  ext: 'externus',
  int: 'internus',
  abd: 'abdominis',
  tranversus: 'transversus',
  sternohyroideus: 'sternohyoideus',
  ventr: 'ventralis',
  sup: 'superioris',
  lat: 'lateralis',
  med: 'medialis',
  prof: 'profundus',
  superf: 'superficialis',
};

const bones: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^MergedSkull$/, () => 'Cranium'],
  [/^Jaw$/, () => 'Mandibula'],
  [/^Ribcage$/, () => 'Costae et vertebrae thoracicae'],
  [/^Rib_(\d+)$/, (m) => `Costa ${m[1]}`],
  [/^Sternum$/, () => 'Sternum'],
  [/^C_1$/, () => 'Atlas'],
  [/^C_2$/, () => 'Axis'],
  [/^C_(\d+)$/, (m) => `Vertebra cervicalis ${m[1]}`],
  [/^T_(\d+)$/, (m) => `Vertebra thoracica ${m[1]}`],
  [/^L_(\d+)$/, (m) => `Vertebra lumbalis ${m[1]}`],
  [/^Ca_(\d+)$/, (m) => `Vertebra caudalis ${m[1]}`],
  [/^Sacrum$/, () => 'Os sacrum'],
  [/^Pelvis$/, () => 'Os coxae'],
  [/^Scapula$/, () => 'Scapula'],
  [/^humerus$/i, () => 'Humerus'],
  [/^Radius$/, () => 'Radius'],
  [/^Ulna$/, () => 'Ulna'],
  [/^Femoris$/, () => 'Os femoris'],
  [/^Femoris_fabell/, () => 'Os sesamoideum m. gastrocnemii'],
  [/^Patella$/, () => 'Patella'],
  [/^Tibia$/, () => 'Tibia'],
  [/^Fibula$/, () => 'Fibula'],
  [/^Calcaneal_tuber$/, () => 'Calcaneus'],
  [/^Tibial_tarsal$/, () => 'Talus'],
  [/^Tarsus_central$/, () => 'Os tarsi centrale'],
  [/^Tarsus_[LR]?_?([IV]+)$/, (m) => `Os tarsale ${m[1]}`],
  [/^Carpal_accessory$/, () => 'Os carpi accessorium'],
  [/^Carpal_ulnar$/, () => 'Os carpi ulnare'],
  [/^Carpal$/, () => 'Os carpi intermedioradiale'],
  [/^Carpal_Sesamoid$|^Sesamoid/, () => 'Os sesamoideum'],
  [/^Carpal_([IV]+)$/, (m) => `Os carpale ${m[1]}`],
  [/^Os_metacarpale_([IV]+)/, (m) => `Os metacarpale ${m[1]}`],
  [
    /^Metatarsi_[LR]?_?(\d)/,
    (m) => `Os metatarsale ${roman(Number(m[1]) + 1)}`,
  ],
  // Species atlases use canonical names: Tarsus_3, Carpal_ulnare, Phalanx_<digit>_<1-3>.
  [/^Tarsus_centrale$/, () => 'Os tarsi centrale'],
  [/^Tarsus_(\d)$/, (m) => `Os tarsale ${roman(Number(m[1]))}`],
  [
    /^Carpal_(ulnare|accessorium|radiale|intermedium|intermedioradiale)$/,
    (m) => `Os carpi ${m[1]}`,
  ],
  [/^Carpal_(\d)$/, (m) => `Os carpale ${roman(Number(m[1]))}`],
  [/^Os_metacarpale_(\d)$/, (m) => `Os metacarpale ${roman(Number(m[1]))}`],
  [
    /^Phalanx_(\d)_(\d)$/,
    (m) =>
      `Phalanx ${['proximalis', 'media', 'distalis'][Number(m[2]) - 1]} digiti ${roman(Number(m[1]))}`,
  ],
  [/^Phalanx_distalis/, () => 'Phalanx distalis'],
  [/^Phalanx_media/, () => 'Phalanx media'],
  [/^Phalanxpmxinutlis|^Phalanx_proximalis/, () => 'Phalanx proximalis'],
  [/^Phalanges/, () => 'Phalanges'],
];

const fixed: Record<string, string> = {
  skin: 'Cutis',
  eye: 'Bulbus oculi',
  m_Eye: 'Bulbus oculi',
  m_Nose: 'Planum nasale',
  m_Skutulum: 'Scutulum',
  m_abdominis_Aponeurosis: 'Aponeurosis abdominis',
  m_biceps_femoris_tendon: 'Tendo m. bicipitis femoris',
  m_dorsi_Fascia_thoracolumbar_: 'Fascia thoracolumbalis',
  brain_lobe_frontal: 'Lobus frontalis',
  brain_lobe_sensorimotor: 'Cortex sensorimotorius (gyrus sigmoideus)',
  brain_lobe_parietal: 'Lobus parietalis',
  brain_lobe_occipital: 'Lobus occipitalis',
  brain_lobe_temporal: 'Lobus temporalis (piriformis et perisylvius)',
  brain_cerebellum: 'Cerebellum',
  brain_stem: 'Truncus encephali',
  brain_olfactory_bulbs: 'Bulbi olfactorii',
  organ_spinal_cord: 'Medulla spinalis',
  organ_larynx: 'Larynx',
  organ_trachea: 'Trachea',
  organ_oesophagus: 'Oesophagus',
  organ_thyroid: 'Glandula thyroidea',
  organ_heart: 'Cor',
  organ_aorta: 'Aorta',
  organ_caudal_vena_cava: 'Vena cava caudalis',
  organ_lung: 'Pulmo',
  organ_liver: 'Hepar',
  organ_gallbladder: 'Vesica fellea',
  organ_stomach: 'Ventriculus (gaster)',
  organ_duodenum: 'Duodenum',
  organ_pancreas: 'Pancreas',
  organ_spleen: 'Lien',
  organ_small_intestine: 'Jejunum et ileum',
  organ_colon_rectum: 'Colon et rectum',
  organ_caecum: 'Caecum',
  organ_kidney: 'Ren',
  organ_adrenal: 'Glandula adrenalis',
  organ_bladder: 'Vesica urinaria',
  organ_prostate: 'Prostata',
  organ_tongue: 'Lingua',
  organ_ovary: 'Ovarium',
  organ_uterus: 'Uterus',
  organ_vagina: 'Vagina',
  lm_scapular_spine: 'Spina scapulae',
  lm_acromion: 'Acromion',
  lm_greater_tubercle: 'Tuberculum majus humeri',
  lm_lateral_epicondyle: 'Epicondylus lateralis humeri',
  lm_olecranon: 'Olecranon',
  lm_accessory_carpal: 'Os carpi accessorium',
  lm_iliac_crest: 'Crista iliaca',
  lm_tuber_coxae: 'Tuber coxae',
  lm_tuber_ischiadicum: 'Tuber ischiadicum',
  lm_greater_trochanter: 'Trochanter major',
  lm_patella: 'Patella',
  lm_tibial_tuberosity: 'Tuberositas tibiae',
  lm_lateral_malleolus: 'Malleolus lateralis',
  lm_calcaneal_tuber: 'Tuber calcanei',
  lm_atlas_wing: 'Ala atlantis',
  lm_rib_numbers: 'Costae',
  lm_body_regions: 'Regiones corporis',
  n_cranial_nerves: 'Nn. craniales I-XII',
  gp_humerus_proximal: 'Cartilago epiphysialis proximalis humeri',
  gp_humerus_distal: 'Cartilago epiphysialis distalis humeri',
  gp_radius_proximal: 'Cartilago epiphysialis proximalis radii',
  gp_radius_distal: 'Cartilago epiphysialis distalis radii',
  gp_ulna_distal: 'Cartilago epiphysialis distalis ulnae',
  gp_femur_proximal: 'Cartilago epiphysialis capitis ossis femoris',
  gp_femur_distal: 'Cartilago epiphysialis distalis ossis femoris',
  gp_tibia_proximal: 'Cartilago epiphysialis proximalis tibiae',
  gp_tibia_distal: 'Cartilago epiphysialis distalis tibiae',
  ausc_pulmonic: 'Punctum maximum valvae trunci pulmonalis',
  ausc_aortic: 'Punctum maximum valvae aortae',
  ausc_mitral: 'Punctum maximum valvae atrioventricularis sinistrae',
  ausc_tricuspid: 'Punctum maximum valvae atrioventricularis dextrae',
  ln_mandibular: 'Lnn. mandibulares',
  ln_superficial_cervical: 'Lnn. cervicales superficiales',
  ln_axillary: 'Ln. axillaris proprius',
  ln_superficial_inguinal: 'Lnn. inguinales superficiales',
  ln_popliteal: 'Ln. popliteus superficialis',
  v_external_jugular: 'V. jugularis externa',
  v_cephalic: 'V. cephalica',
  v_lateral_saphenous: 'V. saphena lateralis',
  v_femoral_artery: 'A. femoralis',
  n_radial: 'N. radialis',
  n_median: 'N. medianus',
  n_ulnar: 'N. ulnaris',
  n_musculocutaneous: 'N. musculocutaneus',
  n_femoral: 'N. femoralis',
  n_sciatic: 'N. ischiadicus',
  n_tibial: 'N. tibialis',
  n_common_peroneal: 'N. fibularis communis',
  cord_C1_C5: 'Medulla spinalis, segmenta C1-C5',
  cord_C6_T2: 'Intumescentia cervicalis (C6-T2)',
  cord_T3_L3: 'Medulla spinalis, segmenta T3-L3',
  cord_L4_S3: 'Intumescentia lumbalis (L4-S3)',
  cord_caudal: 'Conus medullaris et cauda equina',
};

export function latinName(part: Part): string | null {
  const id = side(part.id);
  const base = id.replace(
    /^(brain_lobe_[a-z]+|organ_lung|organ_kidney|organ_adrenal|organ_ovary)_?.*/,
    '$1',
  );
  if (fixed[base]) return fixed[base];
  if (part.system === 'bone')
    for (const [re, name] of bones) {
      const m = id.match(re) ?? part.id.match(re);
      if (m) return name(m);
    }
  if (part.system === 'muscle' && id.startsWith('m_')) {
    const words = id
      .slice(2)
      .replace(/\(\d\)$|\.\d+$|_\d+$/, '')
      .split('_')
      .filter(Boolean)
      .map((w) => abbrev[w.toLowerCase()] ?? w.toLowerCase());
    return words.length ? `M. ${words.join(' ')}` : null;
  }
  return null;
}
